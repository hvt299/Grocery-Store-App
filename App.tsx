import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetworkStatus from './src/components/NetworkStatus';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {/* Component báo mạng nằm đè lên tất cả */}
        <NetworkStatus />

        {/* Gọi file điều hướng đã tách ra */}
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}