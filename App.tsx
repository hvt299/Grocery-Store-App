import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import NetworkStatus from './src/components/NetworkStatus';

// Import các màn hình vừa tạo
import HomeScreen from './src/screens/HomeScreen';
import ProductScreen from './src/screens/ProductScreen';
import HistoryScreen from './src/screens/HistoryScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <NetworkStatus />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;

              if (route.name === 'Bán Hàng') {
                iconName = focused ? 'cart' : 'cart-outline';
              } else if (route.name === 'Kho Hàng') {
                iconName = focused ? 'cube' : 'cube-outline';
              } else if (route.name === 'Lịch Sử') {
                iconName = focused ? 'time' : 'time-outline';
              }

              // Trả về icon tương ứng
              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#2F95DC', // Màu khi được chọn (Xanh dương)
            tabBarInactiveTintColor: 'gray',  // Màu khi không chọn
            headerShown: false, // Ẩn cái thanh tiêu đề mặc định ở trên cùng đi cho thoáng
          })}
        >
          <Tab.Screen name="Bán Hàng" component={HomeScreen} />
          <Tab.Screen name="Kho Hàng" component={ProductScreen} />
          <Tab.Screen name="Lịch Sử" component={HistoryScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}