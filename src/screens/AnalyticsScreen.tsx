import React, { useState, useCallback, useContext } from 'react';
import {
    View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions,
    TouchableOpacity, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { LineChart } from 'react-native-chart-kit';

import { Trophy, AlertTriangle, TrendingUp, PackageSearch, ChevronLeft } from 'lucide-react-native';

import { getDashboardAnalytics } from '../services/productService';
import { formatCurrency, formatShortDate } from '../utils/format';
import { SPACING } from '../constants/theme';
import { ThemeContext } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const SkeletonDashboard = ({ colors, styles }: any) => {
    const fadeAnim = React.useRef(new Animated.Value(0.3)).current;
    React.useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 0.3, duration: 800, useNativeDriver: true })
        ])).start();
    }, [fadeAnim]);

    return (
        <Animated.View style={{ padding: SPACING, opacity: fadeAnim, paddingBottom: 120 }}>
            {/* Xương thẻ tóm tắt */}
            <View style={styles.row}>
                <View style={[styles.summaryCard, { height: 100, backgroundColor: colors.borderColor }]} />
                <View style={styles.gap} />
                <View style={[styles.summaryCard, { height: 100, backgroundColor: colors.borderColor }]} />
            </View>
            {/* Xương biểu đồ */}
            <View style={styles.section}>
                <View style={{ width: 160, height: 20, backgroundColor: colors.borderColor, borderRadius: 6, marginBottom: 15 }} />
                <View style={[styles.chartContainer, { height: 220, backgroundColor: colors.borderColor }]} />
            </View>
            {/* Xương danh sách */}
            <View style={styles.section}>
                <View style={{ width: 140, height: 20, backgroundColor: colors.borderColor, borderRadius: 6, marginBottom: 15 }} />
                <View style={[styles.listItem, { height: 68, backgroundColor: colors.borderColor }]} />
                <View style={[styles.listItem, { height: 68, backgroundColor: colors.borderColor }]} />
                <View style={[styles.listItem, { height: 68, backgroundColor: colors.borderColor }]} />
            </View>
        </Animated.View>
    );
};

export default function DashboardScreen({ navigation }: any) {
    const { colors, isDark } = useContext(ThemeContext);
    const styles = createStyles(colors);

    const [analytics, setAnalytics] = useState<any>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            fetchData(false);
        }, [])
    );

    const fetchData = async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const data = await getDashboardAnalytics();
            setAnalytics(data);
        } catch (error) {
            console.log('Lỗi tải báo cáo', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchData(true);
    };

    const chartLabels = analytics?.weeklyTrend?.map((item: any) => formatShortDate(item._id)) || [];
    const chartData = analytics?.weeklyTrend?.map((item: any) => item.revenue) || [];

    const renderSummaryCard = (title: string, data: any, isPrimary = false) => (
        <View style={[styles.summaryCard, isPrimary && styles.summaryCardPrimary]}>
            <Text style={[styles.summaryTitle, isPrimary && styles.summaryTitlePrimary]}>
                {title}
            </Text>

            <Text style={[styles.summaryValue, isPrimary && styles.summaryValuePrimary]} numberOfLines={1}>
                {formatCurrency(data?.revenue || 0)}
            </Text>

            <View style={styles.summaryFooter}>
                <Text style={[styles.summarySub, isPrimary && styles.summarySubPrimary]}>
                    Lãi: {formatCurrency(data?.profit || 0)}
                </Text>
                <Text style={[styles.summarySub, isPrimary && styles.summarySubPrimary]}>
                    {data?.orders || 0} đơn
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar style={isDark ? "light" : "dark"} />

            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={{ paddingRight: 15, paddingVertical: 5 }}
                    >
                        <ChevronLeft size={28} color={colors.text} />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>Báo cáo</Text>
                        <Text style={styles.headerSub}>Tổng quan tình hình kinh doanh</Text>
                    </View>
                </View>
                <View style={styles.headerIconBox}>
                    <TrendingUp size={24} color={colors.primary} strokeWidth={2} />
                </View>
            </View>

            <ScrollView
                contentContainerStyle={loading ? {} : styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
            >
                {loading ? (
                    <SkeletonDashboard colors={colors} styles={styles} />
                ) : (
                    <>
                        <View style={styles.row}>
                            {renderSummaryCard('Hôm nay', analytics?.summary?.today, true)}
                            <View style={styles.gap} />
                            {renderSummaryCard('Tháng này', analytics?.summary?.month)}
                        </View>

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Doanh thu 7 ngày qua</Text>
                            </View>

                            <View style={styles.chartContainer}>
                                <LineChart
                                    data={{
                                        labels: chartLabels.length ? chartLabels : ['N/A'],
                                        datasets: [{ data: chartData.length ? chartData : [0] }],
                                    }}
                                    width={width - SPACING * 2 - 20}
                                    height={220}
                                    yAxisLabel=""
                                    yAxisSuffix="đ"
                                    chartConfig={{
                                        backgroundColor: colors.card,
                                        backgroundGradientFrom: colors.card,
                                        backgroundGradientTo: colors.card,
                                        decimalPlaces: 0,
                                        color: (opacity = 1) => `rgba(74, 114, 255, ${opacity})`,
                                        labelColor: () => colors.subText,
                                        style: { borderRadius: 16 },
                                        propsForDots: { r: '5', strokeWidth: '2', stroke: colors.primary },
                                        propsForBackgroundLines: { strokeDasharray: "4", stroke: colors.borderColor }
                                    }}
                                    bezier
                                    style={{ borderRadius: 16, paddingTop: 10 }}
                                />
                            </View>
                        </View>

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Top 5 Bán Chạy</Text>
                                <Trophy size={22} color={colors.warning} strokeWidth={2} />
                            </View>

                            {analytics?.topProducts?.length > 0 ? (
                                analytics.topProducts.map((item: any, index: number) => (
                                    <View key={item._id} style={styles.listItem}>
                                        <View style={[styles.rankBadge, index === 0 && { backgroundColor: isDark ? '#332b1a' : '#FFF4E5' }]}>
                                            <Text style={[styles.rankText, index === 0 && { color: colors.warning }]}>
                                                #{index + 1}
                                            </Text>
                                        </View>

                                        <View style={styles.listContent}>
                                            <Text style={styles.listName} numberOfLines={1}>{item.name}</Text>
                                            <Text style={styles.listSubText}>Đã bán: {item.totalQuantity}</Text>
                                        </View>

                                        <Text style={styles.listValue}>{formatCurrency(item.totalRevenue)}</Text>
                                    </View>
                                ))
                            ) : (
                                <View style={styles.emptyContainer}>
                                    <PackageSearch size={40} color={colors.subText} style={{ opacity: 0.5, marginBottom: 10 }} />
                                    <Text style={styles.emptyText}>Chưa có dữ liệu bán hàng</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Cảnh Báo: Hàng Tồn Ế ({'>'}30 ngày)</Text>
                                <AlertTriangle size={22} color={colors.danger} strokeWidth={2} />
                            </View>

                            {analytics?.deadStock?.length > 0 ? (
                                analytics.deadStock.map((item: any) => (
                                    <View key={item._id} style={styles.listItem}>
                                        <View style={styles.listContent}>
                                            <Text style={styles.listName} numberOfLines={1}>{item.name}</Text>
                                            <Text style={styles.listSubText}>Giá bán: {formatCurrency(item.price)}</Text>
                                        </View>

                                        <View style={styles.dangerBadge}>
                                            <Text style={styles.dangerText}>Tồn {item.stock}</Text>
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <View style={styles.emptyContainer}>
                                    <Trophy size={40} color={colors.success} style={{ opacity: 0.5, marginBottom: 10 }} />
                                    <Text style={[styles.emptyText, { color: colors.success }]}>Tuyệt vời! Không có hàng tồn ế.</Text>
                                </View>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING, paddingTop: 10, paddingBottom: 15 },
    headerTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
    headerSub: { fontSize: 14, color: colors.subText, marginTop: 4 },
    headerIconBox: { width: 44, height: 44, backgroundColor: colors.primaryLight, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

    scrollContent: { padding: SPACING, paddingBottom: 120 },
    row: { flexDirection: 'row' },
    gap: { width: SPACING },

    summaryCard: { flex: 1, backgroundColor: colors.card, padding: 16, borderRadius: 20, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10, elevation: 3 },
    summaryCardPrimary: { backgroundColor: colors.primary },
    summaryTitle: { fontSize: 12, color: colors.subText, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryTitlePrimary: { color: 'rgba(255,255,255,0.8)' },
    summaryValue: { fontSize: 22, fontWeight: '900', color: colors.text, marginVertical: 10 },
    summaryValuePrimary: { color: '#fff' },
    summaryFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summarySub: { fontSize: 12, color: colors.subText, fontWeight: '500' },
    summarySubPrimary: { color: 'rgba(255,255,255,0.9)' },

    section: { marginTop: 25 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text },

    chartContainer: { backgroundColor: colors.card, borderRadius: 20, padding: 10, alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },

    listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 16, borderRadius: 16, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 8, elevation: 2 },
    rankBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.borderColor, justifyContent: 'center', alignItems: 'center' },
    rankText: { fontWeight: '800', color: colors.text, fontSize: 14 },

    listContent: { flex: 1, marginLeft: 15, paddingRight: 10 },
    listName: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
    listSubText: { fontSize: 13, color: colors.subText },
    listValue: { fontSize: 15, fontWeight: '800', color: colors.primary },

    dangerBadge: { backgroundColor: colors.danger + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: colors.danger + '40' },
    dangerText: { color: colors.danger, fontSize: 13, fontWeight: '800' },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30, backgroundColor: colors.card, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.borderColor },
    emptyText: { textAlign: 'center', color: colors.subText, fontWeight: '600', fontSize: 14 },
});