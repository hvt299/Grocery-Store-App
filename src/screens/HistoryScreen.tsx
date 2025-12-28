import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ActivityIndicator, RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { deleteInvoice, getInvoices } from '../services/productService';
import { formatCurrency, formatDate } from '../utils/format';

export default function HistoryScreen() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // State cho Modal xem chi tiết
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // Tải dữ liệu mỗi khi vào màn hình
  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getInvoices();
      setInvoices(data || []);
    } catch (error) {
      console.log('Lỗi tải lịch sử', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = (id: number) => {
    Alert.alert(
      'Xóa hóa đơn này?',
      'Hành động này không thể hoàn tác. Doanh thu sẽ bị trừ đi.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteInvoice(id);

              // Thành công:
              setDetailVisible(false); // Tắt modal
              fetchData(); // Tải lại danh sách
              Alert.alert('Đã xóa', 'Hóa đơn đã được xóa khỏi hệ thống.');
            } catch (error) {
              Alert.alert('Lỗi', 'Không xóa được hóa đơn.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Tính tổng tiền CHỈ CỦA HÔM NAY
  const todayRevenue = useMemo(() => {
    const today = new Date().toDateString(); // Lấy ngày hiện tại dạng chuỗi (để so sánh)

    return invoices
      .filter(inv => new Date(inv.created_at).toDateString() === today)
      .reduce((sum, inv) => sum + inv.total_amount, 0);
  }, [invoices]);

  const openDetail = (invoice: any) => {
    setSelectedInvoice(invoice);
    setDetailVisible(true);
  };

  // Render từng dòng hóa đơn
  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => openDetail(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.iconBox}>
            <Ionicons name="receipt" size={20} color="#2F95DC" />
          </View>
          <View>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
            <Text style={styles.itemCount}>
              {item.invoice_items?.length || 0} món
            </Text>
          </View>
        </View>
        <Text style={styles.amountText}>{formatCurrency(item.total_amount)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header Thống Kê */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Doanh thu hôm nay</Text>
        <Text style={styles.headerValue}>{formatCurrency(todayRevenue)}</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.listTitle}>Danh sách đơn hàng</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#2F95DC" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={invoices}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={fetchData} />
            }
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', marginTop: 30, color: 'gray' }}>Chưa có đơn hàng nào</Text>
            }
          />
        )}
      </View>

      {/* MODAL CHI TIẾT HÓA ĐƠN */}
      <Modal visible={detailVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết đơn hàng</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* NÚT XÓA: Chỉ hiện khi có hóa đơn đang chọn */}
                {selectedInvoice && (
                  <TouchableOpacity
                    onPress={() => handleDeleteInvoice(selectedInvoice.id)}
                    style={{ marginRight: 20 }}
                  >
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
                <Text style={styles.modalDate}>Ngày: {formatDate(selectedInvoice.created_at)}</Text>
                <View style={styles.divider} />

                {/* Danh sách món trong đơn */}
                {selectedInvoice.invoice_items?.map((item: any, index: number) => (
                  <View key={index} style={styles.detailRow}>
                    <Text style={styles.detailName}>
                      {item.quantity} x {item.product_name} ({item.unit})
                    </Text>
                    <Text style={styles.detailPrice}>
                      {formatCurrency(item.price * item.quantity)}
                    </Text>
                  </View>
                ))}

                <View style={[styles.divider, { marginVertical: 15 }]} />
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>TỔNG CỘNG</Text>
                  <Text style={styles.totalValue}>
                    {formatCurrency(selectedInvoice.total_amount)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  // Header thống kê
  header: {
    backgroundColor: '#2F95DC', padding: 20, paddingTop: 60,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.2, elevation: 5
  },
  headerLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 16, marginBottom: 5 },
  headerValue: { color: 'white', fontSize: 32, fontWeight: 'bold' },

  body: { flex: 1, padding: 15 },
  listTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },

  // Card hóa đơn
  card: {
    backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 10,
    elevation: 2
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBox: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#E1F5FE',
    justifyContent: 'center', alignItems: 'center', marginRight: 15
  },
  dateText: { fontSize: 14, fontWeight: '600', color: '#333' },
  itemCount: { fontSize: 12, color: 'gray', marginTop: 2 },
  amountText: { fontSize: 16, fontWeight: 'bold', color: '#2F95DC' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 15, padding: 20, maxHeight: '80%' },
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