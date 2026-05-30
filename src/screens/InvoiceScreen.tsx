import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ActivityIndicator, SectionList, Alert,
  RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { StatusBar } from 'expo-status-bar';

import { Receipt, Trash2, X, Clock, FileText } from 'lucide-react-native';

import { getInvoices, deleteInvoice } from '../services/productService';
import { formatCurrency, formatDate } from '../utils/format';
import { socket } from '../lib/socket';
import { COLORS, SPACING } from '../constants/theme';

const SkeletonRow = () => (
  <View style={[styles.card, { opacity: 0.6 }]}>
    <View style={styles.cardRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={[styles.iconBox, { backgroundColor: '#F0F4F8' }]} />
        <View style={{ marginLeft: 12 }}>
          <View style={{ width: 120, height: 14, backgroundColor: '#E5E5EA', borderRadius: 4, marginBottom: 8 }} />
          <View style={{ width: 60, height: 10, backgroundColor: '#E5E5EA', borderRadius: 4 }} />
        </View>
      </View>
      <View style={{ width: 80, height: 16, backgroundColor: '#E5E5EA', borderRadius: 4 }} />
    </View>
  </View>
);

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [invoices, setInvoices] = useState<any[]>([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  useFocusEffect(React.useCallback(() => { fetchData(1, true); }, []));

  useEffect(() => {
    socket.on('invoice_added', () => fetchData(1, true));
    socket.on('invoice_changed', () => fetchData(1, true));

    const unsubscribeNet = NetInfo.addEventListener(state => {
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
      const newData = res.data || [];

      if (isReset) {
        setInvoices(newData);
      } else {
        setInvoices(prev => [...prev, ...newData]);
      }

      setPage(res.page);
      setTotalPages(res.totalPages);
    } catch (error) {
      console.log('Lỗi tải lịch sử', error);
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
    if (invoices.length === 0) return [];
    const grouped: any[] = [];
    let currentSection: any = null;

    invoices.forEach((item) => {
      const dateKey = new Date(item.created_at).toLocaleDateString('vi-VN');
      if (!currentSection || currentSection.title !== dateKey) {
        currentSection = { title: dateKey, data: [], dayTotal: 0 };
        grouped.push(currentSection);
      }
      currentSection.data.push(item);
      currentSection.dayTotal += item.total_amount;
    });
    return grouped;
  }, [invoices]);

  const todayRevenue = useMemo(() => {
    const today = new Date().toLocaleDateString('vi-VN');
    const todaySection = sections.find(s => s.title === today);
    return todaySection ? todaySection.dayTotal : 0;
  }, [sections]);

  const handleDeleteInvoice = (id: string) => {
    Alert.alert('Hủy hóa đơn?', 'Doanh thu sẽ bị trừ và hàng sẽ hoàn lại kho.', [
      { text: 'Quay lại', style: 'cancel' },
      {
        text: 'Hủy đơn', style: 'destructive',
        onPress: async () => {
          try {
            setDetailVisible(false);
            await deleteInvoice(id);
            fetchData(1, true);
          } catch (error) { Alert.alert('Lỗi', 'Không xóa được.'); }
        }
      }
    ]);
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => { setSelectedInvoice(item); setDetailVisible(true); }}>
      <View style={styles.cardRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.iconBox}>
            <Receipt size={24} color={COLORS.primary} strokeWidth={2} />
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.summaryText} numberOfLines={1}>
              {item.invoice_items?.map((i: any) => i.product_name).join(', ')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Clock size={12} color={COLORS.subText} style={{ marginRight: 4 }} />
              <Text style={styles.timeText}>
                {new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text style={styles.itemCount}> • {item.invoice_items?.length || 0} món</Text>
            </View>
          </View>
        </View>
        <Text style={styles.amountText}>{formatCurrency(item.total_amount)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />

      {/* HEADER MỚI BỎ NÚT ĐĂNG XUẤT */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Doanh thu hôm nay</Text>
        <Text style={styles.headerValue}>{formatCurrency(todayRevenue)}</Text>
      </View>

      <View style={styles.body}>
        {initialLoading ? (
          <View style={{ paddingHorizontal: SPACING, paddingTop: SPACING }}>
            <SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow />
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item._id.toString()}
            renderItem={renderItem}
            renderSectionHeader={({ section: { title, dayTotal } }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{title === new Date().toLocaleDateString('vi-VN') ? 'HÔM NAY' : title}</Text>
                <Text style={styles.sectionTotal}>Tổng: {formatCurrency(dayTotal)}</Text>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: SPACING }}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={COLORS.primary} style={{ margin: 20 }} /> : null}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', marginTop: 60 }}>
                <FileText size={60} color={COLORS.subText} style={{ opacity: 0.5, marginBottom: 15 }} />
                <Text style={{ textAlign: 'center', color: COLORS.subText, fontStyle: 'italic' }}>Chưa có đơn hàng nào được bán</Text>
              </View>
            }
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          />
        )}
      </View>

      {/* MODAL CHI TIẾT HÓA ĐƠN (GIAO DIỆN BILL) */}
      <Modal visible={detailVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setDetailVisible(false)} />
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết hóa đơn</Text>
              <TouchableOpacity onPress={() => setDetailVisible(false)} style={styles.closeBtn}>
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedInvoice && (
              <View>
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                  <Text style={styles.modalId}>Mã Đơn: #{selectedInvoice._id?.slice(-6).toUpperCase()}</Text>
                  <Text style={styles.modalDate}>{formatDate(selectedInvoice.created_at)}</Text>
                </View>

                {/* ĐƯỜNG KẺ ĐỨT NÉT KIỂU BILL */}
                <View style={styles.dashedDivider} />

                {selectedInvoice.invoice_items?.map((item: any, index: number) => (
                  <View key={index} style={styles.detailRow}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.detailName}>{item.product_name}</Text>
                      <Text style={styles.detailQtyPrice}>{item.quantity} {item.unit} x {formatCurrency(item.price)}</Text>
                    </View>
                    <Text style={styles.detailTotalPrice}>{formatCurrency(item.price * item.quantity)}</Text>
                  </View>
                ))}

                <View style={styles.dashedDivider} />

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>TỔNG CỘNG</Text>
                  <Text style={styles.totalValue}>{formatCurrency(selectedInvoice.total_amount)}</Text>
                </View>

                {/* NÚT HỦY ĐƠN HÀNG */}
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteInvoice(selectedInvoice._id)}
                  activeOpacity={0.8}
                >
                  <Trash2 size={20} color={COLORS.danger} style={{ marginRight: 8 }} />
                  <Text style={styles.deleteBtnText}>Hủy đơn & Hoàn kho</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING, paddingTop: 20, paddingBottom: 30, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8, zIndex: 10 },
  headerLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 5, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  headerValue: { color: 'white', fontSize: 36, fontWeight: '900' },

  body: { flex: 1, marginTop: -10 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, marginTop: 15, marginBottom: 5 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: COLORS.subText, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionTotal: { fontSize: 14, fontWeight: 'bold', color: COLORS.text },

  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },

  summaryText: { fontSize: 16, fontWeight: '700', color: COLORS.text, maxWidth: 200 },
  timeText: { fontSize: 13, fontWeight: '600', color: COLORS.subText },
  itemCount: { fontSize: 13, color: COLORS.subText },
  amountText: { fontSize: 16, fontWeight: '800', color: COLORS.primary },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%', shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
  modalHandle: { width: 40, height: 5, backgroundColor: '#E0E0E0', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },

  modalHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20, position: 'relative' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  closeBtn: { position: 'absolute', right: 0, padding: 5, backgroundColor: COLORS.background, borderRadius: 20 },

  modalId: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  modalDate: { color: COLORS.subText, fontSize: 14, fontWeight: '500' },

  dashedDivider: { height: 1, borderWidth: 1, borderColor: COLORS.borderColor, borderStyle: 'dashed', marginVertical: 15 },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  detailName: { fontSize: 15, color: COLORS.text, fontWeight: '600', marginBottom: 4 },
  detailQtyPrice: { fontSize: 14, color: COLORS.subText },
  detailTotalPrice: { fontSize: 16, fontWeight: '800', color: COLORS.text },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 30 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  totalValue: { fontSize: 24, fontWeight: '900', color: COLORS.primary },

  deleteBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF0F0', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FFE0E0' },
  deleteBtnText: { color: COLORS.danger, fontSize: 16, fontWeight: 'bold' }
});