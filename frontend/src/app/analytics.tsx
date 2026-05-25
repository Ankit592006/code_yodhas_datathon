import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { analyticsApi } from '@/services/api';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - Spacing.four * 2 - Spacing.three * 2;
const CHART_HEIGHT = 160;

interface AnalyticsData {
  avgWeeklyScore: number;
  bestDay: { score: number; day: string };
  moodConsistency: number;
  trend: Array<{ day: string; score: number }>;
  screenVsStress: Array<{ screenTime: number; stress: number }>;
  sleepDistribution: {
    poor: number;
    fair: number;
    good: number;
    excellent: number;
  };
  timeline: Array<{ week: string; avgScore: number; risk: string }>;
}

export default function AnalyticsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);

  const fetchAnalytics = async () => {
    try {
      const response = await analyticsApi.getAnalytics();
      setData(response);
    } catch (err) {
      console.error('Failed to load analytics', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchAnalytics().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color="#208AEF" />
        <ThemedText style={{ marginTop: Spacing.two }}>Mapping your trends...</ThemedText>
      </ThemedView>
    );
  }

  // Sleep Distribution Calculations
  const sleepDist = data?.sleepDistribution ?? { poor: 0, fair: 0, good: 0, excellent: 0 };
  const totalSleepRecords = Math.max(
    1,
    sleepDist.poor + sleepDist.fair + sleepDist.good + sleepDist.excellent
  );

  const sleepPercentages = {
    poor: (sleepDist.poor / totalSleepRecords) * 100,
    fair: (sleepDist.fair / totalSleepRecords) * 100,
    good: (sleepDist.good / totalSleepRecords) * 100,
    excellent: (sleepDist.excellent / totalSleepRecords) * 100,
  };

  // Screen vs Stress SVG parameters
  const screenVsStress = data?.screenVsStress?.slice(-7) ?? [];
  const maxScreenTime = Math.max(5, ...screenVsStress.map((d) => d.screenTime));

  const getRiskBadgeColor = (risk: string) => {
    switch (risk.toUpperCase()) {
      case 'HIGH':
        return { bg: '#FEE2E2', border: '#EF4444', text: '#B91C1C' };
      case 'MODERATE':
        return { bg: '#FEF3C7', border: '#F59E0B', text: '#B45309' };
      default:
        return { bg: '#D1FAE5', border: '#10B981', text: '#047857' };
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#208AEF" />
          }
        >
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.title}>
              Behavioral Analytics
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              Understand the passive correlation between your screen activity, sleep, and stress.
            </ThemedText>
          </View>

          {/* Metric Overview Row */}
          <View style={styles.overviewRow}>
            <View style={[styles.overviewCard, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="smallBold" style={{ color: colors.textSecondary }}>Avg. Score</ThemedText>
              <ThemedText style={styles.overviewValue}>{data?.avgWeeklyScore ?? 50}%</ThemedText>
            </View>
            <View style={[styles.overviewCard, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="smallBold" style={{ color: colors.textSecondary }}>Consistency</ThemedText>
              <ThemedText style={styles.overviewValue}>{data?.moodConsistency ?? 0}%</ThemedText>
            </View>
            <View style={[styles.overviewCard, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="smallBold" style={{ color: colors.textSecondary }}>Best Day</ThemedText>
              <ThemedText style={styles.overviewDayText} numberOfLines={1}>
                {data?.bestDay?.day || 'N/A'}
              </ThemedText>
            </View>
          </View>

          {/* Custom SVG Screen Time vs Stress Correlation Chart */}
          <View style={[styles.chartCard, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="smallBold" style={styles.chartTitle}>
              📱 SCREEN TIME VS. 🧠 STRESS TREND
            </ThemedText>
            
            {screenVsStress.length === 0 ? (
              <View style={styles.noDataView}>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  Log check-ins or sync passive stats to generate correlation charts.
                </ThemedText>
              </View>
            ) : (
              <View style={styles.chartContainer}>
                <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                    const y = CHART_HEIGHT - 30 - p * (CHART_HEIGHT - 50);
                    return (
                      <G key={i}>
                        <Line
                          x1="30"
                          y1={y}
                          x2={CHART_WIDTH}
                          y2={y}
                          stroke={colors.backgroundSelected}
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                        <SvgText
                          x="5"
                          y={y + 4}
                          fontSize="9"
                          fill={colors.textSecondary}
                          textAnchor="start"
                        >
                          {Math.round(p * 10)}
                        </SvgText>
                      </G>
                    );
                  })}

                  {/* Render Screen Time Bars & Stress Line Points */}
                  {screenVsStress.map((val, idx) => {
                    const x = 40 + idx * ((CHART_WIDTH - 60) / Math.max(1, screenVsStress.length - 1));
                    const barHeight = (val.screenTime / maxScreenTime) * (CHART_HEIGHT - 50);
                    const barY = CHART_HEIGHT - 30 - barHeight;

                    const stressY = CHART_HEIGHT - 30 - (val.stress / 10) * (CHART_HEIGHT - 50);

                    return (
                      <G key={idx}>
                        {/* Screen Time Bar */}
                        <Rect
                          x={x - 6}
                          y={barY}
                          width="12"
                          height={barHeight}
                          fill="#3B82F6"
                          rx="3"
                          opacity="0.5"
                        />
                        {/* Stress Dot */}
                        <Rect
                          x={x - 4}
                          y={stressY - 4}
                          width="8"
                          height="8"
                          fill="#EF4444"
                          rx="4"
                        />
                        {/* Day label */}
                        <SvgText
                          x={x}
                          y={CHART_HEIGHT - 10}
                          fontSize="8"
                          fill={colors.textSecondary}
                          textAnchor="middle"
                        >
                          {`D${idx + 1}`}
                        </SvgText>
                      </G>
                    );
                  })}
                </Svg>
                
                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#3B82F6', opacity: 0.5 }]} />
                    <ThemedText type="small" style={{ fontSize: 10, color: colors.textSecondary }}>
                      Screen Time (Hrs)
                    </ThemedText>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                    <ThemedText type="small" style={{ fontSize: 10, color: colors.textSecondary }}>
                      Stress Index (0-10)
                    </ThemedText>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Sleep Quality Distribution */}
          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              SLEEP PATTERN DISTRIBUTION
            </ThemedText>
            <View style={[styles.distCard, { backgroundColor: colors.backgroundElement }]}>
              {totalSleepRecords === 1 &&
              sleepDist.poor === 0 &&
              sleepDist.fair === 0 &&
              sleepDist.good === 0 &&
              sleepDist.excellent === 0 ? (
                <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                  No sleep logs recorded yet.
                </ThemedText>
              ) : (
                <View style={styles.barStack}>
                  {/* Segmented Bar */}
                  <View style={styles.barContainer}>
                    {sleepPercentages.excellent > 0 && (
                      <View style={[styles.barSegment, { width: `${sleepPercentages.excellent}%`, backgroundColor: '#10B981' }]} />
                    )}
                    {sleepPercentages.good > 0 && (
                      <View style={[styles.barSegment, { width: `${sleepPercentages.good}%`, backgroundColor: '#3B82F6' }]} />
                    )}
                    {sleepPercentages.fair > 0 && (
                      <View style={[styles.barSegment, { width: `${sleepPercentages.fair}%`, backgroundColor: '#F59E0B' }]} />
                    )}
                    {sleepPercentages.poor > 0 && (
                      <View style={[styles.barSegment, { width: `${sleepPercentages.poor}%`, backgroundColor: '#EF4444' }]} />
                    )}
                  </View>

                  {/* Legend Grid */}
                  <View style={styles.distLegendGrid}>
                    <View style={styles.distLegendItem}>
                      <View style={[styles.distColorDot, { backgroundColor: '#10B981' }]} />
                      <ThemedText type="small" style={{ color: colors.text }}>
                        Excellent (8h+): {sleepDist.excellent}
                      </ThemedText>
                    </View>
                    <View style={styles.distLegendItem}>
                      <View style={[styles.distColorDot, { backgroundColor: '#3B82F6' }]} />
                      <ThemedText type="small" style={{ color: colors.text }}>
                        Good (7-8h): {sleepDist.good}
                      </ThemedText>
                    </View>
                    <View style={styles.distLegendItem}>
                      <View style={[styles.distColorDot, { backgroundColor: '#F59E0B' }]} />
                      <ThemedText type="small" style={{ color: colors.text }}>
                        Fair (6-7h): {sleepDist.fair}
                      </ThemedText>
                    </View>
                    <View style={styles.distLegendItem}>
                      <View style={[styles.distColorDot, { backgroundColor: '#EF4444' }]} />
                      <ThemedText type="small" style={{ color: colors.text }}>
                        Poor (&lt;6h): {sleepDist.poor}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* 4-Week Timeline Breakdown */}
          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              WEEKLY WELL-BEING TIMELINE
            </ThemedText>
            {data?.timeline?.map((item, index) => {
              const themeBadge = getRiskBadgeColor(item.risk);
              return (
                <View
                  key={index}
                  style={[styles.timelineRow, { backgroundColor: colors.backgroundElement }]}
                >
                  <View style={styles.timelineWeek}>
                    <ThemedText type="smallBold">{item.week}</ThemedText>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      Average Score: {item.avgScore}%
                    </ThemedText>
                  </View>
                  
                  <View
                    style={[
                      styles.timelineBadge,
                      {
                        backgroundColor: themeBadge.bg,
                        borderColor: themeBadge.border,
                      },
                    ]}
                  >
                    <ThemedText style={[styles.badgeText, { color: themeBadge.text }]}>
                      {item.risk} RISK
                    </ThemedText>
                  </View>
                </View>
              );
            })}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  overviewRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  overviewCard: {
    flex: 1,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
    gap: 4,
  },
  overviewValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  overviewDayText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  chartCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  chartTitle: {
    fontSize: 11,
    letterSpacing: 1.1,
    marginBottom: Spacing.three,
  },
  chartContainer: {
    alignItems: 'center',
  },
  noDataView: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartLegend: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: Spacing.two,
  },
  distCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  barStack: {
    gap: Spacing.three,
  },
  barContainer: {
    height: 16,
    borderRadius: 8,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  barSegment: {
    height: '100%',
  },
  distLegendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  distLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '47%',
  },
  distColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    marginBottom: Spacing.two,
  },
  timelineWeek: {
    gap: 2,
  },
  timelineBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});
