import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

import {
  getProducts, getCategories, addProduct, deleteProduct, updateProduct,
  addCategory, updateCategory, deleteCategory // Import thêm các hàm mới
} from '../services/productService';
import { supabase } from '../lib/supabase';

export default function ProductScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // --- STATE CHO SẢN PHẨM ---
  const [prodModalVisible, setProdModalVisible] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodUnit, setProdUnit] = useState('cái');
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [editingProdId, setEditingProdId] = useState<number | null>(null);

  // --- STATE CHO DANH MỤC (MỚI) ---
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [catName, setCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();

    // Realtime: Lắng nghe cả Products và Categories
    const productSub = supabase
      .channel('prods_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData)
      .subscribe();

    const catSub = supabase
      .channel('cats_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(productSub);
      supabase.removeChannel(catSub);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [prods, cats] = await Promise.all([getProducts(), getCategories()]);
      setProducts(prods);
      setCategories(cats);
      // Mặc định chọn danh mục đầu tiên cho form thêm sản phẩm
      if (!selectedCat && cats.length > 0) setSelectedCat(cats[0].id);
    } catch (error) {
      console.log('Lỗi tải dữ liệu');
    }
  };

  // --- XỬ LÝ SẢN PHẨM (Code cũ) ---
  const openAddProduct = () => {
    setEditingProdId(null);
    setProdName(''); setProdPrice(''); setProdUnit('cái');
    if (categories.length > 0) setSelectedCat(categories[0].id);
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
      Alert.alert('Xong', 'Đã lưu sản phẩm');
    } catch (error) {
      Alert.alert('Lỗi', 'Không lưu được');
    }
  };

  const handleDeleteProduct = (id: number) => {
    Alert.alert('Xóa món này?', '', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => deleteProduct(id) }
    ]);
  };

  // --- XỬ LÝ DANH MỤC (MỚI) ---
  const handleSaveCategory = async () => {
    if (!catName.trim()) return;
    try {
      if (editingCatId) await updateCategory(editingCatId, catName);
      else await addCategory(catName);

      setCatName('');
      setEditingCatId(null);
      // Không cần alert, danh sách tự update nhờ Realtime
    } catch (error) {
      Alert.alert('Lỗi', 'Không lưu được danh mục');
    }
  };

  const handleEditCategory = (item: any) => {
    setCatName(item.name);
    setEditingCatId(item.id);
  };

  const handleDeleteCategory = (id: number) => {
    Alert.alert('Xóa danh mục?', 'Các sản phẩm thuộc danh mục này sẽ không bị xóa (mất danh mục).', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => deleteCategory(id) }
    ]);
  };

  // --- RENDER ---
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kho Hàng ({products.length})</Text>
        <View style={{ flexDirection: 'row' }}>
          {/* Nút mở quản lý Danh mục */}
          <TouchableOpacity onPress={() => setCatModalVisible(true)} style={styles.iconBtn}>
            <Ionicons name="folder-open" size={24} color="#2F95DC" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 80 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.itemCard} onPress={() => openEditProduct(item)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemSub}>{item.categories?.name} • {item.unit}</Text>
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

      {/* --- MODAL SẢN PHẨM --- */}
      <Modal visible={prodModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingProdId ? 'Sửa món' : 'Thêm món'}</Text>

            <TextInput style={styles.input} placeholder="Tên món" value={prodName} onChangeText={setProdName} />
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
              <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => setProdModalVisible(false)}>
                <Text style={{ color: 'white' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleSaveProduct}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- MODAL QUẢN LÝ DANH MỤC (MỚI) --- */}
      <Modal visible={catModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '70%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Quản lý Danh mục</Text>
              <TouchableOpacity onPress={() => setCatModalVisible(false)}>
                <Ionicons name="close" size={24} color="gray" />
              </TouchableOpacity>
            </View>

            {/* Form thêm/sửa nhanh */}
            <View style={styles.addCatRow}>
              <TextInput
                style={[styles.input, { marginBottom: 0, flex: 1 }]}
                placeholder="Nhập tên danh mục..."
                value={catName}
                onChangeText={setCatName}
              />
              <TouchableOpacity style={styles.addCatBtn} onPress={handleSaveCategory}>
                <Ionicons name={editingCatId ? "checkmark" : "add"} size={24} color="white" />
              </TouchableOpacity>
              {editingCatId && (
                <TouchableOpacity
                  style={[styles.addCatBtn, { backgroundColor: 'gray', marginLeft: 5 }]}
                  onPress={() => { setEditingCatId(null); setCatName(''); }}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              )}
            </View>

            {/* Danh sách danh mục */}
            <FlatList
              data={categories}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.catItemRow}>
                  <Text style={styles.catItemText}>{item.name}</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity onPress={() => handleEditCategory(item)} style={{ padding: 8 }}>
                      <Ionicons name="pencil" size={20} color="#2F95DC" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteCategory(item.id)} style={{ padding: 8 }}>
                      <Ionicons name="trash-outline" size={20} color="red" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#ddd' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  iconBtn: { padding: 5, marginLeft: 15 },

  itemCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'white', padding: 15, marginHorizontal: 15, marginTop: 10, borderRadius: 10, elevation: 2 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#333' },
  itemSub: { color: 'gray', fontSize: 13, marginTop: 4 },
  itemPrice: { fontSize: 16, fontWeight: 'bold', color: '#2F95DC' },
  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: '#2F95DC', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },

  // Modal common
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

  // Styles riêng cho Modal Danh mục
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  addCatRow: { flexDirection: 'row', marginBottom: 20 },
  addCatBtn: { backgroundColor: '#2F95DC', width: 48, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 8, marginLeft: 10 },
  catItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  catItemText: { fontSize: 16, color: '#333' }
});