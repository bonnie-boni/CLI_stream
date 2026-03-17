import { Tabs } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { WireframeTheme } from '@/constants/wireframe-theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: WireframeTheme.textPrimary,
        tabBarInactiveTintColor: WireframeTheme.textSecondary,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#0a1f3e',
          borderTopColor: WireframeTheme.border,
          height: 66,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tracks',
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="library-music" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Player',
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="album" color={color} />,
        }}
      />
      <Tabs.Screen
        name="playlists"
        options={{
          title: 'Playlists',
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="queue-music" color={color} />,
        }}
      />
    </Tabs>
  );
}
