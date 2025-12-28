import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

import { getProducts, getCategories, addProduct, deleteProduct, updateProduct } from '../services/productService';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/format';

export default function ProductScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // State cho Modal thêm mới
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newUnit, setNewUnit] = useState('cái');
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Load dữ liệu khi vào màn hình
  useEffect(() => {
    fetchData();

    // --- CẤU HÌNH REALTIME (Tự động cập nhật) ---
    const subscription = supabase
      .channel('realtime:products') // Đặt tên kênh bất kỳ
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' }, // Lắng nghe mọi thay đổi trên bảng products
        (payload) => {
          console.log('Có thay đổi từ Server:', payload);
          fetchData(); // Tải lại danh sách ngay lập tức
        }
      )
      .subscribe();

    // Hủy đăng ký khi thoát màn hình để tránh rò rỉ bộ nhớ
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [prods, cats] = await Promise.all([getProducts(), getCategories()]);
      setProducts(prods);
      setCategories(cats);
      // Chỉ set default category nếu chưa có selection và đang ko edit
      if (!selectedCat && cats.length > 0) setSelectedCat(cats[0].id);
    } catch (error) {
      Alert.alert('Lỗi', 'Không tải được dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null); // Reset về chế độ thêm
    setNewName('');
    setNewPrice('');
    setNewUnit('cái');
    if (categories.length > 0) setSelectedCat(categories[0].id);
    setModalVisible(true);
  };

  const openEditModal = (item: any) => {
    setEditingId(item.id); // Lưu ID đang sửa
    setNewName(item.name);
    setNewPrice(item.price.toString());
    setNewUnit(item.unit);
    setSelectedCat(item.category_id);
    setModalVisible(true);
  };

  const handleAddProduct = async () => {
    if (!newName || !newPrice) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên và giá');
      return;
    }

    try {
      const priceNumber = parseInt(newPrice);

      if (editingId) {
        // --- LOGIC SỬA ---
        await updateProduct(editingId, {
          name: newName,
          price: priceNumber,
          unit: newUnit,
          category_id: selectedCat
        });
        Alert.alert('Xong', 'Đã cập nhật sản phẩm!');
      } else {
        // --- LOGIC THÊM ---
        await addProduct({
          name: newName,
          price: priceNumber,
          unit: newUnit,
          category_id: selectedCat
        });
        Alert.alert('Xong', 'Đã thêm món mới!');
      }

      setModalVisible(false);
      fetchData(); // Load lại danh sách
    } catch (error) {
      Alert.alert('Lỗi', 'Không thêm được sản phẩm');
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa món này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          await deleteProduct(id);
        }
      }
    ]);
  };

  // Giao diện từng món hàng trong danh sách
  const renderItem = ({ item }: { item: any }) => (
    // Bấm vào item thì mở Sửa
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => openEditModal(item)}
      activeOpacity={0.7}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemSub}>
          {item.categories?.name} • Đơn vị: {item.unit}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.itemPrice}>
          {item.price.toLocaleString('vi-VN')} đ
        </Text>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ padding: 5 }}>
          <Ionicons name="trash-outline" size={20} color="red" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kho Hàng ({products.length})</Text>
        {/* Nút reload thủ công phòng khi mạng lag */}
        <TouchableOpacity onPress={() => { setLoading(true); fetchData().then(() => setLoading(false)); }}>
          <Ionicons name="reload" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2F95DC" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      {/* Nút thêm mới gọi hàm openAddModal */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Đổi tiêu đề dựa theo trạng thái */}
            <Text style={styles.modalTitle}>
              {editingId ? 'Chỉnh Sửa Món' : 'Thêm Món Mới'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Tên sản phẩm"
              value={newName}
              onChangeText={setNewName}
            />

            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 10 }]}
                placeholder="Giá bán"
                keyboardType="numeric"
                value={newPrice}
                onChangeText={setNewPrice}
              />
              <TextInput
                style={[styles.input, { width: 100 }]}
                placeholder="Đơn vị"
                value={newUnit}
                onChangeText={setNewUnit}
              />
            </View>

            <Text style={styles.label}>Chọn danh mục:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedCat}
                onValueChange={(itemValue) => setSelectedCat(itemValue)}
              >
                {categories.map((cat) => (
                  <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
                ))}
              </Picker>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.btn, styles.btnCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: 'white' }}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.btnSave]}
                onPress={handleAddProduct}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                  {editingId ? 'Cập nhật' : 'Lưu mới'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 50, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#ddd'
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },

  itemCard: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: 'white', padding: 15, marginHorizontal: 15, marginTop: 10,
    borderRadius: 10, elevation: 2
  },
  itemName: { fontSize: 16, fontWeight: '600', color: '#333' },
  itemSub: { color: 'gray', fontSize: 13, marginTop: 4 },
  itemPrice: { fontSize: 16, fontWeight: 'bold', color: '#2F95DC' },

  fab: {
    position: 'absolute', right: 20, bottom: 20,
    backgroundColor: '#2F95DC', width: 60, height: 60, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center', elevation: 5
  },

  // Styles Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 15, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, marginBottom: 15, fontSize: 16
  },
  row: { flexDirection: 'row' },
  label: { marginBottom: 5, color: 'gray' },
  pickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 20 },

  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center' },
  btnCancel: { backgroundColor: '#FF6B6B', marginRight: 10 },
  btnSave: { backgroundColor: '#2F95DC', marginLeft: 10 },
});