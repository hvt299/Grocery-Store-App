import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';

import { getDashboardAnalytics } from '../services/productService';
import { formatCurrency, formatShortDate } from '../utils/format';
import { COLORS, SPACING } from '../constants/theme';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
    const [analytics, setAnalytics] = useState<any>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const fetchData = async () => {
        try {
            setLoading(true);
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
        fetchData();
    };

    const chartLabels =
        analytics?.weeklyTrend?.map((item: any) => formatShortDate(item._id)) ||
        [];
    const chartData =
        analytics?.weeklyTrend?.map((item: any) => item.revenue) || [];

    const renderSummaryCard = (title: string, data: any, isPrimary = false) => (
        <View style={[styles.summaryCard, isPrimary && styles.summaryCardPrimary]}>
            <Text
                style={[
                    styles.summaryTitle,
                    isPrimary && styles.summaryTitlePrimary,
                ]}
            >
                {title}
            </Text>

            <Text
                style={[
                    styles.summaryValue,
                    isPrimary && styles.summaryValuePrimary,
                ]}
            >
                {formatCurrency(data?.revenue || 0)}
            </Text>

            <View style={styles.summaryFooter}>
                <Text
                    style={[
                        styles.summarySub,
                        isPrimary && styles.summarySubPrimary,
                    ]}
                >
                    Lãi: {formatCurrency(data?.profit || 0)}
                </Text>
                <Text
                    style={[
                        styles.summarySub,
                        isPrimary && styles.summarySubPrimary,
                    ]}
                >
                    {data?.orders || 0} đơn
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Báo Cáo Thống Kê</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[COLORS.primary]}
                    />
                }
            >
                <View style={styles.row}>
                    {renderSummaryCard('Hôm nay', analytics?.summary?.today, true)}
                    <View style={styles.gap} />
                    {renderSummaryCard('Tháng này', analytics?.summary?.month)}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Xu hướng doanh thu (7 ngày)
                    </Text>

                    <View style={styles.chartContainer}>
                        <LineChart
                            data={{
                                labels: chartLabels.length ? chartLabels : ['N/A'],
                                datasets: [
                                    {
                                        data: chartData.length ? chartData : [0],
                                    },
                                ],
                            }}
                            width={width - SPACING * 2}
                            height={220}
                            yAxisSuffix="đ"
                            chartConfig={{
                                backgroundColor: COLORS.card,
                                backgroundGradientFrom: COLORS.card,
                                backgroundGradientTo: COLORS.card,
                                decimalPlaces: 0,
                                color: (opacity = 1) =>
                                    `rgba(74, 114, 255, ${opacity})`,
                                labelColor: () => COLORS.subText,
                                style: { borderRadius: 16 },
                                propsForDots: {
                                    r: '4',
                                    strokeWidth: '2',
                                    stroke: COLORS.primary,
                                },
                            }}
                            bezier
                            style={{ borderRadius: 16 }}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Top 5 Bán Chạy</Text>
                        <Ionicons
                            name="trophy"
                            size={20}
                            color={COLORS.warning}
                        />
                    </View>

                    {analytics?.topProducts?.length > 0 ? (
                        analytics.topProducts.map((item: any, index: number) => (
                            <View key={item._id} style={styles.listItem}>
                                <View style={styles.rankBadge}>
                                    <Text style={styles.rankText}>
                                        {index + 1}
                                    </Text>
                                </View>

                                <View style={styles.listContent}>
                                    <Text style={styles.listName}>
                                        {item.name}
                                    </Text>
                                    <Text style={styles.listSubText}>
                                        Đã bán: {item.totalQuantity}
                                    </Text>
                                </View>

                                <Text style={styles.listValue}>
                                    {formatCurrency(item.totalRevenue)}
                                </Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>
                            Chưa có dữ liệu bán hàng
                        </Text>
                    )}
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>
                            Cảnh Báo: Hàng Tồn Ế ({'>'}30 ngày)
                        </Text>
                        <Ionicons
                            name="warning"
                            size={20}
                            color={COLORS.danger}
                        />
                    </View>

                    {analytics?.deadStock?.length > 0 ? (
                        analytics.deadStock.map((item: any) => (
                            <View key={item._id} style={styles.listItem}>
                                <View style={styles.listContent}>
                                    <Text style={styles.listName}>
                                        {item.name}
                                    </Text>
                                    <Text style={styles.listSubText}>
                                        Giá bán: {formatCurrency(item.price)}
                                    </Text>
                                </View>

                                <View style={styles.dangerBadge}>
                                    <Text style={styles.dangerText}>
                                        Tồn {item.stock}
                                    </Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>
                            Tuyệt vời! Không có hàng tồn ế.
                        </Text>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    header: {
        paddingHorizontal: SPACING,
        paddingVertical: 12,
    },

    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.text,
    },

    scrollContent: {
        padding: SPACING,
        paddingBottom: 120,
    },

    row: {
        flexDirection: 'row',
    },

    gap: {
        width: SPACING,
    },

    summaryCard: {
        flex: 1,
        backgroundColor: COLORS.card,
        padding: 15,
        borderRadius: 16,
    },

    summaryCardPrimary: {
        backgroundColor: COLORS.primary,
    },

    summaryTitle: {
        fontSize: 12,
        color: COLORS.subText,
        fontWeight: '600',
        textTransform: 'uppercase',
    },

    summaryTitlePrimary: {
        color: 'rgba(255,255,255,0.8)',
    },

    summaryValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        marginVertical: 8,
    },

    summaryValuePrimary: {
        color: '#fff',
    },

    summaryFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    summarySub: {
        fontSize: 12,
        color: COLORS.subText,
    },

    summarySubPrimary: {
        color: 'rgba(255,255,255,0.9)',
    },

    section: {
        marginTop: 22,
    },

    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },

    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },

    chartContainer: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 10,
    },

    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },

    rankBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#F0F4F8',
        justifyContent: 'center',
        alignItems: 'center',
    },

    rankText: {
        fontWeight: '700',
        color: COLORS.text,
    },

    listContent: {
        flex: 1,
        marginLeft: 12,
    },

    listName: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },

    listSubText: {
        fontSize: 12,
        color: COLORS.subText,
        marginTop: 3,
    },

    listValue: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.primary,
    },

    dangerBadge: {
        backgroundColor: '#FFEBEA',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },

    dangerText: {
        color: COLORS.danger,
        fontSize: 12,
        fontWeight: '700',
    },

    emptyText: {
        textAlign: 'center',
        color: COLORS.subText,
        fontStyle: 'italic',
        marginTop: 10,
    },
});