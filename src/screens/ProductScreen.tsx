import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform, RefreshControl, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { StatusBar } from 'expo-status-bar';

import {
  getProducts, getCategories, addProduct, deleteProduct, updateProduct,
  addCategory, updateCategory, deleteCategory
} from '../services/productService';
import { supabase } from '../lib/supabase';

export default function ProductScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // --- STATE TÌM KIẾM & LỌC (MỚI) ---
  const [searchText, setSearchText] = useState('');
  const [filterCatId, setFilterCatId] = useState<number | null>(null); // null = Hiện tất cả

  // --- STATE MODAL SẢN PHẨM ---
  const [prodModalVisible, setProdModalVisible] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodUnit, setProdUnit] = useState('Cái');
  const [selectedCat, setSelectedCat] = useState<number | null>(null); // Dùng cho Modal
  const [editingProdId, setEditingProdId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // --- STATE MODAL DANH MỤC ---
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [catName, setCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();

    // --- A. LOGIC REALTIME (CŨ) ---
    const productSub = supabase
      .channel('prods_realtime_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData)
      .subscribe();

    const catSub = supabase
      .channel('cats_realtime_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchData)
      .subscribe();

    // --- B. LOGIC TỰ LOAD KHI CÓ MẠNG (MỚI) ---
    const unsubscribeNet = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        // console.log('ProductScreen: Có mạng lại'); // Bỏ comment nếu muốn test
        fetchData();
      }
    });

    return () => {
      // Hủy đăng ký tất cả khi thoát màn hình
      supabase.removeChannel(productSub);
      supabase.removeChannel(catSub);
      unsubscribeNet(); // <--- Quan trọng
    };
  }, []);

  const fetchData = async () => {
    try {
      const [prods, cats] = await Promise.all([getProducts(), getCategories()]);
      setProducts(prods);
      setCategories(cats);
    } catch (error) {
      console.log('Lỗi tải dữ liệu');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(); // Đợi tải xong dữ liệu
    setRefreshing(false); // Tắt vòng quay
  };

  // --- LOGIC LỌC DANH SÁCH (MỚI - QUAN TRỌNG) ---
  const filteredList = useMemo(() => {
    return products.filter(p => {
      // 1. Lọc theo tên (không phân biệt hoa thường)
      const matchName = p.name.toLowerCase().includes(searchText.toLowerCase());
      // 2. Lọc theo danh mục
      const matchCat = filterCatId === null || p.category_id === filterCatId;

      return matchName && matchCat;
    });
  }, [products, searchText, filterCatId]);

  // --- CÁC HÀM XỬ LÝ CŨ (GIỮ NGUYÊN) ---
  const openAddProduct = () => {
    setEditingProdId(null);
    setProdName(''); setProdPrice(''); setProdUnit('Cái');
    // Mặc định chọn danh mục đầu tiên hoặc danh mục đang lọc
    if (filterCatId) setSelectedCat(filterCatId);
    else if (categories.length > 0) setSelectedCat(categories[0].id);

    setProdModalVisible(true);
  };

  const openEditProduct = (item: any) => {
    setEditingProdId(item.id);
    setProdName(item.name);
    setProdPrice(item.price.toString());
    setProdUnit(item.unit);
    setSelectedCat(item.category_id);
    setProdModalVisible(true);
  };

  const handleSaveProduct = async () => {
    if (!prodName || !prodPrice) {
      Alert.alert('Thiếu thông tin', 'Nhập tên và giá nhé!');
      return;
    }
    try {
      const price = parseInt(prodPrice);
      const payload = { name: prodName, price, unit: prodUnit, category_id: selectedCat };

      if (editingProdId) await updateProduct(editingProdId, payload);
      else await addProduct(payload);

      setProdModalVisible(false);
      await fetchData();
      Alert.alert('Xong', 'Đã lưu sản phẩm');
    } catch (error) {
      Alert.alert('Lỗi', 'Không lưu được');
    }
  };

  const handleDeleteProduct = (id: number) => {
    Alert.alert('Xóa món này?', '', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          await deleteProduct(id);
          await fetchData();
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
      await fetchData();
    } catch (error) { Alert.alert('Lỗi', 'Không lưu được danh mục'); }
  };

  const handleEditCategory = (item: any) => { setCatName(item.name); setEditingCatId(item.id); };
  const handleDeleteCategory = (id: number) => {
    Alert.alert('Xóa danh mục?', 'Sản phẩm sẽ mất danh mục này.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          await deleteCategory(id);
          await fetchData();
        }
      }
    ]);
  };

  // --- GIAO DIỆN ---
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="dark" backgroundColor="white" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kho Hàng ({filteredList.length})</Text>
        <TouchableOpacity onPress={() => setCatModalVisible(true)} style={styles.iconBtn}>
          <Ionicons name="folder-open" size={24} color="#2F95DC" />
        </TouchableOpacity>
      </View>

      {/* --- CÔNG CỤ TÌM KIẾM & LỌC --- */}
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

        <FlatList
          horizontal
          data={[{ id: null, name: 'Tất cả' }, ...categories]}
          keyExtractor={item => item.id ? item.id.toString() : 'all'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                filterCatId === item.id && styles.filterChipActive
              ]}
              onPress={() => setFilterCatId(item.id)}
            >
              <Text style={[
                styles.filterText,
                filterCatId === item.id && styles.filterTextActive
              ]}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* --- DANH SÁCH SẢN PHẨM --- */}
      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 30, color: 'gray' }}>Không tìm thấy sản phẩm nào</Text>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2F95DC']}
            tintColor="#2F95DC"
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.itemCard} onPress={() => openEditProduct(item)}>

            {/* 6. HIỂN THỊ ẢNH (MỚI) */}
            <View style={styles.imgContainer}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.itemImg} />
              ) : (
                <View style={styles.itemImgPlaceholder}>
                  <Text style={styles.itemImgText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemSub}>{item.categories?.name || 'Chưa phân loại'} • {item.unit}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.itemPrice}>{item.price.toLocaleString('vi-VN')} đ</Text>
              <TouchableOpacity onPress={() => handleDeleteProduct(item.id)} style={{ padding: 5 }}>
                <Ionicons name="trash-outline" size={20} color="red" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={openAddProduct}>
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>

      {/* --- MODAL SẢN PHẨM (Giữ nguyên logic) --- */}
      <Modal visible={prodModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingProdId ? 'Sửa món' : 'Thêm món'}</Text>
            <TextInput style={styles.input} placeholder="Tên món" value={prodName} onChangeText={setProdName} />

            {/* Nếu sau này muốn thêm ô nhập URL ảnh thì thêm ở đây */}

            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1, marginRight: 10 }]} placeholder="Giá bán" keyboardType="numeric" value={prodPrice} onChangeText={setProdPrice} />
              <TextInput style={[styles.input, { width: 100 }]} placeholder="Đơn vị" value={prodUnit} onChangeText={setProdUnit} />
            </View>
            <Text style={styles.label}>Chọn danh mục:</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={selectedCat} onValueChange={(v) => setSelectedCat(v)}>
                {categories.map((c) => <Picker.Item key={c.id} label={c.name} value={c.id} />)}
              </Picker>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => setProdModalVisible(false)}><Text style={{ color: 'white' }}>Hủy</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleSaveProduct}><Text style={{ color: 'white', fontWeight: 'bold' }}>Lưu</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- MODAL DANH MỤC --- */}
      <Modal visible={catModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
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
            <FlatList
              data={categories}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.catItemRow}>
                  <Text style={styles.catItemText}>{item.name}</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity onPress={() => handleEditCategory(item)} style={{ padding: 8 }}><Ionicons name="pencil" size={20} color="#2F95DC" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteCategory(item.id)} style={{ padding: 8 }}><Ionicons name="trash-outline" size={20} color="red" /></TouchableOpacity>
                  </View>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingVertical: 15, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#ddd' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  iconBtn: { padding: 5, marginLeft: 15 },

  // Search & Filter
  filterContainer: { backgroundColor: 'white', paddingBottom: 10, marginBottom: 5 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2F5',
    margin: 15, marginBottom: 5, paddingHorizontal: 10, borderRadius: 8, height: 40
  },
  searchInput: { flex: 1, fontSize: 16, height: '100%' },
  filterChip: {
    paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F0F2F5', marginRight: 10, marginLeft: 5, borderWidth: 1, borderColor: 'transparent'
  },
  filterChipActive: { backgroundColor: '#E1F5FE', borderColor: '#2F95DC' },
  filterText: { color: 'gray', fontWeight: '500' },
  filterTextActive: { color: '#2F95DC', fontWeight: 'bold' },

  // ITEM CARD (Đã sửa để hiện ảnh đẹp hơn)
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center', // Căn giữa dọc
    backgroundColor: 'white',
    padding: 15,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 10,
    elevation: 2
  },
  // Style cho ảnh
  imgContainer: {
    width: 50, height: 50, borderRadius: 8, overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4F8'
  },
  itemImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  itemImgPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#E1F5FE' },
  itemImgText: { fontSize: 18, fontWeight: 'bold', color: '#2F95DC' },

  itemName: { fontSize: 16, fontWeight: '600', color: '#333' },
  itemSub: { color: 'gray', fontSize: 13, marginTop: 4 },
  itemPrice: { fontSize: 16, fontWeight: 'bold', color: '#2F95DC' },

  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: '#2F95DC', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 15, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16 },
  row: { flexDirection: 'row' },
  label: { marginBottom: 5, color: 'gray' },
  pickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center' },
  btnCancel: { backgroundColor: '#FF6B6B', marginRight: 10 },
  btnSave: { backgroundColor: '#2F95DC', marginLeft: 10 },

  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  addCatRow: { flexDirection: 'row', marginBottom: 20 },
  addCatBtn: { backgroundColor: '#2F95DC', width: 48, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 8, marginLeft: 10 },
  catItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  catItemText: { fontSize: 16, color: '#333' }
});