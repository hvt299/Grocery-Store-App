import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ActivityIndicator, SectionList, Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';

import { getInvoices, deleteInvoice } from '../services/productService';
import { formatCurrency, formatDate } from '../utils/format';
import { supabase } from '../lib/supabase';

export default function HistoryScreen() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // State Modal
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  useEffect(() => {
    // 1. Lắng nghe thay đổi từ Server (Realtime)
    // Khi có đơn mới (INSERT) hoặc đơn bị xóa (DELETE) -> Tự tải lại
    const invoiceSub = supabase
      .channel('history_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        console.log('Có thay đổi lịch sử đơn hàng!');
        fetchData();
      })
      .subscribe();

    // 2. Lắng nghe trạng thái Mạng
    const unsubscribeNet = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        fetchData();
      }
    });

    return () => {
      // Hủy đăng ký khi thoát
      supabase.removeChannel(invoiceSub);
      unsubscribeNet();
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getInvoices();
      // data từ Supabase đã được sắp xếp giảm dần (mới nhất trước)
      setInvoices(data || []);
    } catch (error) {
      console.log('Lỗi tải lịch sử', error);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC NHÓM ĐƠN HÀNG THEO NGÀY (QUAN TRỌNG) ---
  const sections = useMemo(() => {
    if (invoices.length === 0) return [];

    const grouped: any[] = [];
    let currentSection: any = null;

    invoices.forEach((item) => {
      // Lấy ngày tháng năm (VD: 28/12/2024)
      const dateKey = new Date(item.created_at).toLocaleDateString('vi-VN');

      // Nếu chưa có nhóm hoặc ngày khác nhóm hiện tại -> Tạo nhóm mới
      if (!currentSection || currentSection.title !== dateKey) {
        currentSection = {
          title: dateKey,
          data: [],
          dayTotal: 0 // Biến để cộng dồn tiền trong ngày
        };
        grouped.push(currentSection);
      }

      // Thêm đơn hàng vào nhóm
      currentSection.data.push(item);
      currentSection.dayTotal += item.total_amount;
    });

    return grouped;
  }, [invoices]);

  // --- TÍNH TỔNG DOANH THU TOÀN BỘ (Hoặc chỉ hôm nay tùy bạn) ---
  // Ở đây mình để tổng doanh thu HÔM NAY trên header cho nổi bật
  const todayRevenue = useMemo(() => {
    const today = new Date().toLocaleDateString('vi-VN');
    const todaySection = sections.find(s => s.title === today);
    return todaySection ? todaySection.dayTotal : 0;
  }, [sections]);


  // --- CÁC HÀM XỬ LÝ (Giữ nguyên) ---
  const openDetail = (invoice: any) => {
    setSelectedInvoice(invoice);
    setDetailVisible(true);
  };

  const handleDeleteInvoice = (id: number) => {
    Alert.alert(
      'Xóa hóa đơn này?',
      'Doanh thu sẽ bị trừ đi.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn', style: 'destructive',
          onPress: async () => {
            try {
              await deleteInvoice(id);
              setDetailVisible(false);
            } catch (error) { Alert.alert('Lỗi', 'Không xóa được.'); }
            finally { setLoading(false); }
          }
        }
      ]
    );
  };

  // --- RENDER ---

  // 1. Render từng dòng hóa đơn
  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => openDetail(item)}>
      <View style={styles.cardRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.iconBox}>
            {/* Hiển thị giờ cụ thể (VD: 10:30) */}
            <Text style={styles.timeText}>
              {new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={{ marginLeft: 10 }}>
            {/* Hiển thị tóm tắt món hàng đầu tiên */}
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

  // 2. Render Tiêu đề ngày (Mới)
  const renderSectionHeader = ({ section: { title, dayTotal } }: any) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Ngày {title}</Text>
      <Text style={styles.sectionTotal}>Tổng: {formatCurrency(dayTotal)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header Thống Kê Hôm Nay */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Doanh thu hôm nay</Text>
        <Text style={styles.headerValue}>{formatCurrency(todayRevenue)}</Text>
      </View>

      <View style={styles.body}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ paddingBottom: 20 }}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 30, color: 'gray' }}>Chưa có đơn hàng nào</Text>
          }
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchData}
              colors={['#2F95DC']}
              tintColor="#2F95DC"
            />
          }
        />
      </View>

      {/* MODAL CHI TIẾT (Giữ nguyên) */}
      <Modal
        visible={detailVisible}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          {/* Bấm ra ngoài để đóng */}
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setDetailVisible(false)} />

          <View style={styles.modalContent}>
            {/* Thanh nắm kéo giả */}
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết đơn hàng</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {selectedInvoice && (
                  <TouchableOpacity onPress={() => handleDeleteInvoice(selectedInvoice.id)} style={{ marginRight: 20 }}>
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
                    <Text style={styles.detailName}>{item.quantity} x {item.product_name} ({item.unit})</Text>
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

  header: {
    backgroundColor: '#2F95DC', padding: 20, paddingVertical: 15,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.2, elevation: 5
  },
  headerLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 16, marginBottom: 5 },
  headerValue: { color: 'white', fontSize: 32, fontWeight: 'bold' },

  body: { flex: 1, padding: 15 },

  // Styles cho Section Header (Ngày tháng)
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, marginTop: 10, marginBottom: 5,
    backgroundColor: '#F5F5F5'
  },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: 'gray', textTransform: 'uppercase' },
  sectionTotal: { fontSize: 14, fontWeight: 'bold', color: '#333' },

  // Card hóa đơn
  card: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 8, elevation: 1 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  iconBox: {
    width: 50, height: 40, borderRadius: 8, backgroundColor: '#E1F5FE',
    justifyContent: 'center', alignItems: 'center'
  },
  timeText: { fontSize: 13, fontWeight: 'bold', color: '#2F95DC' },

  summaryText: { fontSize: 14, fontWeight: '600', color: '#333', maxWidth: 150 },
  itemCount: { fontSize: 12, color: 'gray', marginTop: 2 },
  amountText: { fontSize: 16, fontWeight: 'bold', color: '#333' },

  // Modal Styles (Giữ nguyên)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    minHeight: '40%',
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, elevation: 10
  },
  modalHandle: { width: 40, height: 5, backgroundColor: '#DDD', borderRadius: 3, alignSelf: 'center', marginBottom: 15 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalDate: { color: 'gray', fontSize: 14, marginBottom: 10 },

  divider: { height: 1, backgroundColor: '#eee', marginVertical: 5 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 5 },
  detailName: { flex: 1, fontSize: 15, color: '#333' },
  detailPrice: { fontSize: 15, fontWeight: '600', color: '#333' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: 'bold' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: '#2F95DC' }
});