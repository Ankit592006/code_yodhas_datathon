import { NativeModules, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { MindBuddyModule } = NativeModules;

export const isNative = Platform.OS === 'android' && !!MindBuddyModule;

if (!isNative) {
  console.warn(
    'MindBuddyModule is not available. Using simulated mock sensors (Expo Go / Web Mode).'
  );
}

export const nativeModule = {
  isSimulated: !isNative,

  checkUsageStatsPermission: async (): Promise<boolean> => {
    if (isNative) {
      return await MindBuddyModule.checkUsageStatsPermission();
    }
    // Simulate that it's allowed on Expo Go to let users experience the app
    const status = await AsyncStorage.getItem('simulated_usage_stats_permission');
    return status === 'granted';
  },

  requestUsageStatsPermission: async (): Promise<void> => {
    if (isNative) {
      MindBuddyModule.requestUsageStatsPermission();
    } else {
      await AsyncStorage.setItem('simulated_usage_stats_permission', 'granted');
      Alert.alert(
        'Simulated Permission',
        'Directing to Usage Access Settings is simulated in Expo Go. Permission has been mocked as GRANTED.',
        [{ text: 'OK' }]
      );
    }
  },

  getScreenTime: async (): Promise<number> => {
    if (isNative) {
      return await MindBuddyModule.getScreenTime();
    }
    // Return simulated screen time in hours
    const stored = await AsyncStorage.getItem('simulated_screen_time');
    if (stored) return parseFloat(stored);
    
    // Default simulated screen time: 4.8 hours
    return 4.8;
  },

  getStepCount: async (): Promise<number> => {
    return 0;
  },

  resetStepCount: async (): Promise<boolean> => {
    return true;
  },
  
  // Custom helpers to update mocks for testing in Expo Go
  setSimulatedData: async (steps: number, screenTime: number) => {
    await AsyncStorage.setItem('simulated_screen_time', screenTime.toString());
  }
};
