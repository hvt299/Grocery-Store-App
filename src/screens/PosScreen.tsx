import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Dimensions,
  Animated,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { StatusBar } from 'expo-status-bar';
import {
  Store,
  ShoppingCart,
  X,
  Plus,
  Minus,
  Pencil,
  Trash2,
  Printer,
  PackageOpen,
  ArrowRight,
  Banknote,
  Coins,
  Layers,
  UserCheck,
  Lock,
} from 'lucide-react-native';

import { getProducts, getCategories, createInvoice } from '../services/productService';
import { printReceipt } from '../services/printerService';
import { formatCurrency, formatPosHeader } from '../utils/format';
import { socket } from '../lib/socket';
import { SPACING, FONTS, SHADOWS } from '../constants/theme';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import GlobalSearchBar from '../components/GlobalSearchBar';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING * 3) / 2;

const SkeletonGridCard = ({ colors, styles }: any) => {
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.9, duration: 800, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.gridCard, { opacity: fadeAnim, marginBottom: 14 }]}>
      <View style={styles.gridImgPlaceholder} />
      <View style={styles.gridBody}>
        <View style={{ width: '85%', height: 14, backgroundColor: colors.borderColor, borderRadius: 6, marginBottom: 8 }} />
        <View style={{ width: '50%', height: 12, backgroundColor: colors.borderColor, borderRadius: 6, marginBottom: 12 }} />
        <View style={styles.gridFooter}>
          <View style={{ width: 70, height: 18, backgroundColor: colors.borderColor, borderRadius: 6 }} />
          <View style={{ width: 34, height: 34, backgroundColor: colors.borderColor, borderRadius: 12 }} />
        </View>
      </View>
    </Animated.View>
  );
};

// Memoized Product Card with expo-image for maximum performance & zero OOM crashes
const ProductGridCard = React.memo(
  ({
    item,
    qtyInCart,
    onAddToCart,
    colors,
    styles,
  }: {
    item: any;
    qtyInCart: number;
    onAddToCart: (prod: any) => void;
    colors: any;
    styles: any;
  }) => {
    const safeName = item?.name || 'Sản phẩm';
    const stock = Number(item.stock) || 0;
    const isOutOfStock = stock <= 0;

    let status = { label: `Kho: ${stock}`, color: colors.success, bg: colors.successLight };
    if (stock <= 0) {
      status = { label: 'Hết hàng', color: colors.danger, bg: colors.dangerLight };
    } else if (stock <= 10) {
      status = { label: `Còn ${stock}`, color: colors.warning, bg: colors.warningLight };
    }

    return (
      <TouchableOpacity
        style={[styles.gridCard, qtyInCart > 0 && styles.gridCardSelected]}
        activeOpacity={0.75}
        onPress={() => onAddToCart(item)}
      >
        <View style={styles.gridImgPlaceholder}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.productImage}
              contentFit="cover"
              transition={150}
              cachePolicy="memory-disk"
              recyclingKey={item._id}
            />
          ) : (
            <View style={styles.initialsBox}>
              <Text style={styles.cardImgText}>{safeName.charAt(0).toUpperCase()}</Text>
            </View>
          )}

          <View style={[styles.stockBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.stockBadgeText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.gridBody}>
          <Text style={styles.cardName} numberOfLines={2}>
            {safeName}
          </Text>

          <View style={styles.gridFooter}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Text style={styles.cardPrice} numberOfLines={1}>
                {formatCurrency(item.price)}
              </Text>
              {item.unit ? <Text style={styles.cardUnit}>/{item.unit}</Text> : null}
            </View>

            <TouchableOpacity
              style={[
                styles.addBtn,
                isOutOfStock && styles.addBtnDisabled,
                qtyInCart > 0 && styles.addBtnActive,
              ]}
              onPress={() => onAddToCart(item)}
              activeOpacity={0.7}
              disabled={isOutOfStock}
            >
              {qtyInCart > 0 ? (
                <Text style={styles.addBtnQtyText}>{qtyInCart}</Text>
              ) : (
                <Plus size={18} color={isOutOfStock ? colors.subText : colors.primary} strokeWidth={2.6} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  },
  (prev, next) =>
    prev.item._id === next.item._id &&
    prev.item.price === next.item.price &&
    prev.item.stock === next.item.stock &&
    prev.item.imageUrl === next.item.imageUrl &&
    prev.qtyInCart === next.qtyInCart
);

export default function PosScreen({ navigation, route }: any) {
  const { colors, isDark } = React.useContext(ThemeContext);
  const { user, isAdmin, isCashier, sellerName } = React.useContext(AuthContext);
  const styles = createStyles(colors, isDark);
  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);

  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [cartVisible, setCartVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [editPriceModalVisible, setEditPriceModalVisible] = useState(false);
  const [editingCartItem, setEditingCartItem] = useState<any>(null);
  const [newPrice, setNewPrice] = useState('');

  // Cash payment calculation state
  const [customerCash, setCustomerCash] = useState<number | null>(null);

  // Animated Floating Cart Bar
  const floatingBarY = useRef(new Animated.Value(100)).current;
  const cartBounce = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      fetchData(1, true);
    }, [])
  );

  useEffect(() => {
    socket.on('product_changed', () => fetchData(1, true));
    socket.on('category_changed', () => fetchData(1, true));
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      if (state.isConnected) fetchData(1, true);
    });
    return () => {
      socket.off('product_changed');
      socket.off('category_changed');
      unsubscribeNet();
    };
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData(1, true);
    }, 350);
    return () => clearTimeout(delayDebounceFn);
  }, [searchText, selectedCat]);

  // Optimized pagination: fetch 16 items per page instead of 50 to conserve memory
  const fetchData = async (pageNumber = 1, isReset = false) => {
    if (isReset && !refreshing) setInitialLoading(true);
    try {
      const [prodsRes, cats] = await Promise.all([
        getProducts(pageNumber, 16, searchText, selectedCat),
        getCategories(),
      ]);
      const newData = prodsRes?.data || [];
      if (isReset) {
        setProducts(newData);
      } else {
        setProducts((prev) => [...prev, ...newData]);
      }

      setPage(prodsRes?.page || 1);
      setTotalPages(prodsRes?.totalPages || 1);

      if (isReset) {
        setCategories([{ _id: null, name: 'Tất cả' }, ...(Array.isArray(cats) ? cats : [])]);
      }
    } catch (e) {
      console.log('Lỗi tải dữ liệu POS', e);
    } finally {
      setInitialLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = async () => {
    if (page < totalPages && !loadingMore) {
      setLoadingMore(true);
      await fetchData(page + 1, false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(1, true);
    setRefreshing(false);
  };

  // Safe barcode scanner integration
  useEffect(() => {
    if (route.params?.scannedSku && route.params?.timestamp) {
      const sku = route.params.scannedSku;
      const action = route.params.scannerAction;

      if (action === 'addToCart') {
        const foundProduct = products.find((p) => p.sku === sku);
        if (foundProduct) {
          addToCart(foundProduct);
        } else {
          Alert.alert('Không tìm thấy', `Mã vạch "${sku}" chưa có trong danh sách.`);
        }
      } else if (action === 'search') {
        setSearchText(sku);
      }

      navigation.setParams({ scannedSku: null, scannerAction: null, timestamp: null });
    }
  }, [route.params?.timestamp]);

  const triggerCartBounce = () => {
    Animated.sequence([
      Animated.timing(cartBounce, { toValue: 1.25, duration: 120, useNativeDriver: true }),
      Animated.spring(cartBounce, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
    ]).start();
  };

  const addToCart = useCallback((product: any) => {
    if (!product || !product._id) return;
    const currentStock = Number(product.stock) || 0;
    if (currentStock <= 0) {
      Alert.alert('Cảnh báo kho', 'Sản phẩm này hiện đã hết hàng trong kho!');
      return;
    }

    triggerCartBounce();

    setCart((curr) => {
      const existing = curr.find((i) => i._id === product._id);
      if (existing) {
        if (existing.quantity >= currentStock) {
          Alert.alert('Tồn kho không đủ', `Kho chỉ còn ${currentStock} ${product.unit || 'món'}.`);
          return curr;
        }
        return curr.map((i) => (i._id === product._id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...curr, { ...product, quantity: 1, price: Number(product.price) || 0 }];
    });
  }, []);

  const decreaseQuantity = (productId: string) => {
    setCart((curr) => {
      const existing = curr.find((i) => i._id === productId);
      if (!existing) return curr;
      if (existing.quantity <= 1) {
        return curr.filter((i) => i._id !== productId);
      }
      return curr.map((i) => (i._id === productId ? { ...i, quantity: i.quantity - 1 } : i));
    });
  };

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0);
  }, [cart]);

  const totalQuantity = useMemo(() => {
    return cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }, [cart]);

  // Animate floating cart strip in/out
  useEffect(() => {
    if (cart.length > 0) {
      Animated.spring(floatingBarY, {
        toValue: 0,
        tension: 80,
        friction: 9,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(floatingBarY, {
        toValue: 120,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [cart.length]);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setCartVisible(false);

    Alert.alert(
      'Xác nhận thanh toán',
      `Người bán: ${sellerName}\nKhách thanh toán: ${formatCurrency(totalAmount)}\nSố lượng: ${totalQuantity} món`,
      [
        { text: 'Kiểm tra lại', style: 'cancel', onPress: () => setCartVisible(true) },
        {
          text: 'Thanh toán & Xuất hóa đơn',
          onPress: async () => {
            try {
              const invoiceId = await createInvoice(cart, totalAmount, sellerName);
              await printReceipt({
                invoiceId: invoiceId,
                totalAmount: totalAmount,
                sellerName: sellerName,
                items: cart,
              });
              setCart([]);
              setCustomerCash(null);
              fetchData(1, true);
              Alert.alert('Thành công', `Đơn hàng đã được thanh toán bởi: ${sellerName}`);
            } catch (e) {
              Alert.alert('Lỗi giao dịch', 'Có lỗi xảy ra khi tạo hóa đơn. Vui lòng thử lại!');
            }
          },
        },
      ]
    );
  };

  const clearCart = () => {
    Alert.alert('Xóa giỏ hàng', 'Bạn có chắc muốn xóa tất cả sản phẩm đang chọn trong giỏ?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa toàn bộ',
        style: 'destructive',
        onPress: () => {
          setCart([]);
          setCartVisible(false);
          setCustomerCash(null);
        },
      },
    ]);
  };

  const openEditPrice = (item: any) => {
    // Permission check: only admin can edit prices on the fly
    if (!isAdmin) {
      Alert.alert(
        'Quyền hạn bị giới hạn',
        'Thu ngân không có quyền tự ý sửa giá bán tại quầy. Vui lòng liên hệ Chủ cửa hàng (Admin)!'
      );
      return;
    }
    setEditingCartItem(item);
    setNewPrice(String(item.price || 0));
    setEditPriceModalVisible(true);
  };

  const saveNewPrice = () => {
    if (!editingCartItem) return;
    const parsed = parseInt(newPrice, 10);
    if (isNaN(parsed) || parsed < 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập giá bán hợp lệ!');
      return;
    }
    setCart((curr) =>
      curr.map((i) => (i._id === editingCartItem._id ? { ...i, price: parsed } : i))
    );
    setEditPriceModalVisible(false);
  };

  const cashSuggestions = [totalAmount, 50000, 100000, 200000, 500000].filter(
    (val, idx, self) => val >= totalAmount && self.indexOf(val) === idx
  );

  const cartMap = useMemo(() => {
    const map = new Map<string, number>();
    cart.forEach((c) => map.set(c._id, c.quantity));
    return map;
  }, [cart]);

  const renderProductItem = useCallback(
    ({ item }: { item: any }) => {
      const qty = cartMap.get(item._id) || 0;
      return (
        <ProductGridCard
          item={item}
          qtyInCart={qty}
          onAddToCart={addToCart}
          colors={colors}
          styles={styles}
        />
      );
    },
    [cartMap, addToCart, colors, styles]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* POS Top Bar */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.headerGreeting}>{formatPosHeader()}</Text>
            <View style={[styles.userBadge, isAdmin ? styles.adminBadge : styles.cashierBadge]}>
              <UserCheck size={11} color={isAdmin ? colors.primary : colors.secondary} strokeWidth={2.5} />
              <Text style={[styles.userBadgeText, { color: isAdmin ? colors.primary : colors.secondary }]}>
                {sellerName}
              </Text>
            </View>
          </View>
          <Text style={styles.headerTitle}>Bán hàng tại quầy</Text>
        </View>

        <TouchableOpacity
          style={styles.headerAvatar}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('More')}
        >
          <Store size={22} color={colors.primary} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={{ paddingHorizontal: SPACING, marginBottom: 12 }}>
        <GlobalSearchBar
          placeholder="Tìm tên sản phẩm hoặc mã vạch..."
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Category Ribbon */}
      <View style={{ marginBottom: 10 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(i, index) => (i?._id ? String(i._id) : `cat-${index}`)}
          contentContainerStyle={{ paddingHorizontal: SPACING }}
          renderItem={({ item }) => {
            const isSelected = selectedCat === item._id;
            return (
              <TouchableOpacity
                style={[styles.catChip, isSelected && styles.catChipActive]}
                onPress={() => setSelectedCat(item._id)}
                activeOpacity={0.7}
              >
                <Layers
                  size={14}
                  color={isSelected ? 'white' : colors.subText}
                  strokeWidth={2.2}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.catChipText, isSelected && styles.catChipTextActive]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Product Grid / Skeleton */}
      {initialLoading ? (
        <View style={styles.skeletonContainer}>
          <SkeletonGridCard colors={colors} styles={styles} />
          <SkeletonGridCard colors={colors} styles={styles} />
          <SkeletonGridCard colors={colors} styles={styles} />
          <SkeletonGridCard colors={colors} styles={styles} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item, index) => (item?._id ? String(item._id) : `prod-${index}`)}
          numColumns={2}
          contentContainerStyle={{
            paddingHorizontal: SPACING,
            paddingBottom: cart.length > 0 ? 180 : 120,
          }}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          showsVerticalScrollIndicator={false}
          // High-performance virtualization properties to eliminate lag & OOM crashes
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={3}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ margin: 16 }} />
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <PackageOpen size={48} color={colors.subText} strokeWidth={1.8} style={{ opacity: 0.6, marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>Không tìm thấy sản phẩm</Text>
              <Text style={styles.emptySub}>Thử tìm kiếm với từ khóa khác hoặc quét mã vạch</Text>
            </View>
          }
          renderItem={renderProductItem}
        />
      )}

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <Animated.View
          style={[
            styles.floatingCartContainer,
            {
              transform: [{ translateY: floatingBarY }],
              bottom: Platform.OS === 'android' ? 104 + insets.bottom : 116 + insets.bottom,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.floatingCartBar}
            activeOpacity={0.9}
            onPress={() => setCartVisible(true)}
          >
            <View style={styles.floatingCartLeft}>
              <Animated.View style={[styles.cartIconBadgeBox, { transform: [{ scale: cartBounce }] }]}>
                <ShoppingCart size={22} color="white" strokeWidth={2.4} />
                <View style={styles.cartCountPill}>
                  <Text style={styles.cartCountText}>{totalQuantity}</Text>
                </View>
              </Animated.View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.floatingTotalAmount}>{formatCurrency(totalAmount)}</Text>
                <Text style={styles.floatingItemCount}>{totalQuantity} sản phẩm trong giỏ</Text>
              </View>
            </View>

            <View style={styles.floatingCartRight}>
              <Text style={styles.floatingCheckoutText}>Xem giỏ</Text>
              <ArrowRight size={18} color="white" strokeWidth={2.5} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Cart Modal - CENTER DISPLAY MODAL */}
      <Modal
        visible={cartVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCartVisible(false)}
      >
        <View style={[styles.modalCenterOverlay, { paddingBottom: (Platform.OS === 'android' ? 150 : 170) + insets.bottom }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setCartVisible(false)}
          />
          <View style={styles.modalCenterCard}>
            {/* Cart Header */}
            <View style={styles.cartHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ShoppingCart size={22} color={colors.primary} strokeWidth={2.4} />
                <Text style={styles.cartSheetTitle}>Đơn hàng ({totalQuantity})</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={clearCart} style={styles.clearCartBtn}>
                  <Trash2 size={16} color={colors.danger} strokeWidth={2.2} />
                  <Text style={styles.clearCartText}>Xóa giỏ</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCartVisible(false)} style={styles.closeSheetBtn}>
                  <X size={20} color={colors.text} strokeWidth={2.4} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Seller info pill */}
            <View style={styles.sellerBanner}>
              <UserCheck size={14} color={colors.primary} strokeWidth={2.2} />
              <Text style={styles.sellerBannerText}>Thu ngân chốt đơn: {sellerName}</Text>
            </View>

            {/* Cart Item List */}
            <ScrollView style={styles.cartItemList} showsVerticalScrollIndicator={false}>
              {cart.map((item) => (
                <View key={item._id} style={styles.cartItemRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.cartItemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <Text style={styles.cartItemPrice}>{formatCurrency(item.price)}</Text>
                      {item.unit ? <Text style={styles.cartItemUnit}> / {item.unit}</Text> : null}

                      {isAdmin ? (
                        <TouchableOpacity
                          onPress={() => openEditPrice(item)}
                          style={styles.editPriceBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Pencil size={12} color={colors.primary} strokeWidth={2.2} />
                        </TouchableOpacity>
                      ) : (
                        <View style={{ marginLeft: 6, opacity: 0.5 }}>
                          <Lock size={12} color={colors.subText} />
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Quantity Stepper */}
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => decreaseQuantity(item._id)}
                      activeOpacity={0.7}
                    >
                      <Minus size={15} color={colors.text} strokeWidth={2.4} />
                    </TouchableOpacity>
                    <Text style={styles.stepValue}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => addToCart(item)}
                      activeOpacity={0.7}
                    >
                      <Plus size={15} color={colors.text} strokeWidth={2.4} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.cartItemTotal}>
                    {formatCurrency(item.price * item.quantity)}
                  </Text>
                </View>
              ))}

              {/* Quick Cash Suggestions */}
              <View style={styles.cashSection}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Banknote size={16} color={colors.secondary} strokeWidth={2.2} />
                  <Text style={styles.cashSectionTitle}>Tiền khách đưa (gợi ý nhanh):</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {cashSuggestions.map((cashVal) => {
                    const isSelected = customerCash === cashVal;
                    return (
                      <TouchableOpacity
                        key={cashVal}
                        style={[styles.cashChip, isSelected && styles.cashChipActive]}
                        onPress={() => setCustomerCash(cashVal)}
                      >
                        <Text style={[styles.cashChipText, isSelected && styles.cashChipTextActive]}>
                          {cashVal === totalAmount ? 'Đủ tiền' : formatCurrency(cashVal)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {customerCash !== null && customerCash >= totalAmount && (
                  <View style={styles.changeDueRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Coins size={16} color={colors.success} strokeWidth={2.2} />
                      <Text style={styles.changeDueLabel}>Tiền thối lại khách:</Text>
                    </View>
                    <Text style={styles.changeDueValue}>
                      {formatCurrency(customerCash - totalAmount)}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Total Summary & Checkout Button */}
            <View style={styles.sheetFooter}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tổng thanh toán:</Text>
                <Text style={styles.summaryTotalVal}>{formatCurrency(totalAmount)}</Text>
              </View>

              <TouchableOpacity
                style={styles.checkoutBtn}
                onPress={handleCheckout}
                activeOpacity={0.85}
              >
                <Printer size={20} color="white" strokeWidth={2.4} style={{ marginRight: 8 }} />
                <Text style={styles.checkoutBtnText}>Xác nhận & In hóa đơn</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Price Modal - CENTER DISPLAY MODAL */}
      <Modal
        visible={editPriceModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditPriceModalVisible(false)}
      >
        <View style={[styles.modalCenterOverlay, { paddingBottom: (Platform.OS === 'android' ? 150 : 170) + insets.bottom }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setEditPriceModalVisible(false)}
          />
          <View style={styles.editPriceCard}>
            <Text style={styles.editPriceTitle}>Sửa giá bán đơn hàng (Quyền Admin)</Text>
            <Text style={styles.editPriceProdName}>{editingCartItem?.name}</Text>

            <TextInput
              style={styles.priceInput}
              keyboardType="numeric"
              value={newPrice}
              onChangeText={setNewPrice}
              placeholder="Nhập giá mới..."
              placeholderTextColor={colors.subText}
              autoFocus={true}
              selectionColor={colors.primary}
            />

            <View style={styles.editPriceBtnRow}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setEditPriceModalVisible(false)}
              >
                <Text style={styles.cancelModalBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveModalBtn} onPress={saveNewPrice}>
                <Text style={styles.saveModalBtnText}>Lưu giá mới</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING,
      paddingTop: 8,
      paddingBottom: 12,
    },
    headerGreeting: {
      fontSize: 12,
      fontFamily: FONTS.medium,
      color: colors.subText,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginRight: 8,
    },
    userBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    adminBadge: {
      backgroundColor: colors.primaryLight,
    },
    cashierBadge: {
      backgroundColor: colors.secondaryLight,
    },
    userBadgeText: {
      fontSize: 11,
      fontFamily: FONTS.bold,
      marginLeft: 4,
    },
    headerTitle: {
      fontSize: 22,
      fontFamily: FONTS.bold,
      color: colors.text,
      marginTop: 2,
    },
    headerAvatar: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    catChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.card,
      marginRight: 8,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    catChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    catChipText: {
      fontSize: 13,
      fontFamily: FONTS.medium,
      color: colors.subText,
    },
    catChipTextActive: {
      color: 'white',
      fontFamily: FONTS.bold,
    },
    skeletonContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING,
    },
    gridCard: {
      width: CARD_WIDTH,
      backgroundColor: colors.card,
      borderRadius: 16,
      marginBottom: 14,
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      overflow: 'hidden',
      ...SHADOWS.soft,
    },
    gridCardSelected: {
      borderColor: colors.primary,
      backgroundColor: isDark ? '#192642' : '#F4F7FF',
    },
    gridImgPlaceholder: {
      width: '100%',
      height: CARD_WIDTH * 0.72,
      backgroundColor: isDark ? '#182438' : '#F1F5F9',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    productImage: {
      width: '100%',
      height: '100%',
    },
    initialsBox: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardImgText: {
      fontSize: 22,
      fontFamily: FONTS.bold,
      color: colors.primary,
    },
    stockBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    stockBadgeText: {
      fontSize: 11,
      fontFamily: FONTS.bold,
    },
    gridBody: {
      padding: 10,
    },
    cardName: {
      fontSize: 13,
      fontFamily: FONTS.semiBold,
      color: colors.text,
      lineHeight: 18,
      minHeight: 36,
    },
    gridFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    cardPrice: {
      fontSize: 14,
      fontFamily: FONTS.bold,
      color: colors.primary,
    },
    cardUnit: {
      fontSize: 11,
      fontFamily: FONTS.regular,
      color: colors.subText,
    },
    addBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'transparent' : colors.primaryMedium,
    },
    addBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    addBtnDisabled: {
      opacity: 0.4,
    },
    addBtnQtyText: {
      color: 'white',
      fontFamily: FONTS.bold,
      fontSize: 13,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyTitle: {
      fontSize: 16,
      fontFamily: FONTS.bold,
      color: colors.text,
      marginBottom: 4,
    },
    emptySub: {
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: colors.subText,
      textAlign: 'center',
      maxWidth: 260,
    },
    floatingCartContainer: {
      position: 'absolute',
      left: SPACING,
      right: SPACING,
      zIndex: 999,
    },
    floatingCartBar: {
      backgroundColor: colors.primary,
      borderRadius: 18,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      ...SHADOWS.float,
    },
    floatingCartLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    cartIconBadgeBox: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    cartCountPill: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: colors.warning,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 10,
    },
    cartCountText: {
      color: '#0F172A',
      fontFamily: FONTS.bold,
      fontSize: 11,
    },
    floatingTotalAmount: {
      color: 'white',
      fontSize: 16,
      fontFamily: FONTS.bold,
    },
    floatingItemCount: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 11,
      fontFamily: FONTS.medium,
    },
    floatingCartRight: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.18)',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
    },
    floatingCheckoutText: {
      color: 'white',
      fontFamily: FONTS.bold,
      fontSize: 13,
      marginRight: 6,
    },
    // CENTER DIALOG STYLING
    modalCenterOverlay: {
      flex: 1,
      backgroundColor: colors.modalOverlay,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: Platform.OS === 'android' ? 140 : 160,
    },
    modalCenterCard: {
      width: '100%',
      maxWidth: 440,
      backgroundColor: colors.card,
      borderRadius: 24,
      maxHeight: '60%',
      paddingHorizontal: SPACING,
      paddingVertical: 14,
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      ...SHADOWS.float,
    },
    cartHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderColor,
    },
    sellerBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      marginTop: 8,
    },
    sellerBannerText: {
      fontSize: 12,
      fontFamily: FONTS.semiBold,
      color: colors.primary,
      marginLeft: 6,
    },
    cartSheetTitle: {
      fontSize: 17,
      fontFamily: FONTS.bold,
      color: colors.text,
      marginLeft: 8,
    },
    clearCartBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor: colors.dangerLight,
      marginRight: 10,
    },
    clearCartText: {
      fontSize: 12,
      fontFamily: FONTS.semiBold,
      color: colors.danger,
      marginLeft: 4,
    },
    closeSheetBtn: {
      padding: 6,
      borderRadius: 10,
      backgroundColor: colors.cardSecondary,
    },
    cartItemList: {
      maxHeight: 160,
      marginTop: 8,
    },
    cartItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderColor,
    },
    cartItemName: {
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: colors.text,
    },
    cartItemPrice: {
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: colors.subText,
    },
    cartItemUnit: {
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: colors.subText,
    },
    editPriceBtn: {
      marginLeft: 6,
      padding: 3,
    },
    stepperContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardSecondary,
      borderRadius: 10,
      padding: 3,
      marginRight: 10,
    },
    stepBtn: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepValue: {
      fontSize: 13,
      fontFamily: FONTS.bold,
      color: colors.text,
      paddingHorizontal: 8,
    },
    cartItemTotal: {
      fontSize: 13,
      fontFamily: FONTS.bold,
      color: colors.primary,
      width: 72,
      textAlign: 'right',
    },
    cashSection: {
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.borderColor,
    },
    cashSectionTitle: {
      fontSize: 12,
      fontFamily: FONTS.medium,
      color: colors.subText,
      marginLeft: 6,
    },
    cashChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 12,
      backgroundColor: colors.cardSecondary,
      marginRight: 8,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    cashChipActive: {
      backgroundColor: colors.secondaryLight,
      borderColor: colors.secondary,
    },
    cashChipText: {
      fontSize: 12,
      fontFamily: FONTS.medium,
      color: colors.text,
    },
    cashChipTextActive: {
      color: colors.secondaryDark || colors.secondary,
      fontFamily: FONTS.bold,
    },
    changeDueRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.successLight,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      marginTop: 10,
    },
    changeDueLabel: {
      fontSize: 12,
      fontFamily: FONTS.medium,
      color: colors.success,
      marginLeft: 6,
    },
    changeDueValue: {
      fontSize: 14,
      fontFamily: FONTS.bold,
      color: colors.success,
    },
    sheetFooter: {
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.borderColor,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    summaryLabel: {
      fontSize: 14,
      fontFamily: FONTS.medium,
      color: colors.subText,
    },
    summaryTotalVal: {
      fontSize: 18,
      fontFamily: FONTS.bold,
      color: colors.primary,
    },
    checkoutBtn: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingVertical: 12,
      borderRadius: 14,
      ...SHADOWS.soft,
    },
    checkoutBtnText: {
      color: 'white',
      fontFamily: FONTS.bold,
      fontSize: 14,
    },
    editPriceCard: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      ...SHADOWS.card,
    },
    editPriceTitle: {
      fontSize: 16,
      fontFamily: FONTS.bold,
      color: colors.text,
    },
    editPriceProdName: {
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: colors.subText,
      marginTop: 4,
      marginBottom: 14,
    },
    priceInput: {
      backgroundColor: colors.inputBg,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 16,
      fontFamily: FONTS.bold,
      color: colors.text,
      marginBottom: 16,
    },
    editPriceBtnRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    cancelModalBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.cardSecondary,
      marginRight: 10,
    },
    cancelModalBtnText: {
      fontSize: 13,
      fontFamily: FONTS.medium,
      color: colors.text,
    },
    saveModalBtn: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.primary,
    },
    saveModalBtnText: {
      fontSize: 13,
      fontFamily: FONTS.bold,
      color: 'white',
    },
  });