import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { TextLink, palette } from '@/src/components/primitives';

type Props = {
  initialValue?: string;
  onDismiss?: () => void;
  onSubmit: (value: string) => Promise<void> | void;
  placeholder: string;
  submitLabel?: string;
  title: string;
};

export const TextEntrySheet = forwardRef<BottomSheetModal, Props>(function TextEntrySheet(
  {
    initialValue = '',
    onDismiss,
    onSubmit,
    placeholder,
    submitLabel = 'Save',
    title,
  },
  ref
) {
  const inputRef = useRef<TextInput>(null);
  const snapPoints = useMemo(() => ['34%'], []);
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue, title]);

  return (
    <BottomSheetModal
      enableDynamicSizing={false}
      onChange={(index) => {
        if (index >= 0) {
          setTimeout(() => {
            inputRef.current?.focus();
          }, 80);
        }
      }}
      onDismiss={onDismiss}
      ref={ref}
      backgroundStyle={styles.background}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.12} />
      )}
      handleIndicatorStyle={styles.handle}
      snapPoints={snapPoints}>
      <BottomSheetView style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <TextInput
          autoCapitalize="sentences"
          autoCorrect={false}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor={palette.textMuted}
          ref={inputRef}
          returnKeyType="done"
          style={styles.input}
          value={value}
          onSubmitEditing={async () => {
            const trimmed = value.trim();
            if (!trimmed) {
              return;
            }
            await onSubmit(trimmed);
          }}
        />
        <View style={styles.actions}>
          <TextLink hapticIntent="selection" label="Cancel" onPress={() => {
            if (ref && typeof ref !== 'function') {
              ref.current?.dismiss();
            }
          }} />
          <TextLink
            disabled={!value.trim()}
            hapticIntent="selection"
            label={submitLabel}
            onPress={async () => {
              const trimmed = value.trim();
              if (!trimmed) {
                return;
              }
              await onSubmit(trimmed);
            }}
          />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  background: {
    backgroundColor: palette.background,
    borderTopColor: palette.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  handle: {
    backgroundColor: palette.textMuted,
    height: 4,
    width: 36,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: {
    color: palette.text,
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 14,
    marginBottom: 16,
  },
  input: {
    borderBottomColor: palette.borderStrong,
    borderBottomWidth: StyleSheet.hairlineWidth,
    color: palette.text,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 13,
    paddingBottom: 10,
    paddingTop: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 18,
  },
});
