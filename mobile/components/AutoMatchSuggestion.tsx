import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Text } from './Themed';
import Colors from '../constants/Colors';
import { ClientSuggestion } from '../services/event-client-mapping.service';

interface Props {
  suggestions: ClientSuggestion[];
  onSelect: (clientId: string) => void;
  onDismiss?: () => void;
  compact?: boolean;
}

export function AutoMatchSuggestion({
  suggestions,
  onSelect,
  onDismiss,
  compact = false,
}: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  if (suggestions.length === 0) return null;

  const topSuggestion = suggestions[0];
  const otherSuggestions = suggestions.slice(1, 3); // Show up to 2 alternatives

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return '#10B981'; // Green
    if (confidence >= 0.5) return '#F59E0B'; // Yellow/Orange
    return '#6B7280'; // Gray
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.5) return 'Medium';
    return 'Low';
  };

  const getSourceIcon = (source: ClientSuggestion['source']): 'link' | 'magic' => {
    return source === 'existing-mapping' ? 'link' : 'magic';
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.compactContainer,
          { backgroundColor: colorScheme === 'dark' ? '#1E3A5F' : '#EBF8FF' },
        ]}
        onPress={() => onSelect(topSuggestion.clientId)}
        activeOpacity={0.7}
      >
        <FontAwesome
          name={getSourceIcon(topSuggestion.source)}
          size={14}
          color={colors.tint}
          style={styles.compactIcon}
        />
        <Text style={[styles.compactText, { color: colors.tint }]}>
          Link to {topSuggestion.clientName}?
        </Text>
        <View
          style={[
            styles.confidenceBadge,
            { backgroundColor: getConfidenceColor(topSuggestion.confidence) + '20' },
          ]}
        >
          <Text
            style={[
              styles.confidenceText,
              { color: getConfidenceColor(topSuggestion.confidence) },
            ]}
          >
            {Math.round(topSuggestion.confidence * 100)}%
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colorScheme === 'dark' ? '#1E293B' : '#F8FAFC' },
      ]}
    >
      <View style={styles.header}>
        <FontAwesome name="lightbulb-o" size={16} color={colors.tint} />
        <Text style={[styles.headerText, { color: colors.text }]}>
          Client Suggestion
        </Text>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <FontAwesome name="times" size={16} color={colors.tabIconDefault} />
          </TouchableOpacity>
        )}
      </View>

      {/* Top Suggestion */}
      <TouchableOpacity
        style={[
          styles.suggestionCard,
          {
            backgroundColor: colorScheme === 'dark' ? '#374151' : '#FFFFFF',
            borderColor: getConfidenceColor(topSuggestion.confidence),
          },
        ]}
        onPress={() => onSelect(topSuggestion.clientId)}
        activeOpacity={0.7}
      >
        <View style={styles.suggestionContent}>
          <View style={styles.suggestionMain}>
            <FontAwesome
              name={getSourceIcon(topSuggestion.source)}
              size={18}
              color={colors.tint}
              style={styles.suggestionIcon}
            />
            <View style={styles.suggestionInfo}>
              <Text style={[styles.clientName, { color: colors.text }]}>
                {topSuggestion.clientName}
              </Text>
              <Text style={[styles.reasonText, { color: colors.tabIconDefault }]}>
                {topSuggestion.reasons[0]}
              </Text>
            </View>
          </View>
          <View style={styles.confidenceSection}>
            <View
              style={[
                styles.confidenceBadgeLarge,
                { backgroundColor: getConfidenceColor(topSuggestion.confidence) + '20' },
              ]}
            >
              <Text
                style={[
                  styles.confidenceTextLarge,
                  { color: getConfidenceColor(topSuggestion.confidence) },
                ]}
              >
                {getConfidenceLabel(topSuggestion.confidence)}
              </Text>
            </View>
            <FontAwesome name="chevron-right" size={14} color={colors.tabIconDefault} />
          </View>
        </View>
      </TouchableOpacity>

      {/* Alternative Suggestions */}
      {otherSuggestions.length > 0 && (
        <View style={styles.alternativesSection}>
          <Text style={[styles.alternativesHeader, { color: colors.tabIconDefault }]}>
            Other matches:
          </Text>
          <View style={styles.alternativesList}>
            {otherSuggestions.map((suggestion) => (
              <TouchableOpacity
                key={suggestion.clientId}
                style={[
                  styles.alternativeChip,
                  { backgroundColor: colorScheme === 'dark' ? '#4B5563' : '#E5E7EB' },
                ]}
                onPress={() => onSelect(suggestion.clientId)}
              >
                <Text style={[styles.alternativeText, { color: colors.text }]}>
                  {suggestion.clientName}
                </Text>
                <Text
                  style={[
                    styles.alternativeConfidence,
                    { color: getConfidenceColor(suggestion.confidence) },
                  ]}
                >
                  {Math.round(suggestion.confidence * 100)}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  dismissButton: {
    padding: 4,
  },
  suggestionCard: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 2,
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggestionMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
  },
  reasonText: {
    fontSize: 12,
    marginTop: 2,
  },
  confidenceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confidenceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  confidenceBadgeLarge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  confidenceTextLarge: {
    fontSize: 12,
    fontWeight: '600',
  },
  alternativesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  alternativesHeader: {
    fontSize: 12,
    marginBottom: 8,
  },
  alternativesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  alternativeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  alternativeText: {
    fontSize: 13,
  },
  alternativeConfidence: {
    fontSize: 11,
    fontWeight: '600',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 6,
  },
  compactIcon: {
    marginRight: 6,
  },
  compactText: {
    fontSize: 13,
    flex: 1,
  },
});
