import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { X, ScanLine, Zap, ZapOff, Camera, ShieldAlert } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';
import { FONTS, SHADOWS } from '../constants/theme';

export default function GlobalScannerScreen({ navigation, route }: any) {
  const { colors } = React.useContext(ThemeContext);
  const styles = createStyles(colors);

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);

  const { returnScreen = 'Sell', action = 'addToCart' } = route.params || {};

  // Animated laser beam
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, { toValue: 240, duration: 1500, useNativeDriver: true }),
        Animated.timing(laserAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [laserAnim]);

  const handleBarCodeScanned = ({ data }: any) => {
    if (scanned || !data) return;
    setScanned(true);

    navigation.navigate(returnScreen, {
      scannedSku: String(data).trim(),
      scannerAction: action,
      timestamp: Date.now(),
    });
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <StatusBar style="light" />
        <View style={styles.permissionCard}>
          <ShieldAlert size={48} color={colors.warning} strokeWidth={2} style={{ marginBottom: 14 }} />
          <Text style={styles.permissionTitle}>Cần quyền truy cập Camera</Text>
          <Text style={styles.permissionSub}>
            Ứng dụng POS cần quyền máy ảnh để quét mã vạch và QR code của sản phẩm.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission} activeOpacity={0.85}>
            <Camera size={18} color="white" strokeWidth={2.4} style={{ marginRight: 8 }} />
            <Text style={styles.permissionBtnText}>Cấp quyền máy ảnh</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtnTextRow} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Camera Live View */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={torchEnabled}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Overlay UI */}
      <SafeAreaView style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconCircleBtn}>
            <X size={22} color="white" strokeWidth={2.4} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Quét mã vạch POS</Text>

          <TouchableOpacity
            onPress={() => setTorchEnabled(!torchEnabled)}
            style={[styles.iconCircleBtn, torchEnabled && styles.torchActive]}
          >
            {torchEnabled ? (
              <Zap size={22} color={colors.warning} strokeWidth={2.4} />
            ) : (
              <ZapOff size={22} color="white" strokeWidth={2.4} />
            )}
          </TouchableOpacity>
        </View>

        {/* Viewfinder Target */}
        <View style={styles.centerTargetArea}>
          <View style={styles.scanBox}>
            {/* Corner accents */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Animated Laser Beam */}
            <Animated.View
              style={[
                styles.laserBeam,
                {
                  transform: [{ translateY: laserAnim }],
                },
              ]}
            />
          </View>

          <Text style={styles.scanInstruction}>
            Đặt mã vạch hoặc mã QR vào giữa khung hình
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'black',
    },
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    permissionCard: {
      backgroundColor: '#1E293B',
      borderRadius: 22,
      padding: 24,
      alignItems: 'center',
      maxWidth: 320,
    },
    permissionTitle: {
      fontSize: 18,
      fontFamily: FONTS.bold,
      color: 'white',
      marginBottom: 8,
      textAlign: 'center',
    },
    permissionSub: {
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: '#94A3B8',
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 20,
    },
    permissionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 14,
      ...SHADOWS.soft,
    },
    permissionBtnText: {
      color: 'white',
      fontFamily: FONTS.bold,
      fontSize: 14,
    },
    backBtnTextRow: {
      marginTop: 14,
      padding: 6,
    },
    backBtnText: {
      color: '#94A3B8',
      fontFamily: FONTS.medium,
      fontSize: 13,
    },
    overlay: {
      flex: 1,
      justifyContent: 'space-between',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 10,
    },
    iconCircleBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    torchActive: {
      backgroundColor: 'rgba(255,255,255,0.9)',
    },
    headerTitle: {
      color: 'white',
      fontSize: 16,
      fontFamily: FONTS.bold,
    },
    centerTargetArea: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scanBox: {
      width: 260,
      height: 260,
      position: 'relative',
      overflow: 'hidden',
    },
    corner: {
      position: 'absolute',
      width: 32,
      height: 32,
      borderColor: colors.primary,
    },
    topLeft: {
      top: 0,
      left: 0,
      borderTopWidth: 4,
      borderLeftWidth: 4,
      borderTopLeftRadius: 14,
    },
    topRight: {
      top: 0,
      right: 0,
      borderTopWidth: 4,
      borderRightWidth: 4,
      borderTopRightRadius: 14,
    },
    bottomLeft: {
      bottom: 0,
      left: 0,
      borderBottomWidth: 4,
      borderLeftWidth: 4,
      borderBottomLeftRadius: 14,
    },
    bottomRight: {
      bottom: 0,
      right: 0,
      borderBottomWidth: 4,
      borderRightWidth: 4,
      borderBottomRightRadius: 14,
    },
    laserBeam: {
      width: '100%',
      height: 2,
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 6,
    },
    scanInstruction: {
      color: 'white',
      fontFamily: FONTS.medium,
      fontSize: 13,
      marginTop: 28,
      textAlign: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
  });