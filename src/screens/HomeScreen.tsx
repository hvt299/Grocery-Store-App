import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, Alert, Modal, TextInput, Platform, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { StatusBar } from 'expo-status-bar';

import { getProducts, getCategories, createInvoice } from '../services/productService';
import { formatCurrency } from '../utils/format';
import { supabase } from '../lib/supabase';

// --- CẤU HÌNH UI ---
const { width } = Dimensions.get('window');
const SPACING = 16; // Khoảng cách chuẩn
const COLUMN_COUNT = 2;
// Tính toán chiều rộng item: (Màn hình - Padding trái phải - Khoảng giữa) / 2
const ITEM_WIDTH = (width - (SPACING * 3)) / 2;

const COLORS = {
  primary: '#007AFF',      // Xanh iOS chuẩn
  background: '#F8F9FA',   // Xám trắng rất nhạt (nền App)
  card: '#FFFFFF',         // Trắng tinh (nền Card)
  text: '#1A1A1A',         // Đen xám (Chữ chính)
  subText: '#8E8E93',      // Xám nhạt (Chữ phụ)
  danger: '#FF3B30',       // Đỏ (Nút xóa/Badge)
  success: '#34C759',      // Xanh lá (Thành công)
  inputBg: '#EEF1F4'       // Nền ô tìm kiếm
};

export default function HomeScreen({ navigation }: any) {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [cartVisible, setCartVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // --- LOGIC LỜI CHÀO TỰ ĐỘNG ---
  const getGreetingTime = () => {
    const hours = new Date().getHours();
    if (hours >= 5 && hours < 11) return { text: 'Chào buổi sáng,', icon: 'sunny-outline', color: '#FDB813' }; // Sáng (5h-11h)
    if (hours >= 11 && hours < 14) return { text: 'Chào buổi trưa,', icon: 'sunny', color: '#FF9800' };         // Trưa (11h-14h)
    if (hours >= 14 && hours < 18) return { text: 'Chào buổi chiều,', icon: 'partly-sunny-outline', color: '#FF5722' }; // Chiều (14h-18h)
    return { text: 'Chào buổi tối,', icon: 'moon-outline', color: '#673AB7' };                                  // Tối
  };

  const greeting = getGreetingTime();
  const todayStr = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' });

  useFocusEffect(React.useCallback(() => { fetchData(); }, []));

  useEffect(() => {
    // 1. Realtime Supabase (Giữ nguyên)
    const pSub = supabase.channel('h_prods').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData).subscribe();
    const cSub = supabase.channel('h_cats').on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchData).subscribe();

    // 2. TỰ ĐỘNG LOAD LẠI KHI CÓ MẠNG (THÊM ĐOẠN NÀY)
    const unsubscribeNet = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        fetchData();
      }
    });

    return () => {
      supabase.removeChannel(pSub);
      supabase.removeChannel(cSub);
      unsubscribeNet(); // Quan trọng: Hủy lắng nghe khi thoát màn hình
    };
  }, []);

  const fetchData = async () => {
    try {
      const [prods, cats] = await Promise.all([getProducts(), getCategories()]);
      setProducts(prods);
      setCategories([{ id: null, name: 'Tất cả' }, ...cats]);
    } catch (e) { console.log('Lỗi tải dữ liệu'); }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCat === null || p.category_id === selectedCat;
      const matchName = p.name.toLowerCase().includes(searchText.toLowerCase());
      return matchCat && matchName;
    });
  }, [products, selectedCat, searchText]);

  // --- CART LOGIC ---
  const addToCart = (product: any) => {
    setCart(curr => {
      const existing = curr.find(i => i.id === product.id);
      if (existing) return curr.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...curr, { ...product, quantity: 1 }];
    });
  };

  const decreaseQuantity = (productId: number) => {
    setCart(curr => {
      const existing = curr.find(i => i.id === productId);
      if (existing?.quantity === 1) return curr.filter(i => i.id !== productId);
      return curr.map(i => i.id === productId ? { ...i, quantity: i.quantity - 1 } : i);
    });
  };

  const removeItem = (productId: number) => setCart(curr => curr.filter(i => i.id !== productId));

  const totalAmount = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);
  const totalQuantity = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setCartVisible(false);
    Alert.alert('Chốt đơn?', `Tổng: ${formatCurrency(totalAmount)}`, [
      { text: 'Hủy', style: 'cancel', onPress: () => setCartVisible(true) },
      { text: 'OK', onPress: async () => { await createInvoice(cart, totalAmount); setCart([]); Alert.alert("Thành công!"); } }
    ]);
  };

  // --- RENDER ITEMS ---

  const renderCategory = ({ item }: { item: any }) => {
    const isSelected = selectedCat === item.id;
    return (
      <TouchableOpacity
        style={[styles.catItem, isSelected && styles.catItemActive]}
        onPress={() => setSelectedCat(item.id)}
      >
        <Text style={[styles.catText, isSelected && styles.catTextActive]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderProduct = ({ item }: { item: any }) => {
    const qty = cart.find(c => c.id === item.id)?.quantity || 0;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => addToCart(item)}
        activeOpacity={0.8}
      >
        {/* Placeholder Image đẹp hơn */}
        <View style={styles.cardImgPlaceholder}>
          <Text style={styles.cardImgText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.cardFooter}>
            <Text style={styles.cardPrice}>{formatCurrency(item.price)}</Text>
            {/* Nút cộng giả lập */}
            <View style={styles.addBtn}>
              <Ionicons name="add" size={16} color="white" />
            </View>
          </View>
        </View>

        {qty > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{qty}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderCartItem = ({ item }: { item: any }) => (
    <View style={styles.cartItemRow}>
      <View style={styles.cartItemIcon}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.primary }}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 12 }}>
        <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cartItemPrice}>{formatCurrency(item.price)}</Text>
      </View>

      <View style={styles.cartActions}>
        <TouchableOpacity onPress={() => decreaseQuantity(item.id)} style={styles.qtyBtn}>
          <Ionicons name="remove" size={20} color={COLORS.text} />
        </TouchableOpacity>

        <Text style={styles.qtyValue}>{item.quantity}</Text>

        <TouchableOpacity onPress={() => addToCart(item)} style={styles.qtyBtn}>
          <Ionicons name="add" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="dark" backgroundColor="white" />
      
      {/* 1. HEADER HIỆN ĐẠI */}
      <View style={styles.header}>
        <View>
          {/* Sửa dòng này: Dùng greeting.text thay vì chữ cứng */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.headerSub}>{greeting.text}</Text>
            {/* Thêm cái icon nhỏ xinh bên cạnh */}
            <Ionicons name={greeting.icon as any} size={16} color={greeting.color} style={{ marginLeft: 5 }} />
          </View>

          <Text style={styles.headerTitle}>Grocery Store App</Text>
        </View>
        <View style={styles.dateBadge}>
          <Ionicons name="calendar-outline" size={14} color="#555" />
          <Text style={styles.dateText}>{todayStr}</Text>
        </View>
      </View>

      {/* 2. SEARCH BAR */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm món hàng..."
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* 3. CATEGORIES (STYLE MỚI) */}
      <View style={styles.catContainer}>
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={i => i.id ? i.id.toString() : 'all'}
          renderItem={renderCategory}
          contentContainerStyle={{ paddingHorizontal: SPACING }}
        />
      </View>

      {/* 4. PRODUCT GRID */}
      <FlatList
        data={filteredProducts}
        keyExtractor={i => i.id.toString()}
        renderItem={renderProduct}
        numColumns={COLUMN_COUNT}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        contentContainerStyle={{ padding: SPACING, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      />

      {/* 5. FLOATING CART (THANH TRÔI) */}
      {cart.length > 0 && (
        <View style={styles.floatCartContainer}>
          <TouchableOpacity style={styles.floatCartBtn} onPress={() => setCartVisible(true)}>
            <View style={styles.floatCartLeft}>
              <View style={styles.floatCartBadge}>
                <Text style={styles.floatCartBadgeText}>{totalQuantity}</Text>
              </View>
              <View>
                <Text style={styles.floatCartLabel}>Tổng thanh toán</Text>
                <Text style={styles.floatCartValue}>{formatCurrency(totalAmount)}</Text>
              </View>
            </View>
            <View style={styles.floatCartRight}>
              <Text style={styles.floatCartCheckout}>Xem giỏ hàng</Text>
              <Ionicons name="chevron-forward" size={18} color="white" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* --- MODAL GIỎ HÀNG (FULL REDESIGN) --- */}
      <Modal visible={cartVisible} animationType="slide" transparent={true} statusBarTranslucent={true}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setCartVisible(false)} />

          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Giỏ hàng ({totalQuantity})</Text>
              <TouchableOpacity onPress={() => setCartVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* List sản phẩm trong giỏ */}
            <FlatList
              data={cart}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={{ padding: SPACING }}
              renderItem={renderCartItem}
              ListFooterComponent={<View style={{ height: 20 }} />}
            />

            {/* Modal Footer (Thanh toán) */}
            <View style={styles.modalFooter}>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Tạm tính:</Text>
                <Text style={styles.billValue}>{formatCurrency(totalAmount)}</Text>
              </View>
              <TouchableOpacity style={styles.checkoutBigBtn} onPress={handleCheckout}>
                <Text style={styles.checkoutBigText}>THANH TOÁN • {formatCurrency(totalAmount)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- STYLE SHEET ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: { paddingHorizontal: SPACING, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerSub: { fontSize: 14, color: COLORS.subText },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  dateBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#EEE' },
  dateText: { marginLeft: 5, fontSize: 12, fontWeight: '600', color: '#555', textTransform: 'capitalize' },

  // Search
  searchContainer: { padding: SPACING, paddingBottom: 5 },
  searchBar: { flexDirection: 'row', backgroundColor: COLORS.inputBg, height: 46, borderRadius: 12, alignItems: 'center', paddingHorizontal: 15 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: COLORS.text },

  // Categories
  catContainer: { marginTop: 10, marginBottom: 5 },
  catItem: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#FFF', borderRadius: 25, marginRight: 10, borderWidth: 1, borderColor: '#EEE' },
  catItemActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  catText: { fontSize: 14, fontWeight: '600', color: COLORS.subText },
  catTextActive: { color: '#FFF' },

  // Product Card
  card: { width: ITEM_WIDTH, backgroundColor: COLORS.card, borderRadius: 16, marginBottom: SPACING, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3, padding: 10 },
  cardImgPlaceholder: { width: '100%', aspectRatio: 1.2, backgroundColor: '#F0F4F8', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  cardImgText: { fontSize: 24, fontWeight: 'bold', color: '#B0B8C1' },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 8, height: 40 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary },
  addBtn: { width: 30, height: 30, backgroundColor: COLORS.primary, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: -6, right: -6, backgroundColor: COLORS.danger, minWidth: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', paddingHorizontal: 4 },

  // Floating Cart Bar (Home Screen)
  floatCartContainer: { position: 'absolute', bottom: 20, left: SPACING, right: SPACING },
  floatCartBtn: { backgroundColor: '#1A1A1A', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, paddingHorizontal: 16, borderRadius: 16, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  floatCartLeft: { flexDirection: 'row', alignItems: 'center' },
  floatCartBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 8, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  floatCartBadgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  floatCartLabel: { color: '#888', fontSize: 10, textTransform: 'uppercase' },
  floatCartValue: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  floatCartRight: { flexDirection: 'row', alignItems: 'center' },
  floatCartCheckout: { color: '#FFF', fontWeight: 'bold', fontSize: 14, marginRight: 4 },

  // MODAL STYLES (New)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#F8F9FA', // Màu nền chung cho cả khối
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%', // Giới hạn chiều cao
    width: '100%',
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, elevation: 10
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING,
    borderBottomWidth: 1, borderBottomColor: '#EEE',
    backgroundColor: '#FFF', // Header nền trắng
    borderTopLeftRadius: 24, borderTopRightRadius: 24 // Bo góc theo content
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  modalCloseBtn: { padding: 5 },

  // Cart Item Row
  cartItemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 12 },
  cartItemIcon: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#F0F4F8', justifyContent: 'center', alignItems: 'center' },
  cartItemName: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  cartItemPrice: { fontSize: 14, color: COLORS.subText },

  cartActions: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 8 },
  qtyBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  qtyValue: { width: 20, textAlign: 'center', fontSize: 15, fontWeight: '600' },

  modalFooter: { backgroundColor: '#FFF', padding: SPACING, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#EEE' },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  billLabel: { fontSize: 16, color: COLORS.subText },
  billValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  checkoutBigBtn: { backgroundColor: COLORS.primary, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  checkoutBigText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 }
});