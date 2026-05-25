import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Dimensions,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { dashboardApi, trackerApi, profileApi } from '@/services/api';
import { nativeModule } from '@/services/nativeModule';
import { weatherService } from '@/services/weather';
import { useAuth } from '@/context/AuthContext';
import LoginScreen from './login';
import SignupScreen from './signup';
import CustomTabBar from '@/components/custom-tab-bar';

const { width } = Dimensions.get('window');

const MOOD_EMOJIS: Record<string, string> = {
  happy: '😊',
  excited: '🤩',
  neutral: '😐',
  celebrating: '🎉',
  stressed: '🧘',
  sad: '😢',
  anxious: '😰',
};

interface DashboardData {
  score: number;
  stats: {
    sleepHours: number;
    steps: number;
    screenTime: number;
    mood: string;
    stress: number;
  };
  streak: number;
  insights: Array<{ title: string; message: string }>;
  emergencyContact?: string;
}

export default function DashboardScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { username, token, isLoading, logout } = useAuth();
  
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);

  const loggedMood = data?.stats?.mood?.toLowerCase() || '';
  const moodEmoji = loggedMood ? (MOOD_EMOJIS[loggedMood] || '😐') : '📝';
  const moodLabel = loggedMood ? `Logged: ${data?.stats?.mood}` : 'Log your mood';
  const [envData, setEnvData] = useState<{ temp: number; aqi: number; humidity: number; locationName: string } | null>(null);
  const [syncLog, setSyncLog] = useState<string>('Idle');
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactNumber, setContactNumber] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const response = await dashboardApi.getDashboard();
      setData(response);
      if (response.emergencyContact) {
        setContactNumber(response.emergencyContact);
      }
    } catch (err: any) {
      console.error('Failed to load dashboard', err);
      if (err?.response?.status === 401) {
        logout();
      }
    }
  };

  const handleSaveContact = async () => {
    if (!contactNumber.trim()) {
      Alert.alert('Invalid Number', 'Please enter a valid phone number.');
      return;
    }
    setSavingContact(true);
    try {
      await profileApi.updateEmergencyContact(contactNumber.trim());
      Alert.alert('Contact Saved', 'Your emergency contact has been configured.');
      setShowContactModal(false);
      await fetchDashboardData();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to save emergency contact. Please try again.');
    } finally {
      setSavingContact(false);
    }
  };

  const syncPassiveSensors = async () => {
    if (!token) return;
    setSyncing(true);
    setSyncLog('Accessing sensors...');
    try {
      // 1. Get screen time from Kotlin native module (steps are now manual-only)
      const screenTime = await nativeModule.getScreenTime();

      // 2. Get local weather and AQI
      setSyncLog('Fetching environmental data...');
      const weather = await weatherService.getEnvironmentalData();
      setEnvData(weather);

      // 3. Post screen time to backend (steps/mood/sleep are NOT overwritten — explicit-only)
      setSyncLog('Analyzing mental load...');
      await trackerApi.submitDailyTracker({
        screenTime: parseFloat(screenTime.toFixed(1)),
        aqi: weather.aqi,
        isPassive: true,
      });

      // 4. Always re-fetch dashboard to keep wellbeing score live
      setSyncLog('Refreshed');
      await fetchDashboardData();

      // 5. Show in-app alert if screen time is high (> 6 hours)
      if (screenTime > 6) {
        Alert.alert(
          '📱 High Screen Time Detected',
          `You've had ${screenTime.toFixed(1)} hours of screen time today. This is raising your stress index. Take a break!`,
          [{ text: 'Got it', style: 'default' }]
        );
      }
    } catch (err: any) {
      console.error('Error in passive sensor sync:', err);
      setSyncLog('Sync failed');
      if (err?.response?.status === 401) {
        logout();
      }
    } finally {
      setSyncing(false);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await fetchDashboardData();
    // Fetch environmental weather
    try {
      const weather = await weatherService.getEnvironmentalData();
      setEnvData(weather);
    } catch (e) {
      console.warn(e);
    }
    setLoading(false);
    // Trigger background sync silently
    syncPassiveSensors();
  };

  useEffect(() => {
    const checkAndRequestPermission = async () => {
      try {
        const hasPermission = await nativeModule.checkUsageStatsPermission();
        if (!hasPermission) {
          Alert.alert(
            'Usage Access Required',
            'MindBuddy needs Usage Access permission to track your screen time. Please find MindBuddy in the settings and enable it.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Enable Settings', onPress: () => nativeModule.requestUsageStatsPermission() }
            ]
          );
        }
      } catch (err) {
        console.error('Error checking usage stats permission:', err);
      }
    };

    if (token) {
      loadAllData();
      checkAndRequestPermission();
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;

      // Initial load on focus
      fetchDashboardData();
      syncPassiveSensors();

      // Poll dashboard data every 5 seconds for real-time updates (from chat crisis/mood/sleep logs)
      const dataInterval = setInterval(() => {
        fetchDashboardData();
      }, 5000);

      // Poll screen time & environmental sync every 30 seconds
      const sensorInterval = setInterval(() => {
        syncPassiveSensors();
      }, 30000);

      return () => {
        clearInterval(dataInterval);
        clearInterval(sensorInterval);
      };
    }, [token])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    await syncPassiveSensors();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color="#208AEF" />
        <ThemedText style={{ marginTop: Spacing.two }}>Loading your sanctuary...</ThemedText>
      </ThemedView>
    );
  }

  if (!token) {
    if (authMode === 'login') {
      return <LoginScreen onToggle={() => setAuthMode('signup')} />;
    } else {
      return <SignupScreen onToggle={() => setAuthMode('login')} />;
    }
  }

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color="#208AEF" />
        <ThemedText style={{ marginTop: Spacing.two }}>Loading your sanctuary...</ThemedText>
      </ThemedView>
    );
  }

  // Draw SVG Score ring parameters
  const score = data?.score ?? 50;
  const radius = 70;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Determine score color
  const getScoreColor = (val: number) => {
    if (val >= 75) return '#10B981'; // Green (Stable)
    if (val >= 50) return '#F59E0B'; // Orange (Moderate)
    return '#EF4444'; // Red (Anomalous/High Stress)
  };

  const scoreColor = getScoreColor(score);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#208AEF" />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <ThemedText style={[styles.welcomeText, { color: colors.textSecondary }]}>
                Welcome back,
              </ThemedText>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Logout 👤',
                    'Are you sure you want to sign out of your mental health sanctuary?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Logout', style: 'destructive', onPress: () => logout() }
                    ]
                  );
                }}
                activeOpacity={0.7}
              >
                <ThemedText type="subtitle" style={[styles.usernameText, { textDecorationLine: 'underline' }]}>
                  {username ? username.split(' ')[0] : 'Friend'} ⚙️
                </ThemedText>
              </TouchableOpacity>
            </View>
            <View style={styles.streakBadge}>
              <ThemedText style={styles.streakText}>🔥 {data?.streak ?? 0} Day Streak</ThemedText>
            </View>
          </View>

          {/* Score Visualizer */}
          <View style={[styles.scoreCard, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.scoreChartContainer}>
              <Svg width={180} height={180} viewBox="0 0 180 180">
                <Circle
                  cx="90"
                  cy="90"
                  r={radius}
                  stroke={colors.backgroundSelected}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                <Circle
                  cx="90"
                  cy="90"
                  r={radius}
                  stroke={scoreColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  transform="rotate(-90, 90, 90)"
                />
                <SvgText
                  x="90"
                  y="85"
                  textAnchor="middle"
                  fontSize="38"
                  fontWeight="bold"
                  fill={colors.text}
                >
                  {score}
                </SvgText>
                <SvgText
                  x="90"
                  y="110"
                  textAnchor="middle"
                  fontSize="12"
                  fill={colors.textSecondary}
                >
                  WELL-BEING
                </SvgText>
              </Svg>
            </View>

            <View style={styles.syncStatus}>
              <View style={[styles.indicator, { backgroundColor: scoreColor }]} />
              <ThemedText type="smallBold">
                {score >= 75 ? 'Sanctuary Stable' : score >= 50 ? 'Mild Anomalies' : 'Action Recommended'}
              </ThemedText>
              <TouchableOpacity onPress={syncPassiveSensors} disabled={syncing}>
                <ThemedText type="small" style={styles.syncButton}>
                  {syncing ? 'Syncing...' : `Passive Sync: ${syncLog}`}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              SANCTUARY ACTIONS
            </ThemedText>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.backgroundElement }]}
                onPress={() => router.push('/checkin')}
              >
                <ThemedText style={styles.actionEmoji}>{moodEmoji}</ThemedText>
                <View style={styles.actionCardContent}>
                  <ThemedText type="smallBold">Sanctuary Log</ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: 2 }}>
                    {moodLabel}
                  </ThemedText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.backgroundElement }]}
                onPress={() => router.push('/chat' as any)}
              >
                <ThemedText style={styles.actionEmoji}>💬</ThemedText>
                <View style={styles.actionCardContent}>
                  <ThemedText type="smallBold">AI Therapist</ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: 2 }}>
                    Chat with companion
                  </ThemedText>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Emergency Contact */}
          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              EMERGENCY ALERT CONTACT
            </ThemedText>
            <View style={[styles.contactCard, { backgroundColor: colors.backgroundElement }]}>
              {!showContactModal ? (
                <View style={styles.contactHeader}>
                  <ThemedText style={{ fontSize: 22 }}>🚨</ThemedText>
                  <View style={{ flex: 1, marginLeft: Spacing.two }}>
                    <ThemedText type="smallBold">Emergency Alert Number</ThemedText>
                    <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: 2 }}>
                      {data?.emergencyContact ? `Alerting: ${data.emergencyContact}` : 'Not configured. Alert triggers on high stress.'}
                    </ThemedText>
                  </View>
                  <TouchableOpacity
                    style={[styles.editContactBtn, { backgroundColor: colors.backgroundSelected }]}
                    onPress={() => {
                      setContactNumber(data?.emergencyContact || '');
                      setShowContactModal(true);
                    }}
                  >
                    <ThemedText type="smallBold" style={{ color: '#208AEF', fontSize: 12 }}>
                      {data?.emergencyContact ? 'Edit' : 'Set Contact'}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: Spacing.two }}>
                  <ThemedText type="smallBold">Set Emergency Contact Number</ThemedText>
                  <TextInput
                    style={[styles.contactInput, { color: colors.text, borderColor: colors.backgroundSelected }]}
                    placeholder="Enter phone number (e.g. +123456789)"
                    placeholderTextColor={colors.textSecondary}
                    value={contactNumber}
                    onChangeText={setContactNumber}
                    keyboardType="phone-pad"
                  />
                  <View style={styles.contactActionsRow}>
                    <TouchableOpacity
                      style={[styles.contactActionBtn, { backgroundColor: '#208AEF' }]}
                      onPress={handleSaveContact}
                      disabled={savingContact}
                    >
                      {savingContact ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <ThemedText type="smallBold" style={{ color: '#ffffff' }}>Save</ThemedText>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.contactActionBtn, { backgroundColor: colors.backgroundSelected }]}
                      onPress={() => setShowContactModal(false)}
                      disabled={savingContact}
                    >
                      <ThemedText type="smallBold" style={{ color: colors.text }}>Cancel</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Alerts / Insights */}
          {data?.insights && data.insights.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                SUPPORTIVE INSIGHTS
              </ThemedText>
              {data.insights.map((insight, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.insightAlert,
                    {
                      backgroundColor: scheme === 'dark' ? '#1E222B' : '#EFF6FF',
                      borderColor: '#3B82F6',
                    },
                  ]}
                >
                  <ThemedText style={styles.insightIcon}>💡</ThemedText>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold" style={{ color: colors.text }}>
                      {insight.title}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: 2 }}>
                      {insight.message}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Environmental Conditions */}
          {envData && (
            <View style={styles.section}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                ENVIRONMENTAL SENSORS ({envData.locationName})
              </ThemedText>
              <View style={[styles.envRow, { backgroundColor: colors.backgroundElement }]}>
                <View style={styles.envWidget}>
                  <ThemedText style={styles.envValue}>{envData.temp.toFixed(1)}°C</ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>Temp</ThemedText>
                </View>
                <View style={styles.envDivider} />
                <View style={styles.envWidget}>
                  <ThemedText style={styles.envValue}>{envData.humidity}%</ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>Humidity</ThemedText>
                </View>
                <View style={styles.envDivider} />
                <View style={styles.envWidget}>
                  <ThemedText style={[styles.envValue, { color: envData.aqi > 100 ? '#EF4444' : '#10B981' }]}>
                    {envData.aqi}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>AQI Index</ThemedText>
                </View>
              </View>
            </View>
          )}

          {/* Stats Grid */}
          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              DAILY BEHAVIOR LOGS
            </ThemedText>
            
            <View style={styles.grid}>
              {/* Screen Time */}
              <View style={[styles.gridCard, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText style={styles.cardEmoji}>📱</ThemedText>
                <ThemedText type="smallBold" style={{ color: colors.textSecondary }}>Screen Time</ThemedText>
                <ThemedText style={styles.cardValue}>
                  {data?.stats?.screenTime?.toFixed(1) ?? '0.0'} hrs
                </ThemedText>
                <View style={styles.nativeIndicator}>
                  <View style={styles.pulseDot} />
                  <ThemedText type="small" style={{ color: '#10B981', fontSize: 10 }}>
                    Kotlin Native Stats
                  </ThemedText>
                </View>
              </View>

              {/* Step Count */}
              <TouchableOpacity
                style={[styles.gridCard, { backgroundColor: colors.backgroundElement }]}
                onPress={() => router.push('/steps')}
                activeOpacity={0.7}
              >
                <ThemedText style={styles.cardEmoji}>🏃</ThemedText>
                <ThemedText type="smallBold" style={{ color: colors.textSecondary }}>Movement</ThemedText>
                <ThemedText style={styles.cardValue}>
                  {data?.stats?.steps?.toLocaleString() ?? '0'} steps
                </ThemedText>
                <View style={styles.nativeIndicator}>
                  <View style={styles.pulseDot} />
                  <ThemedText type="small" style={{ color: '#10B981', fontSize: 10 }}>
                    Sensor Active (Tap to override)
                  </ThemedText>
                </View>
              </TouchableOpacity>

              {/* Sleep Hours */}
              <TouchableOpacity
                style={[styles.gridCard, { backgroundColor: colors.backgroundElement }]}
                onPress={() => router.push('/sleep')}
                activeOpacity={0.7}
              >
                <ThemedText style={styles.cardEmoji}>😴</ThemedText>
                <ThemedText type="smallBold" style={{ color: colors.textSecondary }}>Sleep Duration</ThemedText>
                <ThemedText style={styles.cardValue}>
                  {data?.stats?.sleepHours ?? '0'} hrs
                </ThemedText>
                <ThemedText type="small" style={{ color: '#208AEF', fontSize: 10 }}>
                  Tap to log manually
                </ThemedText>
              </TouchableOpacity>

              {/* Stress Level */}
              <View style={[styles.gridCard, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText style={styles.cardEmoji}>🧠</ThemedText>
                <ThemedText type="smallBold" style={{ color: colors.textSecondary }}>Stress Index</ThemedText>
                <ThemedText style={[styles.cardValue, { color: (data?.stats?.stress ?? 0) >= 7 ? '#EF4444' : colors.text }]}>
                  {data?.stats?.stress ?? '0'} / 10
                </ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary, fontSize: 10 }}>
                  ML Predicted
                </ThemedText>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
      <CustomTabBar activeTab="home" />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  welcomeText: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  usernameText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  streakBadge: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  streakText: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scoreCard: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    alignItems: 'center',
    marginBottom: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  scoreChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  syncButton: {
    color: '#208AEF',
    marginLeft: Spacing.one,
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: Spacing.two,
  },
  insightAlert: {
    flexDirection: 'row',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.two,
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  insightIcon: {
    fontSize: 24,
  },
  envRow: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  envWidget: {
    alignItems: 'center',
    flex: 1,
  },
  envValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  envDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  gridCard: {
    width: (width - Spacing.four * 2 - Spacing.three) / 2,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: 4,
  },
  cardEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  nativeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  actionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  actionEmoji: {
    fontSize: 24,
  },
  actionCardContent: {
    flex: 1,
  },
  contactCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    marginTop: Spacing.one,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editContactBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
  contactInput: {
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    height: 44,
    fontSize: 14,
    marginTop: Spacing.one,
  },
  contactActionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  contactActionBtn: {
    flex: 1,
    height: 40,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
