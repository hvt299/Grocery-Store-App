import React, { useState, useContext } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthContext } from '../context/AuthContext';

export default function LoginScreen() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const { login } = useContext(AuthContext);

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
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>

                {/* Logo & Tiêu đề */}
                <View style={styles.headerContainer}>
                    <View style={styles.logoBox}>
                        <Ionicons name="cart" size={60} color="white" />
                    </View>
                    <Text style={styles.title}>Grocery Store</Text>
                    <Text style={styles.subtitle}>Đăng nhập để quản lý cửa hàng</Text>
                </View>

                {/* Form Đăng Nhập */}
                <View style={styles.formContainer}>
                    <View style={styles.inputGroup}>
                        <Ionicons name="person-outline" size={20} color="#888" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Tên đăng nhập"
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Mật khẩu"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                            <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#888" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.loginBtn, (!username || !password) && styles.loginBtnDisabled]}
                        onPress={handleLogin}
                        disabled={!username || !password || loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.loginBtnText}>ĐĂNG NHẬP</Text>
                        )}
                    </TouchableOpacity>
                </View>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    content: { flex: 1, justifyContent: 'center', padding: 20 },
    headerContainer: { alignItems: 'center', marginBottom: 40 },
    logoBox: { width: 100, height: 100, backgroundColor: '#2F95DC', borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 15, shadowColor: '#2F95DC', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#1A1A1A' },
    subtitle: { fontSize: 16, color: '#8E8E93', marginTop: 5 },
    formContainer: { backgroundColor: 'white', padding: 20, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 3 },
    inputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2F5', borderRadius: 12, marginBottom: 15, paddingHorizontal: 15, height: 55 },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, fontSize: 16, color: '#333' },
    eyeBtn: { padding: 5 },
    loginBtn: { backgroundColor: '#2F95DC', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: '#2F95DC', shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 },
    loginBtnDisabled: { backgroundColor: '#A0CCF0', shadowOpacity: 0 },
    loginBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }
});