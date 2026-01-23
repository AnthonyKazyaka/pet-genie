/**
 * Workload Color Constants
 * Consistent color theming for workload visualization
 * 
 * Shared between web and mobile applications
 */

import type { WorkloadLevel } from '../models/workload.model';

export interface WorkloadColorScheme {
  solid: string;
  background: string;
  text: string;
  label: string;
}

/**
 * Workload level colors (light theme)
 * Using semi-transparent versions for backgrounds
 */
export const WORKLOAD_COLORS: Record<WorkloadLevel, WorkloadColorScheme> = {
  none: {
    solid: '#E5E7EB',
    background: 'transparent',
    text: '#6B7280',
    label: 'Free',
  },
  comfortable: {
    solid: '#10B981',
    background: 'rgba(16, 185, 129, 0.15)',
    text: '#059669',
    label: 'Light',
  },
  busy: {
    solid: '#F59E0B',
    background: 'rgba(245, 158, 11, 0.15)',
    text: '#D97706',
    label: 'Moderate',
  },
  high: {
    solid: '#F97316',
    background: 'rgba(249, 115, 22, 0.18)',
    text: '#EA580C',
    label: 'Heavy',
  },
  burnout: {
    solid: '#EF4444',
    background: 'rgba(239, 68, 68, 0.20)',
    text: '#DC2626',
    label: 'Overloaded',
  },
};

/**
 * Workload level colors (dark theme)
 */
export const WORKLOAD_COLORS_DARK: Record<WorkloadLevel, WorkloadColorScheme> = {
  none: {
    solid: '#4B5563',
    background: 'transparent',
    text: '#9CA3AF',
    label: 'Free',
  },
  comfortable: {
    solid: '#34D399',
    background: 'rgba(52, 211, 153, 0.20)',
    text: '#6EE7B7',
    label: 'Light',
  },
  busy: {
    solid: '#FBBF24',
    background: 'rgba(251, 191, 36, 0.20)',
    text: '#FCD34D',
    label: 'Moderate',
  },
  high: {
    solid: '#FB923C',
    background: 'rgba(251, 146, 60, 0.22)',
    text: '#FDBA74',
    label: 'Heavy',
  },
  burnout: {
    solid: '#F87171',
    background: 'rgba(248, 113, 113, 0.25)',
    text: '#FCA5A5',
    label: 'Overloaded',
  },
};

/**
 * Get workload colors based on theme
 * @param isDark - Whether to use dark theme colors
 * @returns Workload color mapping
 */
export function getWorkloadColors(isDark: boolean = false): Record<WorkloadLevel, WorkloadColorScheme> {
  return isDark ? WORKLOAD_COLORS_DARK : WORKLOAD_COLORS;
}
