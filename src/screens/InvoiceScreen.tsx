import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  SectionList,
  Alert,
  RefreshControl,
  Animated,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { StatusBar } from 'expo-status-bar';
import {
  Receipt,
  Trash2,
  X,
  Clock,
  Printer,
  ChevronRight,
  TrendingUp,
  PackageOpen,
  Calendar,
  CheckCircle2,
  UserCheck,
} from 'lucide-react-native';

import { getInvoices, deleteInvoice } from '../services/productService';
import { printReceipt } from '../services/printerService';
import { formatCurrency, formatDate } from '../utils/format';
import { socket } from '../lib/socket';
import { SPACING, FONTS, SHADOWS } from '../constants/theme';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';

const SkeletonRow = ({ colors, styles }: any) => {
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
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      <View style={styles.cardRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={[styles.iconBox, { backgroundColor: colors.borderColor }]} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <View style={{ width: '70%', height: 14, backgroundColor: colors.borderColor, borderRadius: 4, marginBottom: 8 }} />
            <View style={{ width: '40%', height: 10, backgroundColor: colors.borderColor, borderRadius: 4 }} />
          </View>
        </View>
        <View style={{ width: 80, height: 16, backgroundColor: colors.borderColor, borderRadius: 4 }} />
      </View>
    </Animated.View>
  );
};

export default function InvoiceScreen() {
  const { colors, isDark } = React.useContext(ThemeContext);
  const { isAdmin } = React.useContext(AuthContext);
  const styles = createStyles(colors, isDark);

  const [invoices, setInvoices] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      fetchData(1, true);
    }, [])
  );

  useEffect(() => {
    socket.on('invoice_added', () => fetchData(1, true));
    socket.on('invoice_changed', () => fetchData(1, true));

    const unsubscribeNet = NetInfo.addEventListener((state) => {
      if (state.isConnected) fetchData(1, true);
    });

    return () => {
      socket.off('invoice_added');
      socket.off('invoice_changed');
      unsubscribeNet();
    };
  }, []);

  const fetchData = async (pageNumber = 1, isReset = false) => {
    if (isReset) setInitialLoading(true);
    try {
      const res = await getInvoices(pageNumber, 20);
      const newData = res?.data || [];

      if (isReset) {
        setInvoices(newData);
      } else {
        setInvoices((prev) => [...prev, ...newData]);
      }

      setPage(res?.page || 1);
      setTotalPages(res?.totalPages || 1);
    } catch (error) {
      console.log('Lỗi tải lịch sử hóa đơn', error);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (page < totalPages && !loadingMore) {
      setLoadingMore(true);
      fetchData(page + 1, false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(1, true);
  };

  const sections = useMemo(() => {
    if (!Array.isArray(invoices) || invoices.length === 0) return [];
    const grouped: any[] = [];
    let currentSection: any = null;

    invoices.forEach((item) => {
      let dateKey = 'Khác';
      try {
        const d = new Date(item.createdAt);
        if (!isNaN(d.getTime())) {
          dateKey = d.toLocaleDateString('vi-VN');
        }
      } catch (e) {}

      if (!currentSection || currentSection.title !== dateKey) {
        currentSection = { title: dateKey, data: [], dayTotal: 0 };
        grouped.push(currentSection);
      }
      currentSection.data.push(item);
      currentSection.dayTotal += Number(item.totalAmount) || 0;
    });
    return grouped;
  }, [invoices]);

  const todayRevenue = useMemo(() => {
    const today = new Date().toLocaleDateString('vi-VN');
    const todaySection = sections.find((s) => s.title === today);
    return todaySection ? todaySection.dayTotal : 0;
  }, [sections]);

  const todayOrderCount = useMemo(() => {
    const today = new Date().toLocaleDateString('vi-VN');
    const todaySection = sections.find((s) => s.title === today);
    return todaySection ? todaySection.data.length : 0;
  }, [sections]);

  const handleDeleteInvoice = (id: string) => {
    if (!isAdmin) {
      Alert.alert('Từ chối quyền hạn', 'Thu ngân không có quyền hủy hóa đơn đã thanh toán. Vui lòng liên hệ Chủ cửa hàng (Admin)!');
      return;
    }

    Alert.alert('Hủy hóa đơn?', 'Doanh thu sẽ bị trừ và số lượng sản phẩm được hoàn lại kho.', [
      { text: 'Quay lại', style: 'cancel' },
      {
        text: 'Hủy đơn ngay',
        style: 'destructive',
        onPress: async () => {
          try {
            setDetailVisible(false);
            await deleteInvoice(id);
            fetchData(1, true);
            Alert.alert('Thành công', 'Đã hủy hóa đơn và cập nhật lại kho!');
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể hủy hóa đơn.');
          }
        },
      },
    ]);
  };

  const handleReprint = async () => {
    if (!selectedInvoice) return;
    try {
      await printReceipt({
        invoiceId: selectedInvoice._id,
        totalAmount: selectedInvoice.totalAmount,
        sellerName: selectedInvoice.sellerName || selectedInvoice.seller_name || 'Thu ngân',
        items: (selectedInvoice.items || []).map((i: any) => ({
          name: i.productName,
          quantity: i.quantity,
          price: i.price,
        })),
      });
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể in lại hóa đơn.');
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const itemsList = item?.items || [];
    const itemSummary = itemsList.map((i: any) => i?.productName || 'SP').join(', ') || 'Đơn hàng';
    const timeFormatted = item?.createdAt
      ? new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      : '--:--';
    const seller = item?.sellerName || item?.seller_name || 'Thu ngân';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => {
          setSelectedInvoice(item);
          setDetailVisible(true);
        }}
      >
        <View style={styles.cardRow}>
          <View style={styles.iconBox}>
            <Receipt size={22} color={colors.primary} strokeWidth={2.2} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.summaryText} numberOfLines={1}>
              {itemSummary}
            </Text>
            <View style={styles.cardMetaRow}>
              <Clock size={12} color={colors.subText} style={{ marginRight: 4 }} />
              <Text style={styles.timeText}>{timeFormatted}</Text>
              <Text style={styles.itemCount}> • {itemsList.length} món</Text>
              <Text style={styles.sellerChip}> • {seller}</Text>
            </View>
          </View>

          <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
            <Text style={styles.amountText}>{formatCurrency(item.totalAmount)}</Text>
            <ChevronRight size={16} color={colors.subText} style={{ marginTop: 2 }} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* REVENUE HERO CARD */}
      <View style={styles.heroSection}>
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroLabel}>Doanh thu hôm nay</Text>
            <Text style={styles.heroValue}>{formatCurrency(todayRevenue)}</Text>
            <View style={styles.heroBadge}>
              <CheckCircle2 size={13} color={colors.success} strokeWidth={2.4} />
              <Text style={styles.heroBadgeText}>{todayOrderCount} đơn đã thanh toán</Text>
            </View>
          </View>
          <View style={styles.heroIconBox}>
            <TrendingUp size={28} color="white" strokeWidth={2.4} />
          </View>
        </View>
      </View>

      {/* INVOICE SECTION LIST */}
      <View style={styles.body}>
        {initialLoading ? (
          <View style={{ paddingHorizontal: SPACING, paddingTop: 10 }}>
            <SkeletonRow colors={colors} styles={styles} />
            <SkeletonRow colors={colors} styles={styles} />
            <SkeletonRow colors={colors} styles={styles} />
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item, index) => (item?._id ? String(item._id) : `inv-${index}`)}
            renderItem={renderItem}
            renderSectionHeader={({ section: { title, dayTotal } }) => {
              const isToday = title === new Date().toLocaleDateString('vi-VN');
              return (
                <View style={styles.sectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Calendar size={14} color={isToday ? colors.primary : colors.subText} strokeWidth={2.2} style={{ marginRight: 6 }} />
                    <Text style={[styles.sectionTitle, isToday && { color: colors.primary }]}>
                      {isToday ? 'Hôm nay' : title}
                    </Text>
                  </View>
                  <Text style={styles.sectionTotal}>Tổng: {formatCurrency(dayTotal)}</Text>
                </View>
              );
            }}
            contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: SPACING }}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ margin: 20 }} />
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <PackageOpen size={48} color={colors.subText} strokeWidth={1.8} style={{ opacity: 0.6, marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>Chưa có đơn hàng nào</Text>
                <Text style={styles.emptySub}>Các giao dịch tại quầy sẽ được lưu tại đây</Text>
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          />
        )}
      </View>

      {/* DETAIL THERMAL BILL MODAL - CENTER DISPLAY MODAL (Đổi sang giữa màn hình) */}
      <Modal
        visible={detailVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDetailVisible(false)}
      >
        <View style={styles.modalCenterOverlay}>
          <View style={styles.modalCenterCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Receipt size={22} color={colors.primary} strokeWidth={2.4} />
                <Text style={styles.modalTitle}>Chi tiết hóa đơn</Text>
              </View>
              <TouchableOpacity onPress={() => setDetailVisible(false)} style={styles.closeBtn}>
                <X size={20} color={colors.text} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            {selectedInvoice && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                {/* Paper Bill Styling */}
                <View style={styles.paperBillCard}>
                  <Text style={styles.billStoreTitle}>CỬA HÀNG TẠP HÓA A&B</Text>
                  <Text style={styles.billStoreSub}>HÓA ĐƠN BÁN HÀNG TẠI QUẦY</Text>

                  <View style={styles.dashedDivider} />

                  <View style={styles.billMetaRow}>
                    <Text style={styles.billMetaLabel}>Mã HĐ:</Text>
                    <Text style={styles.billMetaVal}>
                      #{selectedInvoice._id ? selectedInvoice._id.slice(-8).toUpperCase() : '---'}
                    </Text>
                  </View>
                  <View style={styles.billMetaRow}>
                    <Text style={styles.billMetaLabel}>Thời gian:</Text>
                    <Text style={styles.billMetaVal}>{formatDate(selectedInvoice.createdAt)}</Text>
                  </View>
                  <View style={styles.billMetaRow}>
                    <Text style={styles.billMetaLabel}>Thu ngân / Người bán:</Text>
                    <Text style={[styles.billMetaVal, { color: colors.primary, fontFamily: FONTS.bold }]}>
                      {selectedInvoice.sellerName || selectedInvoice.seller_name || 'Thu ngân'}
                    </Text>
                  </View>

                  <View style={styles.dashedDivider} />

                  {/* Items Table */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableCol, { flex: 2 }]}>Tên món</Text>
                    <Text style={[styles.tableCol, { flex: 1, textAlign: 'center' }]}>SL</Text>
                    <Text style={[styles.tableCol, { flex: 1.5, textAlign: 'right' }]}>Thành tiền</Text>
                  </View>

                  {(selectedInvoice.items || []).map((item: any, index: number) => (
                    <View key={index} style={styles.detailRow}>
                      <View style={{ flex: 2 }}>
                        <Text style={styles.detailName}>{item.productName}</Text>
                        <Text style={styles.detailQtyPrice}>
                          {formatCurrency(item.price)}/{item.unit || 'món'}
                        </Text>
                      </View>
                      <Text style={[styles.detailQty, { flex: 1, textAlign: 'center' }]}>
                        {item.quantity}
                      </Text>
                      <Text style={[styles.detailTotalPrice, { flex: 1.5, textAlign: 'right' }]}>
                        {formatCurrency(item.price * item.quantity)}
                      </Text>
                    </View>
                  ))}

                  <View style={styles.dashedDivider} />

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>TỔNG CỘNG:</Text>
                    <Text style={styles.totalValue}>
                      {formatCurrency(selectedInvoice.totalAmount)}
                    </Text>
                  </View>
                  <View style={styles.paymentMethodRow}>
                    <Text style={styles.methodLabel}>Hình thức:</Text>
                    <Text style={styles.methodVal}>Tiền mặt (Cash)</Text>
                  </View>
                </View>

                {/* Bill Actions: Print is available to all, Delete only for Admin */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.reprintBtn, !isAdmin && { flex: 1 }]}
                    onPress={handleReprint}
                    activeOpacity={0.8}
                  >
                    <Printer size={18} color="white" strokeWidth={2.4} style={{ marginRight: 6 }} />
                    <Text style={styles.reprintBtnText}>In lại hóa đơn</Text>
                  </TouchableOpacity>

                  {isAdmin && (
                    <TouchableOpacity
                      style={styles.deleteInvoiceBtn}
                      onPress={() => handleDeleteInvoice(selectedInvoice._id)}
                      activeOpacity={0.8}
                    >
                      <Trash2 size={18} color={colors.danger} strokeWidth={2.4} style={{ marginRight: 6 }} />
                      <Text style={styles.deleteInvoiceBtnText}>Hủy hóa đơn</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    heroSection: {
      paddingHorizontal: SPACING,
      paddingTop: 8,
      paddingBottom: 10,
    },
    heroCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 18,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      ...SHADOWS.card,
    },
    heroLeft: {
      flex: 1,
    },
    heroLabel: {
      fontSize: 12,
      fontFamily: FONTS.medium,
      color: colors.subText,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    heroValue: {
      fontSize: 24,
      fontFamily: FONTS.bold,
      color: colors.primary,
      marginTop: 2,
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.successLight,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      alignSelf: 'flex-start',
      marginTop: 6,
    },
    heroBadgeText: {
      fontSize: 11,
      fontFamily: FONTS.semiBold,
      color: colors.success,
      marginLeft: 4,
    },
    heroIconBox: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...SHADOWS.soft,
    },
    body: {
      flex: 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 4,
      marginTop: 6,
    },
    sectionTitle: {
      fontSize: 13,
      fontFamily: FONTS.bold,
      color: colors.text,
      textTransform: 'uppercase',
    },
    sectionTotal: {
      fontSize: 12,
      fontFamily: FONTS.semiBold,
      color: colors.subText,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      ...SHADOWS.soft,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardInfo: {
      flex: 1,
      marginLeft: 12,
    },
    summaryText: {
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: colors.text,
    },
    cardMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    timeText: {
      fontSize: 12,
      fontFamily: FONTS.medium,
      color: colors.subText,
    },
    itemCount: {
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: colors.subText,
    },
    sellerChip: {
      fontSize: 11,
      fontFamily: FONTS.medium,
      color: colors.primary,
    },
    amountText: {
      fontSize: 15,
      fontFamily: FONTS.bold,
      color: colors.primary,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyTitle: {
      fontSize: 16,
      fontFamily: FONTS.bold,
      color: colors.text,
      marginBottom: 4,
    },
    emptySub: {
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: colors.subText,
      textAlign: 'center',
    },
    // CENTER DIALOG MODAL STYLING
    modalCenterOverlay: {
      flex: 1,
      backgroundColor: colors.modalOverlay,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    modalCenterCard: {
      width: '100%',
      maxWidth: 440,
      backgroundColor: colors.card,
      borderRadius: 24,
      paddingHorizontal: SPACING,
      paddingVertical: 18,
      maxHeight: '85%',
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      ...SHADOWS.float,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderColor,
    },
    modalTitle: {
      fontSize: 17,
      fontFamily: FONTS.bold,
      color: colors.text,
      marginLeft: 8,
    },
    closeBtn: {
      padding: 6,
      borderRadius: 10,
      backgroundColor: colors.cardSecondary,
    },
    paperBillCard: {
      backgroundColor: colors.cardSecondary,
      borderRadius: 16,
      padding: 16,
      marginTop: 14,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    billStoreTitle: {
      fontSize: 15,
      fontFamily: FONTS.bold,
      color: colors.text,
      textAlign: 'center',
    },
    billStoreSub: {
      fontSize: 11,
      fontFamily: FONTS.medium,
      color: colors.subText,
      textAlign: 'center',
      marginTop: 2,
    },
    dashedDivider: {
      borderWidth: 0.8,
      borderStyle: 'dashed',
      borderColor: colors.borderColor,
      marginVertical: 10,
    },
    billMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 2,
    },
    billMetaLabel: {
      fontSize: 12,
      fontFamily: FONTS.medium,
      color: colors.subText,
    },
    billMetaVal: {
      fontSize: 12,
      fontFamily: FONTS.semiBold,
      color: colors.text,
    },
    tableHeader: {
      flexDirection: 'row',
      paddingBottom: 6,
    },
    tableCol: {
      fontSize: 12,
      fontFamily: FONTS.bold,
      color: colors.subText,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
    },
    detailName: {
      fontSize: 13,
      fontFamily: FONTS.semiBold,
      color: colors.text,
    },
    detailQtyPrice: {
      fontSize: 11,
      fontFamily: FONTS.regular,
      color: colors.subText,
      marginTop: 1,
    },
    detailQty: {
      fontSize: 13,
      fontFamily: FONTS.bold,
      color: colors.text,
    },
    detailTotalPrice: {
      fontSize: 13,
      fontFamily: FONTS.bold,
      color: colors.text,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
    totalLabel: {
      fontSize: 14,
      fontFamily: FONTS.bold,
      color: colors.text,
    },
    totalValue: {
      fontSize: 18,
      fontFamily: FONTS.bold,
      color: colors.primary,
    },
    paymentMethodRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    methodLabel: {
      fontSize: 12,
      fontFamily: FONTS.medium,
      color: colors.subText,
    },
    methodVal: {
      fontSize: 12,
      fontFamily: FONTS.medium,
      color: colors.text,
    },
    actionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
      marginBottom: 6,
    },
    reprintBtn: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingVertical: 13,
      borderRadius: 14,
      marginRight: 10,
      ...SHADOWS.soft,
    },
    reprintBtnText: {
      color: 'white',
      fontFamily: FONTS.bold,
      fontSize: 14,
    },
    deleteInvoiceBtn: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.dangerLight,
      paddingVertical: 13,
      borderRadius: 14,
    },
    deleteInvoiceBtnText: {
      color: colors.danger,
      fontFamily: FONTS.bold,
      fontSize: 14,
    },
  });