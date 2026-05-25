import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Rect, G, Text as SvgText, Line } from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { trackerApi, dashboardApi } from '@/services/api';

const { width } = Dimensions.get('window');

interface SleepTrendItem {
  day: string;
  hours: number;
}

export default function SleepScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  const [sleepHours, setSleepHours] = useState<number>(7.0);
  const [loading, setLoading] = useState(false);
  const [fetchingTrend, setFetchingTrend] = useState(true);
  const [sleepTrend, setSleepTrend] = useState<SleepTrendItem[]>([]);

  const fetchTrendData = async () => {
    try {
      const response = await dashboardApi.getDashboard();
      if (response && response.sleepTrend) {
        setSleepTrend(response.sleepTrend);
      }
    } catch (err) {
      console.warn('Failed to fetch sleep trend:', err);
    } finally {
      setFetchingTrend(false);
    }
  };

  useEffect(() => {
    fetchTrendData();
  }, []);

  const handleIncrementSleep = () => {
    if (sleepHours < 24) setSleepHours((prev) => parseFloat((prev + 0.5).toFixed(1)));
  };

  const handleDecrementSleep = () => {
    if (sleepHours > 0) setSleepHours((prev) => parseFloat((prev - 0.5).toFixed(1)));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await trackerApi.submitDailyTracker({
        sleepHours: sleepHours,
      });

      Alert.alert(
        'Sleep Logged',
        `Successfully logged ${sleepHours} hours of sleep! Predicted Stress: ${result.output?.stress_score ?? 'N/A'}/10.`,
        [
          {
            text: 'Return Home',
            onPress: () => {
              router.back();
            },
          },
          {
            text: 'Stay Here',
            onPress: () => {
              fetchTrendData();
            },
          }
        ]
      );
    } catch (err: any) {
      console.error(err);
      Alert.alert(
        'Submission Failed',
        err.response?.data?.error || 'Could not save sleep data. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderTrendChart = () => {
    if (fetchingTrend) {
      return (
        <View style={styles.chartPlaceholder}>
          <ActivityIndicator color="#208AEF" />
          <ThemedText style={{ marginTop: 8, fontSize: 12 }}>Loading sleep trends...</ThemedText>
        </View>
      );
    }

    if (sleepTrend.length === 0) {
      return (
        <View style={styles.chartPlaceholder}>
          <ThemedText style={{ fontSize: 13, color: colors.textSecondary }}>No sleep logs recorded yet.</ThemedText>
        </View>
      );
    }

    const svgWidth = width - Spacing.four * 2;
    const svgHeight = 180;
    const paddingLeft = 35;
    const paddingRight = 10;
    const paddingTop = 25;
    const paddingBottom = 30;

    const chartWidth = svgWidth - paddingLeft - paddingRight;
    const chartHeight = svgHeight - paddingTop - paddingBottom;

    const maxSleep = Math.max(...sleepTrend.map(d => d.hours), 10);
    const numItems = sleepTrend.length;
    const barWidth = Math.min(30, (chartWidth / numItems) * 0.6);
    const spacing = (chartWidth - barWidth * numItems) / (numItems - 1 || 1);

    const normalSleepVal = 8.0;
    const normalY = paddingTop + chartHeight - (normalSleepVal / maxSleep) * chartHeight;

    return (
      <View style={[styles.chartCard, { backgroundColor: colors.backgroundElement }]}>
        <ThemedText type="smallBold" style={[styles.chartTitle, { color: colors.text }]}>
          7-DAY SLEEP TREND (HOURS)
        </ThemedText>
        <Svg width={svgWidth} height={svgHeight}>
          {[0, 2, 4, 6, 8, 10].map((tick) => {
            if (tick > maxSleep) return null;
            const y = paddingTop + chartHeight - (tick / maxSleep) * chartHeight;
            return (
              <G key={tick}>
                <Line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke={colors.backgroundSelected}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <SvgText
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill={colors.textSecondary}
                >
                  {tick}h
                </SvgText>
              </G>
            );
          })}

          {/* Normal Sleep Hours Line */}
          <Line
            x1={paddingLeft}
            y1={normalY}
            x2={svgWidth - paddingRight}
            y2={normalY}
            stroke="#10B981"
            strokeWidth="2"
            strokeDasharray="5 5"
          />
          <SvgText
            x={svgWidth - paddingRight - 5}
            y={normalY - 6}
            textAnchor="end"
            fontSize="9"
            fontWeight="bold"
            fill="#10B981"
          >
            Normal Sleep (8h)
          </SvgText>

          {sleepTrend.map((item, index) => {
            const barHeight = (item.hours / maxSleep) * chartHeight;
            const x = paddingLeft + index * (barWidth + spacing) + spacing / 2;
            const y = paddingTop + chartHeight - barHeight;

            return (
              <G key={index}>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barHeight, 2)}
                  rx={4}
                  ry={4}
                  fill={item.hours >= 7 ? '#10B981' : item.hours >= 5 ? '#3B82F6' : '#EF4444'}
                />
                <SvgText
                  x={x + barWidth / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="bold"
                  fill={colors.text}
                >
                  {item.hours.toFixed(1)}
                </SvgText>
                <SvgText
                  x={x + barWidth / 2}
                  y={svgHeight - paddingBottom + 16}
                  textAnchor="middle"
                  fontSize="10"
                  fill={colors.textSecondary}
                >
                  {item.day}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.two }}>
              <ThemedText type="subtitle" style={styles.title}>
                Sleep Duration Log
              </ThemedText>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ThemedText style={{ color: colors.textSecondary, fontWeight: 'bold' }}>✕ Close</ThemedText>
              </TouchableOpacity>
            </View>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter how many hours you slept last night. Consistency helps improve stress prediction.
            </ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              LOG YOUR SLEEP
            </ThemedText>
            <View style={[styles.sleepControl, { backgroundColor: colors.backgroundElement }]}>
              <TouchableOpacity
                style={[styles.sleepBtn, { backgroundColor: colors.backgroundSelected }]}
                onPress={handleDecrementSleep}
              >
                <ThemedText style={styles.sleepBtnText}>-</ThemedText>
              </TouchableOpacity>
              
              <View style={styles.sleepDisplay}>
                <ThemedText style={styles.sleepHoursText}>{sleepHours.toFixed(1)}</ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  hours
                </ThemedText>
              </View>

              <TouchableOpacity
                style={[styles.sleepBtn, { backgroundColor: colors.backgroundSelected }]}
                onPress={handleIncrementSleep}
              >
                <ThemedText style={styles.sleepBtnText}>+</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: loading ? colors.backgroundSelected : '#3B82F6' }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <View style={styles.submitTextRow}>
                <ThemedText style={styles.submitText}>Save Sleep Entry</ThemedText>
                <ThemedText style={styles.submitArrow}>✦</ThemedText>
              </View>
            )}
          </TouchableOpacity>

          <View style={{ marginTop: Spacing.four }}>
            {renderTrendChart()}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
  },
  header: {
    paddingVertical: Spacing.three,
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: Spacing.two,
  },
  sleepControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three,
    padding: Spacing.two,
    marginTop: Spacing.one,
  },
  sleepBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sleepBtnText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  sleepDisplay: {
    alignItems: 'center',
  },
  sleepHoursText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  submitButton: {
    height: 52,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  submitTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitArrow: {
    color: '#ffffff',
    fontSize: 18,
  },
  backButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  chartCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  chartTitle: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: Spacing.three,
  },
  chartPlaceholder: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
