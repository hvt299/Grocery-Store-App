import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, Modal, TextInput, RefreshControl, Image, KeyboardAvoidingView, Platform, Dimensions, Animated
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { StatusBar } from 'expo-status-bar';

import { Store, ShoppingCart, X, Plus, Minus, Pencil } from 'lucide-react-native';

import { getProducts, getCategories, createInvoice } from '../services/productService';
import { printReceipt } from '../services/printerService';
import { formatCurrency, formatPosHeader } from '../utils/format';
import { socket } from '../lib/socket';
import { SPACING } from '../constants/theme';
import { ThemeContext } from '../context/ThemeContext';
import GlobalSearchBar from '../components/GlobalSearchBar';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING * 3) / 2;

const SkeletonGridCard = ({ colors, styles }: any) => {
  const fadeAnim = React.useRef(new Animated.Value(0.3)).current;
  React.useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0.3, duration: 800, useNativeDriver: true })
    ])).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.gridCard, { opacity: fadeAnim, marginBottom: 15 }]}>
      <View style={styles.gridImgPlaceholder} />
      <View style={styles.gridBody}>
        <View style={{ width: '80%', height: 14, backgroundColor: colors.borderColor, borderRadius: 4, marginBottom: 8 }} />
        <View style={{ width: '50%', height: 14, backgroundColor: colors.borderColor, borderRadius: 4, marginBottom: 12 }} />
        <View style={styles.gridFooter}>
          <View style={{ width: 60, height: 16, backgroundColor: colors.borderColor, borderRadius: 4 }} />
          <View style={{ width: 32, height: 32, backgroundColor: colors.borderColor, borderRadius: 10 }} />
        </View>
      </View>
    </Animated.View>
  );
};

export default function PosScreen({ navigation, route }: any) {
  const { colors, isDark } = React.useContext(ThemeContext);
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

  const [editPriceModalVisible, setEditPriceModalVisible] = useState(false);
  const [editingCartItem, setEditingCartItem] = useState<any>(null);
  const [newPrice, setNewPrice] = useState('');

  useFocusEffect(React.useCallback(() => { fetchData(1, true); }, []));

  useEffect(() => {
    socket.on('product_changed', () => fetchData(1, true));
    socket.on('category_changed', () => fetchData(1, true));
    const unsubscribeNet = NetInfo.addEventListener(state => { if (state.isConnected) fetchData(1, true); });
    return () => { socket.off('product_changed'); socket.off('category_changed'); unsubscribeNet(); };
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => { fetchData(1, true); }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchText, selectedCat]);

  const fetchData = async (page = 1, isReset = false) => {
    if (isReset && !refreshing) setInitialLoading(true);
    try {
      const [prodsRes, cats] = await Promise.all([getProducts(page, 50, searchText, selectedCat), getCategories()]);
      const newData = prodsRes.data || [];
      if (isReset) { setProducts(newData); } else { setProducts(prev => [...prev, ...newData]); }
      if (isReset) { setCategories([{ _id: null, name: 'Tất cả' }, ...cats]); }
    } catch (e) { console.log('Lỗi tải dữ liệu'); }
    finally { setInitialLoading(false); }
  };

  const onRefresh = async () => { setRefreshing(true); await fetchData(1, true); setRefreshing(false); };

  useEffect(() => {
    if (route.params?.scannedSku && route.params?.timestamp) {
      const sku = route.params.scannedSku;
      const action = route.params.scannerAction;

      if (action === 'addToCart') {
        const foundProduct = products.find(p => p.sku === sku);
        if (foundProduct) {
          addToCart(foundProduct);
        } else {
          Alert.alert('Không tìm thấy', `Mã vạch ${sku} chưa có trong kho.`);
        }
      } else if (action === 'search') {
        setSearchText(sku);
      }

      navigation.setParams({ scannedSku: null, scannerAction: null, timestamp: null });
    }
  }, [route.params?.timestamp, products]);

  const addToCart = (product: any) => {
    if (product.stock <= 0) { Alert.alert('Cảnh báo', 'Sản phẩm này đã hết hàng!'); return; }
    setCart(curr => {
      const existing = curr.find(i => i._id === product._id);
      if (existing) {
        if (existing.quantity >= product.stock) { Alert.alert('Kho không đủ', `Chỉ còn ${product.stock} ${product.unit} trong kho.`); return curr; }
        return curr.map(i => i._id === product._id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...curr, { ...product, quantity: 1 }];
    });
  };

  const decreaseQuantity = (productId: string) => {
    setCart(curr => {
      const existing = curr.find(i => i._id === productId);
      if (existing?.quantity === 1) return curr.filter(i => i._id !== productId);
      return curr.map(i => i._id === productId ? { ...i, quantity: i.quantity - 1 } : i);
    });
  };

  const totalAmount = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);
  const totalQuantity = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setCartVisible(false);
    Alert.alert('Xác nhận thanh toán?', `Tổng: ${formatCurrency(totalAmount)}`, [
      { text: 'Hủy', style: 'cancel', onPress: () => setCartVisible(true) },
      {
        text: 'OK', onPress: async () => {
          try {
            const invoiceId = await createInvoice(cart, totalAmount);

            await printReceipt({
              invoiceId: invoiceId,
              totalAmount: totalAmount,
              items: cart
            });

            setCart([]);
            fetchData(1, true);
          }
          catch (e) { Alert.alert("Lỗi", "Có lỗi xảy ra khi thanh toán."); }
        }
      }
    ]);
  };

  const clearCart = () => {
    Alert.alert('Xóa giỏ hàng', 'Bạn có chắc chắn muốn xóa toàn bộ sản phẩm trong giỏ?', [
      { text: 'Không', style: 'cancel' },
      { text: 'Xóa sạch', style: 'destructive', onPress: () => setCart([]) }
    ]);
  };

  const openEditPrice = (item: any) => { setEditingCartItem(item); setNewPrice(item.price.toString()); setEditPriceModalVisible(true); };
  const saveNewPrice = () => {
    if (!editingCartItem || !newPrice) return;
    setCart(curr => curr.map(i => i._id === editingCartItem._id ? { ...i, price: parseInt(newPrice) } : i));
    setEditPriceModalVisible(false);
  };

  const getStockColor = (stock: number) => {
    if (stock <= 0) return colors.danger;
    if (stock <= 10) return '#FF9500';
    return colors.success;
  };

  const renderProduct = ({ item }: { item: any }) => {
    const qtyInCart = cart.find(c => c._id === item._id)?.quantity || 0;
    const isOutOfStock = item.stock <= 0;

    return (
      <TouchableOpacity
        style={styles.gridCard}
        activeOpacity={0.7}
        onPress={() => addToCart(item)}
      >
        <View style={styles.gridImgPlaceholder}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <Text style={styles.cardImgText}>{item.name.charAt(0).toUpperCase()}</Text>
          )}
          {/* Badge Tồn kho đè lên ảnh */}
          <View style={[styles.stockBadge, { backgroundColor: getStockColor(item.stock) }]}>
            <Text style={styles.stockBadgeText}>{isOutOfStock ? 'Hết' : item.stock}</Text>
          </View>
        </View>

        <View style={styles.gridBody}>
          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.gridFooter}>
            <Text style={styles.cardPrice}>{formatCurrency(item.price)}</Text>

            <View style={[styles.addBtn, isOutOfStock && styles.addBtnDisabled, qtyInCart > 0 && styles.addBtnActive]}>
              {qtyInCart > 0 ? (
                <Text style={{ color: 'white', fontWeight: 'bold' }}>{qtyInCart}</Text>
              ) : (
                <Plus size={18} color={isOutOfStock ? colors.subText : colors.primary} strokeWidth={3} />
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>
            {formatPosHeader()}
          </Text>

          <Text style={styles.headerTitle}>
            Bán hàng tại quầy
          </Text>
        </View>
        <TouchableOpacity style={styles.headerAvatar}>
          <Store size={24} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: SPACING, marginBottom: 15 }}>
        <GlobalSearchBar
          placeholder="Tìm tên, mã vạch..."
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <View style={{ paddingHorizontal: SPACING, marginBottom: 15 }}>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={categories} keyExtractor={i => i._id ? i._id.toString() : 'all'}
          renderItem={({ item }) => {
            const isSelected = selectedCat === item._id;
            return (
              <TouchableOpacity style={[styles.catChip, isSelected && styles.catChipActive]} onPress={() => setSelectedCat(item._id)}>
                <Text style={[styles.catChipText, isSelected && styles.catChipTextActive]}>{item.name || 'Chưa phân loại'}</Text>
              </TouchableOpacity>
            )
          }}
        />
      </View>

      {/* CHUYỂN SANG DẠNG LƯỚI 2 CỘT */}
      {initialLoading ? (
        <View style={{ paddingHorizontal: SPACING, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <SkeletonGridCard colors={colors} styles={styles} />
          <SkeletonGridCard colors={colors} styles={styles} />
          <SkeletonGridCard colors={colors} styles={styles} />
          <SkeletonGridCard colors={colors} styles={styles} />
          <SkeletonGridCard colors={colors} styles={styles} />
          <SkeletonGridCard colors={colors} styles={styles} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={i => i._id.toString()}
          renderItem={renderProduct}
          numColumns={2}
          columnWrapperStyle={styles.rowWrapper}
          contentContainerStyle={{ paddingHorizontal: SPACING, paddingBottom: 180 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 50, color: colors.subText }}>Không tìm thấy sản phẩm</Text>}
        />
      )}

      {/* THANH GIỎ HÀNG */}
      {cart.length > 0 && (
        <View style={[styles.checkoutBarWrapper, { bottom: insets.bottom + 100 }
        ]}>
          <TouchableOpacity style={styles.checkoutBar} onPress={() => setCartVisible(true)} activeOpacity={0.9}>
            <View style={styles.checkoutBarLeft}>
              <View style={styles.checkoutIcon}>
                <ShoppingCart size={20} color={colors.primary} strokeWidth={2.5} />
                <View style={styles.checkoutBadge}><Text style={styles.checkoutBadgeText}>{totalQuantity}</Text></View>
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.checkoutTotalLabel}>Tổng thanh toán</Text>
                <Text style={styles.checkoutTotalAmount}>{formatCurrency(totalAmount)}</Text>
              </View>
            </View>
            <View style={styles.checkoutBarRight}>
              <Text style={styles.checkoutBtnText}>Xem giỏ</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL GIỎ HÀNG (BILL) */}
      <Modal visible={cartVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlayCart}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setCartVisible(false)} />
          <View style={styles.modalContentCart}>
            <View style={styles.modalHeaderCart}>
              <Text style={styles.modalTitleCart}>Giỏ hàng ({totalQuantity})</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {cart.length > 0 && (
                  <TouchableOpacity onPress={clearCart} style={{ marginRight: 15 }}>
                    <Text style={{ color: colors.danger, fontWeight: 'bold' }}>Xóa sạch</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setCartVisible(false)}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <FlatList
              data={cart}
              keyExtractor={item => item._id.toString()}
              contentContainerStyle={[{ padding: SPACING, flexGrow: 1 }, cart.length === 0 && { justifyContent: 'center' }]}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                  <ShoppingCart size={40} color={colors.subText} style={{ opacity: 0.5, marginBottom: 15 }} />
                  <Text style={{ fontSize: 16, color: colors.subText, fontStyle: 'italic' }}>Giỏ hàng của bạn đang trống</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={styles.cartItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 6 }}>{item.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity onPress={() => openEditPrice(item)}>
                        <Text style={{ color: colors.subText, fontSize: 14 }}>
                          {formatCurrency(item.price)} <Pencil size={12} color={colors.subText} />
                        </Text>
                      </TouchableOpacity>
                      <Text style={{ color: colors.subText, fontSize: 14 }}>  x  {item.quantity}  =  </Text>
                      <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 15 }}>
                        {formatCurrency(item.price * item.quantity)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cartActions}>
                    <TouchableOpacity onPress={() => decreaseQuantity(item._id)} style={styles.qtyBtn}><Minus size={20} color={colors.text} /></TouchableOpacity>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <TouchableOpacity onPress={() => addToCart(item)} style={styles.qtyBtn}><Plus size={20} color={colors.text} /></TouchableOpacity>
                  </View>
                </View>
              )}
            />

            <View style={[styles.modalFooterCart, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <TouchableOpacity
                style={[styles.checkoutBigBtn, cart.length === 0 && styles.checkoutBigBtnDisabled]}
                onPress={handleCheckout}
                disabled={cart.length === 0}
              >
                <Text style={styles.checkoutBigText}>
                  {cart.length === 0 ? 'GIỎ HÀNG TRỐNG' : `THANH TOÁN • ${formatCurrency(totalAmount)}`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL SỬA GIÁ */}
      <Modal visible={editPriceModalVisible} transparent={true} animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.editPriceOverlay}>
          <View style={styles.editPriceContent}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>Sửa giá bán</Text>
            <Text style={{ color: 'gray', marginBottom: 10 }}>{editingCartItem?.name}</Text>
            <TextInput style={styles.editPriceInput} keyboardType="numeric" value={newPrice} onChangeText={setNewPrice} autoFocus />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity style={styles.btnHuy} onPress={() => setEditPriceModalVisible(false)}><Text style={{ fontWeight: 'bold', color: 'gray' }}>Hủy</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnLưu} onPress={saveNewPrice}><Text style={{ fontWeight: 'bold', color: 'white' }}>Lưu giá</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING, paddingTop: 10, paddingBottom: 20 },
    headerGreeting: { fontSize: 14, color: colors.subText, marginBottom: 4 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
    headerAvatar: { width: 44, height: 44, backgroundColor: colors.primaryLight, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },

    catChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.card, marginRight: 10, borderWidth: 1, borderColor: colors.borderColor },
    catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    catChipText: { fontSize: 14, color: colors.subText, fontWeight: '600' },
    catChipTextActive: { color: 'white', fontWeight: '700' },

    rowWrapper: { justifyContent: 'space-between', marginBottom: 15 },
    gridCard: { width: CARD_WIDTH, backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden', shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
    gridImgPlaceholder: { width: '100%', height: CARD_WIDTH, backgroundColor: colors.borderColor, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    productImage: { width: '100%', height: '100%' },
    cardImgText: { fontSize: 32, fontWeight: 'bold', color: colors.subText },
    stockBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    stockBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

    gridBody: { padding: 12 },
    cardName: { fontSize: 14, fontWeight: '700', color: colors.text, height: 40, marginBottom: 8 },
    gridFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardPrice: { fontSize: 15, fontWeight: '900', color: colors.primary },

    addBtn: { width: 32, height: 32, backgroundColor: colors.primaryLight, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    addBtnDisabled: { backgroundColor: colors.inputBg },
    addBtnActive: { backgroundColor: colors.primary },

    checkoutBarWrapper: { position: 'absolute', left: SPACING, right: SPACING, zIndex: 10 },
    checkoutBar: { flexDirection: 'row', backgroundColor: colors.primary, borderRadius: 20, padding: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'space-between', shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
    checkoutBarLeft: { flexDirection: 'row', alignItems: 'center' },
    checkoutIcon: { width: 44, height: 44, backgroundColor: 'white', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    checkoutBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: colors.danger, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.primary },
    checkoutBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    checkoutTotalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
    checkoutTotalAmount: { color: 'white', fontSize: 18, fontWeight: '900', marginTop: 2 },
    checkoutBarRight: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
    checkoutBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

    modalOverlayCart: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContentCart: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
    modalHeaderCart: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    modalTitleCart: { fontSize: 20, fontWeight: '800', color: colors.text },
    cartItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    cartActions: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderRadius: 20, paddingHorizontal: 5, paddingVertical: 3 },
    qtyBtn: { padding: 5 },
    qtyValue: { width: 30, textAlign: 'center', fontWeight: 'bold', fontSize: 16, color: colors.text },
    modalFooterCart: { padding: 20, borderTopWidth: 1, borderTopColor: colors.borderColor },
    checkoutBigBtn: { backgroundColor: colors.primary, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
    checkoutBigBtnDisabled: { backgroundColor: colors.subText, shadowOpacity: 0 },
    checkoutBigText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

    editPriceOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    editPriceContent: { backgroundColor: colors.card, padding: 20, borderRadius: 16, width: '80%' },
    editPriceInput: { borderWidth: 1, borderColor: colors.borderColor, borderRadius: 10, padding: 12, fontSize: 18, marginBottom: 20, color: colors.text },
    btnHuy: { flex: 1, padding: 12, backgroundColor: colors.inputBg, borderRadius: 10, marginRight: 10, alignItems: 'center' },
    btnLưu: { flex: 1, padding: 12, backgroundColor: colors.primary, borderRadius: 10, marginLeft: 10, alignItems: 'center' }
  });
}