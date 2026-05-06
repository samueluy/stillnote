import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';
type BiblePrefs = {
  activeTranslationCode: string;
  lastBibleReference: string;
};

type AppContextValue = {
  activeSpaceId: string;
  setActiveSpaceId: (value: string) => void;
  refreshToken: number;
  bumpRefreshToken: () => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  activeTranslationCode: string;
  setActiveTranslationCode: (code: string) => void;
  lastBibleReference: string;
  setLastBibleReference: (reference: string) => void;
};

const AppContext = createContext<AppContextValue | null>(null);
const THEME_KEY = 'stillnote.theme.mode';
const BIBLE_PREFS_KEY = 'stillnote.bible.prefs';
const ACTIVE_SPACE_KEY = 'stillnote.active-space';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeSpaceId, setActiveSpaceId] = useState('space-personal');
  const [refreshToken, setRefreshToken] = useState(0);
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [activeTranslationCode, setActiveTranslationCodeState] = useState('KJV');
  const [lastBibleReference, setLastBibleReferenceState] = useState('John 1:1');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark') {
        setThemeModeState(stored);
      }
    });

    AsyncStorage.getItem(ACTIVE_SPACE_KEY).then((stored) => {
      if (stored) {
        setActiveSpaceId(stored);
      }
    });

    AsyncStorage.getItem(BIBLE_PREFS_KEY).then((stored) => {
      if (!stored) {
        return;
      }

      try {
        const parsed = JSON.parse(stored) as Partial<BiblePrefs>;
        if (parsed.activeTranslationCode) {
          setActiveTranslationCodeState(parsed.activeTranslationCode);
        }
        if (parsed.lastBibleReference) {
          setLastBibleReferenceState(parsed.lastBibleReference);
        }
      } catch {
        // Ignore invalid stored preferences and use defaults.
      }
    });
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_KEY, mode);
  };

  const persistActiveSpace = useCallback((spaceId: string) => {
    AsyncStorage.setItem(ACTIVE_SPACE_KEY, spaceId);
  }, []);

  const persistBiblePrefs = useCallback((next: Partial<BiblePrefs>) => {
    const payload: BiblePrefs = {
      activeTranslationCode: next.activeTranslationCode ?? activeTranslationCode,
      lastBibleReference: next.lastBibleReference ?? lastBibleReference,
    };
    AsyncStorage.setItem(BIBLE_PREFS_KEY, JSON.stringify(payload));
  }, [activeTranslationCode, lastBibleReference]);

  const setActiveTranslationCode = useCallback((code: string) => {
    setActiveTranslationCodeState(code);
    persistBiblePrefs({ activeTranslationCode: code });
  }, [persistBiblePrefs]);

  const setLastBibleReference = useCallback((reference: string) => {
    setLastBibleReferenceState(reference);
    persistBiblePrefs({ lastBibleReference: reference });
  }, [persistBiblePrefs]);

  const handleSetActiveSpaceId = useCallback((value: string) => {
    setActiveSpaceId(value);
    persistActiveSpace(value);
  }, [persistActiveSpace]);

  const value = useMemo<AppContextValue>(
    () => ({
      activeSpaceId,
      setActiveSpaceId: handleSetActiveSpaceId,
      refreshToken,
      bumpRefreshToken: () => setRefreshToken((current) => current + 1),
      themeMode,
      setThemeMode,
      activeTranslationCode,
      setActiveTranslationCode,
      lastBibleReference,
      setLastBibleReference,
    }),
    [
      activeSpaceId,
      handleSetActiveSpaceId,
      refreshToken,
      themeMode,
      activeTranslationCode,
      lastBibleReference,
      setActiveTranslationCode,
      setLastBibleReference,
    ]
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
