import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import các màn hình
import HomeScreen from '../screens/HomeScreen';
import ProductScreen from '../screens/ProductScreen';
import HistoryScreen from '../screens/HistoryScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: any;

                    if (route.name === 'Bán Hàng') {
                        iconName = focused ? 'cart' : 'cart-outline';
                    } else if (route.name === 'Kho Hàng') {
                        iconName = focused ? 'cube' : 'cube-outline';
                    } else if (route.name === 'Lịch Sử') {
                        iconName = focused ? 'time' : 'time-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#2F95DC',
                tabBarInactiveTintColor: 'gray',
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#FFFFFF',
                    borderTopColor: '#EEE',
                }
            })}
        >
            <Tab.Screen name="Bán Hàng" component={HomeScreen} />
            <Tab.Screen name="Kho Hàng" component={ProductScreen} />
            <Tab.Screen name="Lịch Sử" component={HistoryScreen} />
        </Tab.Navigator>
    );
}