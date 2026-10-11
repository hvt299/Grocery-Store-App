import React, { useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  ShoppingCart,
  Package,
  Receipt,
  Grid2x2,
  ScanLine,
} from 'lucide-react-native';

import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import NetworkStatus from '../components/NetworkStatus';
import { FONTS } from '../constants/theme';

import LoginScreen from '../screens/LoginScreen';
import PosScreen from '../screens/PosScreen';
import InventoryScreen from '../screens/InventoryScreen';
import InvoiceScreen from '../screens/InvoiceScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import MoreScreen from '../screens/MoreScreen';
import GlobalScannerScreen from '../screens/GlobalScannerScreen';
import AddEditProductScreen from '../screens/AddEditProductScreen';
import PrinterSettingsScreen from '../screens/PrinterSettingsScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type TabParamList = {
  Sell: undefined;
  Inventory: undefined;
  Scan: undefined;
  History: undefined;
  More: undefined;
  Dashboard: undefined;
};

const Stack = createStackNavigator();
const RootStack = createStackNavigator();
const Tab = createBottomTabNavigator<TabParamList>();
const EmptyScreen = () => null;

const CustomScanButton = () => {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useContext(ThemeContext);
  const styles = createStyles(colors, isDark);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <TouchableOpacity
      style={styles.customScanButton}
      onPress={() =>
        navigation.navigate('GlobalScanner', {
          returnScreen: 'Sell',
          action: 'addToCart',
        })
      }
      activeOpacity={0.85}
    >
      <Animated.View
        style={[
          styles.scanPulseRing,
          {
            transform: [{ scale: pulseAnim }],
            opacity: isDark ? 0.35 : 0.25,
          },
        ]}
      />
      <View style={styles.scanButtonInner}>
        <ScanLine size={28} color="white" strokeWidth={2.4} />
      </View>
    </TouchableOpacity>
  );
};

const TabItemComponent = ({
  route,
  isFocused,
  label,
  onPress,
  colors,
  styles,
}: any) => {
  const scaleAnim = useRef(new Animated.Value(isFocused ? 1.05 : 1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isFocused ? 1.08 : 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [isFocused]);

  let IconComponent = ShoppingCart;
  if (route.name === 'Sell') IconComponent = ShoppingCart;
  else if (route.name === 'Inventory') IconComponent = Package;
  else if (route.name === 'History') IconComponent = Receipt;
  else if (route.name === 'More') IconComponent = Grid2x2;

  const color = isFocused ? colors.primary : colors.subText;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.tabItem}
      activeOpacity={0.7}
    >
      <Animated.View
        style={[
          styles.tabIconWrapper,
          { transform: [{ scale: scaleAnim }] },
          isFocused && styles.tabIconWrapperActive,
        ]}
      >
        <IconComponent
          size={21}
          color={color}
          strokeWidth={isFocused ? 2.4 : 2}
        />
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          { color },
          isFocused && { fontFamily: FONTS.bold },
        ]}
      >
        {label}
      </Text>
      {isFocused && <View style={styles.activeDot} />}
    </TouchableOpacity>
  );
};

function MyCustomTabBar({ state, descriptors, navigation }: any) {
  const { colors, isDark } = useContext(ThemeContext);
  const styles = createStyles(colors, isDark);
  const insets = useSafeAreaInsets();
  const androidBottomGap = insets.bottom > 0 ? insets.bottom : 8;

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          paddingBottom: Platform.OS === 'ios' ? 14 : androidBottomGap,
          height: Platform.OS === 'android' ? 64 + androidBottomGap : 84,
        },
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;
        const isFocused = state.index === index;

        if (route.name === 'Scan') return <CustomScanButton key={route.key} />;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate({ name: route.name, merge: true });
          }
        };

        return (
          <TabItemComponent
            key={route.key}
            route={route}
            isFocused={isFocused}
            label={label}
            onPress={onPress}
            colors={colors}
            styles={styles}
          />
        );
      })}
    </View>
  );
}

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    tabBar={(props) => <MyCustomTabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen
      name="Sell"
      component={PosScreen}
      options={{ tabBarLabel: 'Bán hàng' }}
    />
    <Tab.Screen
      name="Inventory"
      component={InventoryScreen}
      options={{ tabBarLabel: 'Kho hàng' }}
    />
    <Tab.Screen name="Scan" component={EmptyScreen} />
    <Tab.Screen
      name="History"
      component={InvoiceScreen}
      options={{ tabBarLabel: 'Hóa đơn' }}
    />
    <Tab.Screen
      name="More"
      component={MoreScreen}
      options={{ tabBarLabel: 'Tiện ích' }}
    />
  </Tab.Navigator>
);

const AppRoot = () => (
  <RootStack.Navigator screenOptions={{ headerShown: false }}>
    <RootStack.Screen name="MainTabs" component={MainTabs} />
    <RootStack.Screen name="GlobalScanner" component={GlobalScannerScreen} />
    <RootStack.Screen name="AddEditProduct" component={AddEditProductScreen} />
    <RootStack.Screen name="PrinterSettings" component={PrinterSettingsScreen} />
    <RootStack.Screen name="Settings" component={SettingsScreen} />
    <RootStack.Screen name="Dashboard" component={AnalyticsScreen} />
  </RootStack.Navigator>
);

export default function AppNavigator() {
  const { isLoading, userToken } = useContext(AuthContext);
  const { colors, isDark } = useContext(ThemeContext);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        style={isDark ? 'light' : 'dark'}
        backgroundColor="transparent"
        translucent={true}
      />
      <NetworkStatus />
      {userToken ? <AppRoot /> : <AuthStack />}
    </SafeAreaProvider>
  );
}

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    tabBarContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      alignItems: 'center',
      justifyContent: 'space-around',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: isDark ? 0.35 : 0.08,
      shadowRadius: 16,
      elevation: 20,
      borderTopWidth: 1,
      borderTopColor: colors.borderColor,
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
    },
    tabIconWrapper: {
      padding: 4,
      borderRadius: 12,
    },
    tabIconWrapperActive: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(37, 99, 235, 0.08)',
    },
    tabLabel: {
      fontSize: 11,
      fontFamily: FONTS.medium,
      marginTop: 2,
    },
    activeDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.primary,
      marginTop: 2,
    },
    customScanButton: {
      top: -18,
      justifyContent: 'center',
      alignItems: 'center',
      flex: 1,
    },
    scanPulseRing: {
      position: 'absolute',
      width: 66,
      height: 66,
      borderRadius: 33,
      backgroundColor: colors.primary,
    },
    scanButtonInner: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
      elevation: 12,
    },
  });
}