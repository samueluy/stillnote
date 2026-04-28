import { createContext, useContext, useMemo, useState } from 'react';

type AppContextValue = {
  activeSpaceId: string;
  setActiveSpaceId: (value: string) => void;
  refreshToken: number;
  bumpRefreshToken: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeSpaceId, setActiveSpaceId] = useState('space-personal');
  const [refreshToken, setRefreshToken] = useState(0);

  const value = useMemo<AppContextValue>(
    () => ({
      activeSpaceId,
      setActiveSpaceId,
      refreshToken,
      bumpRefreshToken: () => setRefreshToken((current) => current + 1),
    }),
    [activeSpaceId, refreshToken]
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
