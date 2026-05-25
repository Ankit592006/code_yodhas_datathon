import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { trackerApi } from '@/services/api';

const QUICK_OPTIONS = [
  { label: '< 2k', value: 1500, emoji: '🐢' },
  { label: '2–4k', value: 3000, emoji: '🚶' },
  { label: '5–7k', value: 6000, emoji: '🏃' },
  { label: '8–10k', value: 9000, emoji: '⚡' },
  { label: '10k+', value: 11000, emoji: '🔥' },
];

export default function StepsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  const [loading, setLoading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [exactSteps, setExactSteps] = useState('');

  // Resolve final step count: exact input takes priority over preset
  const finalSteps = exactSteps.trim()
    ? parseInt(exactSteps.replace(/[^0-9]/g, ''), 10) || 0
    : selectedPreset ?? 0;

  const isReady = finalSteps > 0;

  const handleSubmit = async () => {
    if (!isReady) {
      Alert.alert('No Steps Selected', 'Please pick a range or type an exact step count first.');
      return;
    }
    setLoading(true);
    try {
      const result = await trackerApi.submitDailyTracker({ stepCount: finalSteps });
      Alert.alert(
        'Steps Logged ✅',
        `Successfully logged ${finalSteps.toLocaleString()} steps!\nPredicted Stress: ${result.output?.stress_score ?? 'N/A'}/10.`,
        [
          {
            text: 'Return Home',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      console.error(err);
      Alert.alert(
        'Submission Failed',
        err.response?.data?.error || 'Could not save steps. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.one }}>
              <ThemedText type="subtitle" style={styles.title}>Movement Log 🏃</ThemedText>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ThemedText style={{ color: colors.textSecondary, fontWeight: 'bold' }}>✕ Close</ThemedText>
              </TouchableOpacity>
            </View>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              How much did you move today? Pick a range or type the exact count.
            </ThemedText>
          </View>

          {/* Quick-select presets */}
          <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            STEP RANGE
          </ThemedText>
          <View style={styles.presetsGrid}>
            {QUICK_OPTIONS.map((opt) => {
              const isSelected = selectedPreset === opt.value && !exactSteps.trim();
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.presetCard,
                    {
                      backgroundColor: isSelected ? '#10B981' : colors.backgroundElement,
                      borderColor: isSelected ? '#10B981' : 'transparent',
                    },
                  ]}
                  onPress={() => {
                    setSelectedPreset(opt.value);
                    setExactSteps('');
                  }}
                >
                  <ThemedText style={styles.presetEmoji}>{opt.emoji}</ThemedText>
                  <ThemedText
                    style={[
                      styles.presetLabel,
                      { color: isSelected ? '#ffffff' : colors.text },
                    ]}
                  >
                    {opt.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Exact count input */}
          <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: Spacing.four }]}>
            OR ENTER EXACT COUNT
          </ThemedText>
          <View style={[styles.exactInputWrapper, { backgroundColor: colors.backgroundElement }]}>
            <TextInput
              style={[styles.exactInput, { color: colors.text }]}
              placeholder="e.g. 7432"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={exactSteps}
              onChangeText={(val) => {
                setExactSteps(val.replace(/[^0-9]/g, ''));
                if (val) setSelectedPreset(null);
              }}
              returnKeyType="done"
            />
            {exactSteps.length > 0 && (
              <TouchableOpacity onPress={() => setExactSteps('')} style={styles.clearBtn}>
                <ThemedText style={{ color: colors.textSecondary, fontSize: 18 }}>✕</ThemedText>
              </TouchableOpacity>
            )}
          </View>

          {/* Summary */}
          {isReady && (
            <View style={[styles.summaryCard, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>LOGGING</ThemedText>
              <ThemedText style={styles.summarySteps}>{finalSteps.toLocaleString()}</ThemedText>
              <ThemedText style={{ color: colors.textSecondary, fontSize: 13 }}>steps today</ThemedText>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: loading || !isReady ? colors.backgroundSelected : '#10B981' }]}
            onPress={handleSubmit}
            disabled={loading || !isReady}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText style={styles.submitText}>Save Steps ✦</ThemedText>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six ?? 40,
  },
  header: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: Spacing.one,
  },
  backButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: Spacing.two,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  presetCard: {
    flexBasis: '18%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 2,
    gap: 4,
  },
  presetEmoji: {
    fontSize: 22,
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  exactInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    height: 52,
  },
  exactInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  clearBtn: {
    padding: 4,
  },
  summaryCard: {
    marginTop: Spacing.four,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    alignItems: 'center',
  },
  summarySteps: {
    fontSize: 36,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  submitButton: {
    marginTop: Spacing.four,
    height: 52,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
