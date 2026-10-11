import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { WifiOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext } from '../context/ThemeContext';
import { FONTS } from '../constants/theme';

const { width } = Dimensions.get('window');

export default function NetworkStatus() {
  const { colors } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const [isConnected, setIsConnected] = useState<boolean | null>(true);

  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected ?? true;
      setIsConnected(connected);

      if (!connected) {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }).start();
      } else {
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    });

    return () => unsubscribe();
  }, []);

  if (isConnected) return null;

  const styles = createStyles(colors);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 10),
          transform: [{ translateY }],
        },
      ]}
    >
      <WifiOff size={18} color="white" strokeWidth={2.5} />
      <Text style={styles.text}>Mất kết nối mạng. Đang chờ kết nối lại...</Text>
    </Animated.View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.danger,
      width: width,
      paddingBottom: 10,
      paddingHorizontal: 16,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'absolute',
      top: 0,
      zIndex: 99999,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 10,
    },
    text: {
      color: 'white',
      fontFamily: FONTS.semiBold,
      marginLeft: 8,
      fontSize: 13,
    },
  });