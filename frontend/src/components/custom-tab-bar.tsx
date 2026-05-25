import React from 'react';
import { StyleSheet, View, TouchableOpacity, Image, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from './themed-text';
import { Colors, Spacing } from '@/constants/theme';

interface CustomTabBarProps {
  activeTab: 'home' | 'analytics';
}

export default function CustomTabBar({ activeTab }: CustomTabBarProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  const handleTabPress = (tabName: 'home' | 'analytics') => {
    if (tabName === activeTab) return;
    if (tabName === 'home') {
      router.replace('/');
    } else {
      router.replace('/explore' as any);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderTopColor: colors.backgroundSelected }]}>
      <TouchableOpacity
        style={styles.tabButton}
        onPress={() => handleTabPress('home')}
        activeOpacity={0.7}
      >
        <Image
          source={require('@/assets/images/tabIcons/home.png')}
          style={[
            styles.tabIcon,
            { tintColor: activeTab === 'home' ? '#208AEF' : colors.textSecondary }
          ]}
        />
        <ThemedText
          type="small"
          style={[
            styles.tabLabel,
            { color: activeTab === 'home' ? '#208AEF' : colors.textSecondary }
          ]}
        >
          Home
        </ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabButton}
        onPress={() => handleTabPress('analytics')}
        activeOpacity={0.7}
      >
        <Image
          source={require('@/assets/images/tabIcons/explore.png')}
          style={[
            styles.tabIcon,
            { tintColor: activeTab === 'analytics' ? '#208AEF' : colors.textSecondary }
          ]}
        />
        <ThemedText
          type="small"
          style={[
            styles.tabLabel,
            { color: activeTab === 'analytics' ? '#208AEF' : colors.textSecondary }
          ]}
        >
          Analytics
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 64,
    borderTopWidth: 1,
    paddingBottom: 8,
    paddingTop: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 4,
  },
  tabIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});
