import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ShoppingCart, Package, Receipt, Grid2x2, Barcode } from 'lucide-react-native';

import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthContext } from '../context/AuthContext';
import NetworkStatus from '../components/NetworkStatus';
import { COLORS } from '../constants/theme';

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
    Sell: undefined; Inventory: undefined; Scan: undefined;
    History: undefined; More: undefined; Dashboard: undefined;
};

const Stack = createStackNavigator();
const RootStack = createStackNavigator();
const Tab = createBottomTabNavigator<TabParamList>();
const EmptyScreen = () => null;

const CustomScanButton = () => {
    const navigation = useNavigation<any>();
    return (
        <TouchableOpacity
            style={styles.customScanButton}
            onPress={() => navigation.navigate('GlobalScanner', { returnScreen: 'Sell', action: 'addToCart' })}
            activeOpacity={0.9}
        >
            <View style={styles.scanButtonInner}>
                <Barcode size={28} color="white" strokeWidth={2.5} />
            </View>
        </TouchableOpacity>
    );
};

function MyCustomTabBar({ state, descriptors, navigation }: any) {
    const insets = useSafeAreaInsets();
    const androidBottomGap = insets.bottom > 0 ? insets.bottom : 10;

    return (
        <View
            style={[
                styles.tabBarContainer,
                {
                    paddingBottom: Platform.OS === 'ios' ? 15 : androidBottomGap,
                    height: Platform.OS === 'android' ? 62 + androidBottomGap : 82
                }
            ]}
        >
            {state.routes.map((route: any, index: number) => {
                const { options } = descriptors[route.key];
                const label = options.tabBarLabel !== undefined ? options.tabBarLabel : options.title !== undefined ? options.title : route.name;
                const isFocused = state.index === index;

                if (route.name === 'Scan') return <CustomScanButton key={route.key} />;

                const onPress = () => {
                    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate({ name: route.name, merge: true });
                    }
                };

                const color = isFocused ? COLORS.primary : COLORS.subText;

                let IconComponent = ShoppingCart;
                if (route.name === 'Sell') IconComponent = ShoppingCart;
                else if (route.name === 'Inventory') IconComponent = Package;
                else if (route.name === 'History') IconComponent = Receipt;
                else if (route.name === 'More') IconComponent = Grid2x2;

                return (
                    <TouchableOpacity
                        key={route.key}
                        onPress={onPress}
                        style={styles.tabItem}
                        activeOpacity={0.7}
                    >
                        <IconComponent size={22} color={color} strokeWidth={2.25} />
                        <Text style={[styles.tabLabel, { color }]}>{label}</Text>
                    </TouchableOpacity>
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
        <Tab.Screen name="Sell" component={PosScreen} options={{ tabBarLabel: 'Bán hàng' }} />
        <Tab.Screen name="Inventory" component={InventoryScreen} options={{ tabBarLabel: 'Kho' }} />
        <Tab.Screen name="Scan" component={EmptyScreen} />
        <Tab.Screen name="History" component={InvoiceScreen} options={{ tabBarLabel: 'Lịch sử' }} />
        <Tab.Screen name="More" component={MoreScreen} options={{ tabBarLabel: 'Thêm' }} />
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

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <SafeAreaProvider style={{ flex: 1, backgroundColor: COLORS.background }}>
            <StatusBar style="dark" backgroundColor="transparent" translucent={true} />
            <NetworkStatus />
            {userToken ? <AppRoot /> : <AuthStack />}
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    tabBarContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        alignItems: 'center',
        justifyContent: 'space-around',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 15,
        borderTopWidth: 0,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
    },
    customScanButton: { top: -18, justifyContent: 'center', alignItems: 'center', flex: 1 },
    scanButtonInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 12 }
});