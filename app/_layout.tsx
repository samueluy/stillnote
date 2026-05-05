import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { View, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  RobotoMono_400Regular,
  RobotoMono_500Medium,
} from '@expo-google-fonts/roboto-mono';

import { migrateDbIfNeeded } from '@/src/lib/database';
import { AppProvider } from '@/src/providers/app-provider';
import { theme } from '@/src/theme/theme';

export default function RootLayout() {
  const c = theme.light;

  const [fontsLoaded] = useFonts({
    RobotoMono_400Regular,
    RobotoMono_500Medium,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: c.textTertiary, fontSize: 14, fontFamily: 'RobotoMono_400Regular' }}>
          Loading fonts…
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.bg }}>
      <SQLiteProvider databaseName="stillnote.db" onInit={migrateDbIfNeeded}>
        <AppProvider>
          <BottomSheetModalProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="editor/[noteId]"
                options={{ animation: 'slide_from_right', gestureEnabled: true, fullScreenGestureEnabled: true }}
              />
            </Stack>
            <StatusBar style="dark" />
          </BottomSheetModalProvider>
        </AppProvider>
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}
