import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';

import {
    BarChart3, Settings, LogOut, ChevronRight,
    Users, Printer, Store, ShieldCheck
} from 'lucide-react-native';

import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { SPACING } from '../constants/theme';
import { TabParamList } from '../navigation/AppNavigator';

const MenuItem = ({ icon: Icon, iconColor, iconBg, title, subtitle, onPress, isLast = false, colors, styles }: any) => (
    <>
        <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: iconBg }]}>
                <Icon size={22} color={iconColor} strokeWidth={2.25} />
            </View>
            <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>{title}</Text>
                {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
            </View>
            <ChevronRight size={20} color={colors.subText} strokeWidth={2} />
        </TouchableOpacity>
        {!isLast && <View style={styles.menuDivider} />}
    </>
);

export default function MoreScreen() {
    const { logout } = useContext(AuthContext);
    const { colors, isDark } = useContext(ThemeContext);
    const styles = createStyles(colors, isDark);
    type MoreNav = BottomTabNavigationProp<TabParamList, 'More'>;
    const navigation = useNavigation<MoreNav>();

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* SỬA LỖI STATUS BAR ĐEN TRONG DARKMODE CHÍNH LÀ ĐÂY */}
            <StatusBar style={isDark ? "light" : "dark"} />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.pageTitle}>Mở rộng</Text>

                {/* HỒ SƠ CỬA HÀNG */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarBox}>
                        <Store size={32} color={colors.primary} strokeWidth={2} />
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.shopName}>Cửa hàng chính</Text>
                        <View style={styles.roleBadge}>
                            <ShieldCheck size={12} color={colors.success} strokeWidth={2.5} />
                            <Text style={styles.roleText}>Quản trị viên (Admin)</Text>
                        </View>
                    </View>
                </View>

                {/* NHÓM 1: HOẠT ĐỘNG KINH DOANH */}
                <Text style={styles.sectionTitle}>Hoạt động kinh doanh</Text>
                <View style={styles.menuGroup}>
                    <MenuItem
                        icon={BarChart3} iconColor={colors.primary} iconBg={isDark ? colors.primaryLight : '#E5EFFF'}
                        title="Báo cáo & Thống kê" subtitle="Doanh thu, lợi nhuận, tồn kho"
                        onPress={() => navigation.navigate('Dashboard')}
                        colors={colors} styles={styles}
                    />
                    <MenuItem
                        icon={Users} iconColor={colors.success} iconBg={isDark ? '#1a2e1d' : '#D1FAE5'}
                        title="Khách hàng & Đối tác"
                        onPress={() => Alert.alert('Thông báo', 'Tính năng CRM đang được phát triển!')}
                        isLast={true}
                        colors={colors} styles={styles}
                    />
                </View>

                {/* NHÓM 2: THIẾT BỊ & HỆ THỐNG */}
                <Text style={styles.sectionTitle}>Hệ thống & Thiết bị</Text>
                <View style={styles.menuGroup}>
                    <MenuItem
                        icon={Printer} iconColor={colors.warning} iconBg={isDark ? '#332b1a' : '#FEF3C7'}
                        title="Máy in hóa đơn" subtitle="Kết nối Bluetooth/LAN"
                        onPress={() => navigation.navigate('PrinterSettings' as any)}
                        colors={colors} styles={styles}
                    />
                    <MenuItem
                        icon={Settings} iconColor="#8B5CF6" iconBg={isDark ? '#2e1e4a' : '#EDE9FE'}
                        title="Cài đặt chung"
                        onPress={() => navigation.navigate('Settings' as any)}
                        isLast={true}
                        colors={colors} styles={styles}
                    />
                </View>

                {/* NÚT ĐĂNG XUẤT */}
                <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
                    <LogOut size={22} color={colors.danger} strokeWidth={2.25} style={{ marginRight: 10 }} />
                    <Text style={styles.logoutText}>Đăng xuất khỏi hệ thống</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

function createStyles(colors: any, isDark: boolean) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        scrollContent: { padding: SPACING, paddingBottom: 100 },

        pageTitle: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 20 },

        profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 16, borderRadius: 20, marginBottom: 25, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10, elevation: 3 },
        avatarBox: { width: 60, height: 60, borderRadius: 18, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
        profileInfo: { flex: 1 },
        shopName: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 6 },
        roleBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1a2e1d' : '#E8F5E9', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
        roleText: { fontSize: 12, fontWeight: '700', color: colors.success, marginLeft: 4 },

        sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.subText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginLeft: 4 },

        menuGroup: { backgroundColor: colors.card, borderRadius: 20, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
        menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
        menuIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
        menuTextContainer: { flex: 1, justifyContent: 'center' },
        menuTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
        menuSubtitle: { fontSize: 13, color: colors.subText, marginTop: 4 },
        menuDivider: { height: 1, backgroundColor: colors.borderColor, marginLeft: 76, marginRight: 16 },

        logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? colors.danger + '20' : '#FFF0F0', marginTop: 10, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: isDark ? colors.danger + '40' : '#FFE0E0' },
        logoutText: { fontSize: 16, fontWeight: 'bold', color: colors.danger },
    });
}