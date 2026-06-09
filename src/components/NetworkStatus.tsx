import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function NetworkStatus() {
    const { colors } = useContext(ThemeContext);
    const styles = createStyles(colors);
    
    const [isConnected, setIsConnected] = useState<boolean | null>(true);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected);
        });
        return () => unsubscribe();
    }, []);

    if (isConnected) return null;

    return (
        <View style={[styles.container, { paddingTop: Math.max(insets.top, 10) }]}>
            <Ionicons name="wifi-outline" size={18} color="white" />
            <Text style={styles.text}>Mất kết nối mạng. Đang chờ khôi phục...</Text>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        backgroundColor: colors.danger,
        width: width,
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        top: 0,
        zIndex: 9999,
        shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 5, elevation: 5
    },
    text: { color: 'white', fontWeight: '600', marginLeft: 8, fontSize: 14 }
});