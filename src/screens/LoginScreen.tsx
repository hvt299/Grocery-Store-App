import React, { useState, useContext, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    Keyboard, TouchableWithoutFeedback, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Store, User, Lock, Eye, EyeOff } from 'lucide-react-native';

import { AuthContext } from '../context/AuthContext';
import { SPACING } from '../constants/theme';
import { ThemeContext } from '../context/ThemeContext';

export default function LoginScreen() {
    const { colors, isDark } = useContext(ThemeContext);
    const styles = createStyles(colors);

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const { login } = useContext(AuthContext);

    const passwordRef = useRef<TextInput>(null);

    const handleLogin = async () => {
        if (!username || !password) return;
        setLoading(true);
        try {
            await login(username, password);
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <SafeAreaView style={styles.container}>
                <StatusBar style={isDark ? "light" : "dark"} />

                <View style={{ flex: 1 }}>
                    <View style={styles.content}>

                        {/* Logo & Tiêu đề */}
                        <View style={styles.headerContainer}>
                            <View style={styles.logoBox}>
                                <Store size={48} color="white" strokeWidth={2} />
                            </View>
                            <Text style={styles.title}>GROCERY STORE POS</Text>
                            <Text style={styles.subtitle}>
                                Đăng nhập để quản lý cửa hàng
                            </Text>
                        </View>

                        {/* Form Đăng Nhập */}
                        <View style={styles.formContainer}>

                            <View style={styles.inputGroup}>
                                <User
                                    size={20}
                                    color={colors.subText}
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Tên đăng nhập"
                                    value={username}
                                    onChangeText={setUsername}
                                    autoCapitalize="none"
                                    placeholderTextColor={colors.subText}
                                    returnKeyType="next"
                                    onSubmitEditing={() => passwordRef.current?.focus()}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Lock
                                    size={20}
                                    color={colors.subText}
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    ref={passwordRef}
                                    style={styles.input}
                                    placeholder="Mật khẩu"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    placeholderTextColor={colors.subText}
                                    returnKeyType="done"
                                    onSubmitEditing={handleLogin}
                                />

                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeBtn}
                                >
                                    {showPassword ? (
                                        <EyeOff size={20} color={colors.subText} />
                                    ) : (
                                        <Eye size={20} color={colors.subText} />
                                    )}
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.loginBtn,
                                    (!username || !password) && styles.loginBtnDisabled,
                                ]}
                                onPress={handleLogin}
                                disabled={!username || !password || loading}
                                activeOpacity={0.8}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.loginBtnText}>
                                        ĐĂNG NHẬP
                                    </Text>
                                )}
                            </TouchableOpacity>

                        </View>

                    </View>
                </View>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1, justifyContent: 'center', padding: SPACING * 1.5 },

    headerContainer: { alignItems: 'center', marginBottom: 40 },
    logoBox: {
        width: 88, height: 88,
        backgroundColor: colors.primary,
        borderRadius: 24,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 20,
        shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 15, elevation: 8
    },
    title: { fontSize: 28, fontWeight: '900', color: colors.text, letterSpacing: 0.5 },
    subtitle: { fontSize: 15, color: colors.subText, marginTop: 8, fontWeight: '500' },

    formContainer: {
        backgroundColor: colors.card,
        padding: 24,
        borderRadius: 24,
        shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 20, elevation: 4
    },
    inputGroup: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.inputBg,
        borderRadius: 16,
        marginBottom: 16,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: colors.borderColor
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, color: colors.text, fontWeight: '500' },
    eyeBtn: { padding: 5 },

    loginBtn: {
        backgroundColor: colors.primary,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
        marginTop: 10,
        shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
    },
    loginBtnDisabled: { backgroundColor: colors.subText, shadowOpacity: 0 },
    loginBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }
});