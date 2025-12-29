import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function NetworkStatus() {
    const [isConnected, setIsConnected] = useState<boolean | null>(true);

    useEffect(() => {
        // Lắng nghe trạng thái mạng
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected);
        });

        return () => unsubscribe();
    }, []);

    // Nếu có mạng thì không hiện gì cả (ẩn đi)
    if (isConnected) return null;

    // Nếu mất mạng -> Hiện thanh đỏ
    return (
        <View style={styles.container}>
            <Ionicons name="wifi-outline" size={20} color="white" />
            <Text style={styles.text}>Không có kết nối Internet. Đang kiểm tra...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FF3B30', // Màu đỏ báo động
        width: width,
        paddingVertical: 10,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute', // Trôi nổi trên cùng
        top: 0, // Đặt ở đỉnh màn hình (dưới status bar nếu dùng SafeAreaView)
        zIndex: 9999, // Đè lên mọi thứ
    },
    text: {
        color: 'white',
        fontWeight: 'bold',
        marginLeft: 10,
        fontSize: 14,
    },
});