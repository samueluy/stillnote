import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

type AppContextValue = {
  activeSpaceId: string;
  setActiveSpaceId: (value: string) => void;
  refreshToken: number;
  bumpRefreshToken: () => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

const AppContext = createContext<AppContextValue | null>(null);
const THEME_KEY = 'stillnote.theme.mode';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeSpaceId, setActiveSpaceId] = useState('space-personal');
  const [refreshToken, setRefreshToken] = useState(0);
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark') {
        setThemeModeState(stored);
      }
    });
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_KEY, mode);
  };

  const value = useMemo<AppContextValue>(
    () => ({
      activeSpaceId,
      setActiveSpaceId,
      refreshToken,
      bumpRefreshToken: () => setRefreshToken((current) => current + 1),
      themeMode,
      setThemeMode,
    }),
    [activeSpaceId, refreshToken, themeMode]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppContext);
  if (!value) {
    throw new Error('useAppState must be used inside AppProvider');
  }
  return value;
}
