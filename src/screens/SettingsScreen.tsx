import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Sun, Moon, Smartphone } from 'lucide-react-native';
import { COLORS, SPACING } from '../constants/theme';
import { ThemeContext } from '../context/ThemeContext';

export default function SettingsScreen({ navigation }: any) {
    const { themeMode, updateThemeMode, colors, isDark } = useContext(ThemeContext);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    const styles = createStyles(colors);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}>
                    <ChevronLeft size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Cài đặt chung</Text>
                <View style={{ width: 38 }} />
            </View>

            <View style={styles.body}>
                {/* --- KHỐI GIAO DIỆN (THEME) THIẾT KẾ DẠNG 3 TAB MENU --- */}
                <Text style={styles.sectionTitle}>Giao diện ứng dụng</Text>
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tabItem, themeMode === 'light' && styles.tabActive]}
                        onPress={() => updateThemeMode('light')}
                        activeOpacity={0.8}
                    >
                        <Sun size={20} color={themeMode === 'light' ? COLORS.primary : COLORS.subText} />
                        <Text style={[styles.tabText, themeMode === 'light' && styles.tabTextActive]}>Sáng</Text>
                    </TouchableOpacity>

                    <View style={styles.tabDivider} />

                    <TouchableOpacity
                        style={[styles.tabItem, themeMode === 'dark' && styles.tabActive]}
                        onPress={() => updateThemeMode('dark')}
                        activeOpacity={0.8}
                    >
                        <Moon size={20} color={themeMode === 'dark' ? COLORS.primary : COLORS.subText} />
                        <Text style={[styles.tabText, themeMode === 'dark' && styles.tabTextActive]}>Tối</Text>
                    </TouchableOpacity>

                    <View style={styles.tabDivider} />

                    <TouchableOpacity
                        style={[styles.tabItem, themeMode === 'system' && styles.tabActive]}
                        onPress={() => updateThemeMode('system')}
                        activeOpacity={0.8}
                    >
                        <Smartphone size={20} color={themeMode === 'system' ? COLORS.primary : COLORS.subText} />
                        <Text style={[styles.tabText, themeMode === 'system' && styles.tabTextActive]}>Hệ thống</Text>
                    </TouchableOpacity>
                </View>

                {/* --- KHỐI TÙY CHỌN KHÁC --- */}
                <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Tùy chọn khác</Text>
                <View style={styles.settingsBlock}>
                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>Bật thông báo đẩy</Text>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{ false: '#E5E5EA', true: COLORS.primaryLight }}
                            thumbColor={notificationsEnabled ? COLORS.primary : '#f4f3f4'}
                        />
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>Ngôn ngữ</Text>
                        <Text style={styles.settingValue}>Tiếng Việt</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>Phiên bản ứng dụng</Text>
                        <Text style={styles.settingValue}>v1.0.0 (Build 45)</Text>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    headerTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
    body: { padding: SPACING },

    sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.subText, textTransform: 'uppercase', marginBottom: 12, marginLeft: 4 },

    tabContainer: { flexDirection: 'row', backgroundColor: colors.borderColor, borderRadius: 16, padding: 4 },
    tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12 },
    tabActive: { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    tabDivider: { width: 1, backgroundColor: colors.borderColor, marginVertical: 10 },
    tabText: { marginLeft: 8, fontSize: 15, fontWeight: '600', color: colors.subText },
    tabTextActive: { color: colors.primary, fontWeight: '800' },
    hintText: { fontSize: 12, color: colors.subText, fontStyle: 'italic', marginTop: 10, marginLeft: 4 },

    settingsBlock: { backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.borderColor },
    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
    settingLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
    settingValue: { fontSize: 16, color: colors.subText, fontWeight: '500' },
    divider: { height: 1, backgroundColor: colors.borderColor }
});