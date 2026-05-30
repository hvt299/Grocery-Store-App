import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ActivityIndicator, SectionList, Alert,
  RefreshControl, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { StatusBar } from 'expo-status-bar';

import { getInvoices, deleteInvoice } from '../services/productService';
import { formatCurrency, formatDate } from '../utils/format';
import { socket } from '../lib/socket';

import { AuthContext } from '../context/AuthContext';
import { useContext } from 'react';

const SkeletonRow = () => (
  <View style={[styles.card, { opacity: 0.7 }]}>
    <View style={styles.cardRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={[styles.iconBox, { backgroundColor: '#E0E0E0' }]} />
        <View style={{ marginLeft: 10 }}>
          <View style={{ width: 120, height: 14, backgroundColor: '#E0E0E0', borderRadius: 4, marginBottom: 6 }} />
          <View style={{ width: 60, height: 10, backgroundColor: '#E0E0E0', borderRadius: 4 }} />
        </View>
      </View>
      <View style={{ width: 80, height: 16, backgroundColor: '#E0E0E0', borderRadius: 4 }} />
    </View>
  </View>
);

export default function HistoryScreen() {
  const [invoices, setInvoices] = useState<any[]>([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const { logout } = useContext(AuthContext);

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
    Alert.alert('Xóa hóa đơn này?', 'Doanh thu sẽ bị trừ và hàng sẽ hoàn lại kho.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa vĩnh viễn', style: 'destructive',
        onPress: async () => {
          try {
            setDetailVisible(false);
            await deleteInvoice(id);
            fetchData(1, true);
          } catch (error) { Alert.alert('Lỗi', 'Không xóa được.'); }
        }
      }
    ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => { setSelectedInvoice(item); setDetailVisible(true); }}>
      <View style={styles.cardRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.iconBox}>
            <Text style={styles.timeText}>
              {new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.summaryText} numberOfLines={1}>
              {item.invoice_items?.map((i: any) => i.product_name).join(', ')}
            </Text>
            <Text style={styles.itemCount}>{item.invoice_items?.length || 0} món</Text>
          </View>
        </View>
        <Text style={styles.amountText}>{formatCurrency(item.total_amount)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerLabel}>Doanh thu hôm nay</Text>
          <Text style={styles.headerValue}>{formatCurrency(todayRevenue)}</Text>
        </View>
        <TouchableOpacity style={{ position: 'absolute', right: 20, top: 30 }} onPress={logout}>
          <Ionicons name="log-out-outline" size={28} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {initialLoading ? (
          <View>
            <SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow />
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item._id.toString()}
            renderItem={renderItem}
            renderSectionHeader={({ section: { title, dayTotal } }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Ngày {title}</Text>
                <Text style={styles.sectionTotal}>Tổng: {formatCurrency(dayTotal)}</Text>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
            stickySectionHeadersEnabled={false}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#2F95DC" style={{ margin: 20 }} /> : null}
            ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 30, color: 'gray' }}>Chưa có đơn hàng nào</Text>}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2F95DC']} />}
          />
        )}
      </View>

      {/* MODAL CHI TIẾT */}
      <Modal visible={detailVisible} animationType="slide" transparent={true} statusBarTranslucent={true}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setDetailVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết đơn hàng</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {selectedInvoice && (
                  <TouchableOpacity onPress={() => handleDeleteInvoice(selectedInvoice._id)} style={{ marginRight: 20 }}>
                    <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setDetailVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
            </View>

            {selectedInvoice && (
              <View>
                <Text style={styles.modalDate}>Thời gian: {formatDate(selectedInvoice.created_at)}</Text>
                <View style={styles.divider} />
                {selectedInvoice.invoice_items?.map((item: any, index: number) => (
                  <View key={index} style={styles.detailRow}>
                    <Text style={styles.detailName}>{item.quantity} x {item.product_name}</Text>
                    <Text style={styles.detailPrice}>{formatCurrency(item.price * item.quantity)}</Text>
                  </View>
                ))}
                <View style={[styles.divider, { marginVertical: 15 }]} />
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>TỔNG CỘNG</Text>
                  <Text style={styles.totalValue}>{formatCurrency(selectedInvoice.total_amount)}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#2F95DC', padding: 20, paddingTop: 40, paddingVertical: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.15, elevation: 5 },
  headerLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginBottom: 5, fontWeight: '600', textTransform: 'uppercase' },
  headerValue: { color: 'white', fontSize: 36, fontWeight: '900' },
  body: { flex: 1, padding: 15 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, marginTop: 15, marginBottom: 5, backgroundColor: '#F5F5F5' },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: 'gray', textTransform: 'uppercase', letterSpacing: 1 },
  sectionTotal: { fontSize: 15, fontWeight: 'bold', color: '#1A1A1A' },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#E1F5FE', justifyContent: 'center', alignItems: 'center' },
  timeText: { fontSize: 13, fontWeight: '800', color: '#2F95DC' },
  summaryText: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', maxWidth: 180 },
  itemCount: { fontSize: 13, color: 'gray', marginTop: 4, fontWeight: '500' },
  amountText: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: '40%', shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
  modalHandle: { width: 40, height: 5, backgroundColor: '#E0E0E0', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  modalDate: { color: 'gray', fontSize: 14, marginBottom: 15, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  detailName: { flex: 1, fontSize: 15, color: '#333', fontWeight: '500' },
  detailPrice: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  totalValue: { fontSize: 22, fontWeight: '900', color: '#2F95DC' }
});