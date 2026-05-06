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
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="threads" options={{ title: 'Folders' }} />
      <Tabs.Screen name="bible" options={{ title: 'Bible' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
