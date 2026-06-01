import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, StyleSheet, TouchableOpacity,
    Alert, KeyboardAvoidingView, Platform, ScrollView, Image, Modal, ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { Camera as CameraIcon, ScanBarcode, ChevronLeft } from 'lucide-react-native';

import { addProduct, updateProduct, getCategories, uploadImageToCloudinary } from '../services/productService';
import { COLORS, SPACING } from '../constants/theme';

export default function AddEditProductScreen({ navigation, route }: any) {
    const insets = useSafeAreaInsets();

    const productToEdit = route.params?.product;

    const [categories, setCategories] = useState<any[]>([]);
    const [prodName, setProdName] = useState(productToEdit?.name || '');
    const [prodPrice, setProdPrice] = useState(productToEdit?.price?.toString() || '');
    const [prodCostPrice, setProdCostPrice] = useState(productToEdit?.costPrice?.toString() || '');
    const [prodStock, setProdStock] = useState(productToEdit?.stock?.toString() || '');
    const [prodSku, setProdSku] = useState(productToEdit?.sku || '');
    const [prodUnit, setProdUnit] = useState(productToEdit?.unit || 'Chưa xác định');
    const [selectedCat, setSelectedCat] = useState<string>(productToEdit?.categoryId || productToEdit?.category_id || '');
    const [prodImageUrl, setProdImageUrl] = useState(productToEdit?.imageUrl || '');

    const [isUploading, setIsUploading] = useState(false);
    const [imagePickerVisible, setImagePickerVisible] = useState(false);

    useEffect(() => {
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
            setCategories(cats);
        } catch (error) { console.log(error); }
    };

    const handleLaunchPicker = async (type: 'camera' | 'library') => {
        setImagePickerVisible(false);

        setTimeout(async () => {
            try {
                let result: any;
                const options = { mediaTypes: ['images'] as any, allowsEditing: true, aspect: [1, 1] as [number, number], quality: 0.5 };

                if (type === 'camera') {
                    const { status } = await ImagePicker.requestCameraPermissionsAsync();
                    if (status !== 'granted') return Alert.alert('Lỗi', 'Cần quyền camera.');
                    result = await ImagePicker.launchCameraAsync(options);
                } else {
                    result = await ImagePicker.launchImageLibraryAsync(options);
                }

                if (!result.canceled) {
                    setIsUploading(true);
                    const realUrl = await uploadImageToCloudinary(result.assets[0].uri);
                    setProdImageUrl(realUrl);
                    setIsUploading(false);
                }
            } catch (error) {
                setIsUploading(false);
            }
        }, 400);
    };

    const handleSaveProduct = async () => {
        if (!prodName || !prodPrice) return Alert.alert('Lỗi', 'Vui lòng nhập tên và giá bán!');
        try {
            const payload = {
                name: prodName, price: parseInt(prodPrice), costPrice: parseInt(prodCostPrice) || 0,
                stock: parseInt(prodStock) || 0, sku: prodSku, unit: prodUnit,
                category_id: selectedCat === '' ? null : selectedCat,
                imageUrl: prodImageUrl
            };

            if (productToEdit) await updateProduct(productToEdit._id, payload);
            else await addProduct(payload);

            Alert.alert('Thành công', 'Đã lưu sản phẩm!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        } catch (error) { Alert.alert('Lỗi', 'Không lưu được'); }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}>
                    <ChevronLeft size={28} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{productToEdit ? 'Sửa món hàng' : 'Thêm món hàng'}</Text>
                <View style={{ width: 28 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView style={{ flex: 1, padding: SPACING }} keyboardShouldPersistTaps="handled">

                    <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                        <TouchableOpacity style={styles.imagePickerBtn} onPress={() => setImagePickerVisible(true)} disabled={isUploading}>
                            {isUploading ? <ActivityIndicator size="large" color={COLORS.primary} />
                                : prodImageUrl ? <Image source={{ uri: prodImageUrl }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
                                    : <CameraIcon size={32} color={COLORS.subText} strokeWidth={1.5} />}
                        </TouchableOpacity>
                        <View style={{ flex: 1, marginLeft: 15 }}>
                            <TextInput style={styles.input} placeholder="Tên món hàng (*)" value={prodName} onChangeText={setProdName} />
                            <View style={styles.skuInputContainer}>
                                <TextInput style={styles.skuInputBox} placeholder="Mã vạch (SKU)" value={prodSku} onChangeText={setProdSku} />
                                <TouchableOpacity style={styles.skuScanBtn} onPress={() => navigation.navigate('GlobalScanner', { returnScreen: 'AddEditProduct', action: 'sku' })}>
                                    <ScanBarcode size={22} color="white" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <View style={styles.row}>
                        <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} placeholder="Giá bán (*)" keyboardType="numeric" value={prodPrice} onChangeText={setProdPrice} />
                        <TextInput style={[styles.input, { flex: 1, marginLeft: 8 }]} placeholder="Giá vốn" keyboardType="numeric" value={prodCostPrice} onChangeText={setProdCostPrice} />
                    </View>

                    <View style={styles.row}>
                        <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} placeholder="Tồn kho" keyboardType="numeric" value={prodStock} onChangeText={setProdStock} />
                        <TextInput style={[styles.input, { flex: 1, marginLeft: 8 }]} placeholder="Đơn vị (Cái, Chai...)" value={prodUnit} onChangeText={setProdUnit} />
                    </View>

                    <Text style={styles.label}>Phân loại danh mục:</Text>
                    <View style={styles.pickerContainer}>
                        <Picker selectedValue={selectedCat} onValueChange={(v) => setSelectedCat(v)}>
                            <Picker.Item label="Chưa phân loại" value="" />
                            {categories.map((c) => <Picker.Item key={c._id} label={c.name} value={c._id} />)}
                        </Picker>
                    </View>
                    <View style={{ height: 100 }} />
                </ScrollView>

                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 15) }]}>
                    <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleSaveProduct}>
                        <Text style={styles.btnTextWhite}>Lưu thông tin</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Menu Chọn Ảnh */}
            <Modal visible={imagePickerVisible} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setImagePickerVisible(false)} />
                    <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                        <View style={styles.modalHandle} />
                        <Text style={{ fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 20 }}>Chọn ảnh sản phẩm</Text>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleLaunchPicker('camera')}><Text style={styles.actionBtnText}>Chụp ảnh mới</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleLaunchPicker('library')}><Text style={styles.actionBtnText}>Chọn từ thư viện</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFF0F0', marginTop: 8 }]} onPress={() => setImagePickerVisible(false)}>
                            <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>Hủy bỏ</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F4F8' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },

    imagePickerBtn: { width: 90, height: 90, backgroundColor: '#F8F9FA', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#D1D5DB', borderStyle: 'dashed' },
    input: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 14, padding: 14, marginBottom: 15, fontSize: 15, color: COLORS.text },

    skuInputContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 0 },
    skuInputBox: { flex: 1, backgroundColor: '#F8F9FA', borderWidth: 1, borderRightWidth: 0, borderColor: '#E5E5EA', borderTopLeftRadius: 14, borderBottomLeftRadius: 14, padding: 14, fontSize: 15, color: COLORS.text },
    skuScanBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 14, height: 50, justifyContent: 'center', alignItems: 'center', borderTopRightRadius: 14, borderBottomRightRadius: 14 },

    row: { flexDirection: 'row' },
    label: { marginBottom: 8, color: COLORS.subText, fontWeight: '600', fontSize: 13 },
    pickerContainer: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 14, marginBottom: 25 },

    footer: { paddingHorizontal: SPACING, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F0F4F8', backgroundColor: '#FFF' },
    btn: { width: '100%', padding: 16, borderRadius: 14, alignItems: 'center' },
    btnSave: { backgroundColor: COLORS.primary },
    btnTextWhite: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    bottomSheet: { backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
    modalHandle: { width: 40, height: 5, backgroundColor: '#E0E0E0', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
    actionBtn: { paddingVertical: 16, backgroundColor: '#F8F9FA', borderRadius: 14, marginBottom: 12, alignItems: 'center' },
    actionBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.text }
});