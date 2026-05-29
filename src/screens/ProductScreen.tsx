import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform, RefreshControl, Image,
  TouchableWithoutFeedback, Keyboard, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';

import {
  getProducts, getCategories, addProduct, deleteProduct, updateProduct,
  addCategory, updateCategory, deleteCategory
} from '../services/productService';
import { socket } from '../lib/socket';
import { uploadImageToCloudinary } from '../services/productService';

export default function ProductScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterCatId, setFilterCatId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasNewData, setHasNewData] = useState(false);

  const [prodModalVisible, setProdModalVisible] = useState(false);
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCostPrice, setProdCostPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodUnit, setProdUnit] = useState('Cái');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const [catModalVisible, setCatModalVisible] = useState(false);
  const [catName, setCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

  const fetchCategories = async () => {
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch (error) { console.log('Lỗi tải danh mục'); }
  };

  const fetchProducts = async (pageNumber = 1, isReset = false) => {
    try {
      const res = await getProducts(pageNumber, 20, searchText, filterCatId);

      if (isReset) {
        setProducts(res.data);
      } else {
        setProducts(prev => [...prev, ...res.data]);
      }

      setPage(res.page);
      setTotalPages(res.totalPages);
      setTotalProducts(res.total);
    } catch (error) {
      console.log('Lỗi tải sản phẩm');
    }
  };

  const loadMore = async () => {
    if (page < totalPages && !loadingMore) {
      setLoadingMore(true);
      await fetchProducts(page + 1, false);
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCategories();
    await fetchProducts(1, true);
    setRefreshing(false);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      try {
        setIsUploading(true);
        const realUrl = await uploadImageToCloudinary(result.assets[0].uri);
        setProdImageUrl(realUrl);
      } catch (error) {
        Alert.alert('Lỗi', 'Không thể tải ảnh lên máy chủ. Vui lòng thử lại!');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const openAddProduct = () => {
    setEditingProdId(null);
    setProdName(''); setProdPrice(''); setProdCostPrice(''); setProdStock(''); setProdSku(''); setProdUnit('Cái'); setProdImageUrl('');
    if (filterCatId) setSelectedCat(filterCatId);
    else if (categories.length > 0) setSelectedCat(categories[0]._id);
    setProdModalVisible(true);
  };

  const openEditProduct = (item: any) => {
    setEditingProdId(item._id);
    setProdName(item.name);
    setProdPrice(item.price.toString());
    setProdCostPrice((item.costPrice || 0).toString());
    setProdStock((item.stock || 0).toString());
    setProdSku(item.sku || '');
    setProdUnit(item.unit);
    setProdImageUrl(item.imageUrl || '');
    setSelectedCat(item.category_id);
    setProdModalVisible(true);
  };

  const handleSaveProduct = async () => {
    if (!prodName || !prodPrice || !prodCostPrice) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên, giá bán và giá vốn!');
      return;
    }
    try {
      const payload = {
        name: prodName,
        price: parseInt(prodPrice),
        costPrice: parseInt(prodCostPrice),
        stock: parseInt(prodStock) || 0,
        sku: prodSku,
        unit: prodUnit,
        category_id: selectedCat,
        imageUrl: prodImageUrl
      };

      if (editingProdId) await updateProduct(editingProdId, payload);
      else await addProduct(payload);

      setProdModalVisible(false);
      await fetchProducts(1, true);
      Alert.alert('Xong', 'Đã lưu sản phẩm');
    } catch (error) {
      Alert.alert('Lỗi', 'Không lưu được');
    }
  };

  const handleDeleteProduct = (id: string) => {
    Alert.alert('Xóa món này?', 'Món hàng sẽ được ẩn khỏi hệ thống.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive',
        onPress: async () => {
          await deleteProduct(id);
          await fetchProducts(1, true);
        }
      }
    ]);
  };

  const handleSaveCategory = async () => {
    if (!catName.trim()) return;
    try {
      if (editingCatId) await updateCategory(editingCatId, catName);
      else await addCategory(catName);
      setCatName(''); setEditingCatId(null);
      await fetchCategories();
    } catch (error) { Alert.alert('Lỗi', 'Không lưu được danh mục'); }
  };

  const handleEditCategory = (item: any) => { setCatName(item.name); setEditingCatId(item._id); };
  const handleDeleteCategory = (id: string) => {
    Alert.alert('Xóa danh mục?', 'Danh mục sẽ bị ẩn đi.', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => { await deleteCategory(id); await fetchCategories(); } }
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kho Hàng ({totalProducts})</Text>
        <TouchableOpacity onPress={() => setCatModalVisible(true)} style={styles.iconBtn}>
          <Ionicons name="folder-open" size={24} color="#2F95DC" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="gray" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm tên sản phẩm..."
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color="gray" />
            </TouchableOpacity>
          )}
        </View>

        {hasNewData && (
          <View style={styles.newDataContainer}>
            <TouchableOpacity
              style={styles.newDataPill}
              onPress={() => {
                setHasNewData(false);
                fetchProducts(1, true);
              }}
            >
              <Ionicons name="sync" size={16} color="white" style={{ marginRight: 5 }} />
              <Text style={styles.newDataText}>Có thay đổi kho hàng. Chạm để tải lại!</Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          horizontal
          data={[{ _id: null, name: 'Tất cả' }, ...categories]}
          keyExtractor={item => item._id ? item._id.toString() : 'all'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, filterCatId === item._id && styles.filterChipActive]}
              onPress={() => setFilterCatId(item._id)}
            >
              <Text style={[styles.filterText, filterCatId === item._id && styles.filterTextActive]}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item._id.toString()}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 30, color: 'gray' }}>Không có sản phẩm</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2F95DC']} tintColor="#2F95DC" />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#2F95DC" style={{ margin: 20 }} /> : null}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.itemCard} onPress={() => openEditProduct(item)}>
            <View style={styles.imgContainer}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.itemImg} resizeMode="cover" resizeMethod="resize" />
              ) : (
                <View style={styles.itemImgPlaceholder}><Text style={styles.itemImgText}>{item.name.charAt(0).toUpperCase()}</Text></View>
              )}
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemSub}>{item.categories?.name || 'Chưa phân loại'} • Kho: {item.stock}</Text>
              <Text style={styles.itemSubDetail}>Mã: {item.sku || 'Chưa có'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.itemPrice}>{item.price.toLocaleString('vi-VN')} đ</Text>
              <Text style={styles.itemCost}>Vốn: {item.costPrice?.toLocaleString('vi-VN')} đ</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={openAddProduct}>
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>

      {/* --- MODAL SẢN PHẨM MỚI TÍCH HỢP ĐẦY ĐỦ TRƯỜNG --- */}
      <Modal visible={prodModalVisible} animationType="slide" transparent={true}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{editingProdId ? 'Sửa món hàng' : 'Thêm món hàng'}</Text>

                <View style={{ flexDirection: 'row', marginBottom: 15 }}>
                  <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage} disabled={isUploading}>
                    {isUploading ? (
                      <ActivityIndicator size="large" color="#2F95DC" />
                    ) : prodImageUrl ? (
                      <Image source={{ uri: prodImageUrl }} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
                    ) : (
                      <Ionicons name="camera" size={30} color="#888" />
                    )}
                  </TouchableOpacity>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <TextInput style={styles.input} placeholder="Tên món hàng" value={prodName} onChangeText={setProdName} />
                    <TextInput style={[styles.input, { marginBottom: 0 }]} placeholder="Mã vạch (SKU)" value={prodSku} onChangeText={setProdSku} />
                  </View>
                </View>

                <View style={styles.row}>
                  <TextInput style={[styles.input, { flex: 1, marginRight: 5 }]} placeholder="Giá bán" keyboardType="numeric" value={prodPrice} onChangeText={setProdPrice} />
                  <TextInput style={[styles.input, { flex: 1, marginLeft: 5 }]} placeholder="Giá vốn" keyboardType="numeric" value={prodCostPrice} onChangeText={setProdCostPrice} />
                </View>

                <View style={styles.row}>
                  <TextInput style={[styles.input, { flex: 1, marginRight: 5 }]} placeholder="Tồn kho" keyboardType="numeric" value={prodStock} onChangeText={setProdStock} />
                  <TextInput style={[styles.input, { flex: 1, marginLeft: 5 }]} placeholder="Đơn vị (Cái, Chai...)" value={prodUnit} onChangeText={setProdUnit} />
                </View>

                <Text style={styles.label}>Chọn danh mục:</Text>
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={selectedCat} onValueChange={(v) => setSelectedCat(v)}>
                    {categories.map((c) => <Picker.Item key={c._id} label={c.name} value={c._id} />)}
                  </Picker>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => setProdModalVisible(false)}><Text style={{ color: 'white', fontWeight: 'bold' }}>Hủy</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleSaveProduct}><Text style={{ color: 'white', fontWeight: 'bold' }}>Lưu món</Text></TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- MODAL DANH MỤC (Giữ nguyên) --- */}
      <Modal visible={catModalVisible} animationType="fade" transparent={true}>
        <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setCatModalVisible(false); }}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <View style={[styles.modalContent, { height: '70%' }]}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>Quản lý Danh mục</Text>
                  <TouchableOpacity onPress={() => setCatModalVisible(false)}><Ionicons name="close" size={24} color="gray" /></TouchableOpacity>
                </View>
                <View style={styles.addCatRow}>
                  <TextInput style={[styles.input, { marginBottom: 0, flex: 1 }]} placeholder="Nhập tên danh mục..." value={catName} onChangeText={setCatName} />
                  <TouchableOpacity style={styles.addCatBtn} onPress={handleSaveCategory}><Ionicons name={editingCatId ? "checkmark" : "add"} size={24} color="white" /></TouchableOpacity>
                  {editingCatId && (<TouchableOpacity style={[styles.addCatBtn, { backgroundColor: 'gray', marginLeft: 5 }]} onPress={() => { setEditingCatId(null); setCatName(''); }}><Ionicons name="close" size={24} color="white" /></TouchableOpacity>)}
                </View>
                <FlatList data={categories} keyExtractor={item => item._id.toString()} renderItem={({ item }) => (
                  <View style={styles.catItemRow}>
                    <Text style={styles.catItemText}>{item.name}</Text>
                    <View style={{ flexDirection: 'row' }}>
                      <TouchableOpacity onPress={() => handleEditCategory(item)} style={{ padding: 8 }}><Ionicons name="pencil" size={20} color="#2F95DC" /></TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteCategory(item._id)} style={{ padding: 8 }}><Ionicons name="trash-outline" size={20} color="red" /></TouchableOpacity>
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
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingVertical: 15, backgroundColor: 'white', shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  iconBtn: { padding: 5, marginLeft: 15 },

  filterContainer: { backgroundColor: 'white', paddingBottom: 10, marginBottom: 5 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2F5', margin: 15, marginBottom: 5, paddingHorizontal: 15, borderRadius: 12, height: 45 },
  searchInput: { flex: 1, fontSize: 16, height: '100%', color: '#333' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0F2F5', marginRight: 10, marginLeft: 5 },
  filterChipActive: { backgroundColor: '#2F95DC' },
  filterText: { color: '#666', fontWeight: '600' },
  filterTextActive: { color: 'white' },

  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, marginHorizontal: 15, marginTop: 10, borderRadius: 12, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 5, elevation: 1 },
  imgContainer: { width: 55, height: 55, borderRadius: 10, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4F8' },
  itemImg: { width: '100%', height: '100%' },
  itemImgPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#E1F5FE' },
  itemImgText: { fontSize: 20, fontWeight: 'bold', color: '#2F95DC' },

  itemName: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 3 },
  itemSub: { color: '#666', fontSize: 13 },
  itemSubDetail: { color: '#888', fontSize: 12, marginTop: 2 },
  itemPrice: { fontSize: 16, fontWeight: 'bold', color: '#2F95DC' },
  itemCost: { fontSize: 12, color: '#888', marginTop: 4 },

  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: '#2F95DC', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#2F95DC', shadowOpacity: 0.4, shadowRadius: 5, elevation: 5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },

  imagePickerBtn: { width: 80, height: 80, backgroundColor: '#F0F2F5', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#DDD', borderStyle: 'dashed' },
  input: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E9ECEF', borderRadius: 10, padding: 12, marginBottom: 15, fontSize: 15, color: '#333' },
  row: { flexDirection: 'row' },
  label: { marginBottom: 5, color: '#666', fontWeight: '600', fontSize: 13 },
  pickerContainer: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E9ECEF', borderRadius: 10, marginBottom: 25 },

  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
  btnCancel: { backgroundColor: '#FF6B6B', marginRight: 10 },
  btnSave: { backgroundColor: '#2F95DC', marginLeft: 10 },

  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  addCatRow: { flexDirection: 'row', marginBottom: 20 },
  addCatBtn: { backgroundColor: '#2F95DC', width: 48, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 10, marginLeft: 10 },
  catItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  catItemText: { fontSize: 16, color: '#333', fontWeight: '500' },

  newDataContainer: {
    position: 'absolute',
    top: 140,
    width: '100%',
    alignItems: 'center',
    zIndex: 10,
  },
  newDataPill: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  newDataText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
});