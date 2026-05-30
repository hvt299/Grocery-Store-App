import React, { useContext } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ShoppingCart, Package, Receipt, Grid2x2, Barcode } from 'lucide-react-native';

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

const AuthStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
);

const MainTabs = () => (
    <Tab.Navigator
        screenOptions={{
            headerShown: false, tabBarActiveTintColor: COLORS.primary, tabBarInactiveTintColor: COLORS.subText,
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600', paddingBottom: 5 }, tabBarStyle: styles.tabBar,
        }}
    >
        <Tab.Screen name="Sell" component={PosScreen} options={{ tabBarLabel: 'Bán hàng', tabBarIcon: ({ color }) => <ShoppingCart size={22} color={color} strokeWidth={2.25} /> }} />
        <Tab.Screen name="Inventory" component={InventoryScreen} options={{ tabBarLabel: 'Kho', tabBarIcon: ({ color }) => <Package size={22} color={color} strokeWidth={2.25} /> }} />
        <Tab.Screen name="Scan" component={EmptyScreen} options={{ tabBarButton: (props) => <CustomScanButton {...props} /> }} />
        <Tab.Screen name="History" component={InvoiceScreen} options={{ tabBarLabel: 'Lịch sử', tabBarIcon: ({ color }) => <Receipt size={22} color={color} strokeWidth={2.25} /> }} />
        <Tab.Screen name="More" component={MoreScreen} options={{ tabBarLabel: 'Thêm', tabBarIcon: ({ color }) => <Grid2x2 size={22} color={color} strokeWidth={2.25} /> }} />
        <Tab.Screen name="Dashboard" component={AnalyticsScreen} options={{ tabBarButton: () => null }} />
    </Tab.Navigator>
);

const AppRoot = () => (
    <RootStack.Navigator screenOptions={{ headerShown: false, presentation: 'modal' }}>
        <RootStack.Screen name="MainTabs" component={MainTabs} />
        <RootStack.Screen name="GlobalScanner" component={GlobalScannerScreen} />
    </RootStack.Navigator>
);

export default function AppNavigator() {
    const { isLoading, userToken } = useContext(AuthContext);
    if (isLoading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
    return <><NetworkStatus />{userToken ? <AppRoot /> : <AuthStack />}</>;
}

const styles = StyleSheet.create({
    tabBar: { position: 'absolute', backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: 65, paddingBottom: 5, paddingTop: 5, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10, borderTopWidth: 0 },
    customScanButton: { top: -25, justifyContent: 'center', alignItems: 'center' },
    scanButtonInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 12 }
});