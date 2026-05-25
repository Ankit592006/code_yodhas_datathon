import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { trackerApi } from '@/services/api';

const MOODS_LIST = [
  { value: 'happy', label: 'Happy', emoji: '😊', color: '#10B981', bg: '#D1FAE5' },
  { value: 'excited', label: 'Excited', emoji: '🤩', color: '#8B5CF6', bg: '#EDE9FE' },
  { value: 'neutral', label: 'Neutral', emoji: '😐', color: '#6B7280', bg: '#F3F4F6' },
  { value: 'celebrating', label: 'Joyful', emoji: '🎉', color: '#F59E0B', bg: '#FEF3C7' },
  { value: 'stressed', label: 'Stressed', emoji: '🧘', color: '#3B82F6', bg: '#DBEAFE' },
  { value: 'sad', label: 'Sad', emoji: '😢', color: '#6366F1', bg: '#E0E7FF' },
  { value: 'anxious', label: 'Anxious', emoji: '😰', color: '#EF4444', bg: '#FEE2E2' },
];

export default function CheckinScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  const [selectedMood, setSelectedMood] = useState<string>('neutral');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await trackerApi.submitDailyTracker({
        mood: selectedMood,
      });

      Alert.alert(
        'Check-in Complete',
        `Logged successfully! Mood: ${selectedMood}. Calculated Stress Level: ${result.output?.stress_score ?? 'N/A'}/10.`,
        [
          {
            text: 'Return Home',
            onPress: () => {
              router.back();
            },
          },
        ]
      );
    } catch (err: any) {
      console.error(err);
      Alert.alert(
        'Submission Failed',
        err.response?.data?.error || 'Could not save check-in data. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.two }}>
              <ThemedText type="subtitle" style={styles.title}>
                Sanctuary Log
              </ThemedText>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ThemedText style={{ color: colors.textSecondary, fontWeight: 'bold' }}>✕ Close</ThemedText>
              </TouchableOpacity>
            </View>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              Select your current mood state to save it in your Sanctuary.
            </ThemedText>
          </View>

          {/* Mood Section */}
          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              HOW ARE YOU FEELING RIGHT NOW?
            </ThemedText>
            <View style={styles.moodGrid}>
              {MOODS_LIST.map((mood) => {
                const isSelected = selectedMood === mood.value;
                return (
                  <TouchableOpacity
                    key={mood.value}
                    style={[
                      styles.moodCard,
                      {
                        backgroundColor: isSelected ? mood.bg : colors.backgroundElement,
                        borderColor: isSelected ? mood.color : 'transparent',
                      },
                    ]}
                    onPress={() => setSelectedMood(mood.value)}
                  >
                    <ThemedText style={styles.moodEmoji}>{mood.emoji}</ThemedText>
                    <ThemedText
                      type={isSelected ? 'smallBold' : 'small'}
                      style={{ color: isSelected ? mood.color : colors.text, marginTop: 4 }}
                    >
                      {mood.label}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: loading ? colors.backgroundSelected : '#208AEF' }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <View style={styles.submitTextRow}>
                <ThemedText style={styles.submitText}>Save Mood Entry</ThemedText>
                <ThemedText style={styles.submitArrow}>✦</ThemedText>
              </View>
            )}
          </TouchableOpacity>
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
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  moodCard: {
    flexGrow: 1,
    width: '30%',
    aspectRatio: 1.1,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    padding: Spacing.two,
  },
  moodEmoji: {
    fontSize: 28,
  },
  submitButton: {
    height: 52,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.three,
    shadowColor: '#208AEF',
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
});
