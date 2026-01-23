import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Text } from './Themed';
import Colors from '../constants/Colors';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onDismiss: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
}

const TOAST_CONFIG: Record<ToastType, { icon: string; color: string }> = {
  success: { icon: 'check-circle', color: '#10B981' },
  error: { icon: 'exclamation-circle', color: '#EF4444' },
  warning: { icon: 'exclamation-triangle', color: '#F59E0B' },
  info: { icon: 'info-circle', color: '#3B82F6' },
};

export function Toast({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onDismiss,
  action,
}: ToastProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show toast
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss if no action
      if (!action && duration > 0) {
        const timer = setTimeout(() => {
          hideToast();
        }, duration);
        return () => clearTimeout(timer);
      }
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  const config = TOAST_CONFIG[type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF',
          borderLeftColor: config.color,
          transform: [{ translateY }],
          opacity,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 5,
        },
      ]}
    >
      <View style={styles.content}>
        <FontAwesome
          name={config.icon as any}
          size={20}
          color={config.color}
          style={styles.icon}
        />
        <Text style={[styles.message, { color: colors.text }]} numberOfLines={2}>
          {message}
        </Text>
        {action && (
          <TouchableOpacity onPress={action.onPress} style={styles.actionButton}>
            <Text style={[styles.actionText, { color: colors.tint }]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
          <FontAwesome name="times" size={16} color={colors.tabIconDefault} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

/**
 * Toast Provider Context
 */
interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
  duration: number;
  action?: { label: string; onPress: () => void };
}

const initialState: ToastState = {
  visible: false,
  message: '',
  type: 'info',
  duration: 3000,
};

type ToastContextType = {
  showToast: (options: Omit<ToastState, 'visible'>) => void;
  hideToast: () => void;
};

export const ToastContext = React.createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ToastState>(initialState);

  const showToast = (options: Omit<ToastState, 'visible'>) => {
    setState({
      ...options,
      visible: true,
    });
  };

  const hideToast = () => {
    setState((prev) => ({ ...prev, visible: false }));
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <Toast
        visible={state.visible}
        message={state.message}
        type={state.type}
        duration={state.duration}
        onDismiss={hideToast}
        action={state.action}
      />
    </ToastContext.Provider>
  );
}

/**
 * Hook to use toast notifications
 */
export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return {
    success: (message: string, options?: { action?: { label: string; onPress: () => void } }) =>
      context.showToast({ message, type: 'success', duration: 3000, ...options }),
    error: (message: string, options?: { action?: { label: string; onPress: () => void } }) =>
      context.showToast({ message, type: 'error', duration: 4000, ...options }),
    warning: (message: string, options?: { action?: { label: string; onPress: () => void } }) =>
      context.showToast({ message, type: 'warning', duration: 3500, ...options }),
    info: (message: string, options?: { action?: { label: string; onPress: () => void } }) =>
      context.showToast({ message, type: 'info', duration: 3000, ...options }),
    hide: context.hideToast,
  };
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90, // Above tab bar
    left: 16,
    right: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  icon: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: 6,
    marginLeft: 4,
  },
});
