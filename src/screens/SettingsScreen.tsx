import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronLeft,
  Sun,
  Moon,
  Smartphone,
  Bell,
  Volume2,
  Printer,
  Globe,
  Info,
  ShieldCheck,
} from 'lucide-react-native';
import { SPACING, FONTS, SHADOWS } from '../constants/theme';
import { ThemeContext } from '../context/ThemeContext';

export default function SettingsScreen({ navigation }: any) {
  const { themeMode, updateThemeMode, colors, isDark } = useContext(ThemeContext);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(false);

  const styles = createStyles(colors, isDark);

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
        <Text style={styles.headerTitle}>Cài đặt hệ thống</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* --- KHỐI GIAO DIỆN (THEME) --- */}
        <Text style={styles.sectionTitle}>Giao diện ứng dụng</Text>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabItem, themeMode === 'light' && styles.tabActive]}
            onPress={() => updateThemeMode('light')}
            activeOpacity={0.8}
          >
            <Sun
              size={18}
              color={themeMode === 'light' ? colors.primary : colors.subText}
              strokeWidth={2.2}
            />
            <Text style={[styles.tabText, themeMode === 'light' && styles.tabTextActive]}>
              Sáng
            </Text>
          </TouchableOpacity>

          <View style={styles.tabDivider} />

          <TouchableOpacity
            style={[styles.tabItem, themeMode === 'dark' && styles.tabActive]}
            onPress={() => updateThemeMode('dark')}
            activeOpacity={0.8}
          >
            <Moon
              size={18}
              color={themeMode === 'dark' ? colors.primary : colors.subText}
              strokeWidth={2.2}
            />
            <Text style={[styles.tabText, themeMode === 'dark' && styles.tabTextActive]}>
              Tối
            </Text>
          </TouchableOpacity>

          <View style={styles.tabDivider} />

          <TouchableOpacity
            style={[styles.tabItem, themeMode === 'system' && styles.tabActive]}
            onPress={() => updateThemeMode('system')}
            activeOpacity={0.8}
          >
            <Smartphone
              size={18}
              color={themeMode === 'system' ? colors.primary : colors.subText}
              strokeWidth={2.2}
            />
            <Text style={[styles.tabText, themeMode === 'system' && styles.tabTextActive]}>
              Hệ thống
            </Text>
          </TouchableOpacity>
        </View>

        {/* --- KHỐI THAO TÁC POS --- */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Cấu hình thu ngân POS</Text>
        <View style={styles.settingsBlock}>
          <View style={styles.settingRow}>
            <View style={styles.settingIconLabel}>
              <View style={[styles.miniIconBg, { backgroundColor: colors.primaryLight }]}>
                <Volume2 size={18} color={colors.primary} strokeWidth={2.2} />
              </View>
              <View>
                <Text style={styles.settingLabel}>Âm thanh phản hồi</Text>
                <Text style={styles.settingSubLabel}>Phát tiếng bip khi quét mã & thêm giỏ</Text>
              </View>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: colors.borderColor, true: colors.primaryMedium }}
              thumbColor={soundEnabled ? colors.primary : '#f4f3f4'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingIconLabel}>
              <View style={[styles.miniIconBg, { backgroundColor: colors.warningLight }]}>
                <Printer size={18} color={colors.warning} strokeWidth={2.2} />
              </View>
              <View>
                <Text style={styles.settingLabel}>Tự động in hóa đơn</Text>
                <Text style={styles.settingSubLabel}>In bill ngay khi nhấn thanh toán</Text>
              </View>
            </View>
            <Switch
              value={autoPrintEnabled}
              onValueChange={setAutoPrintEnabled}
              trackColor={{ false: colors.borderColor, true: colors.primaryMedium }}
              thumbColor={autoPrintEnabled ? colors.primary : '#f4f3f4'}
            />
          </View>
        </View>

        {/* --- KHỐI HỆ THỐNG & THÔNG TIN --- */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Hệ thống & Thiết bị</Text>
        <View style={styles.settingsBlock}>
          <View style={styles.settingRow}>
            <View style={styles.settingIconLabel}>
              <View style={[styles.miniIconBg, { backgroundColor: colors.secondaryLight }]}>
                <Bell size={18} color={colors.secondary} strokeWidth={2.2} />
              </View>
              <Text style={styles.settingLabel}>Thông báo thay đổi kho</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.borderColor, true: colors.primaryMedium }}
              thumbColor={notificationsEnabled ? colors.primary : '#f4f3f4'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingIconLabel}>
              <View style={[styles.miniIconBg, { backgroundColor: colors.infoLight }]}>
                <Globe size={18} color={colors.info} strokeWidth={2.2} />
              </View>
              <Text style={styles.settingLabel}>Ngôn ngữ hiển thị</Text>
            </View>
            <Text style={styles.settingValue}>Tiếng Việt (vi-VN)</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingIconLabel}>
              <View style={[styles.miniIconBg, { backgroundColor: colors.cardSecondary }]}>
                <Info size={18} color={colors.subText} strokeWidth={2.2} />
              </View>
              <Text style={styles.settingLabel}>Phiên bản POS</Text>
            </View>
            <Text style={styles.settingValue}>v1.2.0 (Build 52)</Text>
          </View>
        </View>
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
    sectionTitle: {
      fontSize: 12,
      fontFamily: FONTS.bold,
      color: colors.subText,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 10,
      marginLeft: 4,
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: colors.cardSecondary,
      borderRadius: 16,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    tabItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 11,
      borderRadius: 12,
    },
    tabActive: {
      backgroundColor: colors.card,
      ...SHADOWS.soft,
    },
    tabDivider: {
      width: 1,
      height: 20,
      backgroundColor: colors.borderColor,
      alignSelf: 'center',
    },
    tabText: {
      marginLeft: 6,
      fontSize: 13,
      fontFamily: FONTS.medium,
      color: colors.subText,
    },
    tabTextActive: {
      color: colors.primary,
      fontFamily: FONTS.bold,
    },
    settingsBlock: {
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      overflow: 'hidden',
      ...SHADOWS.soft,
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    settingIconLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    miniIconBg: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    settingLabel: {
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: colors.text,
    },
    settingSubLabel: {
      fontSize: 11,
      fontFamily: FONTS.regular,
      color: colors.subText,
      marginTop: 2,
    },
    settingValue: {
      fontSize: 13,
      fontFamily: FONTS.medium,
      color: colors.subText,
    },
    divider: {
      height: 1,
      backgroundColor: colors.borderColor,
      marginLeft: 64,
    },
  });