import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text } from './Themed';

interface SetupStep {
  id: string;
  label: string;
  completed: boolean;
}

interface SetupProgressProps {
  steps: SetupStep[];
  onStepPress?: (stepId: string) => void;
  isDark?: boolean;
}

/**
 * Setup Progress component
 * Shows completion status of setup steps with interactive checkmarks
 */
export function SetupProgress({
  steps,
  onStepPress,
  isDark = false,
}: SetupProgressProps) {
  const completedCount = steps.filter(s => s.completed).length;
  const totalCount = steps.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDark && styles.titleDark]}>
          Get Started
        </Text>
        <Text style={[styles.progressText, isDark && styles.progressTextDark]}>
          {completedCount}/{totalCount} complete
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressBar, isDark && styles.progressBarDark]}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress * 100}%` },
            progress === 1 && styles.progressComplete,
          ]}
        />
      </View>

      {/* Steps List */}
      <View style={styles.stepsList}>
        {steps.map((step, index) => (
          <TouchableOpacity
            key={step.id}
            style={[
              styles.stepItem,
              index !== steps.length - 1 && styles.stepItemBorder,
              isDark && styles.stepItemBorderDark,
            ]}
            onPress={() => !step.completed && onStepPress?.(step.id)}
            activeOpacity={step.completed ? 1 : 0.7}
          >
            <View
              style={[
                styles.checkbox,
                step.completed && styles.checkboxCompleted,
                isDark && !step.completed && styles.checkboxDark,
              ]}
            >
              {step.completed && (
                <FontAwesome name="check" size={12} color="#fff" />
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                step.completed && styles.stepLabelCompleted,
                isDark && styles.stepLabelDark,
                isDark && step.completed && styles.stepLabelCompletedDark,
              ]}
            >
              {step.label}
            </Text>
            {!step.completed && (
              <FontAwesome
                name="chevron-right"
                size={14}
                color={isDark ? '#4B5563' : '#D1D5DB'}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  containerDark: {
    backgroundColor: '#1F2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  titleDark: {
    color: '#F3F4F6',
  },
  progressText: {
    fontSize: 13,
    color: '#6B7280',
  },
  progressTextDark: {
    color: '#9CA3AF',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBarDark: {
    backgroundColor: '#374151',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 3,
  },
  progressComplete: {
    backgroundColor: '#10B981',
  },
  stepsList: {
    gap: 0,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  stepItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  stepItemBorderDark: {
    borderBottomColor: '#374151',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxDark: {
    borderColor: '#4B5563',
  },
  checkboxCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  stepLabel: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },
  stepLabelDark: {
    color: '#E5E7EB',
  },
  stepLabelCompleted: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  stepLabelCompletedDark: {
    color: '#6B7280',
  },
});
