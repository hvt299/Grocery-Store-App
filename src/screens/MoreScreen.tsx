import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import {
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  Users,
  Printer,
  Store,
  ShieldCheck,
  CreditCard,
  HelpCircle,
  UserCheck,
} from 'lucide-react-native';

import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { SPACING, FONTS, SHADOWS } from '../constants/theme';
import { TabParamList } from '../navigation/AppNavigator';

const MenuItem = ({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  onPress,
  isLast = false,
  colors,
  styles,
}: any) => (
  <>
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, { backgroundColor: iconBg }]}>
        <Icon size={20} color={iconColor} strokeWidth={2.2} />
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      <ChevronRight size={18} color={colors.subText} strokeWidth={2} />
    </TouchableOpacity>
    {!isLast && <View style={styles.menuDivider} />}
  </>
);

export default function MoreScreen() {
  const { logout, user, isAdmin, isCashier, sellerName } = useContext(AuthContext);
  const { colors, isDark } = useContext(ThemeContext);
  const styles = createStyles(colors, isDark);
  type MoreNav = BottomTabNavigationProp<TabParamList, 'More'>;
  const navigation = useNavigation<MoreNav>();

  const handleLogout = () => {
    Alert.alert('Đăng xuất ca làm việc', `Bạn có chắc muốn đăng xuất tài khoản "${user?.username || 'nhân viên'}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const handleOpenDashboard = () => {
    if (!isAdmin) {
      Alert.alert(
        'Quyền truy cập bị từ chối',
        'Báo cáo doanh thu & lãi gộp chỉ dành riêng cho Chủ cửa hàng (Admin)!'
      );
      return;
    }
    navigation.navigate('Dashboard' as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Tiện ích mở rộng</Text>

        {/* Cửa hàng & Thông tin ca làm việc phân định rõ vai trò */}
        <View style={styles.profileCard}>
          <View style={[styles.avatarBox, isAdmin ? { backgroundColor: colors.primaryLight } : { backgroundColor: colors.secondaryLight }]}>
            {isAdmin ? (
              <Store size={30} color={colors.primary} strokeWidth={2.2} />
            ) : (
              <UserCheck size={30} color={colors.secondary} strokeWidth={2.2} />
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.shopName}>Cửa hàng tạp hóa A&B</Text>
            <Text style={styles.userNameText}>Tài khoản: {user?.username || 'Thu ngân'}</Text>

            <View style={[styles.roleBadge, isAdmin ? styles.adminRoleBadge : styles.cashierRoleBadge]}>
              {isAdmin ? (
                <>
                  <ShieldCheck size={12} color={colors.primary} strokeWidth={2.5} />
                  <Text style={[styles.roleText, { color: colors.primary }]}>Chủ cửa hàng (Admin)</Text>
                </>
              ) : (
                <>
                  <UserCheck size={12} color={colors.secondary} strokeWidth={2.5} />
                  <Text style={[styles.roleText, { color: colors.secondary }]}>Nhân viên thu ngân (Cashier)</Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* NHÓM 1: HOẠT ĐỘNG KINH DOANH (CHỈ HIỂN THỊ BÁO CÁO NẾU LÀ ADMIN) */}
        {isAdmin && (
          <>
            <Text style={styles.sectionTitle}>Báo cáo & Tài chính (Chủ cửa hàng)</Text>
            <View style={styles.menuGroup}>
              <MenuItem
                icon={BarChart3}
                iconColor={colors.primary}
                iconBg={colors.primaryLight}
                title="Báo cáo & Thống kê"
                subtitle="Doanh thu, lãi gộp, tồn kho ế"
                onPress={handleOpenDashboard}
                colors={colors}
                styles={styles}
              />
              <MenuItem
                icon={CreditCard}
                iconColor={colors.purple}
                iconBg={colors.purpleLight}
                title="Sổ quỹ & Dòng tiền"
                subtitle="Thu chi, chốt ca kết phiên"
                onPress={() => Alert.alert('Thông báo', 'Tính năng Sổ quỹ đang được chuẩn bị phát hành!')}
                isLast={true}
                colors={colors}
                styles={styles}
              />
            </View>
          </>
        )}

        {/* NHÓM 2: KHÁCH HÀNG & BÁN HÀNG */}
        <Text style={styles.sectionTitle}>Dịch vụ & Khách hàng</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            icon={Users}
            iconColor={colors.secondary}
            iconBg={colors.secondaryLight}
            title="Khách hàng thân thiết"
            subtitle="Tích điểm & quản lý công nợ"
            onPress={() => Alert.alert('Thông báo', 'Tính năng CRM & Tích điểm đang được kết nối trong phiên bản tiếp theo!')}
            isLast={true}
            colors={colors}
            styles={styles}
          />
        </View>

        {/* NHÓM 3: THIẾT BỊ & HỆ THỐNG */}
        <Text style={styles.sectionTitle}>Hệ thống & Thiết bị</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            icon={Printer}
            iconColor={colors.warning}
            iconBg={colors.warningLight}
            title="Máy in hóa đơn nhiệt"
            subtitle="Kết nối Bluetooth / Mạng LAN"
            onPress={() => navigation.navigate('PrinterSettings' as any)}
            colors={colors}
            styles={styles}
          />
          <MenuItem
            icon={Settings}
            iconColor={colors.primary}
            iconBg={colors.primaryLight}
            title="Cài đặt chung"
            subtitle="Giao diện sáng/tối, âm thanh"
            onPress={() => navigation.navigate('Settings' as any)}
            colors={colors}
            styles={styles}
          />
          <MenuItem
            icon={HelpCircle}
            iconColor={colors.info}
            iconBg={colors.infoLight}
            title="Hỗ trợ thu ngân"
            subtitle="Hotline & tài liệu nghiệp vụ POS"
            onPress={() => Alert.alert('Hỗ trợ POS', 'Hotline hỗ trợ kỹ thuật: 1900 6868 (8:00 - 22:00)')}
            isLast={true}
            colors={colors}
            styles={styles}
          />
        </View>

        {/* NHÓM 4: ĐĂNG XUẤT */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut size={20} color={colors.danger} strokeWidth={2.2} />
          <Text style={styles.logoutText}>Đăng xuất khỏi ca làm</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Phiên bản POS v1.2.0 • Tài khoản: {sellerName}</Text>
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
    scrollContent: {
      padding: SPACING,
      paddingBottom: 120,
    },
    pageTitle: {
      fontSize: 24,
      fontFamily: FONTS.bold,
      color: colors.text,
      marginBottom: 16,
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      ...SHADOWS.card,
    },
    avatarBox: {
      width: 56,
      height: 56,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileInfo: {
      flex: 1,
      marginLeft: 14,
    },
    shopName: {
      fontSize: 16,
      fontFamily: FONTS.bold,
      color: colors.text,
    },
    userNameText: {
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: colors.subText,
      marginTop: 2,
    },
    roleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      alignSelf: 'flex-start',
      marginTop: 6,
    },
    adminRoleBadge: {
      backgroundColor: colors.primaryLight,
    },
    cashierRoleBadge: {
      backgroundColor: colors.secondaryLight,
    },
    roleText: {
      fontSize: 11,
      fontFamily: FONTS.bold,
      marginLeft: 4,
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
    menuGroup: {
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      marginBottom: 20,
      overflow: 'hidden',
      ...SHADOWS.soft,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    menuIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    menuTextContainer: {
      flex: 1,
      marginLeft: 14,
    },
    menuTitle: {
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: colors.text,
    },
    menuSubtitle: {
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: colors.subText,
      marginTop: 2,
    },
    menuDivider: {
      height: 1,
      backgroundColor: colors.borderColor,
      marginLeft: 68,
    },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.dangerLight,
      borderRadius: 16,
      paddingVertical: 14,
      marginTop: 6,
    },
    logoutText: {
      fontSize: 14,
      fontFamily: FONTS.bold,
      color: colors.danger,
      marginLeft: 8,
    },
    versionText: {
      textAlign: 'center',
      fontSize: 11,
      fontFamily: FONTS.regular,
      color: colors.subText,
      marginTop: 20,
    },
  });