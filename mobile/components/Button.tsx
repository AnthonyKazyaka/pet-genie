import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Text } from './Themed';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const variantStyles: Record<string, { bg: string; text: string; border?: string }> = {
  primary: { bg: '#2196F3', text: '#fff' },
  secondary: { bg: '#757575', text: '#fff' },
  success: { bg: '#4CAF50', text: '#fff' },
  danger: { bg: '#f44336', text: '#fff' },
  outline: { bg: 'transparent', text: '#2196F3', border: '#2196F3' },
};

const sizeStyles: Record<string, { paddingV: number; paddingH: number; fontSize: number }> = {
  small: { paddingV: 8, paddingH: 12, fontSize: 12 },
  medium: { paddingV: 12, paddingH: 20, fontSize: 14 },
  large: { paddingV: 16, paddingH: 28, fontSize: 16 },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ButtonProps) {
  const colors = variantStyles[variant];
  const sizing = sizeStyles[size];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: disabled ? '#ccc' : colors.bg,
          paddingVertical: sizing.paddingV,
          paddingHorizontal: sizing.paddingH,
          borderWidth: colors.border ? 1 : 0,
          borderColor: colors.border,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            { color: disabled ? '#666' : colors.text, fontSize: sizing.fontSize },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontWeight: '600',
  },
});

export default Button;
