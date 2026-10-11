import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  Store,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  X,
  UserCheck,
  Sparkles,
} from 'lucide-react-native';

import { AuthContext } from '../context/AuthContext';
import { SPACING, FONTS, SHADOWS } from '../constants/theme';
import { ThemeContext } from '../context/ThemeContext';

export default function LoginScreen() {
  const { colors, isDark } = useContext(ThemeContext);
  const styles = createStyles(colors, isDark);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userFocused, setUserFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const { login } = useContext(AuthContext);
  const passwordRef = useRef<TextInput>(null);

  // Smooth entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!');
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (error) {
      // Error handling is dispatched within login or alert
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Logo & Brand Header */}
            <View style={styles.headerContainer}>
              <View style={styles.logoBox}>
                <Store size={44} color="white" strokeWidth={2.4} />
              </View>
              <Text style={styles.title}>GROCERY POS</Text>
              <Text style={styles.subtitle}>Hệ thống bán hàng & quản lý tạp hóa thông minh</Text>
            </View>

            {/* Login Card Form */}
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Đăng nhập vào ca</Text>

              {/* Username Input */}
              <Text style={styles.inputLabel}>Tên tài khoản / Mã nhân viên</Text>
              <View style={[styles.inputGroup, userFocused && styles.inputGroupFocused]}>
                <User
                  size={19}
                  color={userFocused ? colors.primary : colors.subText}
                  style={styles.inputIcon}
                  strokeWidth={2.2}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tên tài khoản..."
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor={colors.mutedText || colors.subText}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  onFocus={() => setUserFocused(true)}
                  onBlur={() => setUserFocused(false)}
                  selectionColor={colors.primary}
                />
                {username.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setUsername('')}
                    style={styles.clearBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={16} color={colors.subText} strokeWidth={2.4} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Password Input */}
              <Text style={styles.inputLabel}>Mật khẩu bảo mật</Text>
              <View style={[styles.inputGroup, passFocused && styles.inputGroupFocused]}>
                <Lock
                  size={19}
                  color={passFocused ? colors.primary : colors.subText}
                  style={styles.inputIcon}
                  strokeWidth={2.2}
                />
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor={colors.mutedText || colors.subText}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                  selectionColor={colors.primary}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showPassword ? (
                    <EyeOff size={19} color={colors.subText} strokeWidth={2.2} />
                  ) : (
                    <Eye size={19} color={colors.subText} strokeWidth={2.2} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Quick demo account selector pills */}
              <View style={styles.quickFillSection}>
                <View style={styles.quickFillHeader}>
                  <Sparkles size={13} color={colors.secondary} strokeWidth={2.2} />
                  <Text style={styles.quickFillLabel}>Điền nhanh tài khoản:</Text>
                </View>
                <View style={styles.quickFillRow}>
                  <TouchableOpacity
                    style={[
                      styles.quickChip,
                      username === 'admin' && styles.quickChipActive,
                    ]}
                    onPress={() => handleQuickFill('admin', '123456')}
                    activeOpacity={0.7}
                  >
                    <UserCheck
                      size={13}
                      color={username === 'admin' ? colors.primary : colors.subText}
                      strokeWidth={2.2}
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      style={[
                        styles.quickChipText,
                        username === 'admin' && styles.quickChipTextActive,
                      ]}
                    >
                      Quản lý (Admin)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.quickChip,
                      username === 'cashier' && styles.quickChipActive,
                    ]}
                    onPress={() => handleQuickFill('cashier', '123456')}
                    activeOpacity={0.7}
                  >
                    <UserCheck
                      size={13}
                      color={username === 'cashier' ? colors.secondary : colors.subText}
                      strokeWidth={2.2}
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      style={[
                        styles.quickChipText,
                        username === 'cashier' && styles.quickChipTextActive,
                      ]}
                    >
                      Thu ngân (Cashier)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Text style={styles.loginBtnText}>Đăng nhập vào ca</Text>
                    <ArrowRight size={18} color="white" strokeWidth={2.5} style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>

              {/* System Security Badge */}
              <View style={styles.securityBadge}>
                <ShieldCheck size={14} color={colors.success} strokeWidth={2.4} />
                <Text style={styles.securityText}>Bảo mật phiên làm việc chuẩn hóa POS</Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: SPACING * 1.5,
      paddingVertical: 24,
    },
    content: {
      width: '100%',
    },
    headerContainer: {
      alignItems: 'center',
      marginBottom: 28,
    },
    logoBox: {
      width: 76,
      height: 76,
      borderRadius: 22,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 14,
      ...SHADOWS.float,
    },
    title: {
      fontSize: 22,
      fontFamily: FONTS.extraBold,
      color: colors.text,
      letterSpacing: 1,
    },
    subtitle: {
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: colors.subText,
      marginTop: 6,
      textAlign: 'center',
      maxWidth: 290,
    },
    formContainer: {
      backgroundColor: colors.card,
      borderRadius: 22,
      padding: 22,
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      ...SHADOWS.card,
    },
    formTitle: {
      fontSize: 17,
      fontFamily: FONTS.bold,
      color: colors.text,
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 12,
      fontFamily: FONTS.semiBold,
      color: colors.subText,
      marginBottom: 6,
    },
    inputGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      marginBottom: 14,
      paddingHorizontal: 14,
      height: 50,
    },
    inputGroupFocused: {
      borderColor: colors.primary,
      backgroundColor: isDark ? colors.cardSecondary : '#F0F9FF',
    },
    inputIcon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      fontSize: 14,
      fontFamily: FONTS.medium,
      color: colors.text,
      paddingVertical: 0,
    },
    clearBtn: {
      padding: 4,
      marginLeft: 4,
    },
    eyeBtn: {
      padding: 4,
      marginLeft: 4,
    },
    quickFillSection: {
      marginTop: 2,
      marginBottom: 16,
    },
    quickFillHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    quickFillLabel: {
      fontSize: 11,
      fontFamily: FONTS.medium,
      color: colors.subText,
      marginLeft: 4,
    },
    quickFillRow: {
      flexDirection: 'row',
      gap: 8,
    },
    quickChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor: colors.cardSecondary,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    quickChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    quickChipText: {
      fontSize: 12,
      fontFamily: FONTS.medium,
      color: colors.subText,
    },
    quickChipTextActive: {
      color: colors.primary,
      fontFamily: FONTS.bold,
    },
    loginBtn: {
      flexDirection: 'row',
      backgroundColor: colors.primary,
      height: 50,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 4,
      ...SHADOWS.soft,
    },
    loginBtnDisabled: {
      opacity: 0.7,
    },
    loginBtnText: {
      color: 'white',
      fontSize: 15,
      fontFamily: FONTS.bold,
    },
    securityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 18,
    },
    securityText: {
      fontSize: 11,
      fontFamily: FONTS.medium,
      color: colors.subText,
      marginLeft: 6,
    },
  });