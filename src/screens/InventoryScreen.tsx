import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform, RefreshControl,
  TouchableWithoutFeedback, Keyboard, ActivityIndicator, ScrollView, Animated
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { StatusBar } from 'expo-status-bar';

import {
  FolderOpen, Plus, Pencil, Trash2, Camera as CameraIcon,
  ScanBarcode, Check, X, RefreshCw
} from 'lucide-react-native';

import {
  getProducts, getCategories, deleteProduct,
  addCategory, updateCategory, deleteCategory
} from '../services/productService';
import { socket } from '../lib/socket';
import { formatCurrency } from '../utils/format';
import { COLORS, SPACING } from '../constants/theme';
import GlobalSearchBar from '../components/GlobalSearchBar';

const SkeletonProductCard = () => {
  const fadeAnim = React.useRef(new Animated.Value(0.3)).current;
  React.useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0.3, duration: 800, useNativeDriver: true })
    ])).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.itemCard, { opacity: fadeAnim }]}>
      <View style={styles.cardMainRow}>
        <View style={{ width: 64, height: 64, borderRadius: 14, backgroundColor: '#E5E5EA' }} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ width: '80%', height: 16, backgroundColor: '#E5E5EA', borderRadius: 4, marginBottom: 8 }} />
          <View style={{ width: '50%', height: 12, backgroundColor: '#E5E5EA', borderRadius: 4, marginBottom: 12 }} />
          <View style={{ width: 40, height: 14, backgroundColor: '#E5E5EA', borderRadius: 4 }} />
        </View>
        <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
          <View style={{ width: 60, height: 16, backgroundColor: '#E5E5EA', borderRadius: 4, marginBottom: 8 }} />
          <View style={{ width: 40, height: 12, backgroundColor: '#E5E5EA', borderRadius: 4 }} />
        </View>
      </View>
      <View style={[styles.cardActionRow, { borderTopWidth: 1, borderTopColor: '#F0F4F8', paddingTop: 12 }]}>
        <View style={{ width: 80, height: 24, backgroundColor: '#E5E5EA', borderRadius: 8 }} />
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: 34, height: 34, backgroundColor: '#E5E5EA', borderRadius: 10, marginRight: 10 }} />
          <View style={{ width: 34, height: 34, backgroundColor: '#E5E5EA', borderRadius: 10 }} />
        </View>
      </View>
    </Animated.View>
  );
};

const ProductCard = React.memo(({ item, onEdit, onDelete }: { item: any, onEdit: any, onDelete: any }) => {
  const getStockColor = (stock: number) => {
    if (stock <= 0) return COLORS.danger;
    if (stock <= 10) return '#FF9500';
    return COLORS.success;
  };

  return (
    <View style={styles.itemCard}>
      <View style={styles.cardMainRow}>
        <View style={styles.imgContainer}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.itemImg}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.itemImgPlaceholder}><Text style={styles.itemImgText}>{item.name.charAt(0).toUpperCase()}</Text></View>
          )}
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.itemCategory} numberOfLines={1}>{item.categories?.name || 'Chưa phân loại'}</Text>

          <View style={styles.skuRow}>
            <ScanBarcode size={14} color={COLORS.subText} />
            <Text style={[styles.skuText, !item.sku && { fontStyle: 'italic', color: '#B0B0B0' }]} numberOfLines={1}>
              {item.sku ? item.sku : 'Chưa có mã'}
            </Text>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
          <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
          <Text style={styles.itemCost}>Vốn: {formatCurrency(item.costPrice || 0)}</Text>
        </View>
      </View>

      <View style={styles.cardActionRow}>
        <View style={[styles.stockBadge, { backgroundColor: getStockColor(item.stock) + '20' }]}>
          <Text style={[styles.stockBadgeText, { color: getStockColor(item.stock) }]}>
            {item.stock <= 0 ? 'Hết hàng' : `Tồn kho: ${item.stock} ${item.unit || ''}`}
          </Text>
        </View>

        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(item)}>
            <Pencil size={18} color={COLORS.primary} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { marginRight: 0 }]} onPress={() => onDelete(item._id)}>
            <Trash2 size={18} color={COLORS.danger} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

export default function InventoryScreen({ navigation, route }: any) {
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

    const unsubscribeNet = NetInfo.addEventListener(state => {
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
    }, 500);
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
      setCategories(cats);
    } catch (error) { console.log('Lỗi tải danh mục'); }
  };

  const fetchProducts = async (pageNumber = 1, isReset = false) => {
    if (isReset && !refreshing) setInitialLoading(true);
    try {
      const res = await getProducts(pageNumber, 20, searchText, filterCatId);
      const newData = res.data || [];
      if (isReset) setProducts(newData);
      else setProducts(prev => [...prev, ...newData]);

      setPage(res.page);
      setTotalPages(res.totalPages);
      setTotalProducts(res.total);
    } catch (error) { console.log('Lỗi tải sản phẩm'); }
    finally { setInitialLoading(false); }
  };

  const loadMore = async () => {
    if (page < totalPages && !loadingMore) {
      setLoadingMore(true);
      await fetchProducts(page + 1, false);
      setLoadingMore(false);
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
        console.log('Lỗi trong quá trình pull-to-refresh:', error);
      } finally {
        setRefreshing(false);
      }
    }, 400);
  };

  const openScanner = (mode: 'search' | 'sku') => {
    navigation.navigate('GlobalScanner', { returnScreen: 'Inventory', action: mode });
  };

  const openAddProduct = () => {
    navigation.navigate('AddEditProduct');
  };

  const openEditProduct = (item: any) => {
    navigation.navigate('AddEditProduct', { product: item });
  };

  const handleDeleteProduct = (id: string) => {
    Alert.alert('Xóa món này?', 'Món hàng sẽ được ẩn khỏi hệ thống.', [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: async () => { await deleteProduct(id); await fetchProducts(1, true); } }]);
  };

  const handleSaveCategory = async () => {
    if (!catName.trim()) return;
    try {
      if (editingCatId) await updateCategory(editingCatId, catName); else await addCategory(catName);
      setCatName(''); setEditingCatId(null); await fetchCategories();
    } catch (error) { Alert.alert('Lỗi', 'Không lưu được danh mục'); }
  };

  const handleEditCategory = (item: any) => { setCatName(item.name); setEditingCatId(item._id); };
  const handleDeleteCategory = (id: string) => {
    Alert.alert('Xóa danh mục?', 'Danh mục sẽ bị ẩn đi.', [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: async () => { await deleteCategory(id); await fetchCategories(); } }]);
  };

  const displayedProducts = useMemo(() => {
    let result = [...products];
    if (stockFilter === 'in_stock') result = result.filter(p => p.stock > 10);
    else if (stockFilter === 'low_stock') result = result.filter(p => p.stock > 0 && p.stock <= 10);
    else if (stockFilter === 'out_of_stock') result = result.filter(p => p.stock <= 0);

    if (priceSort === 'asc') result.sort((a, b) => a.price - b.price);
    else if (priceSort === 'desc') result.sort((a, b) => b.price - a.price);

    return result;
  }, [products, stockFilter, priceSort]);

  const resetFilters = () => {
    setStockFilter('all'); setPriceSort('default'); setFilterCatId(null);
  };

  const renderItem = React.useCallback(({ item }: { item: any }) => (
    <ProductCard
      item={item}
      onEdit={openEditProduct}
      onDelete={handleDeleteProduct}
    />
  ), []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Kho Hàng ({totalProducts})</Text>
          <Text style={styles.headerSub}>Quản lý sản phẩm & tồn kho</Text>
        </View>
        <TouchableOpacity onPress={() => setCatModalVisible(true)} style={styles.iconBtn}>
          <FolderOpen size={24} color={COLORS.primary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* TÌM KIẾM */}
      <View style={styles.searchSection}>
        <View style={{ flex: 1 }}>
          <GlobalSearchBar
            placeholder="Tìm tên hoặc mã..." value={searchText} onChangeText={setSearchText}
            onFilterPress={() => setFilterModalVisible(true)}
          />
        </View>
        <TouchableOpacity style={styles.searchScanBtn} onPress={() => openScanner('search')}>
          <ScanBarcode size={24} color="white" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* BỘ LỌC NHANH */}
      <View style={{ paddingBottom: 10 }}>
        <FlatList
          horizontal data={[{ _id: null, name: 'Tất cả' }, ...categories]}
          keyExtractor={item => item._id ? item._id.toString() : 'all'}
          showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING }}
          renderItem={({ item }) => {
            const isActive = filterCatId === item._id;
            return (
              <TouchableOpacity style={[styles.filterChip, isActive && styles.filterChipActive]} onPress={() => setFilterCatId(item._id)}>
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{item.name}</Text>
              </TouchableOpacity>
            )
          }}
        />
      </View>

      {/* THÔNG BÁO DỮ LIỆU */}
      {hasNewData && (
        <View style={styles.inlineNewDataContainer}>
          <TouchableOpacity style={styles.newDataPill} onPress={() => { setHasNewData(false); fetchProducts(1, true); }}>
            <RefreshCw size={14} color="white" style={{ marginRight: 6 }} />
            <Text style={styles.newDataText}>Có thay đổi kho hàng. Chạm để tải lại!</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* DANH SÁCH */}
      {initialLoading ? (
        <View style={{ paddingHorizontal: SPACING, paddingTop: 10 }}>
          <SkeletonProductCard /><SkeletonProductCard /><SkeletonProductCard /><SkeletonProductCard />
        </View>
      ) : (
        <FlatList
          data={displayedProducts}
          keyExtractor={(item) => item._id.toString()}
          contentContainerStyle={{ paddingHorizontal: SPACING, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}

          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}

          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40, color: COLORS.subText, fontStyle: 'italic' }}>Không có sản phẩm nào</Text>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={COLORS.primary} style={{ margin: 20 }} /> : null}

          renderItem={renderItem}
        />
      )}

      <TouchableOpacity
        style={[
          styles.fab,
          {
            bottom: Platform.OS === 'android'
              ? (62 + (insets.bottom > 0 ? insets.bottom : 10) + 16)
              : 98
          }
        ]}
        onPress={openAddProduct}
        activeOpacity={0.8}
      >
        <Plus size={32} color="white" strokeWidth={2.5} />
      </TouchableOpacity>

      {/* BOTTOM SHEET LỌC */}
      <Modal visible={filterModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlayCart}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setFilterModalVisible(false)} />
          <View style={styles.bottomSheetContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Bộ lọc nâng cao</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterSectionTitle}>Trạng thái tồn kho</Text>
            <View style={styles.chipRow}>
              {[{ id: 'all', label: 'Tất cả' }, { id: 'in_stock', label: 'Còn nhiều' }, { id: 'low_stock', label: 'Sắp hết' }, { id: 'out_of_stock', label: 'Hết hàng' }].map(item => (
                <TouchableOpacity key={item.id} style={[styles.bsChip, stockFilter === item.id && styles.bsChipActive]} onPress={() => setStockFilter(item.id)}>
                  <Text style={[styles.bsChipText, stockFilter === item.id && styles.bsChipTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterSectionTitle}>Danh mục sản phẩm</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
              <TouchableOpacity style={[styles.bsChip, filterCatId === null && styles.bsChipActive]} onPress={() => setFilterCatId(null)}>
                <Text style={[styles.bsChipText, filterCatId === null && styles.bsChipTextActive]}>Tất cả</Text>
              </TouchableOpacity>
              {categories.map(cat => (
                <TouchableOpacity key={cat._id} style={[styles.bsChip, filterCatId === cat._id && styles.bsChipActive]} onPress={() => setFilterCatId(cat._id)}>
                  <Text style={[styles.bsChipText, filterCatId === cat._id && styles.bsChipTextActive]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.filterSectionTitle}>Sắp xếp giá bán</Text>
            <View style={styles.chipRow}>
              {[{ id: 'default', label: 'Mặc định' }, { id: 'asc', label: 'Thấp đến Cao' }, { id: 'desc', label: 'Cao đến Thấp' }].map(item => (
                <TouchableOpacity key={item.id} style={[styles.bsChip, priceSort === item.id && styles.bsChipActive]} onPress={() => setPriceSort(item.id)}>
                  <Text style={[styles.bsChipText, priceSort === item.id && styles.bsChipTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.bsFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <TouchableOpacity style={styles.bsBtnReset} onPress={resetFilters}>
                <Text style={styles.bsBtnResetText}>Thiết lập lại</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bsBtnApply} onPress={() => setFilterModalVisible(false)}>
                <Text style={styles.bsBtnApplyText}>Áp dụng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- MODAL DANH MỤC --- */}
      <Modal visible={catModalVisible} animationType="fade" transparent={true}>
        <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setCatModalVisible(false); }}>
          <View style={styles.modalOverlayCart}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <View style={[styles.bottomSheetContent, { maxHeight: '75%', paddingBottom: Math.max(insets.bottom, 20) }]}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>Quản lý Danh mục</Text>
                  <TouchableOpacity onPress={() => setCatModalVisible(false)}><X size={24} color={COLORS.text} /></TouchableOpacity>
                </View>
                <View style={styles.addCatRow}>
                  <TextInput style={[styles.input, { marginBottom: 0, flex: 1 }]} placeholder="Nhập tên danh mục mới..." value={catName} onChangeText={setCatName} />
                  <TouchableOpacity style={styles.addCatBtn} onPress={handleSaveCategory}>
                    {editingCatId ? <Check size={24} color="white" /> : <Plus size={24} color="white" />}
                  </TouchableOpacity>
                  {editingCatId && (
                    <TouchableOpacity style={[styles.addCatBtn, { backgroundColor: COLORS.subText, marginLeft: 8 }]} onPress={() => { setEditingCatId(null); setCatName(''); }}>
                      <X size={24} color="white" />
                    </TouchableOpacity>
                  )}
                </View>
                <FlatList
                  data={categories} keyExtractor={item => item._id.toString()} showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <View style={styles.catItemRow}>
                      <Text style={styles.catItemText}>{item.name}</Text>
                      <View style={{ flexDirection: 'row' }}>
                        <TouchableOpacity onPress={() => handleEditCategory(item)} style={{ padding: 8 }}>
                          <Pencil size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteCategory(item._id)} style={{ padding: 8 }}>
                          <Trash2 size={20} color={COLORS.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )} />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING, paddingTop: 10, paddingBottom: 15 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 14, color: COLORS.subText, marginTop: 2 },
  iconBtn: { padding: 10, backgroundColor: COLORS.primaryLight, borderRadius: 12 },

  searchSection: { flexDirection: 'row', paddingHorizontal: SPACING, marginBottom: 15 },
  searchScanBtn: { width: 50, height: 50, backgroundColor: COLORS.primary, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginLeft: 10, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 },

  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.card, marginRight: 10, borderWidth: 1, borderColor: COLORS.borderColor },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { color: COLORS.subText, fontWeight: '600', fontSize: 14 },
  filterTextActive: { color: 'white' },

  itemCard: { backgroundColor: COLORS.card, padding: 14, borderRadius: 20, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  cardMainRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  imgContainer: { width: 64, height: 64, borderRadius: 14, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4F8' },
  itemImg: { width: '100%', height: '100%' },
  itemImgPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primaryLight },
  itemImgText: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },

  itemName: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  itemCategory: { fontSize: 13, color: COLORS.subText, marginBottom: 4 },
  skuRow: { flexDirection: 'row', alignItems: 'center' },
  skuText: { fontSize: 12, marginLeft: 6, flex: 1, color: COLORS.subText },

  itemPrice: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  itemCost: { fontSize: 13, color: COLORS.subText },

  cardActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F4F8', paddingTop: 12 },
  stockBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  stockBadgeText: { fontSize: 12, fontWeight: '700' },
  actionBtn: { padding: 8, backgroundColor: '#F8F9FA', borderRadius: 10, marginRight: 10 },

  fab: { position: 'absolute', right: 20, bottom: 90, backgroundColor: COLORS.primary, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8, zIndex: 10 },

  modalOverlayCart: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingTop: 20 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },

  imagePickerBtn: { width: 80, height: 80, backgroundColor: '#F8F9FA', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#D1D5DB', borderStyle: 'dashed' },
  input: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 14, padding: 14, marginBottom: 15, fontSize: 15, color: COLORS.text },

  skuInputContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 0 },
  skuInputBox: { flex: 1, backgroundColor: '#F8F9FA', borderWidth: 1, borderRightWidth: 0, borderColor: '#E5E5EA', borderTopLeftRadius: 14, borderBottomLeftRadius: 14, padding: 14, fontSize: 15, color: COLORS.text },
  skuScanBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 14, height: 50, justifyContent: 'center', alignItems: 'center', borderTopRightRadius: 14, borderBottomRightRadius: 14 },

  row: { flexDirection: 'row' },
  label: { marginBottom: 8, color: COLORS.subText, fontWeight: '600', fontSize: 13 },
  pickerContainer: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 14, marginBottom: 25 },

  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { flex: 1, padding: 16, borderRadius: 14, alignItems: 'center' },
  btnCancel: { backgroundColor: '#F5F5F5', marginRight: 8 },
  btnSave: { backgroundColor: COLORS.primary, marginLeft: 8 },
  btnTextGray: { color: COLORS.subText, fontWeight: 'bold', fontSize: 16 },
  btnTextWhite: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  addCatRow: { flexDirection: 'row', marginBottom: 20 },
  addCatBtn: { backgroundColor: COLORS.primary, width: 52, height: 52, justifyContent: 'center', alignItems: 'center', borderRadius: 14, marginLeft: 10 },
  catItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  catItemText: { fontSize: 16, color: COLORS.text, fontWeight: '600' },

  inlineNewDataContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
    marginBottom: 12,
    paddingHorizontal: SPACING
  },

  newDataPill: { flexDirection: 'row', backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 },
  newDataText: { color: 'white', fontSize: 13, fontWeight: 'bold' },

  bottomSheetContent: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingTop: 15 },
  modalHandle: { width: 40, height: 5, backgroundColor: '#E0E0E0', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  filterSectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 10, marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  bsChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E5E5EA', marginRight: 10, marginBottom: 10 },
  bsChipActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  bsChipText: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  bsChipTextActive: { color: COLORS.primary, fontWeight: '700' },
  bsFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F0F4F8' },
  bsBtnReset: { flex: 1, padding: 16, borderRadius: 14, alignItems: 'center', backgroundColor: '#F5F5F5', marginRight: 8 },
  bsBtnResetText: { color: COLORS.subText, fontWeight: 'bold', fontSize: 16 },
  bsBtnApply: { flex: 1, padding: 16, borderRadius: 14, alignItems: 'center', backgroundColor: COLORS.primary, marginLeft: 8 },
  bsBtnApplyText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  actionSheetBtn: { paddingVertical: 16, backgroundColor: '#F8F9FA', borderRadius: 14, marginBottom: 12, alignItems: 'center' },
  actionSheetBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  actionSheetCancelBtn: { backgroundColor: '#FFF0F0', marginTop: 8 },
  actionSheetCancelText: { fontSize: 16, fontWeight: 'bold', color: COLORS.danger },
});