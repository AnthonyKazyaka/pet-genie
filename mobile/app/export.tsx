import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, View as ThemedView } from '@/components/Themed';
import { useVisitRecords, useClients, useSettings, useAnalytics } from '@/hooks';
import { CalendarEvent, Client, VisitRecord } from '@/models';

/**
 * Date range options
 */
type DateRangeOption = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

/**
 * Export format options
 */
type ExportFormat = 'summary' | 'detailed' | 'csv';

/**
 * Grouping options
 */
type GroupBy = 'day' | 'week' | 'month' | 'client' | 'service';

/**
 * Get date range bounds
 */
function getDateRange(option: DateRangeOption): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (option) {
    case 'today':
      return { start: today, end: now };
    case 'week': {
      const start = new Date(today);
      start.setDate(start.getDate() - start.getDay());
      return { start, end: now };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end: now };
    }
    case 'quarter': {
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), quarterStart, 1);
      return { start, end: now };
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, end: now };
    }
    default:
      return { start: today, end: now };
  }
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format time for display
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format duration in hours
 */
function formatHours(hours: number): string {
  return `${hours.toFixed(1)}h`;
}

/**
 * Generate mock events for export
 */
function generateMockEvents(): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const today = new Date();

  for (let dayOffset = -30; dayOffset <= 0; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);

    if (Math.random() > 0.4) continue;

    const dateStr = date.toISOString().split('T')[0];
    const eventCount = Math.floor(Math.random() * 4) + 1;

    const services = ['drop-in', 'walk', 'overnight'];
    const clients = ['Johnson Family', 'Smith Residence', 'Garcia Home', 'Williams Family'];
    const hours = [8, 10, 14, 16];

    for (let i = 0; i < eventCount && i < hours.length; i++) {
      const service = services[Math.floor(Math.random() * services.length)];
      const client = clients[Math.floor(Math.random() * clients.length)];
      const duration = service === 'walk' ? 60 : 30;

      events.push({
        id: `event_${dateStr}_${i}`,
        calendarId: 'work',
        title: `${service === 'walk' ? 'Walk' : 'Drop-in'} - ${client}`,
        clientName: client,
        location: `${100 + i} Main Street`,
        start: `${dateStr}T${String(hours[i]).padStart(2, '0')}:00:00`,
        end: `${dateStr}T${String(hours[i]).padStart(2, '0')}:${String(duration).padStart(2, '0')}:00`,
        allDay: false,
        status: 'confirmed',
        isWorkEvent: true,
        serviceInfo: {
          type: service as any,
          duration,
        },
      });
    }
  }

  return events;
}

/**
 * Generate summary report
 */
function generateSummaryReport(
  events: CalendarEvent[],
  dateRange: { start: Date; end: Date }
): string {
  const totalVisits = events.length;
  const totalHours = events.reduce((sum, e) => {
    const start = new Date(e.start);
    const end = new Date(e.end);
    return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }, 0);

  const uniqueClients = new Set(events.map((e) => e.clientName).filter(Boolean)).size;

  const byService: Record<string, number> = {};
  events.forEach((e) => {
    const type = e.serviceInfo?.type || 'other';
    byService[type] = (byService[type] || 0) + 1;
  });

  let report = '📊 PET GENIE SUMMARY REPORT\n';
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
  report += `📅 Period: ${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}\n\n`;
  report += '📈 OVERVIEW\n';
  report += `   Total Visits: ${totalVisits}\n`;
  report += `   Total Hours: ${formatHours(totalHours)}\n`;
  report += `   Unique Clients: ${uniqueClients}\n\n`;
  report += '🐾 BY SERVICE TYPE\n';

  Object.entries(byService)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      const percent = Math.round((count / totalVisits) * 100);
      report += `   ${type}: ${count} visits (${percent}%)\n`;
    });

  report += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  report += 'Generated by Pet Genie\n';

  return report;
}

/**
 * Generate detailed report
 */
function generateDetailedReport(
  events: CalendarEvent[],
  dateRange: { start: Date; end: Date },
  groupBy: GroupBy
): string {
  let report = '📋 PET GENIE DETAILED REPORT\n';
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
  report += `📅 Period: ${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}\n\n`;

  // Sort events by date
  const sorted = [...events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  if (groupBy === 'client') {
    // Group by client
    const byClient: Record<string, CalendarEvent[]> = {};
    sorted.forEach((e) => {
      const client = e.clientName || 'Unknown';
      if (!byClient[client]) byClient[client] = [];
      byClient[client].push(e);
    });

    Object.entries(byClient).forEach(([client, clientEvents]) => {
      const hours = clientEvents.reduce((sum, e) => {
        const start = new Date(e.start);
        const end = new Date(e.end);
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0);

      report += `👤 ${client}\n`;
      report += `   ${clientEvents.length} visits • ${formatHours(hours)}\n`;
      clientEvents.slice(0, 5).forEach((e) => {
        const date = new Date(e.start);
        report += `   • ${formatDate(date)} ${formatTime(date)}\n`;
      });
      if (clientEvents.length > 5) {
        report += `   ... and ${clientEvents.length - 5} more\n`;
      }
      report += '\n';
    });
  } else {
    // Group by day (default)
    const byDay: Record<string, CalendarEvent[]> = {};
    sorted.forEach((e) => {
      const dateKey = new Date(e.start).toDateString();
      if (!byDay[dateKey]) byDay[dateKey] = [];
      byDay[dateKey].push(e);
    });

    Object.entries(byDay).forEach(([dateKey, dayEvents]) => {
      const date = new Date(dateKey);
      const hours = dayEvents.reduce((sum, e) => {
        const start = new Date(e.start);
        const end = new Date(e.end);
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0);

      report += `📆 ${formatDate(date)}\n`;
      report += `   ${dayEvents.length} visits • ${formatHours(hours)}\n`;
      dayEvents.forEach((e) => {
        const time = new Date(e.start);
        report += `   • ${formatTime(time)} - ${e.title}\n`;
      });
      report += '\n';
    });
  }

  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  report += 'Generated by Pet Genie\n';

  return report;
}

/**
 * Generate CSV report
 */
function generateCSVReport(events: CalendarEvent[]): string {
  let csv = 'Date,Time,Client,Service,Duration (min),Location\n';

  const sorted = [...events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  sorted.forEach((e) => {
    const start = new Date(e.start);
    const end = new Date(e.end);
    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

    csv += [
      formatDate(start),
      formatTime(start),
      `"${e.clientName || 'Unknown'}"`,
      e.serviceInfo?.type || 'other',
      duration,
      `"${e.location || ''}"`,
    ].join(',');
    csv += '\n';
  });

  return csv;
}

/**
 * Option Button Component
 */
function OptionButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.optionButton, selected && styles.optionButtonSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[styles.optionButtonText, selected && styles.optionButtonTextSelected]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Export Screen
 */
export default function ExportScreen() {
  const { settings } = useSettings();

  const [dateRange, setDateRange] = useState<DateRangeOption>('month');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('summary');
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [exporting, setExporting] = useState(false);

  // Generate mock events (in production, fetch from calendar)
  const events = useMemo(() => generateMockEvents(), []);

  // Filter events by date range
  const filteredEvents = useMemo(() => {
    const { start, end } = getDateRange(dateRange);
    return events.filter((e) => {
      const eventDate = new Date(e.start);
      return eventDate >= start && eventDate <= end;
    });
  }, [events, dateRange]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalVisits = filteredEvents.length;
    const totalHours = filteredEvents.reduce((sum, e) => {
      const start = new Date(e.start);
      const end = new Date(e.end);
      return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0);
    const uniqueClients = new Set(
      filteredEvents.map((e) => e.clientName).filter(Boolean)
    ).size;

    return { totalVisits, totalHours, uniqueClients };
  }, [filteredEvents]);

  /**
   * Generate and share report
   */
  const handleExport = async () => {
    if (filteredEvents.length === 0) {
      Alert.alert('No Data', 'No visits found for the selected period.');
      return;
    }

    setExporting(true);

    try {
      const { start, end } = getDateRange(dateRange);
      let content: string;
      let title: string;

      switch (exportFormat) {
        case 'summary':
          content = generateSummaryReport(filteredEvents, { start, end });
          title = 'Pet Genie Summary';
          break;
        case 'detailed':
          content = generateDetailedReport(filteredEvents, { start, end }, groupBy);
          title = 'Pet Genie Detailed Report';
          break;
        case 'csv':
          content = generateCSVReport(filteredEvents);
          title = 'Pet Genie Export.csv';
          break;
        default:
          content = generateSummaryReport(filteredEvents, { start, end });
          title = 'Pet Genie Report';
      }

      await Share.share({
        message: content,
        title,
      });
    } catch (error: any) {
      if (error.message !== 'User canceled') {
        Alert.alert('Export Failed', 'Unable to share the report.');
      }
    } finally {
      setExporting(false);
    }
  };

  /**
   * Preview report
   */
  const handlePreview = () => {
    if (filteredEvents.length === 0) {
      Alert.alert('No Data', 'No visits found for the selected period.');
      return;
    }

    const { start, end } = getDateRange(dateRange);
    let content: string;

    switch (exportFormat) {
      case 'summary':
        content = generateSummaryReport(filteredEvents, { start, end });
        break;
      case 'detailed':
        content = generateDetailedReport(filteredEvents, { start, end }, groupBy);
        break;
      case 'csv':
        content = generateCSVReport(filteredEvents);
        break;
      default:
        content = generateSummaryReport(filteredEvents, { start, end });
    }

    Alert.alert('Report Preview', content.slice(0, 1000) + (content.length > 1000 ? '\n...' : ''));
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Stats Preview */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Export Preview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalVisits}</Text>
              <Text style={styles.statLabel}>Visits</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatHours(stats.totalHours)}</Text>
              <Text style={styles.statLabel}>Hours</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.uniqueClients}</Text>
              <Text style={styles.statLabel}>Clients</Text>
            </View>
          </View>
        </View>

        {/* Date Range */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Date Range</Text>
          <View style={styles.optionsGrid}>
            <OptionButton
              label="Today"
              selected={dateRange === 'today'}
              onPress={() => setDateRange('today')}
            />
            <OptionButton
              label="This Week"
              selected={dateRange === 'week'}
              onPress={() => setDateRange('week')}
            />
            <OptionButton
              label="This Month"
              selected={dateRange === 'month'}
              onPress={() => setDateRange('month')}
            />
            <OptionButton
              label="Quarter"
              selected={dateRange === 'quarter'}
              onPress={() => setDateRange('quarter')}
            />
            <OptionButton
              label="Year"
              selected={dateRange === 'year'}
              onPress={() => setDateRange('year')}
            />
          </View>
        </View>

        {/* Export Format */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📄 Export Format</Text>
          <View style={styles.formatOptions}>
            <TouchableOpacity
              style={[
                styles.formatCard,
                exportFormat === 'summary' && styles.formatCardSelected,
              ]}
              onPress={() => setExportFormat('summary')}
            >
              <FontAwesome
                name="pie-chart"
                size={24}
                color={exportFormat === 'summary' ? '#2196F3' : '#999'}
              />
              <Text
                style={[
                  styles.formatTitle,
                  exportFormat === 'summary' && styles.formatTitleSelected,
                ]}
              >
                Summary
              </Text>
              <Text style={styles.formatDesc}>Quick overview with totals</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.formatCard,
                exportFormat === 'detailed' && styles.formatCardSelected,
              ]}
              onPress={() => setExportFormat('detailed')}
            >
              <FontAwesome
                name="list-alt"
                size={24}
                color={exportFormat === 'detailed' ? '#2196F3' : '#999'}
              />
              <Text
                style={[
                  styles.formatTitle,
                  exportFormat === 'detailed' && styles.formatTitleSelected,
                ]}
              >
                Detailed
              </Text>
              <Text style={styles.formatDesc}>Full visit breakdown</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.formatCard,
                exportFormat === 'csv' && styles.formatCardSelected,
              ]}
              onPress={() => setExportFormat('csv')}
            >
              <FontAwesome
                name="file-excel-o"
                size={24}
                color={exportFormat === 'csv' ? '#2196F3' : '#999'}
              />
              <Text
                style={[
                  styles.formatTitle,
                  exportFormat === 'csv' && styles.formatTitleSelected,
                ]}
              >
                CSV
              </Text>
              <Text style={styles.formatDesc}>Spreadsheet format</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Group By (for detailed report) */}
        {exportFormat === 'detailed' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Group By</Text>
            <View style={styles.optionsGrid}>
              <OptionButton
                label="Day"
                selected={groupBy === 'day'}
                onPress={() => setGroupBy('day')}
              />
              <OptionButton
                label="Client"
                selected={groupBy === 'client'}
                onPress={() => setGroupBy('client')}
              />
              <OptionButton
                label="Week"
                selected={groupBy === 'week'}
                onPress={() => setGroupBy('week')}
              />
              <OptionButton
                label="Service"
                selected={groupBy === 'service'}
                onPress={() => setGroupBy('service')}
              />
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.previewButton}
            onPress={handlePreview}
            activeOpacity={0.7}
          >
            <FontAwesome name="eye" size={16} color="#2196F3" />
            <Text style={styles.previewButtonText}>Preview</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
            onPress={handleExport}
            disabled={exporting}
            activeOpacity={0.7}
          >
            <FontAwesome name="share" size={16} color="#fff" />
            <Text style={styles.exportButtonText}>
              {exporting ? 'Exporting...' : 'Export & Share'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <FontAwesome name="info-circle" size={14} color="#999" />
          <Text style={styles.infoText}>
            Reports can be shared via email, messages, or saved to your device.
          </Text>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  optionButtonSelected: {
    backgroundColor: '#2196F3',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#666',
  },
  optionButtonTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  formatOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  formatCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  formatCardSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  formatTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    color: '#333',
  },
  formatTitleSelected: {
    color: '#2196F3',
  },
  formatDesc: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  previewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 14,
    gap: 8,
  },
  previewButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2196F3',
  },
  exportButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 14,
    gap: 8,
  },
  exportButtonDisabled: {
    backgroundColor: '#ccc',
  },
  exportButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  info: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
  },
});
