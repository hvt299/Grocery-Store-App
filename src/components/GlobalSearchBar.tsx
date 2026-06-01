import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Search, XCircle, SlidersHorizontal } from 'lucide-react-native';
import { COLORS } from '../constants/theme';

interface Props {
    placeholder?: string;
    value: string;
    onChangeText: (text: string) => void;
    onFilterPress?: () => void;
}

export default function GlobalSearchBar({ placeholder = "Tìm kiếm...", value, onChangeText, onFilterPress }: Props) {
    return (
        <View style={styles.container}>
            <View style={styles.searchBar}>
                <Search size={20} color={COLORS.subText} strokeWidth={2.5} />
                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.subText}
                    value={value}
                    onChangeText={onChangeText}
                />
                {value !== '' && (
                    <TouchableOpacity onPress={() => onChangeText('')} style={{ padding: 4 }}>
                        <XCircle size={18} color={COLORS.subText} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Nút Lọc nâng cao (Filter) */}
            {onFilterPress && (
                <TouchableOpacity style={styles.filterBtn} onPress={onFilterPress}>
                    <SlidersHorizontal size={22} color={COLORS.text} strokeWidth={2} />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'center' },
    searchBar: {
        flex: 1, flexDirection: 'row', backgroundColor: COLORS.inputBg,
        height: 50, borderRadius: 16, alignItems: 'center',
        paddingHorizontal: 15, borderWidth: 1, borderColor: COLORS.borderColor
    },
    input: { flex: 1, marginLeft: 10, fontSize: 15, color: COLORS.text, fontWeight: '500' },
    filterBtn: {
        width: 50, height: 50, backgroundColor: COLORS.inputBg,
        borderRadius: 16, justifyContent: 'center', alignItems: 'center',
        marginLeft: 10, borderWidth: 1, borderColor: COLORS.borderColor
    }
});