import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Platform,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { StatusBar } from 'expo-status-bar';
import {
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  ScanBarcode,
  Check,
  X,
  RefreshCw,
  PackageOpen,
  Tag,
  SlidersHorizontal,
  Lock,
} from 'lucide-react-native';

import {
  getProducts,
  getCategories,
  deleteProduct,
  addCategory,
  updateCategory,
  deleteCategory,
} from '../services/productService';
import { socket } from '../lib/socket';
import { formatCurrency } from '../utils/format';
import { SPACING, FONTS, SHADOWS } from '../constants/theme';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import GlobalSearchBar from '../components/GlobalSearchBar';

const SkeletonProductCard = ({ colors, styles }: any) => {
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
    <Animated.View style={[styles.itemCard, { opacity: fadeAnim }]}>
      <View style={styles.cardMainRow}>
        <View style={{ width: 64, height: 64, borderRadius: 14, backgroundColor: colors.borderColor }} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ width: '80%', height: 16, backgroundColor: colors.borderColor, borderRadius: 6, marginBottom: 8 }} />
          <View style={{ width: '50%', height: 12, backgroundColor: colors.borderColor, borderRadius: 6, marginBottom: 12 }} />
          <View style={{ width: 50, height: 14, backgroundColor: colors.borderColor, borderRadius: 6 }} />
        </View>
        <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
          <View style={{ width: 70, height: 18, backgroundColor: colors.borderColor, borderRadius: 6, marginBottom: 8 }} />
          <View style={{ width: 50, height: 12, backgroundColor: colors.borderColor, borderRadius: 6 }} />
        </View>
      </View>
      <View style={[styles.cardActionRow, { borderTopWidth: 1, borderTopColor: colors.borderColor, paddingTop: 10 }]}>
        <View style={{ width: 90, height: 24, backgroundColor: colors.borderColor, borderRadius: 8 }} />
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: 34, height: 34, backgroundColor: colors.borderColor, borderRadius: 10, marginRight: 8 }} />
          <View style={{ width: 34, height: 34, backgroundColor: colors.borderColor, borderRadius: 10 }} />
        </View>
      </View>
    </Animated.View>
  );
};

// Memoized Product Card with strict role checks (Cost price hidden from Cashier)
const ProductCard = React.memo(
  ({
    item,
    isAdmin,
    onEdit,
    onDelete,
    colors,
    styles,
  }: {
    item: any;
    isAdmin: boolean;
    onEdit: (item: any) => void;
    onDelete: (id: string) => void;
    colors: any;
    styles: any;
  }) => {
    const stock = Number(item?.stock) || 0;
    const price = Number(item?.price) || 0;
    const costPrice = Number(item?.costPrice) || 0;
    const safeName = item?.name || 'Sản phẩm';

    const getStockStatus = () => {
      if (stock <= 0) return { label: 'Hết hàng', color: colors.danger, bg: colors.dangerLight };
      if (stock <= 10)
        return { label: `Sắp hết: ${stock} ${item.unit || ''}`, color: colors.warning, bg: colors.warningLight };
      return { label: `Tồn kho: ${stock} ${item.unit || ''}`, color: colors.success, bg: colors.successLight };
    };

    const status = getStockStatus();

    return (
      <View style={styles.itemCard}>
        <View style={styles.cardMainRow}>
          <View style={styles.imgContainer}>
            {item?.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.itemImg}
                contentFit="cover"
                transition={150}
                cachePolicy="memory-disk"
                recyclingKey={item._id}
              />
            ) : (
              <View style={styles.itemImgPlaceholder}>
                <Text style={styles.itemImgText}>{safeName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.itemName} numberOfLines={1}>
              {safeName}
            </Text>
            <Text style={styles.itemCategory} numberOfLines={1}>
              {item.categories?.name || 'Chưa phân loại'}
            </Text>

            <View style={styles.skuRow}>
              <ScanBarcode size={13} color={colors.subText} strokeWidth={2} />
              <Text style={[styles.skuText, !item.sku && { fontStyle: 'italic', color: colors.mutedText }]} numberOfLines={1}>
                {item.sku ? item.sku : 'Chưa có mã'}
              </Text>
            </View>
          </View>

          <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
            <Text style={styles.itemPrice}>{formatCurrency(price)}</Text>
            {/* Quyền bảo mật: CHỈ ADMIN MỚI THẤY GIÁ VỐN */}
            {isAdmin ? (
              <Text style={styles.itemCost}>Vốn: {formatCurrency(costPrice)}</Text>
            ) : (
              <View style={styles.cashierLockRow}>
                <Lock size={10} color={colors.subText} />
                <Text style={styles.cashierLockText}>Giá sỉ bảo mật</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardActionRow}>
          <View style={[styles.stockBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.stockBadgeText, { color: status.color }]}>{status.label}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(item)} activeOpacity={0.7}>
              <Pencil size={16} color={colors.primary} strokeWidth={2.2} />
            </TouchableOpacity>

            {/* Quyền bảo mật: CHỈ ADMIN MỚI ĐƯỢC XÓA SẢN PHẨM KHỎI KHO */}
            {isAdmin && (
              <TouchableOpacity
                style={[styles.actionBtn, { marginRight: 0, backgroundColor: colors.dangerLight }]}
                onPress={() => onDelete(item._id)}
                activeOpacity={0.7}
              >
                <Trash2 size={16} color={colors.danger} strokeWidth={2.2} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  },
  (prev, next) =>
    prev.item._id === next.item._id &&
    prev.item.price === next.item.price &&
    prev.item.stock === next.item.stock &&
    prev.item.costPrice === next.item.costPrice &&
    prev.item.imageUrl === next.item.imageUrl &&
    prev.isAdmin === next.isAdmin
);

export default function InventoryScreen({ navigation, route }: any) {
  const { colors, isDark } = React.useContext(ThemeContext);
  const { isAdmin } = React.useContext(AuthContext);
  const styles = createStyles(colors, isDark);
  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterCatId, setFilterCatId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasNewData, setHasNewData] = useState(false);

  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [priceSort, setPriceSort] = useState<string>('default');

  const [catModalVisible, setCatModalVisible] = useState(false);
  const [catName, setCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
    fetchProducts(1, true);

    socket.on('product_changed', () => setHasNewData(true));
    socket.on('category_changed', fetchCategories);

    const unsubscribeNet = NetInfo.addEventListener((state) => {
      if (state.isConnected) fetchProducts(1, true);
    });

    return () => {
      socket.off('product_changed');
      socket.off('category_changed');
      unsubscribeNet();
    };
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts(1, true);
    }, 350);
    return () => clearTimeout(delayDebounceFn);
  }, [searchText, filterCatId]);

  useEffect(() => {
    if (route.params?.scannedSku && route.params?.timestamp) {
      const sku = route.params.scannedSku;
      const action = route.params.scannerAction;

      if (action === 'search') {
        setSearchText(sku);
      }

      navigation.setParams({ scannedSku: null, scannerAction: null, timestamp: null });
    }
  }, [route.params?.timestamp]);

  const fetchCategories = async () => {
    try {
      const cats = await getCategories();
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (error) {
      console.log('Lỗi tải danh mục');
    }
  };

  const fetchProducts = async (pageNumber = 1, isReset = false) => {
    if (isReset && !refreshing) setInitialLoading(true);
    try {
      const res = await getProducts(pageNumber, 16, searchText, filterCatId);
      const newData = res?.data || [];
      if (isReset) setProducts(newData);
      else setProducts((prev) => [...prev, ...newData]);

      setPage(res?.page || 1);
      setTotalPages(res?.totalPages || 1);
      setTotalProducts(res?.total || newData.length);
    } catch (error) {
      console.log('Lỗi tải sản phẩm');
    } finally {
      setInitialLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = async () => {
    if (page < totalPages && !loadingMore) {
      setLoadingMore(true);
      await fetchProducts(page + 1, false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(async () => {
      try {
        await fetchCategories();
        await fetchProducts(1, true);
        setHasNewData(false);
      } catch (error) {
        console.log('Lỗi pull-to-refresh:', error);
      } finally {
        setRefreshing(false);
      }
    }, 300);
  };

  const openScanner = (mode: 'search' | 'sku') => {
    navigation.navigate('GlobalScanner', { returnScreen: 'Inventory', action: mode });
  };

  const openAddProduct = () => {
    if (!isAdmin) {
      Alert.alert('Quyền hạn bị giới hạn', 'Chỉ Chủ cửa hàng (Admin) mới có quyền tạo thêm sản phẩm mới vào kho!');
      return;
    }
    navigation.navigate('AddEditProduct');
  };

  const openEditProduct = (item: any) => {
    if (!isAdmin) {
      Alert.alert('Quyền hạn bị giới hạn', 'Chỉ Chủ cửa hàng (Admin) mới có quyền chỉnh sửa thông số và giá vốn sản phẩm!');
      return;
    }
    navigation.navigate('AddEditProduct', { product: item });
  };

  const handleDeleteProduct = (id: string) => {
    if (!isAdmin) {
      Alert.alert('Từ chối thao tác', 'Thu ngân không có quyền xóa sản phẩm khỏi kho hàng!');
      return;
    }
    Alert.alert('Xóa sản phẩm?', 'Món hàng này sẽ được gỡ khỏi kho và danh sách POS.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa ngay',
        style: 'destructive',
        onPress: async () => {
          await deleteProduct(id);
          await fetchProducts(1, true);
        },
      },
    ]);
  };

  const openCategoryModal = () => {
    if (!isAdmin) {
      Alert.alert('Quyền hạn bị giới hạn', 'Chỉ Chủ cửa hàng (Admin) mới có quyền quản lý và sửa đổi danh mục ngành hàng!');
      return;
    }
    setCatModalVisible(true);
  };

  const handleSaveCategory = async () => {
    if (!catName.trim()) return;
    try {
      if (editingCatId) await updateCategory(editingCatId, catName.trim());
      else await addCategory(catName.trim());
      setCatName('');
      setEditingCatId(null);
      await fetchCategories();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu danh mục.');
    }
  };

  const handleEditCategory = (item: any) => {
    setCatName(item.name);
    setEditingCatId(item._id);
  };

  const handleDeleteCategory = (id: string) => {
    Alert.alert('Xóa danh mục?', 'Các sản phẩm thuộc nhóm này sẽ chuyển về chưa phân loại.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          await deleteCategory(id);
          await fetchCategories();
        },
      },
    ]);
  };

  const displayedProducts = useMemo(() => {
    let result = [...products];
    if (stockFilter === 'in_stock') result = result.filter((p) => Number(p.stock) > 10);
    else if (stockFilter === 'low_stock')
      result = result.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= 10);
    else if (stockFilter === 'out_of_stock') result = result.filter((p) => Number(p.stock) <= 0);

    if (priceSort === 'asc') result.sort((a, b) => Number(a.price) - Number(b.price));
    else if (priceSort === 'desc') result.sort((a, b) => Number(b.price) - Number(a.price));

    return result;
  }, [products, stockFilter, priceSort]);

  const resetFilters = () => {
    setStockFilter('all');
    setPriceSort('default');
    setFilterCatId(null);
  };

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <ProductCard
        item={item}
        isAdmin={isAdmin}
        onEdit={openEditProduct}
        onDelete={handleDeleteProduct}
        colors={colors}
        styles={styles}
      />
    ),
    [isAdmin, openEditProduct, handleDeleteProduct, colors, styles]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Kho hàng ({totalProducts})</Text>
          <Text style={styles.headerSub}>
            {isAdmin ? 'Quản lý sản phẩm, đơn giá & giá vốn' : 'Tra cứu tồn kho & đơn giá bán'}
          </Text>
        </View>

        <TouchableOpacity onPress={openCategoryModal} style={styles.iconBtn} activeOpacity={0.8}>
          <FolderOpen size={22} color={colors.primary} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      {/* SEARCH & SCAN BUTTON */}
      <View style={styles.searchSection}>
        <View style={{ flex: 1 }}>
          <GlobalSearchBar
            placeholder="Tìm tên sản phẩm hoặc mã vạch..."
            value={searchText}
            onChangeText={setSearchText}
            onFilterPress={() => setFilterModalVisible(true)}
          />
        </View>
        <TouchableOpacity style={styles.searchScanBtn} onPress={() => openScanner('search')} activeOpacity={0.85}>
          <ScanBarcode size={22} color="white" strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      {/* QUICK CATEGORY CHIPS */}
      <View style={{ marginBottom: 10 }}>
        <FlatList
          horizontal
          data={[{ _id: null, name: 'Tất cả' }, ...categories]}
          keyExtractor={(item, index) => (item?._id ? String(item._id) : `chip-${index}`)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SPACING }}
          renderItem={({ item }) => {
            const isActive = filterCatId === item._id;
            return (
              <TouchableOpacity
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setFilterCatId(item._id)}
                activeOpacity={0.7}
              >
                <Tag
                  size={13}
                  color={isActive ? 'white' : colors.subText}
                  strokeWidth={2.2}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{item.name}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* REAL-TIME NOTIFICATION BANNER */}
      {hasNewData && (
        <View style={styles.inlineNewDataContainer}>
          <TouchableOpacity
            style={styles.newDataPill}
            onPress={() => {
              setHasNewData(false);
              fetchProducts(1, true);
            }}
          >
            <RefreshCw size={14} color="white" style={{ marginRight: 6 }} />
            <Text style={styles.newDataText}>Kho hàng có cập nhật mới. Nhấn để tải lại!</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* PRODUCT LIST - AGGRESSIVE VIRTUALIZATION TO PREVENT OOM CRASH */}
      {initialLoading ? (
        <View style={{ paddingHorizontal: SPACING, paddingTop: 4 }}>
          <SkeletonProductCard colors={colors} styles={styles} />
          <SkeletonProductCard colors={colors} styles={styles} />
          <SkeletonProductCard colors={colors} styles={styles} />
          <SkeletonProductCard colors={colors} styles={styles} />
        </View>
      ) : (
        <FlatList
          data={displayedProducts}
          keyExtractor={(item, index) => (item?._id ? String(item._id) : `prod-${index}`)}
          contentContainerStyle={{ paddingHorizontal: SPACING, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={3}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <PackageOpen size={48} color={colors.subText} strokeWidth={1.8} style={{ opacity: 0.6, marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>Kho hàng trống</Text>
              <Text style={styles.emptySub}>Chưa có sản phẩm nào phù hợp với bộ lọc</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ margin: 16 }} />
            ) : null
          }
          renderItem={renderItem}
        />
      )}

      {/* FLOATING ACTION BUTTON (ADD PRODUCT - ONLY FOR ADMIN) */}
      {isAdmin && (
        <TouchableOpacity
          style={[
            styles.fab,
            {
              bottom:
                Platform.OS === 'android'
                  ? 64 + (insets.bottom > 0 ? insets.bottom : 8) + 16
                  : 98,
            },
          ]}
          onPress={openAddProduct}
          activeOpacity={0.85}
        >
          <Plus size={28} color="white" strokeWidth={2.6} />
        </TouchableOpacity>
      )}

      {/* ADVANCED FILTER MODAL - CENTER DISPLAY MODAL (Đổi sang giữa màn hình) */}
      <Modal
        visible={filterModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalCenterOverlay}>
          <View style={styles.modalCenterCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <SlidersHorizontal size={20} color={colors.primary} strokeWidth={2.4} />
                <Text style={styles.modalTitle}>Bộ lọc sản phẩm</Text>
              </View>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color={colors.text} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.filterSectionTitle}>Trạng thái tồn kho</Text>
              <View style={styles.chipGroup}>
                {[
                  { key: 'all', label: 'Tất cả' },
                  { key: 'in_stock', label: 'Còn hàng (>10)' },
                  { key: 'low_stock', label: 'Sắp hết (1-10)' },
                  { key: 'out_of_stock', label: 'Hết hàng' },
                ].map((f) => (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.modalChip, stockFilter === f.key && styles.modalChipActive]}
                    onPress={() => setStockFilter(f.key)}
                  >
                    <Text style={[styles.modalChipText, stockFilter === f.key && styles.modalChipTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterSectionTitle}>Sắp xếp theo giá</Text>
              <View style={styles.chipGroup}>
                {[
                  { key: 'default', label: 'Mặc định' },
                  { key: 'asc', label: 'Giá tăng dần' },
                  { key: 'desc', label: 'Giá giảm dần' },
                ].map((s) => (
                  <TouchableOpacity
                    key={s.key}
                    style={[styles.modalChip, priceSort === s.key && styles.modalChipActive]}
                    onPress={() => setPriceSort(s.key)}
                  >
                    <Text style={[styles.modalChipText, priceSort === s.key && styles.modalChipTextActive]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                <Text style={styles.resetBtnText}>Đặt lại</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setFilterModalVisible(false)}>
                <Text style={styles.applyBtnText}>Áp dụng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CATEGORY MANAGEMENT MODAL - CENTER DISPLAY MODAL (Đổi sang giữa màn hình) */}
      <Modal
        visible={catModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCatModalVisible(false)}
      >
        <View style={styles.modalCenterOverlay}>
          <View style={styles.modalCenterCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <FolderOpen size={20} color={colors.primary} strokeWidth={2.4} />
                <Text style={styles.modalTitle}>Quản lý danh mục hàng</Text>
              </View>
              <TouchableOpacity onPress={() => setCatModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color={colors.text} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            {/* Input thêm / sửa danh mục */}
            <View style={styles.catInputRow}>
              <TextInput
                style={styles.catTextInput}
                placeholder={editingCatId ? 'Sửa tên danh mục...' : 'Thêm tên danh mục mới...'}
                placeholderTextColor={colors.subText}
                value={catName}
                onChangeText={setCatName}
                selectionColor={colors.primary}
              />
              <TouchableOpacity style={styles.saveCatBtn} onPress={handleSaveCategory} activeOpacity={0.8}>
                <Check size={18} color="white" strokeWidth={2.5} />
              </TouchableOpacity>
              {editingCatId && (
                <TouchableOpacity
                  style={styles.cancelEditCatBtn}
                  onPress={() => {
                    setEditingCatId(null);
                    setCatName('');
                  }}
                >
                  <X size={18} color={colors.text} strokeWidth={2.5} />
                </TouchableOpacity>
              )}
            </View>

            {/* Danh sách danh mục */}
            <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
              {categories.map((cat) => (
                <View key={cat._id} style={styles.catItemRow}>
                  <Text style={styles.catItemName}>{cat.name}</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity onPress={() => handleEditCategory(cat)} style={styles.catActionBtn}>
                      <Pencil size={16} color={colors.primary} strokeWidth={2.2} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteCategory(cat._id)}
                      style={[styles.catActionBtn, { backgroundColor: colors.dangerLight, marginRight: 0 }]}
                    >
                      <Trash2 size={16} color={colors.danger} strokeWidth={2.2} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
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
    headerTitle: {
      fontSize: 22,
      fontFamily: FONTS.bold,
      color: colors.text,
    },
    headerSub: {
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: colors.subText,
      marginTop: 2,
    },
    iconBtn: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    searchSection: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING,
      marginBottom: 12,
    },
    searchScanBtn: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 10,
      ...SHADOWS.soft,
    },
    filterChip: {
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
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterText: {
      fontSize: 13,
      fontFamily: FONTS.medium,
      color: colors.subText,
    },
    filterTextActive: {
      color: 'white',
      fontFamily: FONTS.bold,
    },
    inlineNewDataContainer: {
      alignItems: 'center',
      marginBottom: 8,
    },
    newDataPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      ...SHADOWS.soft,
    },
    newDataText: {
      color: 'white',
      fontSize: 12,
      fontFamily: FONTS.bold,
    },
    itemCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      ...SHADOWS.soft,
    },
    cardMainRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    imgContainer: {
      width: 60,
      height: 60,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: colors.cardSecondary,
    },
    itemImg: {
      width: '100%',
      height: '100%',
    },
    itemImgPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    itemImgText: {
      fontSize: 22,
      fontFamily: FONTS.bold,
      color: colors.primary,
    },
    itemName: {
      fontSize: 15,
      fontFamily: FONTS.semiBold,
      color: colors.text,
      marginBottom: 2,
    },
    itemCategory: {
      fontSize: 12,
      fontFamily: FONTS.medium,
      color: colors.subText,
      marginBottom: 4,
    },
    skuRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    skuText: {
      fontSize: 11,
      fontFamily: FONTS.medium,
      color: colors.subText,
      marginLeft: 4,
    },
    itemPrice: {
      fontSize: 15,
      fontFamily: FONTS.bold,
      color: colors.primary,
    },
    itemCost: {
      fontSize: 11,
      fontFamily: FONTS.regular,
      color: colors.subText,
      marginTop: 2,
    },
    cashierLockRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },
    cashierLockText: {
      fontSize: 10,
      fontFamily: FONTS.regular,
      color: colors.subText,
      marginLeft: 3,
      fontStyle: 'italic',
    },
    cardActionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.borderColor,
    },
    stockBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    stockBadgeText: {
      fontSize: 12,
      fontFamily: FONTS.bold,
    },
    actionBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    fab: {
      position: 'absolute',
      right: SPACING,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...SHADOWS.float,
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
    },
    // CENTER DIALOG STYLING
    modalCenterOverlay: {
      flex: 1,
      backgroundColor: colors.modalOverlay,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    modalCenterCard: {
      width: '100%',
      maxWidth: 440,
      backgroundColor: colors.card,
      borderRadius: 24,
      paddingHorizontal: SPACING,
      paddingVertical: 18,
      maxHeight: '80%',
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      ...SHADOWS.float,
    },
    modalHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderColor,
    },
    modalTitle: {
      fontSize: 17,
      fontFamily: FONTS.bold,
      color: colors.text,
      marginLeft: 8,
    },
    closeBtn: {
      padding: 6,
      borderRadius: 10,
      backgroundColor: colors.cardSecondary,
    },
    filterSectionTitle: {
      fontSize: 13,
      fontFamily: FONTS.bold,
      color: colors.subText,
      textTransform: 'uppercase',
      marginTop: 16,
      marginBottom: 10,
    },
    chipGroup: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    modalChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.cardSecondary,
      marginRight: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    modalChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    modalChipText: {
      fontSize: 13,
      fontFamily: FONTS.medium,
      color: colors.text,
    },
    modalChipTextActive: {
      color: 'white',
      fontFamily: FONTS.bold,
    },
    modalActionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 18,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.borderColor,
    },
    resetBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.cardSecondary,
      alignItems: 'center',
      marginRight: 10,
    },
    resetBtnText: {
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: colors.text,
    },
    applyBtn: {
      flex: 2,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      ...SHADOWS.soft,
    },
    applyBtnText: {
      fontSize: 14,
      fontFamily: FONTS.bold,
      color: 'white',
    },
    catInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 14,
    },
    catTextInput: {
      flex: 1,
      height: 46,
      backgroundColor: colors.inputBg,
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      borderRadius: 12,
      paddingHorizontal: 14,
      fontSize: 14,
      fontFamily: FONTS.medium,
      color: colors.text,
    },
    saveCatBtn: {
      width: 46,
      height: 46,
      borderRadius: 12,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    cancelEditCatBtn: {
      width: 46,
      height: 46,
      borderRadius: 12,
      backgroundColor: colors.cardSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    catItemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderColor,
    },
    catItemName: {
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: colors.text,
    },
    catActionBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
  });