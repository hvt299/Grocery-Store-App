import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS as lightColors, darkColors } from '../constants/theme';

export const ThemeContext = createContext<any>(null);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const systemColorScheme = useColorScheme(); 
    const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system');

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('themeMode');
            if (savedTheme) {
                setThemeMode(savedTheme as 'light' | 'dark' | 'system');
            }
        } catch (e) {
            console.log('Lỗi tải theme', e);
        }
    };

    const updateThemeMode = async (mode: 'light' | 'dark' | 'system') => {
        setThemeMode(mode);
        await AsyncStorage.setItem('themeMode', mode);
    };

    const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
    const colors = isDark ? darkColors : lightColors;

    return (
        <ThemeContext.Provider value={{ themeMode, updateThemeMode, colors, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
};