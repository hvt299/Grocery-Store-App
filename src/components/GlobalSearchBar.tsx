import React, { useContext, useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Search, X, SlidersHorizontal } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';
import { FONTS } from '../constants/theme';

interface Props {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onFilterPress?: () => void;
}

export default function GlobalSearchBar({
  placeholder = 'Tìm kiếm...',
  value,
  onChangeText,
  onFilterPress,
}: Props) {
  const { colors, isDark } = useContext(ThemeContext);
  const [isFocused, setIsFocused] = useState(false);
  const styles = createStyles(colors, isDark, isFocused);

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Search
          size={19}
          color={isFocused ? colors.primary : colors.subText}
          strokeWidth={2.2}
        />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedText || colors.subText}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          selectionColor={colors.primary}
        />
        {value !== '' && (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            style={styles.clearBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.clearIconBg}>
              <X size={13} color={colors.subText} strokeWidth={2.5} />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {onFilterPress && (
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={onFilterPress}
          activeOpacity={0.7}
        >
          <SlidersHorizontal size={20} color={colors.text} strokeWidth={2.2} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean, isFocused: boolean) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: colors.inputBg,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      paddingHorizontal: 14,
      borderWidth: 1.5,
      borderColor: isFocused ? colors.primary : colors.borderColor,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.04,
      shadowRadius: 3,
      elevation: isFocused ? 2 : 1,
    },
    input: {
      flex: 1,
      marginLeft: 10,
      fontSize: 14,
      fontFamily: FONTS.medium,
      color: colors.text,
      paddingVertical: 0,
    },
    clearBtn: {
      padding: 4,
    },
    clearIconBg: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterBtn: {
      width: 48,
      height: 48,
      backgroundColor: colors.card,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 10,
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.04,
      shadowRadius: 3,
      elevation: 1,
    },
  });