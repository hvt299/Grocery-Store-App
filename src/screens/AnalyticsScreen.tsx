import React, { useState, useCallback, useContext, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { LineChart } from 'react-native-chart-kit';
import {
  Trophy,
  AlertTriangle,
  TrendingUp,
  PackageSearch,
  ChevronLeft,
  CircleDollarSign,
  ShoppingBag,
  Sparkles,
} from 'lucide-react-native';

import { getDashboardAnalytics } from '../services/productService';
import { formatCurrency, formatShortDate } from '../utils/format';
import { SPACING, FONTS, SHADOWS } from '../constants/theme';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const SkeletonDashboard = ({ colors, styles }: any) => {
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.9, duration: 800, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [fadeAnim]);

  return (
    <Animated.View style={{ padding: SPACING, opacity: fadeAnim, paddingBottom: 120 }}>
      <View style={styles.row}>
        <View style={[styles.summaryCard, { height: 110, backgroundColor: colors.borderColor }]} />
        <View style={styles.gap} />
        <View style={[styles.summaryCard, { height: 110, backgroundColor: colors.borderColor }]} />
      </View>
      <View style={styles.section}>
        <View style={{ width: 160, height: 18, backgroundColor: colors.borderColor, borderRadius: 6, marginBottom: 14 }} />
        <View style={[styles.chartContainer, { height: 220, backgroundColor: colors.borderColor }]} />
      </View>
      <View style={styles.section}>
        <View style={{ width: 140, height: 18, backgroundColor: colors.borderColor, borderRadius: 6, marginBottom: 14 }} />
        <View style={[styles.listItem, { height: 68, backgroundColor: colors.borderColor }]} />
        <View style={[styles.listItem, { height: 68, backgroundColor: colors.borderColor }]} />
      </View>
    </Animated.View>
  );
};

export default function DashboardScreen({ navigation }: any) {
  const { colors, isDark } = useContext(ThemeContext);
  const { isAdmin } = useContext(AuthContext);
  const styles = createStyles(colors, isDark);

  const [analytics, setAnalytics] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!isAdmin) {
        Alert.alert(
          'Quyền hạn bị từ chối',
          'Báo cáo doanh thu và tài chính chỉ dành riêng cho Chủ cửa hàng (Admin)!',
          [{ text: 'Quay lại', onPress: () => navigation.goBack() }]
        );
        return;
      }
      fetchData(false);
    }, [isAdmin])
  );

  const fetchData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await getDashboardAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.log('Lỗi tải báo cáo phân tích', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  // Safe chart data preparation
  const rawLabels = (analytics?.weeklyTrend?.map((item: any) => formatShortDate(item._id)) || []).slice(-7);
  const rawData = (analytics?.weeklyTrend?.map((item: any) => Number(item.revenue) || 0) || []).slice(-7);

  const chartLabels = rawLabels.length > 0 ? rawLabels : ['Hôm nay'];
  const chartData = rawData.length > 0 ? rawData : [0];

  // Align length in case of any discrepancy
  while (chartLabels.length < chartData.length) {
    chartLabels.push('-');
  }
  while (chartData.length < chartLabels.length) {
    chartData.push(0);
  }

  const renderSummaryCard = (title: string, data: any, isPrimary = false) => {
    const revenue = Number(data?.revenue) || 0;
    const profit = Number(data?.profit) || 0;
    const orders = Number(data?.orders) || 0;

    return (
      <View style={[styles.summaryCard, isPrimary && styles.summaryCardPrimary]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[styles.summaryTitle, isPrimary && styles.summaryTitlePrimary]}>
            {title}
          </Text>
          {isPrimary ? (
            <CircleDollarSign size={18} color="white" strokeWidth={2.4} />
          ) : (
            <ShoppingBag size={18} color={colors.secondary} strokeWidth={2.4} />
          )}
        </View>

        <Text
          style={[styles.summaryValue, isPrimary && styles.summaryValuePrimary]}
          numberOfLines={1}
        >
          {formatCurrency(revenue)}
        </Text>

        <View style={styles.summaryFooter}>
          <Text style={[styles.summarySub, isPrimary && styles.summarySubPrimary]}>
            Lãi: {formatCurrency(profit)}
          </Text>
          <Text style={[styles.summarySubBadge, isPrimary && styles.summarySubBadgePrimary]}>
            {orders} đơn
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ paddingRight: 12, paddingVertical: 4 }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={28} color={colors.text} strokeWidth={2.4} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Báo cáo kinh doanh</Text>
            <Text style={styles.headerSub}>Tổng quan doanh thu & hiệu suất bán lẻ</Text>
          </View>
        </View>
        <View style={styles.headerIconBox}>
          <TrendingUp size={22} color={colors.primary} strokeWidth={2.4} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={loading ? {} : styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {loading ? (
          <SkeletonDashboard colors={colors} styles={styles} />
        ) : (
          <>
            {/* Revenue Summary Cards */}
            <View style={styles.row}>
              {renderSummaryCard('Hôm nay', analytics?.summary?.today, true)}
              <View style={styles.gap} />
              {renderSummaryCard('Tháng này', analytics?.summary?.month, false)}
            </View>

            {/* 7-Day Revenue Trend */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TrendingUp size={18} color={colors.primary} strokeWidth={2.4} style={{ marginRight: 6 }} />
                  <Text style={styles.sectionTitle}>Doanh thu 7 ngày gần nhất</Text>
                </View>
              </View>

              <View style={styles.chartContainer}>
                <LineChart
                  data={{
                    labels: chartLabels,
                    datasets: [{ data: chartData }],
                  }}
                  width={width - SPACING * 2 - 24}
                  height={220}
                  yAxisLabel=""
                  yAxisSuffix=" đ"
                  chartConfig={{
                    backgroundColor: colors.card,
                    backgroundGradientFrom: colors.card,
                    backgroundGradientTo: colors.card,
                    decimalPlaces: 0,
                    color: (opacity = 1) =>
                      isDark
                        ? `rgba(96, 165, 250, ${opacity})`
                        : `rgba(37, 99, 235, ${opacity})`,
                    labelColor: () => colors.subText,
                    style: { borderRadius: 16 },
                    propsForDots: {
                      r: '5',
                      strokeWidth: '2',
                      stroke: colors.primary,
                    },
                    propsForBackgroundLines: {
                      strokeDasharray: '4',
                      stroke: colors.borderColor,
                    },
                  }}
                  bezier
                  style={{ borderRadius: 16, paddingTop: 10 }}
                />
              </View>
            </View>

            {/* Top 5 Best Sellers */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Trophy size={18} color={colors.warning} strokeWidth={2.4} style={{ marginRight: 6 }} />
                  <Text style={styles.sectionTitle}>Top 5 sản phẩm bán chạy</Text>
                </View>
              </View>

              {Array.isArray(analytics?.topProducts) && analytics.topProducts.length > 0 ? (
                analytics.topProducts.map((item: any, index: number) => {
                  const rankColors = [
                    { bg: colors.warningLight, text: colors.warning },
                    { bg: colors.borderColor, text: colors.textSecondary },
                    { bg: colors.primaryLight, text: colors.primary },
                  ];
                  const rankStyle = rankColors[index] || {
                    bg: colors.cardSecondary,
                    text: colors.subText,
                  };

                  return (
                    <View key={item._id || `top-${index}`} style={styles.listItem}>
                      <View style={[styles.rankBadge, { backgroundColor: rankStyle.bg }]}>
                        <Text style={[styles.rankText, { color: rankStyle.text }]}>
                          #{index + 1}
                        </Text>
                      </View>

                      <View style={styles.listContent}>
                        <Text style={styles.listName} numberOfLines={1}>
                          {item.name || 'Sản phẩm'}
                        </Text>
                        <Text style={styles.listSubText}>
                          Đã bán: {item.totalQuantity || 0} sản phẩm
                        </Text>
                      </View>

                      <Text style={styles.listValue}>
                        {formatCurrency(item.totalRevenue || 0)}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyContainer}>
                  <PackageSearch size={40} color={colors.subText} strokeWidth={1.8} style={{ opacity: 0.6, marginBottom: 8 }} />
                  <Text style={styles.emptyText}>Chưa có dữ liệu bán chạy trong kỳ</Text>
                </View>
              )}
            </View>

            {/* Slow Moving / Dead Stock Alert */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AlertTriangle size={18} color={colors.danger} strokeWidth={2.4} style={{ marginRight: 6 }} />
                  <Text style={styles.sectionTitle}>Cảnh báo tồn kho ế ({'>'} 30 ngày)</Text>
                </View>
              </View>

              {Array.isArray(analytics?.deadStock) && analytics.deadStock.length > 0 ? (
                analytics.deadStock.map((item: any, index: number) => (
                  <View key={item._id || `dead-${index}`} style={styles.listItem}>
                    <View style={styles.listContent}>
                      <Text style={styles.listName} numberOfLines={1}>
                        {item.name || 'Sản phẩm'}
                      </Text>
                      <Text style={styles.listSubText}>
                        Giá vốn: {formatCurrency(item.costPrice || item.price || 0)}
                      </Text>
                    </View>

                    <View style={styles.dangerBadge}>
                      <Text style={styles.dangerText}>Tồn: {item.stock || 0}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Sparkles size={36} color={colors.success} strokeWidth={2} style={{ marginBottom: 8 }} />
                  <Text style={[styles.emptyText, { color: colors.success, fontFamily: FONTS.semiBold }]}>
                    Tuyệt vời! Không có hàng tồn ế quá 30 ngày.
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
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
      paddingBottom: 14,
    },
    headerTitle: {
      fontSize: 22,
      fontFamily: FONTS.bold,
      color: colors.text,
    },
    headerSub: {
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: colors.subText,
      marginTop: 2,
    },
    headerIconBox: {
      width: 44,
      height: 44,
      backgroundColor: colors.primaryLight,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    scrollContent: {
      padding: SPACING,
      paddingBottom: 120,
    },
    row: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    gap: {
      width: 12,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      ...SHADOWS.card,
    },
    summaryCardPrimary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    summaryTitle: {
      fontSize: 13,
      fontFamily: FONTS.semiBold,
      color: colors.subText,
    },
    summaryTitlePrimary: {
      color: 'rgba(255,255,255,0.85)',
    },
    summaryValue: {
      fontSize: 18,
      fontFamily: FONTS.bold,
      color: colors.text,
      marginTop: 8,
      marginBottom: 12,
    },
    summaryValuePrimary: {
      color: 'white',
    },
    summaryFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.borderColor,
    },
    summarySub: {
      fontSize: 11,
      fontFamily: FONTS.medium,
      color: colors.subText,
    },
    summarySubPrimary: {
      color: 'rgba(255,255,255,0.85)',
      borderTopColor: 'rgba(255,255,255,0.2)',
    },
    summarySubBadge: {
      fontSize: 11,
      fontFamily: FONTS.bold,
      color: colors.secondary,
    },
    summarySubBadgePrimary: {
      color: 'white',
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    section: {
      marginBottom: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 15,
      fontFamily: FONTS.bold,
      color: colors.text,
    },
    chartContainer: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 12,
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      alignItems: 'center',
      ...SHADOWS.soft,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.borderColor,
      ...SHADOWS.soft,
    },
    rankBadge: {
      width: 32,
      height: 32,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    rankText: {
      fontSize: 12,
      fontFamily: FONTS.bold,
    },
    listContent: {
      flex: 1,
      marginLeft: 12,
    },
    listName: {
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: colors.text,
    },
    listSubText: {
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: colors.subText,
      marginTop: 2,
    },
    listValue: {
      fontSize: 14,
      fontFamily: FONTS.bold,
      color: colors.primary,
    },
    dangerBadge: {
      backgroundColor: colors.dangerLight,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    dangerText: {
      fontSize: 12,
      fontFamily: FONTS.bold,
      color: colors.danger,
    },
    emptyContainer: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    emptyText: {
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: colors.subText,
      textAlign: 'center',
    },
  });