import { Tabs } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { View } from 'react-native';

import { AppNavbar } from '@/components/app-navbar';
import { HapticTab } from '@/components/haptic-tab';

export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f7' }}>
      <AppNavbar />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#1e293b',
          tabBarInactiveTintColor: '#6b7280',
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            backgroundColor: '#f5f5f7',
            borderTopColor: '#d2d4dc',
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
            title: 'Search',
            tabBarIcon: ({ color }) => <MaterialIcons size={24} name="search" color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Download',
            tabBarIcon: ({ color }) => <MaterialIcons size={24} name="download" color={color} />,
          }}
        />
        <Tabs.Screen
          name="playlists"
          options={{
            title: 'Tasks',
            tabBarIcon: ({ color }) => <MaterialIcons size={24} name="task-alt" color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}
