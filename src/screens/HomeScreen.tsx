import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, Alert, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getProducts, getCategories } from '../services/productService';
import { formatCurrency } from '../utils/format';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_WIDTH = (width - 40) / COLUMN_COUNT;

export default function HomeScreen({ navigation }: any) {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);

  const [cart, setCart] = useState<any[]>([]);

  // State cho Modal Giỏ hàng
  const [cartVisible, setCartVisible] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  useEffect(() => {
    // Lắng nghe bảng PRODUCTS (Sản phẩm thay đổi giá/tên...)
    const productSub = supabase
      .channel('home_products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchData();
      })
      .subscribe();

    // Lắng nghe bảng CATEGORIES (Có danh mục mới...)
    const categorySub = supabase
      .channel('home_categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      // Hủy đăng ký khi thoát
      supabase.removeChannel(productSub);
      supabase.removeChannel(categorySub);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [prods, cats] = await Promise.all([getProducts(), getCategories()]);
      setProducts(prods);
      setCategories([{ id: null, name: 'Tất cả' }, ...cats]);
    } catch (error) {
      console.log('Lỗi tải dữ liệu');
    }
  };

  const filteredProducts = useMemo(() => {
    if (!selectedCat) return products;
    return products.filter(p => p.category_id === selectedCat);
  }, [products, selectedCat]);

  // --- LOGIC GIỎ HÀNG (QUAN TRỌNG) ---

  // 1. Thêm (Tăng số lượng)
  const addToCart = (product: any) => {
    setCart(currentCart => {
      const existingItem = currentCart.find(item => item.id === product.id);
      if (existingItem) {
        return currentCart.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...currentCart, { ...product, quantity: 1 }];
    });
  };

  // 2. Giảm (Nếu còn 1 mà giảm thì xóa luôn)
  const decreaseQuantity = (productId: number) => {
    setCart(currentCart => {
      const existingItem = currentCart.find(item => item.id === productId);
      if (existingItem?.quantity === 1) {
        // Xóa khỏi giỏ
        return currentCart.filter(item => item.id !== productId);
      }
      // Giảm số lượng đi 1
      return currentCart.map(item =>
        item.id === productId ? { ...item, quantity: item.quantity - 1 } : item
      );
    });
  };

  // 3. Xóa hẳn món đó ra khỏi giỏ
  const removeItem = (productId: number) => {
    setCart(currentCart => currentCart.filter(item => item.id !== productId));
  };

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  const totalQuantity = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setCartVisible(false); // Đóng modal giỏ hàng lại
    Alert.alert('Chốt đơn?', `Tổng tiền: ${formatCurrency(totalAmount)}`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'OK', onPress: () => console.log('Lưu hóa đơn...') }
    ]);
  };

  // --- GIAO DIỆN ---

  const renderProduct = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.prodItem}
      onPress={() => addToCart(item)}
      activeOpacity={0.7}
    >
      <View style={styles.prodInfo}>
        <Text style={styles.prodName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.prodPrice}>{formatCurrency(item.price)}</Text>
      </View>
      {cart.find(c => c.id === item.id) && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {cart.find(c => c.id === item.id).quantity}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Danh mục */}
      <View style={styles.catContainer}>
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id ? item.id.toString() : 'all'}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.catItem, selectedCat === item.id && styles.catItemActive]}
              onPress={() => setSelectedCat(item.id)}
            >
              <Text style={[styles.catText, selectedCat === item.id && styles.catTextActive]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Lưới sản phẩm */}
      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id.toString()}
        renderItem={renderProduct}
        numColumns={COLUMN_COUNT}
        contentContainerStyle={{ padding: 10, paddingBottom: 100 }}
      />

      {/* Thanh Bottom Bar */}
      {cart.length > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.cartInfo}
            onPress={() => setCartVisible(true)} // Bấm vào đây để mở Modal sửa giỏ hàng
          >
            <View style={styles.cartIconBadge}>
              <Ionicons name="cart" size={24} color="#2F95DC" />
              <View style={styles.miniBadge}>
                <Text style={styles.miniBadgeText}>{totalQuantity}</Text>
              </View>
            </View>
            <View>
              <Text style={styles.totalLabel}>Chi tiết & Sửa</Text>
              <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
            </View>
            <Ionicons name="chevron-up" size={20} color="gray" style={{ marginLeft: 10 }} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.payBtn} onPress={handleCheckout}>
            <Text style={styles.payBtnText}>THANH TOÁN</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* --- MODAL CHI TIẾT GIỎ HÀNG --- */}
      <Modal visible={cartVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f9f9' }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Giỏ hàng đang chọn</Text>
            <TouchableOpacity onPress={() => setCartVisible(false)}>
              <Ionicons name="close-circle" size={30} color="gray" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={cart}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ padding: 15 }}
            renderItem={({ item }) => (
              <View style={styles.cartItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartItemName}>{item.name}</Text>
                  <Text style={styles.cartItemPrice}>{formatCurrency(item.price)}</Text>
                </View>

                {/* Bộ điều khiển số lượng */}
                <View style={styles.qtyControl}>
                  <TouchableOpacity onPress={() => decreaseQuantity(item.id)} style={styles.qtyBtn}>
                    <Ionicons name="remove" size={20} color="#333" />
                  </TouchableOpacity>

                  <Text style={styles.qtyText}>{item.quantity}</Text>

                  <TouchableOpacity onPress={() => addToCart(item)} style={styles.qtyBtn}>
                    <Ionicons name="add" size={20} color="#333" />
                  </TouchableOpacity>
                </View>

                {/* Nút xóa hẳn */}
                <TouchableOpacity onPress={() => removeItem(item.id)} style={{ marginLeft: 15 }}>
                  <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            )}
          />

          <View style={styles.modalFooter}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
              <Text style={{ fontSize: 16, color: 'gray' }}>Tổng tiền:</Text>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2F95DC' }}>{formatCurrency(totalAmount)}</Text>
            </View>
            <TouchableOpacity style={styles.payBtnFull} onPress={handleCheckout}>
              <Text style={styles.payBtnTextFull}>XÁC NHẬN THANH TOÁN</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // ... (Giữ nguyên các style cũ của container, catItem, prodItem...)
  container: { flex: 1, backgroundColor: '#F0F2F5', paddingTop: 40 },
  catContainer: { height: 50, backgroundColor: 'white', marginBottom: 5 },
  catItem: { paddingHorizontal: 15, justifyContent: 'center', height: 50, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  catItemActive: { borderBottomColor: '#2F95DC' },
  catText: { fontSize: 15, color: 'gray' },
  catTextActive: { color: '#2F95DC', fontWeight: 'bold' },
  prodItem: {
    width: ITEM_WIDTH, height: ITEM_WIDTH, backgroundColor: 'white', margin: 5, borderRadius: 8,
    padding: 8, justifyContent: 'space-between', elevation: 1
  },
  prodInfo: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  prodName: { fontSize: 14, textAlign: 'center', marginBottom: 4, color: '#333' },
  prodPrice: { fontSize: 13, fontWeight: 'bold', color: '#2F95DC' },
  badge: {
    position: 'absolute', top: 5, right: 5, backgroundColor: 'red', width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center'
  },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  // Bottom Bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white', height: 80, flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: '#ddd', padding: 15, paddingBottom: 25, elevation: 10
  },
  cartInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  cartIconBadge: { marginRight: 10 },
  miniBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: 'red', borderRadius: 8, paddingHorizontal: 4 },
  miniBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  totalLabel: { fontSize: 12, color: 'gray' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  payBtn: { backgroundColor: '#2F95DC', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, borderRadius: 8, marginLeft: 10 },
  payBtnText: { color: 'white', fontWeight: 'bold', marginRight: 5 },

  // --- STYLES CHO MODAL ---
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: '#eee', backgroundColor: 'white' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },

  cartItemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, marginBottom: 10, borderRadius: 10 },
  cartItemName: { fontSize: 16, fontWeight: '600' },
  cartItemPrice: { color: 'gray', marginTop: 4 },

  qtyControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2F5', borderRadius: 8 },
  qtyBtn: { padding: 10 },
  qtyText: { fontSize: 16, fontWeight: 'bold', marginHorizontal: 10, minWidth: 20, textAlign: 'center' },

  modalFooter: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#eee' },
  payBtnFull: { backgroundColor: '#2F95DC', padding: 15, borderRadius: 10, alignItems: 'center' },
  payBtnTextFull: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});