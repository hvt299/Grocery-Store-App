import React, { useContext } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ShoppingCart,
    Package,
    Receipt,
    Grid2x2,
    BarChart3,
    Settings,
    LogOut,
    ChevronRight,
    Barcode,
} from 'lucide-react-native';

import { AuthContext } from '../context/AuthContext';
import NetworkStatus from '../components/NetworkStatus';
import { COLORS } from '../constants/theme';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ProductScreen from '../screens/ProductScreen';
import HistoryScreen from '../screens/HistoryScreen';
import DashboardScreen from '../screens/DashboardScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator<TabParamList>();

const EmptyScreen = () => null;

const MoreScreen = () => {
    const { logout } = useContext(AuthContext);
    type MoreNav = BottomTabNavigationProp<TabParamList, 'More'>;
    const navigation = useNavigation<MoreNav>();

    return (
        <SafeAreaView style={styles.moreContainer}>
            <View style={styles.moreHeader}>
                <Text style={styles.moreHeaderTitle}>Mở rộng</Text>
            </View>

            <View style={styles.menuGroup}>
                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => navigation.navigate('Dashboard')}
                >
                    <View style={[styles.menuIcon, { backgroundColor: '#E5EFFF' }]}>
                        <BarChart3
                            size={22}
                            color={COLORS.primary}
                            strokeWidth={2.25}
                        />
                    </View>

                    <Text style={styles.menuText}>Báo cáo thống kê</Text>

                    <ChevronRight
                        size={20}
                        color={COLORS.subText}
                        strokeWidth={2.25}
                    />
                </TouchableOpacity>

                <View style={styles.menuDivider} />

                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => Alert.alert('Tính năng đang phát triển')}
                >
                    <View style={[styles.menuIcon, { backgroundColor: '#F3E5F5' }]}>
                        <Settings
                            size={22}
                            color="#9C27B0"
                            strokeWidth={2.25}
                        />
                    </View>

                    <Text style={styles.menuText}>Cài đặt hệ thống</Text>

                    <ChevronRight
                        size={20}
                        color={COLORS.subText}
                        strokeWidth={2.25}
                    />
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                <LogOut
                    size={22}
                    color={COLORS.danger}
                    strokeWidth={2.25}
                    style={{ marginRight: 8 }}
                />
                <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const CustomScanButton = () => {
    const navigation = useNavigation<any>();

    return (
        <TouchableOpacity
            style={styles.customScanButton}
            onPress={() => navigation.navigate('Sell', { triggerScan: Date.now() })}
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
            headerShown: false,
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: COLORS.subText,
            tabBarLabelStyle: {
                fontSize: 11,
                fontWeight: '600',
                paddingBottom: 5,
            },
            tabBarStyle: styles.tabBar,
        }}
    >
        <Tab.Screen
            name="Sell"
            component={HomeScreen}
            options={{
                tabBarLabel: 'Bán hàng',
                tabBarIcon: ({ color }) => (
                    <ShoppingCart
                        size={22}
                        color={color}
                        strokeWidth={2.25}
                    />
                ),
            }}
        />

        <Tab.Screen
            name="Inventory"
            component={ProductScreen}
            options={{
                tabBarLabel: 'Kho',
                tabBarIcon: ({ color }) => (
                    <Package
                        size={22}
                        color={color}
                        strokeWidth={2.25}
                    />
                ),
            }}
        />

        <Tab.Screen
            name="Scan"
            component={EmptyScreen}
            options={{
                tabBarButton: (props) => <CustomScanButton {...props} />,
            }}
        />

        <Tab.Screen
            name="History"
            component={HistoryScreen}
            options={{
                tabBarLabel: 'Lịch sử',
                tabBarIcon: ({ color }) => (
                    <Receipt
                        size={22}
                        color={color}
                        strokeWidth={2.25}
                    />
                ),
            }}
        />

        <Tab.Screen
            name="More"
            component={MoreScreen}
            options={{
                tabBarLabel: 'Thêm',
                tabBarIcon: ({ color }) => (
                    <Grid2x2
                        size={22}
                        color={color}
                        strokeWidth={2.25}
                    />
                ),
            }}
        />

        <Tab.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{
                tabBarButton: () => null,
            }}
        />
    </Tab.Navigator>
);

export default function AppNavigator() {
    const { isLoading, userToken } = useContext(AuthContext);

    if (isLoading) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <ActivityIndicator
                    size="large"
                    color={COLORS.primary}
                />
            </View>
        );
    }

    return (
        <>
            <NetworkStatus />
            {userToken ? <MainTabs /> : <AuthStack />}
        </>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: 'absolute',
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: 65,
        paddingBottom: 5,
        paddingTop: 5,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 10,
        borderTopWidth: 0,
    },

    customScanButton: {
        top: -25,
        justifyContent: 'center',
        alignItems: 'center',
    },

    scanButtonInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
        elevation: 12,
    },

    moreContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    moreHeader: {
        padding: 20,
        paddingBottom: 10,
    },

    moreHeaderTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.text,
    },

    menuGroup: {
        backgroundColor: COLORS.card,
        margin: 16,
        borderRadius: 16,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 5,
        elevation: 2,
    },

    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },

    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },

    menuText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },

    menuDivider: {
        height: 1,
        backgroundColor: COLORS.borderColor,
        marginLeft: 70,
        marginRight: 16,
    },

    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFEBEA',
        marginHorizontal: 16,
        marginTop: 20,
        padding: 16,
        borderRadius: 16,
    },

    logoutText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.danger,
    },
});

export type TabParamList = {
    Sell: undefined;
    Inventory: undefined;
    Scan: undefined;
    History: undefined;
    More: undefined;
    Dashboard: undefined;
};