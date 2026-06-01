import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.x:3001';

export const apiClient = axios.create({
    baseURL: `${BASE_URL}/api`,
    timeout: 210000,
});

apiClient.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response && error.response.status === 401) {
            DeviceEventEmitter.emit('FORCE_LOGOUT');
        }
        return Promise.reject(error);
    }
);