import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { loginApi } from '../services/authService';

export const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [userToken, setUserToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkToken();
    }, []);

    const checkToken = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            setUserToken(token);
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
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Không thể đăng nhập. Vui lòng kiểm tra lại!';
            Alert.alert('Lỗi Đăng Nhập', msg);
            throw error;
        }
    };

    const logout = async () => {
        await AsyncStorage.removeItem('userToken');
        setUserToken(null);
    };

    return (
        <AuthContext.Provider value={{ userToken, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};