import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import {
    BarChart3, Settings, LogOut, ChevronRight,
    Users, Printer, Store, ShieldCheck
} from 'lucide-react-native';

import { AuthContext } from '../context/AuthContext';
import { COLORS, SPACING } from '../constants/theme';
import { TabParamList } from '../navigation/AppNavigator';

const MenuItem = ({ icon: Icon, iconColor, iconBg, title, subtitle, onPress, isLast = false }: any) => (
    <>
        <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: iconBg }]}>
                <Icon size={22} color={iconColor} strokeWidth={2.25} />
            </View>
            <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>{title}</Text>
                {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
            </View>
            <ChevronRight size={20} color={COLORS.subText} strokeWidth={2} />
        </TouchableOpacity>
        {!isLast && <View style={styles.menuDivider} />}
    </>
);

export default function MoreScreen() {
    const { logout } = useContext(AuthContext);
    type MoreNav = BottomTabNavigationProp<TabParamList, 'More'>;
    const navigation = useNavigation<MoreNav>();

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.pageTitle}>Mở rộng</Text>

                {/* HỒ SƠ CỬA HÀNG */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarBox}>
                        <Store size={32} color={COLORS.primary} strokeWidth={2} />
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.shopName}>Cửa hàng chính</Text>
                        <View style={styles.roleBadge}>
                            <ShieldCheck size={12} color={COLORS.success} strokeWidth={2.5} />
                            <Text style={styles.roleText}>Quản trị viên (Admin)</Text>
                        </View>
                    </View>
                </View>

                {/* NHÓM 1: HOẠT ĐỘNG KINH DOANH */}
                <Text style={styles.sectionTitle}>Hoạt động kinh doanh</Text>
                <View style={styles.menuGroup}>
                    <MenuItem
                        icon={BarChart3} iconColor={COLORS.primary} iconBg={COLORS.primaryLight}
                        title="Báo cáo & Thống kê" subtitle="Doanh thu, lợi nhuận, tồn kho"
                        onPress={() => navigation.navigate('Dashboard')}
                    />
                    <MenuItem
                        icon={Users} iconColor="#10B981" iconBg="#D1FAE5"
                        title="Khách hàng & Đối tác"
                        onPress={() => Alert.alert('Thông báo', 'Tính năng CRM đang được phát triển!')}
                        isLast={true}
                    />
                </View>

                {/* NHÓM 2: THIẾT BỊ & HỆ THỐNG */}
                <Text style={styles.sectionTitle}>Hệ thống & Thiết bị</Text>
                <View style={styles.menuGroup}>
                    <MenuItem
                        icon={Printer} iconColor="#F59E0B" iconBg="#FEF3C7"
                        title="Máy in hóa đơn" subtitle="Kết nối Bluetooth/LAN"
                        onPress={() => navigation.navigate('PrinterSettings' as any)}
                    />
                    <MenuItem
                        icon={Settings} iconColor="#8B5CF6" iconBg="#EDE9FE"
                        title="Cài đặt chung"
                        onPress={() => navigation.navigate('Settings' as any)}
                        isLast={true}
                    />
                </View>

                {/* NÚT ĐĂNG XUẤT */}
                <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
                    <LogOut size={22} color={COLORS.danger} strokeWidth={2.25} style={{ marginRight: 10 }} />
                    <Text style={styles.logoutText}>Đăng xuất khỏi hệ thống</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scrollContent: { padding: SPACING, paddingBottom: 100 },

    pageTitle: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 20 },

    profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: 16, borderRadius: 20, marginBottom: 25, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10, elevation: 3 },
    avatarBox: { width: 60, height: 60, borderRadius: 18, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    profileInfo: { flex: 1 },
    shopName: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
    roleBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    roleText: { fontSize: 12, fontWeight: '700', color: COLORS.success, marginLeft: 4 },

    sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.subText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginLeft: 4 },

    menuGroup: { backgroundColor: COLORS.card, borderRadius: 20, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    menuIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    menuTextContainer: { flex: 1, justifyContent: 'center' },
    menuTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
    menuSubtitle: { fontSize: 13, color: COLORS.subText, marginTop: 4 },
    menuDivider: { height: 1, backgroundColor: COLORS.borderColor, marginLeft: 76, marginRight: 16 },

    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0F0', marginTop: 10, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FFE0E0' },
    logoutText: { fontSize: 16, fontWeight: 'bold', color: COLORS.danger },
});