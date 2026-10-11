import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  ScanBarcode,
  ChevronLeft,
  Image as ImageIcon,
  Check,
  X,
} from 'lucide-react-native';

import {
  addProduct,
  updateProduct,
  getCategories,
  uploadImageToCloudinary,
} from '../services/productService';
import { SPACING, FONTS, SHADOWS } from '../constants/theme';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';

export default function AddEditProductScreen({ navigation, route }: any) {
  const { colors, isDark } = useContext(ThemeContext);
  const { isAdmin } = useContext(AuthContext);
  const styles = createStyles(colors, isDark);
  const insets = useSafeAreaInsets();
  const placeholderColor = colors.mutedText || colors.subText;

  const productToEdit = route.params?.product;

  const [categories, setCategories] = useState<any[]>([]);
  const [prodName, setProdName] = useState(productToEdit?.name || '');
  const [prodPrice, setProdPrice] = useState(
    productToEdit?.price !== undefined ? String(productToEdit.price) : ''
  );
  const [prodCostPrice, setProdCostPrice] = useState(
    productToEdit?.costPrice !== undefined ? String(productToEdit.costPrice) : ''
  );
  const [prodStock, setProdStock] = useState(
    productToEdit?.stock !== undefined ? String(productToEdit.stock) : ''
  );
  const [prodSku, setProdSku] = useState(productToEdit?.sku || '');
  const [prodUnit, setProdUnit] = useState(productToEdit?.unit || 'Cái');

  // Fix categoryId object vs string bug
  const initialCatId =
    typeof productToEdit?.categoryId === 'object'
      ? productToEdit?.categoryId?._id || ''
      : productToEdit?.categoryId || productToEdit?.category_id || '';

  const [selectedCat, setSelectedCat] = useState<string>(initialCatId);
  const [prodImageUrl, setProdImageUrl] = useState(productToEdit?.imageUrl || '');

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);

  useEffect(() => {
    // Cashier protection
    if (!isAdmin) {
      Alert.alert(
        'Quyền hạn bị từ chối',
        'Chỉ tài khoản Chủ cửa hàng (Admin) mới có quyền tạo hoặc chỉnh sửa sản phẩm!',
        [{ text: 'Quay lại', onPress: () => navigation.goBack() }]
      );
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    if (route.params?.scannedSku && route.params?.timestamp) {
      setProdSku(route.params.scannedSku);
      navigation.setParams({ scannedSku: null, timestamp: null });
    }
  }, [route.params?.timestamp]);

  const fetchCategories = async () => {
    try {
      const cats = await getCategories();
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (error) {
      console.log('Lỗi tải danh mục', error);
    }
  };

  const handleLaunchPicker = async (type: 'camera' | 'library') => {
    setImagePickerVisible(false);

    setTimeout(async () => {
      try {
        let result: any;
        const options: ImagePicker.ImagePickerOptions = {
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.6,
        };

        if (type === 'camera') {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền Camera để chụp ảnh sản phẩm.');
            return;
          }
          result = await ImagePicker.launchCameraAsync(options);
        } else {
          result = await ImagePicker.launchImageLibraryAsync(options);
        }

        if (!result.canceled && result.assets?.[0]?.uri) {
          setIsUploading(true);
          try {
            const realUrl = await uploadImageToCloudinary(result.assets[0].uri);
            setProdImageUrl(realUrl);
          } catch (uploadErr) {
            Alert.alert('Lỗi tải ảnh', 'Không thể tải ảnh lên máy chủ. Bạn có thể thử lại sau.');
          } finally {
            setIsUploading(false);
          }
        }
      } catch (error) {
        setIsUploading(false);
      }
    }, 350);
  };

  const handleSaveProduct = async () => {
    if (!prodName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên sản phẩm!');
      return;
    }
    const parsedPrice = parseInt(prodPrice, 10);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      Alert.alert('Giá không hợp lệ', 'Vui lòng nhập giá bán hợp lệ!');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: prodName.trim(),
        price: parsedPrice,
        costPrice: Math.max(0, parseInt(prodCostPrice, 10) || 0),
        stock: Math.max(0, parseInt(prodStock, 10) || 0),
        sku: prodSku.trim(),
        unit: prodUnit.trim() || 'Cái',
        category_id: selectedCat === '' ? null : selectedCat,
        imageUrl: prodImageUrl,
      };

      if (productToEdit?._id) {
        await updateProduct(productToEdit._id, payload);
      } else {
        await addProduct(payload);
      }

      Alert.alert('Thành công', 'Đã lưu sản phẩm vào kho!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu sản phẩm. Vui lòng thử lại!');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={28} color={colors.text} strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {productToEdit ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Ảnh sản phẩm */}
          <View style={styles.imageSection}>
            <TouchableOpacity style={styles.imageBox} onPress={() => setImagePickerVisible(true)} activeOpacity={0.8}>
              {prodImageUrl ? (
                <Image
                  source={{ uri: prodImageUrl }}
                  style={styles.prodImagePreview}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Camera size={34} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.imageUploadText}>Chụp hoặc chọn ảnh sản phẩm</Text>
                </View>
              )}
              {isUploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.uploadingText}>Đang tải ảnh...</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Nhóm 1: Thông tin cơ bản */}
          <View style={styles.formCard}>
            <Text style={styles.cardSectionTitle}>Thông tin cơ bản</Text>

            <Text style={styles.fieldLabel}>Tên sản phẩm *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="VD: Nước tăng lực Redbull 250ml"
              placeholderTextColor={placeholderColor}
              value={prodName}
              onChangeText={setProdName}
              selectionColor={colors.primary}
            />

            {/* DANH MỤC RIÊNG 1 HÀNG DÀI RỘNG RÃI */}
            <Text style={styles.fieldLabel}>Danh mục ngành hàng</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedCat}
                onValueChange={(itemValue) => setSelectedCat(itemValue)}
                style={[
                  styles.picker,
                  { color: selectedCat ? colors.text : placeholderColor },
                ]}
                dropdownIconColor={colors.text}
                mode="dropdown"
              >
                <Picker.Item label="-- Chưa phân loại --" value="" color={placeholderColor} />
                {categories.map((c) => (
                  <Picker.Item key={c._id} label={c.name} value={c._id} color={colors.text} />
                ))}
              </Picker>
            </View>

            {/* Hàng: Đơn vị tính & Tồn kho ban đầu */}
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.fieldLabel}>Đơn vị tính</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Lon, Chai, Hộp, Kg..."
                  placeholderTextColor={placeholderColor}
                  value={prodUnit}
                  onChangeText={setProdUnit}
                  selectionColor={colors.primary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Số lượng tồn kho</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="0"
                  placeholderTextColor={placeholderColor}
                  keyboardType="numeric"
                  value={prodStock}
                  onChangeText={setProdStock}
                  selectionColor={colors.primary}
                />
              </View>
            </View>
          </View>

          {/* Nhóm 2: Giá & Mã vạch SKU */}
          <View style={styles.formCard}>
            <Text style={styles.cardSectionTitle}>Giá cả & Quản lý mã vạch</Text>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.fieldLabel}>Giá bán lẻ (VNĐ) *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="0"
                  placeholderTextColor={placeholderColor}
                  keyboardType="numeric"
                  value={prodPrice}
                  onChangeText={setProdPrice}
                  selectionColor={colors.primary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Giá vốn nhập (VNĐ)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="0"
                  placeholderTextColor={placeholderColor}
                  keyboardType="numeric"
                  value={prodCostPrice}
                  onChangeText={setProdCostPrice}
                  selectionColor={colors.primary}
                />
              </View>
            </View>

            {/* MÃ VẠCH / BARCODE RIÊNG 1 HÀNG DÀI RỘNG RÃI CÓ NÚT QUÉT */}
            <Text style={styles.fieldLabel}>Mã vạch sản phẩm (Barcode / SKU)</Text>
            <View style={styles.barcodeRow}>
              <View style={styles.barcodeInputWrapper}>
                <TextInput
                  style={styles.barcodeInput}
                  placeholder="Nhập chuỗi mã vạch hoặc bấm quét..."
                  placeholderTextColor={placeholderColor}
                  value={prodSku}
                  onChangeText={setProdSku}
                  selectionColor={colors.primary}
                />
              </View>

              <TouchableOpacity
                style={styles.scanBarcodeBtn}
                onPress={() =>
                  navigation.navigate('GlobalScanner', {
                    returnScreen: 'AddEditProduct',
                    action: 'fillSku',
                  })
                }
                activeOpacity={0.8}
              >
                <ScanBarcode size={18} color="white" strokeWidth={2.4} style={{ marginRight: 4 }} />
                <Text style={styles.scanBarcodeBtnText}>Quét mã</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Nút lưu */}
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
            onPress={handleSaveProduct}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Check size={20} color="white" strokeWidth={2.6} style={{ marginRight: 8 }} />
                <Text style={styles.saveBtnText}>
                  {productToEdit ? 'Lưu thay đổi sản phẩm' : 'Thêm sản phẩm vào kho'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Image Picker Modal - CENTER DISPLAY MODAL (Đổi sang giữa màn hình) */}
      <Modal
        visible={imagePickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImagePickerVisible(false)}
      >
        <View style={styles.modalCenterOverlay}>
          <View style={styles.modalCenterCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Camera size={20} color={colors.primary} strokeWidth={2.4} />
                <Text style={styles.pickerSheetTitle}>Chọn ảnh sản phẩm</Text>
              </View>
              <TouchableOpacity onPress={() => setImagePickerVisible(false)} style={styles.closeBtn}>
                <X size={20} color={colors.text} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.pickerOption}
              onPress={() => handleLaunchPicker('camera')}
              activeOpacity={0.7}
            >
              <View style={[styles.pickerIconBg, { backgroundColor: colors.primaryLight }]}>
                <Camera size={22} color={colors.primary} strokeWidth={2.2} />
              </View>
              <View>
                <Text style={styles.pickerOptionText}>Chụp ảnh từ Camera</Text>
                <Text style={styles.pickerOptionSub}>Chụp ảnh bao bì sản phẩm thực tế</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickerOption}
              onPress={() => handleLaunchPicker('library')}
              activeOpacity={0.7}
            >
              <View style={[styles.pickerIconBg, { backgroundColor: colors.secondaryLight }]}>
                <ImageIcon size={22} color={colors.secondary} strokeWidth={2.2} />
              </View>
              <View>
                <Text style={styles.pickerOptionText}>Chọn từ bộ sưu tập ảnh</Text>
                <Text style={styles.pickerOptionSub}>Tải lên ảnh đã chụp sẵn trong máy</Text>
              </View>
            </TouchableOpacity>
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
      borderBottomWidth: 1,
      borderBottomColor: colors.borderColor,
    },
    backBtn: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontFamily: FONTS.bold,
      color: colors.text,
    },
    scrollContent: {
      padding: SPACING,
    },
    imageSection: {
      alignItems: 'center',
      marginBottom: 16,
    },
    imageBox: {
      width: 140,
      height: 140,
      borderRadius: 22,
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: colors.borderColor,
      borderStyle: 'dashed',
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      ...SHADOWS.soft,
    },
    prodImagePreview: {
      width: '100%',
      height: '100%',
    },
    imagePlaceholder: {
      alignItems: 'center',
      padding: 10,
    },
    imageUploadText: {
      fontSize: 11,
      fontFamily: FONTS.medium,
      color: colors.subText,
      marginTop: 8,
      textAlign: 'center',
    },
    uploadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    uploadingText: {
      color: 'white',
      fontSize: 11,
      fontFamily: FONTS.medium,
      marginTop: 6,
    },
    formCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      ...SHADOWS.card,
    },
    cardSectionTitle: {
      fontSize: 14,
      fontFamily: FONTS.bold,
      color: colors.text,
      marginBottom: 14,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    fieldLabel: {
      fontSize: 12,
      fontFamily: FONTS.semiBold,
      color: colors.subText,
      marginBottom: 6,
    },
    textInput: {
      backgroundColor: colors.inputBg,
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      height: 48,
      fontSize: 14,
      fontFamily: FONTS.medium,
      color: colors.text,
      marginBottom: 14,
    },
    row: {
      flexDirection: 'row',
    },
    pickerContainer: {
      width: '100%',
      backgroundColor: colors.inputBg,
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      borderRadius: 12,
      marginBottom: 14,
      overflow: 'hidden',
      height: 48,
      justifyContent: 'center',
    },
    picker: {
      width: '100%',
      color: colors.text,
      marginLeft: Platform.OS === 'android' ? -4 : 0,
      height: 48,
    },
    barcodeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    barcodeInputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 48,
      marginRight: 10,
    },
    barcodeInput: {
      flex: 1,
      fontSize: 14,
      fontFamily: FONTS.medium,
      color: colors.text,
      paddingVertical: 0,
      height: '100%',
    },
    scanBarcodeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      height: 48,
      paddingHorizontal: 14,
      borderRadius: 12,
      ...SHADOWS.soft,
    },
    scanBarcodeBtnText: {
      color: 'white',
      fontFamily: FONTS.bold,
      fontSize: 13,
    },
    saveBtn: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 16,
      marginTop: 6,
      ...SHADOWS.soft,
    },
    saveBtnText: {
      color: 'white',
      fontFamily: FONTS.bold,
      fontSize: 15,
    },
    // CENTER MODAL STYLING
    modalCenterOverlay: {
      flex: 1,
      backgroundColor: colors.modalOverlay,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    modalCenterCard: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: colors.card,
      borderRadius: 22,
      paddingHorizontal: SPACING,
      paddingVertical: 18,
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
      marginBottom: 10,
    },
    pickerSheetTitle: {
      fontSize: 16,
      fontFamily: FONTS.bold,
      color: colors.text,
      marginLeft: 8,
    },
    closeBtn: {
      padding: 6,
      borderRadius: 10,
      backgroundColor: colors.cardSecondary,
    },
    pickerOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderColor,
    },
    pickerIconBg: {
      width: 44,
      height: 44,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    pickerOptionText: {
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: colors.text,
    },
    pickerOptionSub: {
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: colors.subText,
      marginTop: 2,
    },
  });