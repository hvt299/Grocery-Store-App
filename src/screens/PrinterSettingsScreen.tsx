import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronLeft,
  Printer,
  Search,
  CheckCircle2,
  Bluetooth,
  Wifi,
  FileText,
} from 'lucide-react-native';
import { SPACING, FONTS, SHADOWS } from '../constants/theme';
import { ThemeContext } from '../context/ThemeContext';

export default function PrinterSettingsScreen({ navigation }: any) {
  const { colors, isDark } = useContext(ThemeContext);
  const styles = createStyles(colors, isDark);

  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isScanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isScanning]);

  const startScan = () => {
    setIsScanning(true);
    setDevices([]);
    const defaultIp = process.env.EXPO_PUBLIC_DEFAULT_PRINTER_IP || '192.168.1.200';
    const defaultPort = process.env.EXPO_PUBLIC_DEFAULT_PRINTER_PORT || '9100';
    const paperSize = process.env.EXPO_PUBLIC_DEFAULT_PRINTER_PAPER_SIZE || '58mm';

    setTimeout(() => {
      setIsScanning(false);
      setDevices([
        { id: 'PRINTER-BT-58', name: `POS Thermal Printer (${paperSize})`, type: 'Bluetooth', mac: '88:4A:EA:12:09:58' },
        { id: 'PRINTER-LAN-80', name: 'Xprinter XP-N160I (LAN)', type: 'LAN', mac: `${defaultIp}:${defaultPort}` },
        { id: 'PRINTER-SUNMI-T2', name: 'Sunmi POS Built-in Thermal', type: 'Internal', mac: 'Hardware Direct' },
      ]);
    }, 1800);
  };

  const handleConnect = (id: string) => {
    setConnectedDeviceId(id);
    Alert.alert('Kết nối thành công', 'Đã liên kết máy in nhiệt. Hệ thống POS đã sẵn sàng in hóa đơn!');
  };

  const handleTestPrint = () => {
    Alert.alert(
      'In thử nghiệm (Test Print)',
      'Lệnh in mẫu đã được gửi tới máy in nhiệt!\nVui lòng kiểm tra giấy in từ thiết bị.'
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ChevronLeft size={28} color={colors.text} strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Máy in hóa đơn nhiệt</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Status Hero Card */}
        <View style={styles.statusCard}>
          <Animated.View
            style={[
              styles.iconBox,
              connectedDeviceId && { backgroundColor: colors.successLight },
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Printer
              size={36}
              color={connectedDeviceId ? colors.success : colors.subText}
              strokeWidth={2.2}
            />
          </Animated.View>

          <Text style={styles.statusTitle}>
            {connectedDeviceId ? 'Đã kết nối máy in nhiệt' : 'Chưa kết nối máy in'}
          </Text>
          <Text style={styles.statusSub}>
            {connectedDeviceId
              ? 'Thiết bị sẵn sàng xuất hóa đơn tự động cho mọi đơn hàng.'
              : 'Hãy nhấn nút quét để tìm kiếm máy in Bluetooth hoặc mạng LAN nội bộ.'}
          </Text>

          {connectedDeviceId && (
            <TouchableOpacity
              style={styles.testBtn}
              onPress={handleTestPrint}
              activeOpacity={0.8}
            >
              <FileText size={18} color="white" strokeWidth={2.4} style={{ marginRight: 6 }} />
              <Text style={styles.testBtnText}>In thử giấy (Test Print)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Scan Header */}
        <View style={styles.scanHeader}>
          <Text style={styles.scanTitle}>Thiết bị tìm thấy</Text>
          <TouchableOpacity
            style={[styles.scanBtn, isScanning && { opacity: 0.8 }]}
            onPress={startScan}
            disabled={isScanning}
            activeOpacity={0.8}
          >
            {isScanning ? (
              <ActivityIndicator size="small" color="white" style={{ marginRight: 6 }} />
            ) : (
              <Search size={16} color="white" strokeWidth={2.4} style={{ marginRight: 6 }} />
            )}
            <Text style={styles.scanBtnText}>{isScanning ? 'Đang dò...' : 'Dò tìm máy in'}</Text>
          </TouchableOpacity>
        </View>

        {/* Device List */}
        {devices.length === 0 && !isScanning && (
          <View style={styles.emptyDeviceBox}>
            <Text style={styles.emptyDeviceText}>
              Chưa có máy in nào được quét. Nhấn "Dò tìm máy in" để bắt đầu.
            </Text>
          </View>
        )}

        {devices.map((device) => {
          const isConnected = connectedDeviceId === device.id;
          return (
            <View key={device.id} style={[styles.deviceItem, isConnected && styles.deviceItemActive]}>
              <View style={styles.deviceIconBg}>
                {device.type === 'Bluetooth' ? (
                  <Bluetooth size={20} color={colors.primary} strokeWidth={2.2} />
                ) : (
                  <Wifi size={20} color={colors.secondary} strokeWidth={2.2} />
                )}
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text style={styles.deviceMac}>
                  Chuẩn: {device.type} • {device.mac}
                </Text>
              </View>

              {isConnected ? (
                <View style={styles.connectedBadge}>
                  <CheckCircle2 size={16} color={colors.success} strokeWidth={2.4} />
                  <Text style={styles.connectedText}>Đang dùng</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.connectBtn}
                  onPress={() => handleConnect(device.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.connectBtnText}>Kết nối</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
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
    body: {
      padding: SPACING,
      paddingBottom: 60,
    },
    statusCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      marginBottom: 24,
      ...SHADOWS.card,
    },
    iconBox: {
      width: 72,
      height: 72,
      borderRadius: 24,
      backgroundColor: colors.cardSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 14,
    },
    statusTitle: {
      fontSize: 17,
      fontFamily: FONTS.bold,
      color: colors.text,
      marginBottom: 6,
    },
    statusSub: {
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: colors.subText,
      textAlign: 'center',
      maxWidth: 290,
      lineHeight: 18,
    },
    testBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 11,
      borderRadius: 14,
      marginTop: 16,
      ...SHADOWS.soft,
    },
    testBtnText: {
      color: 'white',
      fontFamily: FONTS.bold,
      fontSize: 13,
    },
    scanHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
      paddingHorizontal: 4,
    },
    scanTitle: {
      fontSize: 15,
      fontFamily: FONTS.bold,
      color: colors.text,
    },
    scanBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      ...SHADOWS.soft,
    },
    scanBtnText: {
      color: 'white',
      fontFamily: FONTS.bold,
      fontSize: 13,
    },
    emptyDeviceBox: {
      padding: 24,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderColor,
      alignItems: 'center',
    },
    emptyDeviceText: {
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: colors.subText,
      textAlign: 'center',
    },
    deviceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      ...SHADOWS.soft,
    },
    deviceItemActive: {
      borderColor: colors.success,
    },
    deviceIconBg: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.cardSecondary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    deviceName: {
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: colors.text,
    },
    deviceMac: {
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: colors.subText,
      marginTop: 2,
    },
    connectedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.successLight,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
    },
    connectedText: {
      fontSize: 12,
      fontFamily: FONTS.bold,
      color: colors.success,
      marginLeft: 4,
    },
    connectBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
    },
    connectBtnText: {
      color: 'white',
      fontFamily: FONTS.bold,
      fontSize: 12,
    },
  });