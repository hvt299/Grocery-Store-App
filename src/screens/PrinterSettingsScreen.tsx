import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Printer, Search, CheckCircle2 } from 'lucide-react-native';
import { COLORS, SPACING } from '../constants/theme';

export default function PrinterSettingsScreen({ navigation }: any) {
    const [isScanning, setIsScanning] = useState(false);
    const [devices, setDevices] = useState<any[]>([]);
    const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(null);

    const startScan = () => {
        setIsScanning(true);
        setDevices([]);
        setTimeout(() => {
            setIsScanning(false);
            setDevices([
                { id: 'MAC-01', name: 'POS Thermal Printer 58mm', type: 'Bluetooth' },
                { id: 'MAC-02', name: 'Xprinter XP-N160I', type: 'LAN' },
            ]);
        }, 2000);
    };

    const handleConnect = (id: string) => {
        setConnectedDeviceId(id);
        Alert.alert("Thành công", "Đã kết nối máy in. Hệ thống đã sẵn sàng xuất hóa đơn!");
    };

    const handleTestPrint = () => {
        Alert.alert("In thử nghiệm", "Đang gửi lệnh in...\nVui lòng kiểm tra giấy chạy ra từ máy in.");
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}>
                    <ChevronLeft size={28} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Máy in hóa đơn</Text>
                <View style={{ width: 38 }} />
            </View>

            <View style={styles.body}>
                <View style={styles.statusCard}>
                    <View style={[styles.iconBox, connectedDeviceId && { backgroundColor: '#E8F5E9' }]}>
                        <Printer size={32} color={connectedDeviceId ? COLORS.success : COLORS.subText} />
                    </View>
                    <Text style={styles.statusTitle}>
                        {connectedDeviceId ? 'Đã kết nối máy in' : 'Chưa kết nối máy in'}
                    </Text>
                    <Text style={styles.statusSub}>
                        {connectedDeviceId ? 'Sẵn sàng in hóa đơn cho khách hàng.' : 'Hãy quét để tìm máy in gần bạn.'}
                    </Text>

                    {connectedDeviceId && (
                        <TouchableOpacity style={styles.testBtn} onPress={handleTestPrint}>
                            <Text style={styles.testBtnText}>In thử (Test Print)</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.scanHeader}>
                    <Text style={styles.scanTitle}>Thiết bị xung quanh</Text>
                    <TouchableOpacity style={styles.scanBtn} onPress={startScan} disabled={isScanning}>
                        {isScanning ? <ActivityIndicator size="small" color="white" /> : <Search size={18} color="white" />}
                        <Text style={styles.scanBtnText}>{isScanning ? 'Đang quét...' : 'Quét ngay'}</Text>
                    </TouchableOpacity>
                </View>

                {devices.map(device => (
                    <View key={device.id} style={styles.deviceItem}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.deviceName}>{device.name}</Text>
                            <Text style={styles.deviceMac}>Chuẩn kết nối: {device.type}</Text>
                        </View>
                        {connectedDeviceId === device.id ? (
                            <View style={styles.connectedBadge}>
                                <CheckCircle2 size={16} color={COLORS.success} />
                                <Text style={styles.connectedText}>Đã kết nối</Text>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.connectBtn} onPress={() => handleConnect(device.id)}>
                                <Text style={styles.connectBtnText}>Kết nối</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ))}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F4F8' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
    body: { padding: SPACING },
    statusCard: { alignItems: 'center', backgroundColor: COLORS.card, padding: 30, borderRadius: 20, marginBottom: 30, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
    iconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F0F4F8', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    statusTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
    statusSub: { fontSize: 14, color: COLORS.subText, textAlign: 'center' },
    testBtn: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.primaryLight, borderRadius: 12 },
    testBtnText: { color: COLORS.primary, fontWeight: 'bold' },
    scanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    scanTitle: { fontSize: 16, fontWeight: '700', color: COLORS.subText, textTransform: 'uppercase' },
    scanBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
    scanBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },
    deviceItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F0F4F8' },
    deviceName: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
    deviceMac: { fontSize: 13, color: COLORS.subText },
    connectBtn: { backgroundColor: '#F0F4F8', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
    connectBtnText: { color: COLORS.primary, fontWeight: 'bold' },
    connectedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
    connectedText: { color: COLORS.success, fontWeight: 'bold', marginLeft: 6 }
});