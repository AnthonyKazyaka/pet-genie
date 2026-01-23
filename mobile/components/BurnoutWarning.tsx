import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Modal, ScrollView } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text } from './Themed';
import { BurnoutRisk, RuleViolation } from '@/services/rules-engine.service';

interface BurnoutWarningProps {
  risk: BurnoutRisk;
  violations: RuleViolation[];
  onPress?: () => void;
  isDark?: boolean;
}

/**
 * Get severity color
 */
function getSeverityColor(level: BurnoutRisk['level'], isDark: boolean): string {
  switch (level) {
    case 'critical':
      return isDark ? '#F87171' : '#DC2626';
    case 'high':
      return isDark ? '#FB923C' : '#EA580C';
    case 'moderate':
      return isDark ? '#FBBF24' : '#D97706';
    default:
      return isDark ? '#9CA3AF' : '#6B7280';
  }
}

/**
 * Get severity background
 */
function getSeverityBackground(level: BurnoutRisk['level'], isDark: boolean): string {
  switch (level) {
    case 'critical':
      return isDark ? 'rgba(248, 113, 113, 0.15)' : 'rgba(220, 38, 38, 0.08)';
    case 'high':
      return isDark ? 'rgba(251, 146, 60, 0.15)' : 'rgba(234, 88, 12, 0.08)';
    case 'moderate':
      return isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(217, 119, 6, 0.08)';
    default:
      return isDark ? 'rgba(156, 163, 175, 0.15)' : 'rgba(107, 114, 128, 0.08)';
  }
}

/**
 * Get title based on severity
 */
function getTitle(level: BurnoutRisk['level']): string {
  switch (level) {
    case 'critical':
      return 'Burnout Alert!';
    case 'high':
      return 'High Workload Warning';
    case 'moderate':
      return 'Workload Notice';
    default:
      return 'Workload Info';
  }
}

/**
 * Burnout Warning component
 * Shows workload alerts and rule violations with detailed breakdown
 */
export function BurnoutWarning({
  risk,
  violations,
  onPress,
  isDark = false,
}: BurnoutWarningProps) {
  const [showDetails, setShowDetails] = useState(false);
  const color = getSeverityColor(risk.level, isDark);
  const backgroundColor = getSeverityBackground(risk.level, isDark);

  return (
    <>
      <TouchableOpacity
        style={[styles.container, { backgroundColor }]}
        onPress={() => setShowDetails(true)}
        activeOpacity={0.8}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <FontAwesome
              name={risk.level === 'critical' ? 'warning' : 'exclamation-circle'}
              size={20}
              color={color}
            />
          </View>
          <View style={styles.content}>
            <Text style={[styles.title, { color }]}>{getTitle(risk.level)}</Text>
            <Text style={[styles.message, isDark && styles.messageDark]}>
              {risk.factors[0] || 'Your workload is approaching limits'}
            </Text>
            {risk.factors.length > 1 && (
              <Text style={[styles.moreCount, isDark && styles.moreCountDark]}>
                +{risk.factors.length - 1} more concerns
              </Text>
            )}
          </View>
          <FontAwesome
            name="chevron-right"
            size={16}
            color={isDark ? '#6B7280' : '#9CA3AF'}
          />
        </View>

        {/* Score Indicator */}
        <View style={styles.scoreContainer}>
          <View style={[styles.scoreBar, isDark && styles.scoreBarDark]}>
            <View
              style={[
                styles.scoreFill,
                { width: `${Math.min(risk.score, 100)}%`, backgroundColor: color },
              ]}
            />
          </View>
          <Text style={[styles.scoreText, isDark && styles.scoreTextDark]}>
            Risk Score: {Math.round(risk.score)}%
          </Text>
        </View>
      </TouchableOpacity>

      {/* Details Modal */}
      <Modal
        visible={showDetails}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={[styles.modalContainer, isDark && styles.modalContainerDark]}>
          <View style={[styles.modalHeader, isDark && styles.modalHeaderDark]}>
            <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>
              Workload Details
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDetails(false)}
            >
              <FontAwesome
                name="times"
                size={24}
                color={isDark ? '#9CA3AF' : '#6B7280'}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
          >
            {/* Risk Overview */}
            <View style={[styles.section, isDark && styles.sectionDark]}>
              <View style={styles.sectionHeader}>
                <FontAwesome
                  name={risk.level === 'critical' ? 'warning' : 'exclamation-circle'}
                  size={24}
                  color={color}
                />
                <Text style={[styles.sectionTitle, { color }]}>
                  {getTitle(risk.level)}
                </Text>
              </View>
              <Text style={[styles.sectionText, isDark && styles.sectionTextDark]}>
                Your current workload score is {Math.round(risk.score)}%. This is based
                on your scheduled hours, visit frequency, and rest periods.
              </Text>
              <View style={[styles.fullScoreBar, isDark && styles.fullScoreBarDark]}>
                <View
                  style={[
                    styles.fullScoreFill,
                    { width: `${Math.min(risk.score, 100)}%`, backgroundColor: color },
                  ]}
                />
              </View>
            </View>

            {/* Factors */}
            {risk.factors.length > 0 && (
              <View style={[styles.section, isDark && styles.sectionDark]}>
                <Text style={[styles.listTitle, isDark && styles.listTitleDark]}>
                  Contributing Factors
                </Text>
                {risk.factors.map((factor, index) => (
                  <View key={index} style={styles.factorItem}>
                    <FontAwesome
                      name="circle"
                      size={8}
                      color={color}
                      style={styles.bulletIcon}
                    />
                    <Text style={[styles.factorText, isDark && styles.factorTextDark]}>
                      {factor}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Violations */}
            {violations.length > 0 && (
              <View style={[styles.section, isDark && styles.sectionDark]}>
                <Text style={[styles.listTitle, isDark && styles.listTitleDark]}>
                  Rule Violations
                </Text>
                {violations.map((violation, index) => (
                  <View key={index} style={styles.violationItem}>
                    <View
                      style={[
                        styles.violationIcon,
                        {
                          backgroundColor:
                            violation.severity === 'critical'
                              ? 'rgba(220, 38, 38, 0.1)'
                              : 'rgba(245, 158, 11, 0.1)',
                        },
                      ]}
                    >
                      <FontAwesome
                        name={violation.severity === 'critical' ? 'times' : 'exclamation'}
                        size={12}
                        color={
                          violation.severity === 'critical'
                            ? isDark
                              ? '#F87171'
                              : '#DC2626'
                            : isDark
                            ? '#FBBF24'
                            : '#D97706'
                        }
                      />
                    </View>
                    <View style={styles.violationContent}>
                      <Text
                        style={[
                          styles.violationTitle,
                          isDark && styles.violationTitleDark,
                        ]}
                      >
                        {violation.title}
                      </Text>
                      <Text
                        style={[styles.violationText, isDark && styles.violationTextDark]}
                      >
                        {violation.description}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Recommendations */}
            <View style={[styles.section, isDark && styles.sectionDark]}>
              <Text style={[styles.listTitle, isDark && styles.listTitleDark]}>
                Recommendations
              </Text>
              <View style={styles.recommendationItem}>
                <FontAwesome
                  name="lightbulb-o"
                  size={16}
                  color={isDark ? '#60A5FA' : '#2563EB'}
                  style={styles.recommendIcon}
                />
                <Text style={[styles.recommendText, isDark && styles.recommendTextDark]}>
                  Consider spreading visits across more days
                </Text>
              </View>
              <View style={styles.recommendationItem}>
                <FontAwesome
                  name="lightbulb-o"
                  size={16}
                  color={isDark ? '#60A5FA' : '#2563EB'}
                  style={styles.recommendIcon}
                />
                <Text style={[styles.recommendText, isDark && styles.recommendTextDark]}>
                  Schedule breaks between consecutive visits
                </Text>
              </View>
              <View style={styles.recommendationItem}>
                <FontAwesome
                  name="lightbulb-o"
                  size={16}
                  color={isDark ? '#60A5FA' : '#2563EB'}
                  style={styles.recommendIcon}
                />
                <Text style={[styles.recommendText, isDark && styles.recommendTextDark]}>
                  Review your workload limits in Settings
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer Action */}
          <View style={[styles.modalFooter, isDark && styles.modalFooterDark]}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setShowDetails(false);
                onPress?.();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>View Analytics</Text>
              <FontAwesome name="arrow-right" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  messageDark: {
    color: '#D1D5DB',
  },
  moreCount: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  moreCountDark: {
    color: '#9CA3AF',
  },
  scoreContainer: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    marginRight: 12,
    overflow: 'hidden',
  },
  scoreBarDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  scoreFill: {
    height: '100%',
    borderRadius: 2,
  },
  scoreText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  scoreTextDark: {
    color: '#9CA3AF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalContainerDark: {
    backgroundColor: '#111827',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  modalHeaderDark: {
    backgroundColor: '#1F2937',
    borderBottomColor: '#374151',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalTitleDark: {
    color: '#F3F4F6',
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 16,
    gap: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  sectionDark: {
    backgroundColor: '#1F2937',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  sectionTextDark: {
    color: '#9CA3AF',
  },
  fullScoreBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fullScoreBarDark: {
    backgroundColor: '#374151',
  },
  fullScoreFill: {
    height: '100%',
    borderRadius: 4,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  listTitleDark: {
    color: '#F3F4F6',
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletIcon: {
    marginTop: 6,
    marginRight: 10,
  },
  factorText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  factorTextDark: {
    color: '#D1D5DB',
  },
  violationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  violationIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  violationContent: {
    flex: 1,
  },
  violationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  violationTitleDark: {
    color: '#E5E7EB',
  },
  violationText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  violationTextDark: {
    color: '#9CA3AF',
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  recommendIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  recommendText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  recommendTextDark: {
    color: '#D1D5DB',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  modalFooterDark: {
    backgroundColor: '#1F2937',
    borderTopColor: '#374151',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
