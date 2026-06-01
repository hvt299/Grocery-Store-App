import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, ScanLine } from 'lucide-react-native';
import { COLORS } from '../constants/theme';

export default function GlobalScannerScreen({ navigation, route }: any) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    const { returnScreen = 'Sell', action = 'addToCart' } = route.params || {};

    useEffect(() => {
        if (!permission?.granted) {
            requestPermission();
        }
    }, [permission]);

    const handleBarCodeScanned = ({ data }: any) => {
        if (scanned) return;
        setScanned(true);

        navigation.navigate(returnScreen, {
            scannedSku: data,
            scannerAction: action,
            timestamp: Date.now()
        });
    };

    if (!permission) return <View style={styles.container} />;

    if (!permission.granted) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 16, marginBottom: 20 }}>App cần quyền truy cập Camera để quét mã.</Text>
                <TouchableOpacity style={styles.btn} onPress={requestPermission}>
                    <Text style={styles.btnText}>Cấp quyền Camera</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                    <X size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.title}>Quét mã vạch</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={{ flex: 1 }}>
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code128"] }}
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                />

                {/* Lớp phủ UI cho Camera */}
                <View style={styles.overlay}>
                    <View style={styles.scanBox}>
                        <ScanLine size={60} color={COLORS.primary} opacity={0.5} />
                    </View>
                    <Text style={styles.scanText}>Hướng Camera vào mã vạch sản phẩm</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 20, zIndex: 10 },
    closeBtn: { width: 44, height: 44, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    title: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    scanBox: { width: 260, height: 260, borderWidth: 2, borderColor: COLORS.primary, borderRadius: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
    scanText: { color: 'white', marginTop: 24, fontSize: 16, fontWeight: '500' },
    btn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});