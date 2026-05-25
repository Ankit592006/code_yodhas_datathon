import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  useColorScheme,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Path,
  Circle,
  Line as SvgLine,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { analyticsApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import CustomTabBar from '@/components/custom-tab-bar';

const { width } = Dimensions.get('window');
const CHART_PADDING = 30;
const CHART_HEIGHT = 180;

interface AnalyticsData {
  avgWeeklyScore: number;
  bestDay: { score: number; day: string };
  moodConsistency: number;
  trend: Array<{ day: string; score: number }>;
  screenVsStress: Array<{ screenTime: number; stress: number }>;
  sleepDistribution: { poor: number; fair: number; good: number; excellent: number };
  timeline: Array<{ week: string; avgScore: number; risk: string }>;
}

interface ReportData {
  username: string;
  mood: string;
  stressLevel: number;
  sleepHours: number;
  screenTime: number;
  conclusion: string;
  date: string;
}

export default function AnalyticsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<'trends' | 'report'>('trends');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);

  const loadData = async () => {
    try {
      const [analyticsData, reportData] = await Promise.all([
        analyticsApi.getAnalytics(),
        analyticsApi.getReportData(),
      ]);
      setAnalytics(analyticsData);
      setReport(reportData);
    } catch (err) {
      console.error('Failed to fetch analytics or report data:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    };
    if (token) {
      init();
    }
  }, [token]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDownloadReport = () => {
    if (!token) return;
    try {
      const downloadUrl = analyticsApi.getDownloadReportUrl(token);
      Linking.openURL(downloadUrl);
    } catch (err) {
      console.error(err);
      Alert.alert('Download Error', 'Could not start the PDF download. Please try again.');
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color="#208AEF" />
        <ThemedText style={{ marginTop: Spacing.two }}>Loading analytics...</ThemedText>
      </ThemedView>
    );
  }

  // Draw Line Chart Path
  const renderTrendChart = () => {
    if (!analytics || !analytics.trend || analytics.trend.length === 0) {
      return (
        <View style={styles.emptyChart}>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>No trend logs found.</ThemedText>
        </View>
      );
    }

    const data = analytics.trend;
    const chartWidth = width - Spacing.four * 2;
    const drawableWidth = chartWidth - 2 * CHART_PADDING;
    const drawableHeight = CHART_HEIGHT - 2 * CHART_PADDING;

    // Helper to get coordinates
    const getCoords = (index: number, score: number) => {
      const x = CHART_PADDING + (index / (data.length - 1)) * drawableWidth;
      const y = CHART_HEIGHT - CHART_PADDING - (score / 100) * drawableHeight;
      return { x, y };
    };

    // Construct path string
    let pathD = '';
    let fillD = `M ${CHART_PADDING} ${CHART_HEIGHT - CHART_PADDING} `;

    data.forEach((item, index) => {
      const { x, y } = getCoords(index, item.score);
      if (index === 0) {
        pathD += `M ${x} ${y}`;
      } else {
        pathD += ` L ${x} ${y}`;
      }
      fillD += ` L ${x} ${y}`;
    });

    fillD += ` L ${CHART_PADDING + drawableWidth} ${CHART_HEIGHT - CHART_PADDING} Z`;

    return (
      <View style={styles.chartWrapper}>
        <Svg width={chartWidth} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#208AEF" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#208AEF" stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          <SvgLine
            x1={CHART_PADDING}
            y1={CHART_PADDING}
            x2={chartWidth - CHART_PADDING}
            y2={CHART_PADDING}
            stroke={colors.backgroundSelected}
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <SvgLine
            x1={CHART_PADDING}
            y1={CHART_HEIGHT / 2}
            x2={chartWidth - CHART_PADDING}
            y2={CHART_HEIGHT / 2}
            stroke={colors.backgroundSelected}
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <SvgLine
            x1={CHART_PADDING}
            y1={CHART_HEIGHT - CHART_PADDING}
            x2={chartWidth - CHART_PADDING}
            y2={CHART_HEIGHT - CHART_PADDING}
            stroke={colors.backgroundSelected}
            strokeWidth="1.5"
          />

          {/* Axis Labels */}
          <SvgText x={5} y={CHART_PADDING + 4} fontSize="9" fill={colors.textSecondary}>100</SvgText>
          <SvgText x={5} y={CHART_HEIGHT / 2 + 4} fontSize="9" fill={colors.textSecondary}>50</SvgText>
          <SvgText x={5} y={CHART_HEIGHT - CHART_PADDING + 4} fontSize="9" fill={colors.textSecondary}>0</SvgText>

          {/* Line & Gradient Area */}
          <Path d={fillD} fill="url(#chartGrad)" />
          <Path d={pathD} fill="transparent" stroke="#208AEF" strokeWidth="2.5" />

          {/* Scatter points for latest elements */}
          {data.slice(-7).map((item, idx) => {
            const index = data.length - 7 + idx;
            if (index < 0) return null;
            const { x, y } = getCoords(index, item.score);
            return (
              <Circle
                key={index}
                cx={x}
                cy={y}
                r="3.5"
                fill="#208AEF"
                stroke={colors.background}
                strokeWidth="1.5"
              />
            );
          })}
        </Svg>
        <View style={styles.chartXLabels}>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>30 Days Ago</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>Today</ThemedText>
        </View>
      </View>
    );
  };

  // Draw Screen vs Stress Correlation Scatter Plot
  const renderCorrelationChart = () => {
    if (!analytics || !analytics.screenVsStress || analytics.screenVsStress.length === 0) {
      return (
        <View style={styles.emptyChart}>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>No stats recorded yet.</ThemedText>
        </View>
      );
    }

    const data = analytics.screenVsStress;
    const chartWidth = width - Spacing.four * 2;
    const drawableWidth = chartWidth - 2 * CHART_PADDING;
    const drawableHeight = CHART_HEIGHT - 2 * CHART_PADDING;

    const getX = (screenTime: number) => {
      const val = Math.min(screenTime, 16);
      return CHART_PADDING + (val / 16) * drawableWidth;
    };

    const getY = (stress: number) => {
      const val = Math.min(stress, 10);
      return CHART_HEIGHT - CHART_PADDING - (val / 10) * drawableHeight;
    };

    return (
      <View style={styles.chartWrapper}>
        <Svg width={chartWidth} height={CHART_HEIGHT}>
          {/* Y Axis grid */}
          <SvgLine
            x1={CHART_PADDING}
            y1={CHART_PADDING}
            x2={chartWidth - CHART_PADDING}
            y2={CHART_PADDING}
            stroke={colors.backgroundSelected}
            strokeWidth="0.5"
          />
          <SvgLine
            x1={CHART_PADDING}
            y1={CHART_HEIGHT - CHART_PADDING}
            x2={chartWidth - CHART_PADDING}
            y2={CHART_HEIGHT - CHART_PADDING}
            stroke={colors.backgroundSelected}
            strokeWidth="1.5"
          />

          {/* X Axis grid */}
          <SvgLine
            x1={CHART_PADDING}
            y1={CHART_PADDING}
            x2={CHART_PADDING}
            y2={CHART_HEIGHT - CHART_PADDING}
            stroke={colors.backgroundSelected}
            strokeWidth="1.5"
          />
          <SvgLine
            x1={chartWidth - CHART_PADDING}
            y1={CHART_PADDING}
            x2={chartWidth - CHART_PADDING}
            y2={CHART_HEIGHT - CHART_PADDING}
            stroke={colors.backgroundSelected}
            strokeWidth="0.5"
          />

          {/* Grid Labels */}
          <SvgText x={5} y={CHART_PADDING + 4} fontSize="8" fill={colors.textSecondary}>10 (High)</SvgText>
          <SvgText x={5} y={CHART_HEIGHT - CHART_PADDING + 4} fontSize="8" fill={colors.textSecondary}>0 (Low)</SvgText>

          {/* Scatter dots */}
          {data.map((item, index) => {
            const cx = getX(item.screenTime);
            const cy = getY(item.stress);
            // Stress color encoding
            const dotColor = item.stress >= 7 ? '#EF4444' : item.stress >= 4 ? '#F59E0B' : '#10B981';
            return (
              <Circle
                key={index}
                cx={cx}
                cy={cy}
                r="4.5"
                fill={dotColor}
                opacity="0.8"
              />
            );
          })}
        </Svg>
        <View style={styles.chartXLabels}>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>0h Screen Time</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>16h+ Screen Time</ThemedText>
        </View>
      </View>
    );
  };

  const renderSleepBar = (label: string, count: number, total: number, color: string) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
      <View style={styles.sleepBarRow} key={label}>
        <View style={styles.sleepBarLabel}>
          <ThemedText type="smallBold">{label}</ThemedText>
        </View>
        <View style={[styles.sleepBarTrack, { backgroundColor: colors.backgroundSelected }]}>
          <View style={[styles.sleepBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
        </View>
        <ThemedText type="small" style={[styles.sleepBarCount, { color: colors.textSecondary }]}>
          {count}d
        </ThemedText>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Toggle navigation tab */}
        <View style={[styles.tabsHeader, { borderBottomColor: colors.backgroundSelected }]}>
          <TouchableOpacity
            style={[styles.tabTrigger, activeTab === 'trends' && styles.tabTriggerActive]}
            onPress={() => setActiveTab('trends')}
          >
            <ThemedText type={activeTab === 'trends' ? 'smallBold' : 'small'} style={activeTab === 'trends' ? { color: '#208AEF' } : {}}>
              Behavior Trends
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabTrigger, activeTab === 'report' && styles.tabTriggerActive]}
            onPress={() => setActiveTab('report')}
          >
            <ThemedText type={activeTab === 'report' ? 'smallBold' : 'small'} style={activeTab === 'report' ? { color: '#208AEF' } : {}}>
              Health Report
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#208AEF" />
          }
        >
          {activeTab === 'trends' && analytics && (
            <View>
              {/* Score Cards Grid */}
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundElement }]}>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>Avg Well-being</ThemedText>
                  <ThemedText style={[styles.statValue, { color: '#208AEF' }]}>
                    {analytics.avgWeeklyScore}
                  </ThemedText>
                </View>

                <View style={[styles.statCard, { backgroundColor: colors.backgroundElement }]}>
                  <View style={styles.row}>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>Best Day</ThemedText>
                  </View>
                  <ThemedText style={[styles.statValue, { color: '#10B981' }]}>
                    {analytics.bestDay?.score || 0}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary, fontSize: 10 }}>
                    {analytics.bestDay?.day || 'N/A'}
                  </ThemedText>
                </View>

                <View style={[styles.statCard, { backgroundColor: colors.backgroundElement }]}>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>Mood Consistency</ThemedText>
                  <ThemedText style={[styles.statValue, { color: '#8B5CF6' }]}>
                    {analytics.moodConsistency}%
                  </ThemedText>
                </View>
              </View>

              {/* 30 Day Trend */}
              <View style={styles.section}>
                <ThemedText type="smallBold" style={styles.sectionTitle}>
                  30 DAY WELL-BEING TREND
                </ThemedText>
                <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                  {renderTrendChart()}
                </View>
              </View>

              {/* Correlation Grid */}
              <View style={styles.section}>
                <ThemedText type="smallBold" style={styles.sectionTitle}>
                  SCREEN TIME VS STRESS INDEX
                </ThemedText>
                <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                  {renderCorrelationChart()}
                </View>
              </View>

              {/* Sleep Distribution */}
              <View style={styles.section}>
                <ThemedText type="smallBold" style={styles.sectionTitle}>
                  SLEEP QUALITY DISTRIBUTION
                </ThemedText>
                <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                  {(() => {
                    const dist = analytics.sleepDistribution;
                    const totalDays = dist.poor + dist.fair + dist.good + dist.excellent;
                    return (
                      <View style={{ gap: Spacing.two }}>
                        {renderSleepBar('Poor (< 6h)', dist.poor, totalDays, '#EF4444')}
                        {renderSleepBar('Fair (6h - 7h)', dist.fair, totalDays, '#F59E0B')}
                        {renderSleepBar('Good (7h - 8h)', dist.good, totalDays, '#208AEF')}
                        {renderSleepBar('Excellent (> 8h)', dist.excellent, totalDays, '#10B981')}
                      </View>
                    );
                  })()}
                </View>
              </View>

              {/* Weekly Timeline Overview */}
              <View style={styles.section}>
                <ThemedText type="smallBold" style={styles.sectionTitle}>
                  WEEKLY MENTAL HEALTH LOAD
                </ThemedText>
                <View style={[styles.card, { backgroundColor: colors.backgroundElement, paddingVertical: 8 }]}>
                  {analytics.timeline.map((w, index) => (
                    <View
                      key={w.week}
                      style={[
                        styles.timelineRow,
                        index < analytics.timeline.length - 1 && { borderBottomColor: colors.backgroundSelected },
                      ]}
                    >
                      <ThemedText type="smallBold">{w.week}</ThemedText>
                      <View style={styles.row}>
                        <ThemedText type="small" style={{ color: colors.textSecondary, marginRight: 10 }}>
                          Avg: {w.avgScore}
                        </ThemedText>
                        <View
                          style={[
                            styles.riskBadge,
                            {
                              backgroundColor:
                                w.risk === 'HIGH'
                                  ? '#FEE2E2'
                                  : w.risk === 'MODERATE'
                                  ? '#FEF3C7'
                                  : '#D1FAE5',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.riskText,
                              {
                                color:
                                  w.risk === 'HIGH'
                                    ? '#EF4444'
                                    : w.risk === 'MODERATE'
                                    ? '#D97706'
                                    : '#10B981',
                              },
                            ]}
                          >
                            {w.risk} RISK
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {activeTab === 'report' && report && (
            <View>
              {/* Main Report Card */}
              <View style={[styles.card, { backgroundColor: colors.backgroundElement, gap: Spacing.three }]}>
                <View style={styles.reportHeader}>
                  <ThemedText type="subtitle" style={{ fontSize: 18 }}>Mental Health Summary</ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>{report.date}</ThemedText>
                </View>

                <View style={styles.divider} />

                <View style={styles.reportField}>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>Patient Address / ID</ThemedText>
                  <ThemedText type="smallBold">{report.username}</ThemedText>
                </View>

                <View style={styles.reportRow}>
                  <View style={styles.reportHalfField}>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>Primary Mood</ThemedText>
                    <ThemedText type="smallBold" style={{ textTransform: 'capitalize' }}>
                      {report.mood}
                    </ThemedText>
                  </View>
                  <View style={styles.reportHalfField}>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>Stress Index</ThemedText>
                    <ThemedText
                      type="smallBold"
                      style={{ color: report.stressLevel > 7 ? '#EF4444' : colors.text }}
                    >
                      {report.stressLevel} / 10
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.reportRow}>
                  <View style={styles.reportHalfField}>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>Avg Sleep</ThemedText>
                    <ThemedText type="smallBold">{report.sleepHours} hrs</ThemedText>
                  </View>
                  <View style={styles.reportHalfField}>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>Daily Screen Time</ThemedText>
                    <ThemedText type="smallBold">{report.screenTime} hrs</ThemedText>
                  </View>
                </View>
              </View>

              {/* AI Clinical Conclusion */}
              <View style={styles.section}>
                <ThemedText type="smallBold" style={styles.sectionTitle}>
                  AI CLINICAL INTERPRETATION
                </ThemedText>
                <View
                  style={[
                    styles.conclusionCard,
                    {
                      backgroundColor: scheme === 'dark' ? '#1E222B' : '#EFF6FF',
                      borderColor: '#3B82F6',
                    },
                  ]}
                >
                  <ThemedText style={{ fontSize: 24 }}>🧠</ThemedText>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold">Clinical Findings</ThemedText>
                    <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: 4 }}>
                      {report.conclusion}
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Action Button */}
              <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadReport}>
                <ThemedText style={styles.downloadText}>⬇ Download PDF Report</ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
      <CustomTabBar activeTab="analytics" />
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
  tabsHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabTrigger: {
    flex: 1,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabTriggerActive: {
    borderBottomColor: '#208AEF',
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  statCard: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: Spacing.two,
  },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
  },
  emptyChart: {
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartWrapper: {
    alignItems: 'center',
  },
  chartXLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: CHART_PADDING,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sleepBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  sleepBarLabel: {
    width: 90,
  },
  sleepBarTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  sleepBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  sleepBarCount: {
    width: 30,
    textAlign: 'right',
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: 'transparent',
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  riskText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    opacity: 0.2,
  },
  reportField: {
    gap: 4,
  },
  reportRow: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  reportHalfField: {
    flex: 1,
    gap: 4,
  },
  conclusionCard: {
    flexDirection: 'row',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.two,
    alignItems: 'center',
  },
  downloadButton: {
    backgroundColor: '#208AEF',
    height: 52,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.three,
  },
  downloadText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
