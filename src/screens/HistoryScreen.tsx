import { View, Text, StyleSheet } from 'react-native';

export default function HistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Lịch sử ĐƠN HÀNG</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});