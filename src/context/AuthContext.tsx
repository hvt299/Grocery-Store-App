import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, DeviceEventEmitter } from 'react-native';
import { loginApi } from '../services/authService';

export interface UserInfo {
  id?: string;
  username: string;
  role: 'ADMIN' | 'CASHIER';
}

interface AuthContextType {
  userToken: string | null;
  user: UserInfo | null;
  isAdmin: boolean;
  isCashier: boolean;
  sellerName: string;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  userToken: null,
  user: null,
  isAdmin: false,
  isCashier: true,
  sellerName: 'Thu ngân',
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

function decodeJwt(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      // Base64 decode safely
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    }
  } catch (e) {
    // If atob is unavailable or fails, fallback
  }
  return null;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkToken();

    const subscription = DeviceEventEmitter.addListener('FORCE_LOGOUT', () => {
      Alert.alert(
        'Phiên đăng nhập hết hạn',
        'Vui lòng đăng nhập lại để tiếp tục sử dụng!'
      );
      logout();
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const checkToken = async () => {
    try {
      const [token, savedUserStr] = await Promise.all([
        AsyncStorage.getItem('userToken'),
        AsyncStorage.getItem('userInfo'),
      ]);

      if (token) {
        setUserToken(token);
        if (savedUserStr) {
          try {
            setUser(JSON.parse(savedUserStr));
          } catch (e) {}
        } else {
          // Decode from jwt
          const decoded = decodeJwt(token);
          if (decoded) {
            const reconstructedUser: UserInfo = {
              id: decoded.sub,
              username: decoded.username || 'user',
              role: decoded.role === 'ADMIN' ? 'ADMIN' : 'CASHIER',
            };
            setUser(reconstructedUser);
            await AsyncStorage.setItem('userInfo', JSON.stringify(reconstructedUser));
          }
        }
      }
    } catch (e) {
      console.log('Lỗi lấy token', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const data = await loginApi(username, password);
      if (data.access_token) {
        await AsyncStorage.setItem('userToken', data.access_token);
        setUserToken(data.access_token);

        let userInfo: UserInfo = data.user;
        if (!userInfo) {
          const decoded = decodeJwt(data.access_token);
          userInfo = {
            id: decoded?.sub,
            username: decoded?.username || username,
            role: decoded?.role === 'ADMIN' ? 'ADMIN' : 'CASHIER',
          };
        }

        setUser(userInfo);
        await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo));
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Không thể đăng nhập. Vui lòng kiểm tra lại!';
      Alert.alert('Lỗi Đăng Nhập', msg);
      throw error;
    }
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['userToken', 'userInfo']);
    setUserToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isCashier = !isAdmin;
  const sellerName = user?.username ? (isAdmin ? `${user.username} (Chủ shop)` : `${user.username} (Thu ngân)`) : 'Thu ngân';

  return (
    <AuthContext.Provider
      value={{
        userToken,
        user,
        isAdmin,
        isCashier,
        sellerName,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};