import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PlainListSheet } from '@/src/components/plain-list-sheet';
import { TextLink, palette } from '@/src/components/primitives';
import type { Space } from '@/src/types/domain';

export function SpaceSwitcher({
  activeSpaceId,
  onChange,
  spaces,
}: {
  activeSpaceId: string;
  onChange: (spaceId: string) => void;
  spaces: Space[];
}) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const activeSpace = spaces.find((space) => space.id === activeSpaceId) ?? spaces[0] ?? null;

  const items = useMemo(
    () =>
      spaces.map((space) => ({
        key: space.id,
        label: space.name,
        description: space.description,
        onPress: () => {
          sheetRef.current?.dismiss();
          if (space.id !== activeSpaceId) {
            onChange(space.id);
          }
        },
      })),
    [activeSpaceId, onChange, spaces]
  );

  if (!activeSpace) {
    return null;
  }

  return (
    <>
      <View style={styles.row}>
        <Text style={styles.label}>Space</Text>
        <TextLink
          hapticIntent="selection"
          label={activeSpace.name}
          onPress={() => sheetRef.current?.present()}
        />
      </View>
      <PlainListSheet items={items} ref={sheetRef} title="Choose a space" />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderBottomColor: palette.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  label: {
    color: palette.textMuted,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 11,
  },
});
