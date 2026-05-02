import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { migrateDbIfNeeded } from '@/src/lib/database';
import { AppProvider } from '@/src/providers/app-provider';

function LaunchWrapper({ children }: { children: React.ReactNode }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
  }, [opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    flex: 1,
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SQLiteProvider databaseName="stillnote.db" onInit={migrateDbIfNeeded}>
        <AppProvider>
          <BottomSheetModalProvider>
            <LaunchWrapper>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="editor/[noteId]" options={{ animation: 'slide_from_right', gestureEnabled: true, fullScreenGestureEnabled: true }} />
              </Stack>
              <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            </LaunchWrapper>
          </BottomSheetModalProvider>
        </AppProvider>
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}
