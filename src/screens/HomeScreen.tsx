import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, Modal, TextInput, RefreshControl, Image, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { getProducts, getCategories, createInvoice } from '../services/productService';
import { formatCurrency } from '../utils/format';
import { socket } from '../lib/socket';

const SPACING = 16;
const COLORS = {
  primary: '#4A72FF',
  background: '#F5F7FA',
  card: '#FFFFFF',
  text: '#1C1C1E',
  subText: '#8E8E93',
  danger: '#FF3B30',
  success: '#34C759',
  inputBg: '#FFFFFF',
  borderColor: '#E5E5EA'
};

export default function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);

  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [cartVisible, setCartVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [editPriceModalVisible, setEditPriceModalVisible] = useState(false);
  const [editingCartItem, setEditingCartItem] = useState<any>(null);
  const [newPrice, setNewPrice] = useState('');

  const [permission, requestPermission] = useCameraPermissions();
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [scanned, setScanned] = useState(false);

  useFocusEffect(React.useCallback(() => { fetchData(1, true); }, []));

  useEffect(() => {
    socket.on('product_changed', () => fetchData(1, true));
    socket.on('category_changed', () => fetchData(1, true));

    const unsubscribeNet = NetInfo.addEventListener(state => {
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
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchText, selectedCat]);

  const fetchData = async (page = 1, isReset = false) => {
    try {
      const [prodsRes, cats] = await Promise.all([
        getProducts(page, 50, searchText, selectedCat),
        getCategories()
      ]);

      const newData = prodsRes.data || [];
      if (isReset) {
        setProducts(newData);
      } else {
        setProducts(prev => [...prev, ...newData]);
      }

      if (isReset) {
        setCategories([{ _id: null, name: 'Tất cả' }, ...cats]);
      }
    } catch (e) { console.log('Lỗi tải dữ liệu'); }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(1, true);
    setRefreshing(false);
  };

  const openScanner = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Cấp quyền', 'Bạn cần cho phép dùng Camera để quét mã vạch.');
        return;
      }
    }
    setScanned(false);
    setIsScannerVisible(true);
  };

  const handleBarCodeScanned = ({ type, data }: any) => {
    setScanned(true);
    setIsScannerVisible(false);

    const foundProduct = products.find(p => p.sku === data);

    if (foundProduct) {
      if (foundProduct.stock > 0) {
        addToCart(foundProduct);
        Alert.alert('Thành công', `Đã thêm ${foundProduct.name} vào giỏ!`);
      } else {
        Alert.alert('Hết hàng', `${foundProduct.name} đã hết tồn kho!`);
      }
    } else {
      Alert.alert('Lỗi', `Không tìm thấy sản phẩm có mã: ${data}`);
    }
  };

  const addToCart = (product: any) => {
    if (product.stock <= 0) {
      Alert.alert('Cảnh báo', 'Sản phẩm này đã hết hàng!');
      return;
    }
    setCart(curr => {
      const existing = curr.find(i => i._id === product._id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          Alert.alert('Kho không đủ', `Chỉ còn ${product.stock} ${product.unit} trong kho.`);
          return curr;
        }
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
    Alert.alert('Chốt đơn?', `Tổng: ${formatCurrency(totalAmount)}`, [
      { text: 'Hủy', style: 'cancel', onPress: () => setCartVisible(true) },
      {
        text: 'OK', onPress: async () => {
          try {
            await createInvoice(cart, totalAmount);
            setCart([]);
            Alert.alert("Thành công!", "Đã chốt đơn và trừ kho.");
            fetchData(1, true);
          } catch (e) {
            Alert.alert("Lỗi", "Có lỗi xảy ra khi chốt đơn.");
          }
        }
      }
    ]);
  };

  const openEditPrice = (item: any) => {
    setEditingCartItem(item);
    setNewPrice(item.price.toString());
    setEditPriceModalVisible(true);
  };

  const saveNewPrice = () => {
    if (!editingCartItem || !newPrice) return;
    setCart(curr => curr.map(i =>
      i._id === editingCartItem._id
        ? { ...i, price: parseInt(newPrice) }
        : i
    ));
    setEditPriceModalVisible(false);
  };

  const renderProduct = ({ item }: { item: any }) => {
    const qtyInCart = cart.find(c => c._id === item._id)?.quantity || 0;
    const isOutOfStock = item.stock <= 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardImgPlaceholder}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <Text style={styles.cardImgText}>{item.name.charAt(0).toUpperCase()}</Text>
          )}
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardSubText}>{item.stock} in Stock</Text>
          <View style={styles.skuRow}>
            <Ionicons name="barcode-outline" size={14} color={COLORS.subText} />
            <Text style={styles.skuText}>{item.sku || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.cardRight}>
          <Text style={styles.cardPrice}>{formatCurrency(item.price)}</Text>
          <TouchableOpacity
            style={[styles.addBtn, isOutOfStock && styles.addBtnDisabled]}
            onPress={() => addToCart(item)}
            disabled={isOutOfStock}
          >
            {qtyInCart > 0 ? (
              <Text style={{ color: 'white', fontWeight: 'bold' }}>{qtyInCart}</Text>
            ) : (
              <Ionicons name="add" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* HEADER THEO MOCKUP */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bán Hàng</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm..."
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <Ionicons name="options-outline" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* CATEGORY (Tùy chọn hiển thị ngang hoặc ẩn đi nếu giống mockup, ở đây giữ lại để tiện thao tác) */}
      <View style={{ paddingHorizontal: SPACING, marginBottom: 10 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={i => i._id ? i._id.toString() : 'all'}
          renderItem={({ item }) => {
            const isSelected = selectedCat === item._id;
            return (
              <TouchableOpacity
                style={[styles.catChip, isSelected && styles.catChipActive]}
                onPress={() => setSelectedCat(item._id)}
              >
                <Text style={[styles.catChipText, isSelected && styles.catChipTextActive]}>{item.name}</Text>
              </TouchableOpacity>
            )
          }}
        />
      </View>

      <View style={styles.listHeaderRow}>
        <Text style={styles.listHeaderTitle}>Sản phẩm</Text>
        <Text style={styles.listHeaderSubtitle}>Xem tất cả</Text>
      </View>

      {/* PRODUCT LIST (DẠNG 1 CỘT GIỐNG MOCKUP) */}
      <FlatList
        data={products}
        keyExtractor={i => i._id.toString()}
        renderItem={renderProduct}
        contentContainerStyle={{ paddingHorizontal: SPACING, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 50, color: 'gray' }}>Không tìm thấy sản phẩm</Text>}
      />

      {/* FAB SCANNER (Cực giống bản thiết kế) */}
      <TouchableOpacity style={styles.fabScanner} onPress={openScanner}>
        <Ionicons name="scan-outline" size={28} color="white" />
      </TouchableOpacity>

      {/* NÚT THANH TOÁN (CART) MỚI */}
      {cart.length > 0 && (
        <TouchableOpacity style={styles.fabCart} onPress={() => setCartVisible(true)}>
          <View style={styles.fabCartInner}>
            <Text style={styles.fabCartQty}>{totalQuantity}</Text>
            <Text style={styles.fabCartTotal}>{formatCurrency(totalAmount)}</Text>
            <Ionicons name="cart-outline" size={24} color="white" style={{ marginLeft: 10 }} />
          </View>
        </TouchableOpacity>
      )}

      {/* MODAL SCANNER (CAMERA) */}
      <Modal visible={isScannerVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
          <View style={styles.cameraHeader}>
            <TouchableOpacity onPress={() => setIsScannerVisible(false)} style={{ padding: 10 }}>
              <Ionicons name="close" size={30} color="white" />
            </TouchableOpacity>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Quét mã vạch</Text>
            <View style={{ width: 50 }} />
          </View>

          <View style={{ flex: 1 }}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code128"] }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />
            {/* Khung hướng dẫn quét mã */}
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerBox} />
              <Text style={{ color: 'white', marginTop: 20 }}>Hướng Camera vào mã vạch sản phẩm</Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* MODAL GIỎ HÀNG (Giữ nguyên logic giỏ hàng cũ của sếp nhưng gọn hơn) */}
      <Modal visible={cartVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlayCart}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setCartVisible(false)} />
          <View style={styles.modalContentCart}>
            <View style={styles.modalHeaderCart}>
              <Text style={styles.modalTitleCart}>Giỏ hàng ({totalQuantity})</Text>
              <TouchableOpacity onPress={() => setCartVisible(false)}><Ionicons name="close" size={24} color={COLORS.text} /></TouchableOpacity>
            </View>
            <FlatList
              data={cart}
              keyExtractor={item => item._id.toString()}
              contentContainerStyle={{ padding: SPACING }}
              renderItem={({ item }) => (
                <View style={styles.cartItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600' }}>{item.name}</Text>
                    <TouchableOpacity onPress={() => openEditPrice(item)}>
                      <Text style={{ color: COLORS.primary, fontWeight: 'bold', marginTop: 4 }}>
                        {formatCurrency(item.price)} <Ionicons name="pencil" size={12} />
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.cartActions}>
                    <TouchableOpacity onPress={() => decreaseQuantity(item._id)} style={styles.qtyBtn}>
                      <Ionicons name="remove" size={20} />
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <TouchableOpacity onPress={() => addToCart(item)} style={styles.qtyBtn}>
                      <Ionicons name="add" size={20} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
            <View style={[styles.modalFooterCart, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <TouchableOpacity style={styles.checkoutBigBtn} onPress={handleCheckout}>
                <Text style={styles.checkoutBigText}>THANH TOÁN • {formatCurrency(totalAmount)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL SỬA GIÁ TRONG GIỎ HÀNG */}
      <Modal visible={editPriceModalVisible} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 16, width: '80%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>Sửa giá bán</Text>
            <Text style={{ color: 'gray', marginBottom: 10 }}>{editingCartItem?.name}</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10, padding: 12, fontSize: 18, marginBottom: 20 }}
              keyboardType="numeric"
              value={newPrice}
              onChangeText={setNewPrice}
              autoFocus
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity style={{ flex: 1, padding: 12, backgroundColor: '#F5F5F5', borderRadius: 10, marginRight: 10, alignItems: 'center' }} onPress={() => setEditPriceModalVisible(false)}>
                <Text style={{ fontWeight: 'bold', color: 'gray' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, padding: 12, backgroundColor: COLORS.primary, borderRadius: 10, marginLeft: 10, alignItems: 'center' }} onPress={saveNewPrice}>
                <Text style={{ fontWeight: 'bold', color: 'white' }}>Lưu giá</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: { alignItems: 'center', paddingTop: 10, paddingBottom: 15 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },

  searchContainer: { flexDirection: 'row', paddingHorizontal: SPACING, marginBottom: 15, alignItems: 'center' },
  searchBar: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.inputBg, height: 48, borderRadius: 24, alignItems: 'center', paddingHorizontal: 15, borderWidth: 1, borderColor: COLORS.borderColor },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: COLORS.text },
  filterBtn: { width: 48, height: 48, backgroundColor: COLORS.inputBg, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginLeft: 10, borderWidth: 1, borderColor: COLORS.borderColor },

  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'transparent', marginRight: 10 },
  catChipActive: { backgroundColor: '#E5EFFF' },
  catChipText: { fontSize: 14, color: COLORS.subText, fontWeight: '600' },
  catChipTextActive: { color: COLORS.primary, fontWeight: '700' },

  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING, marginBottom: 10, alignItems: 'flex-end' },
  listHeaderTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  listHeaderSubtitle: { fontSize: 14, color: COLORS.subText, fontWeight: '600' },

  card: { flexDirection: 'row', backgroundColor: COLORS.card, padding: 12, borderRadius: 20, marginBottom: 12, alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  cardImgPlaceholder: { width: 60, height: 60, backgroundColor: '#F0F4F8', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  productImage: { width: '100%', height: '100%', borderRadius: 12 },
  cardImgText: { fontSize: 24, fontWeight: 'bold', color: '#B0B8C1' },

  cardBody: { flex: 1, justifyContent: 'center' },
  cardName: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  cardSubText: { fontSize: 12, color: COLORS.subText, marginBottom: 4 },
  skuRow: { flexDirection: 'row', alignItems: 'center' },
  skuText: { fontSize: 11, color: COLORS.subText, marginLeft: 4, letterSpacing: 0.5 },

  cardRight: { alignItems: 'flex-end', justifyContent: 'center', marginLeft: 10 },
  cardPrice: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  addBtn: { width: 36, height: 36, backgroundColor: '#E5EFFF', borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  addBtnDisabled: { backgroundColor: '#F5F5F5' },

  fabScanner: { position: 'absolute', bottom: 30, alignSelf: 'center', width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 8, zIndex: 10 },

  fabCart: { position: 'absolute', bottom: 35, right: 20, backgroundColor: COLORS.text, borderRadius: 25, paddingVertical: 10, paddingHorizontal: 15, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 5, elevation: 5, zIndex: 9 },
  fabCartInner: { flexDirection: 'row', alignItems: 'center' },
  fabCartQty: { backgroundColor: COLORS.primary, color: 'white', width: 22, height: 22, borderRadius: 11, textAlign: 'center', lineHeight: 22, fontSize: 12, fontWeight: 'bold', marginRight: 8 },
  fabCartTotal: { color: 'white', fontSize: 15, fontWeight: 'bold' },

  cameraHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, paddingTop: 50 },
  scannerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  scannerBox: { width: 250, height: 250, borderWidth: 2, borderColor: COLORS.primary, backgroundColor: 'transparent', borderRadius: 20 },

  modalOverlayCart: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContentCart: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeaderCart: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalTitleCart: { fontSize: 20, fontWeight: '800' },
  cartItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  cartActions: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 5, paddingVertical: 3 },
  qtyBtn: { padding: 5 },
  qtyValue: { width: 30, textAlign: 'center', fontWeight: 'bold' },
  modalFooterCart: { padding: 20, borderTopWidth: 1, borderTopColor: '#EEE' },
  checkoutBigBtn: { backgroundColor: COLORS.primary, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  checkoutBigText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});