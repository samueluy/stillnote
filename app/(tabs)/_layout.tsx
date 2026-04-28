import { Tabs } from 'expo-router';
import React from 'react';

import { StillnoteTabBar } from '@/src/components/stillnote-tabs';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <StillnoteTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Workspace',
        }}
      />
      <Tabs.Screen
        name="bible"
        options={{
          title: 'Bible',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
        }}
      />
    </Tabs>
  );
}
