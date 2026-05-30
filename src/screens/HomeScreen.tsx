import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, Modal, TextInput, RefreshControl, Image, KeyboardAvoidingView, Platform
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
import { COLORS, SPACING } from '../constants/theme';

export default function HomeScreen({ navigation, route }: any) {
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
    const unsubscribeNet = NetInfo.addEventListener(state => { if (state.isConnected) fetchData(1, true); });
    return () => { socket.off('product_changed'); socket.off('category_changed'); unsubscribeNet(); };
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => { fetchData(1, true); }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchText, selectedCat]);

  useEffect(() => {
    if (route?.params?.triggerScan) {
      openScanner();
    }
  }, [route?.params?.triggerScan]);

  const fetchData = async (page = 1, isReset = false) => {
    try {
      const [prodsRes, cats] = await Promise.all([getProducts(page, 50, searchText, selectedCat), getCategories()]);
      const newData = prodsRes.data || [];
      if (isReset) { setProducts(newData); } else { setProducts(prev => [...prev, ...newData]); }
      if (isReset) { setCategories([{ _id: null, name: 'Tất cả' }, ...cats]); }
    } catch (e) { console.log('Lỗi tải dữ liệu'); }
  };

  const onRefresh = async () => { setRefreshing(true); await fetchData(1, true); setRefreshing(false); };

  const openScanner = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) { Alert.alert('Cấp quyền', 'Bạn cần cho phép dùng Camera để quét mã vạch.'); return; }
    }
    setScanned(false); setIsScannerVisible(true);
  };

  const handleBarCodeScanned = ({ data }: any) => {
    setScanned(true); setIsScannerVisible(false);
    const foundProduct = products.find(p => p.sku === data);
    if (foundProduct) {
      if (foundProduct.stock > 0) { addToCart(foundProduct); Alert.alert('Thành công', `Đã thêm ${foundProduct.name} vào giỏ!`); }
      else { Alert.alert('Hết hàng', `${foundProduct.name} đã hết tồn kho!`); }
    } else { Alert.alert('Lỗi', `Không tìm thấy sản phẩm có mã: ${data}`); }
  };

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
    Alert.alert('Chốt đơn?', `Tổng: ${formatCurrency(totalAmount)}`, [
      { text: 'Hủy', style: 'cancel', onPress: () => setCartVisible(true) },
      {
        text: 'OK', onPress: async () => {
          try { await createInvoice(cart, totalAmount); setCart([]); Alert.alert("Thành công!", "Đã chốt đơn và trừ kho."); fetchData(1, true); }
          catch (e) { Alert.alert("Lỗi", "Có lỗi xảy ra khi chốt đơn."); }
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
    if (stock <= 0) return COLORS.danger;
    if (stock <= 10) return '#FF9500';
    return COLORS.success;
  };

  const renderProduct = ({ item }: { item: any }) => {
    const qtyInCart = cart.find(c => c._id === item._id)?.quantity || 0;
    const isOutOfStock = item.stock <= 0;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => addToCart(item)}
      >
        <View style={styles.cardImgPlaceholder}>
          {item.imageUrl ? (<Image source={{ uri: item.imageUrl }} style={styles.productImage} resizeMode="cover" />) : (<Text style={styles.cardImgText}>{item.name.charAt(0).toUpperCase()}</Text>)}
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          {/* HIỂN THỊ MÀU CẢNH BÁO TỒN KHO */}
          <Text style={[styles.cardSubText, { color: getStockColor(item.stock), fontWeight: '600' }]}>
            {isOutOfStock ? 'Hết hàng' : `Tồn kho: ${item.stock}`}
          </Text>
          <View style={styles.skuRow}>
            <Ionicons name="barcode-outline" size={14} color={COLORS.subText} />
            {/* XỬ LÝ THIẾU THÔNG TIN MÃ VẠCH */}
            <Text style={[styles.skuText, !item.sku && { fontStyle: 'italic', color: '#B0B0B0' }]}>
              {item.sku ? item.sku : 'Chưa cập nhật mã vạch'}
            </Text>
          </View>
        </View>

        <View style={styles.cardRight}>
          <Text style={styles.cardPrice}>{formatCurrency(item.price)}</Text>
          <View style={[styles.addBtn, isOutOfStock && styles.addBtnDisabled, qtyInCart > 0 && styles.addBtnActive]}>
            {qtyInCart > 0 ? (
              <Text style={{ color: 'white', fontWeight: 'bold' }}>{qtyInCart}</Text>
            ) : (
              <Ionicons name="add" size={20} color={isOutOfStock ? COLORS.subText : COLORS.primary} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Xin chào,</Text>
          <Text style={styles.headerTitle}>Sẵn sàng chốt đơn!</Text>
        </View>
        <TouchableOpacity style={styles.headerAvatar}>
          <Ionicons name="storefront" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.subText} />
          <TextInput style={styles.searchInput} placeholder="Tìm tên hoặc mã hàng..." value={searchText} onChangeText={setSearchText} />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')} style={{ marginRight: 8 }}>
              <Ionicons name="close-circle" size={18} color={COLORS.subText} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={openScanner} style={styles.searchScanBtn}>
            <Ionicons name="barcode-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
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

      <FlatList
        data={products}
        keyExtractor={i => i._id.toString()}
        renderItem={renderProduct}
        contentContainerStyle={{ paddingHorizontal: SPACING, paddingBottom: 180 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 50, color: COLORS.subText }}>Không tìm thấy sản phẩm</Text>}
      />

      {/* THANH GIỎ HÀNG CHUYÊN NGHIỆP */}
      {cart.length > 0 && (
        <View style={styles.checkoutBarWrapper}>
          <TouchableOpacity style={styles.checkoutBar} onPress={() => setCartVisible(true)} activeOpacity={0.9}>
            <View style={styles.checkoutBarLeft}>
              <View style={styles.checkoutIcon}>
                <Ionicons name="cart" size={20} color={COLORS.primary} />
                <View style={styles.checkoutBadge}><Text style={styles.checkoutBadgeText}>{totalQuantity}</Text></View>
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.checkoutTotalLabel}>Tổng thanh toán</Text>
                <Text style={styles.checkoutTotalAmount}>{formatCurrency(totalAmount)}</Text>
              </View>
            </View>
            <View style={styles.checkoutBarRight}>
              <Text style={styles.checkoutBtnText}>Xem giỏ</Text>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL SCANNER */}
      <Modal visible={isScannerVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
          <View style={styles.cameraHeader}>
            <TouchableOpacity onPress={() => setIsScannerVisible(false)} style={{ padding: 10 }}><Ionicons name="close" size={30} color="white" /></TouchableOpacity>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Quét mã vạch</Text>
            <View style={{ width: 50 }} />
          </View>
          <View style={{ flex: 1 }}>
            <CameraView style={StyleSheet.absoluteFillObject} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code128"] }} onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} />
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerBox} />
              <Text style={{ color: 'white', marginTop: 20 }}>Hướng Camera vào mã vạch sản phẩm</Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* MODAL GIỎ HÀNG */}
      <Modal visible={cartVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlayCart}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setCartVisible(false)} />
          <View style={styles.modalContentCart}>
            <View style={styles.modalHeaderCart}>
              <Text style={styles.modalTitleCart}>Giỏ hàng ({totalQuantity})</Text>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* NÚT XÓA SẠCH GIỎ HÀNG */}
                {cart.length > 0 && (
                  <TouchableOpacity onPress={clearCart} style={{ marginRight: 15 }}>
                    <Ionicons name="trash-outline" size={24} color={COLORS.danger} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setCartVisible(false)}>
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>
            </View>

            <FlatList
              data={cart}
              keyExtractor={item => item._id.toString()}
              contentContainerStyle={[
                { padding: SPACING, flexGrow: 1 },
                cart.length === 0 && { justifyContent: 'center' }
              ]}

              ListEmptyComponent={
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                  <Ionicons name="cart-outline" size={30} color={COLORS.subText} style={{ opacity: 0.5, marginBottom: 15 }} />
                  <Text style={{ fontSize: 16, color: COLORS.subText, fontStyle: 'italic' }}>Giỏ hàng của bạn đang trống</Text>
                </View>
              }

              renderItem={({ item }) => (
                <View style={styles.cartItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 6 }}>{item.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity onPress={() => openEditPrice(item)}>
                        <Text style={{ color: COLORS.subText, fontSize: 14 }}>
                          {formatCurrency(item.price)} <Ionicons name="pencil" size={12} />
                        </Text>
                      </TouchableOpacity>
                      <Text style={{ color: COLORS.subText, fontSize: 14 }}>  x  {item.quantity}  =  </Text>
                      <Text style={{ color: COLORS.primary, fontWeight: 'bold', fontSize: 15 }}>
                        {formatCurrency(item.price * item.quantity)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cartActions}>
                    <TouchableOpacity onPress={() => decreaseQuantity(item._id)} style={styles.qtyBtn}><Ionicons name="remove" size={20} color={COLORS.text} /></TouchableOpacity>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <TouchableOpacity onPress={() => addToCart(item)} style={styles.qtyBtn}><Ionicons name="add" size={20} color={COLORS.text} /></TouchableOpacity>
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
                  {cart.length === 0 ? 'GIỎ HÀNG TRỐNG' : `CHỐT ĐƠN • ${formatCurrency(totalAmount)}`}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING, paddingTop: 10, paddingBottom: 20 },
  headerGreeting: { fontSize: 14, color: COLORS.subText, marginBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  headerAvatar: { width: 44, height: 44, backgroundColor: COLORS.primaryLight, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },

  searchContainer: { paddingHorizontal: SPACING, marginBottom: 15 },
  searchBar: { flexDirection: 'row', backgroundColor: COLORS.inputBg, height: 50, borderRadius: 16, alignItems: 'center', paddingHorizontal: 15, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, overflow: 'hidden' },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: COLORS.text },
  searchScanBtn: { padding: 8, backgroundColor: COLORS.primaryLight, borderRadius: 10, marginLeft: 5 },

  catChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: COLORS.card, marginRight: 10, borderWidth: 1, borderColor: COLORS.borderColor },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipText: { fontSize: 14, color: COLORS.subText, fontWeight: '600' },
  catChipTextActive: { color: 'white', fontWeight: '700' },

  card: { flexDirection: 'row', backgroundColor: COLORS.card, padding: 12, borderRadius: 16, marginBottom: 12, alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  cardImgPlaceholder: { width: 64, height: 64, backgroundColor: '#F0F4F8', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  productImage: { width: '100%', height: '100%', borderRadius: 12 },
  cardImgText: { fontSize: 24, fontWeight: 'bold', color: '#B0B8C1' },

  cardBody: { flex: 1, justifyContent: 'center' },
  cardName: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  cardSubText: { fontSize: 13, marginBottom: 6 },
  skuRow: { flexDirection: 'row', alignItems: 'center' },
  skuText: { fontSize: 12, marginLeft: 4 },

  cardRight: { alignItems: 'flex-end', justifyContent: 'center', marginLeft: 10 },
  cardPrice: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  addBtn: { width: 32, height: 32, backgroundColor: COLORS.primaryLight, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  addBtnDisabled: { backgroundColor: '#F5F5F5' },
  addBtnActive: { backgroundColor: COLORS.primary },

  checkoutBarWrapper: { position: 'absolute', bottom: 100, left: SPACING, right: SPACING, zIndex: 10 },
  checkoutBar: { flexDirection: 'row', backgroundColor: COLORS.primary, borderRadius: 20, padding: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'space-between', shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
  checkoutBarLeft: { flexDirection: 'row', alignItems: 'center' },
  checkoutIcon: { width: 44, height: 44, backgroundColor: 'white', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  checkoutBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: COLORS.danger, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.primary },
  checkoutBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  checkoutTotalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  checkoutTotalAmount: { color: 'white', fontSize: 18, fontWeight: '900', marginTop: 2 },
  checkoutBarRight: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  checkoutBtnText: { color: 'white', fontWeight: 'bold', marginRight: 5, fontSize: 14 },

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
  qtyValue: { width: 30, textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
  modalFooterCart: { padding: 20, borderTopWidth: 1, borderTopColor: '#EEE' },
  checkoutBigBtn: { backgroundColor: COLORS.primary, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  checkoutBigBtnDisabled: { backgroundColor: '#C0C0C0', shadowOpacity: 0 },
  checkoutBigText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  editPriceOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  editPriceContent: { backgroundColor: 'white', padding: 20, borderRadius: 16, width: '80%' },
  editPriceInput: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10, padding: 12, fontSize: 18, marginBottom: 20 },
  btnHuy: { flex: 1, padding: 12, backgroundColor: '#F5F5F5', borderRadius: 10, marginRight: 10, alignItems: 'center' },
  btnLưu: { flex: 1, padding: 12, backgroundColor: COLORS.primary, borderRadius: 10, marginLeft: 10, alignItems: 'center' }
});