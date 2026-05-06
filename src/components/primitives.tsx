import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { forwardRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { HapticIntent } from '@/src/lib/haptics';
import { triggerHaptic } from '@/src/lib/haptics';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export const palette = {
  background: '#F8F4EE',
  surface: '#FFFFFF',
  text: '#131313',
  textSecondary: 'rgba(19,19,19,0.6)',
  textMuted: 'rgba(19,19,19,0.37)',
  border: 'rgba(19,19,19,0.12)',
  borderStrong: 'rgba(19,19,19,0.2)',
  accent: '#131313',
  scrim: 'rgba(19,19,19,0.18)',
};

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {children}
    </SafeAreaView>
  );
}

export const PageScroll = forwardRef<ScrollView, { children: ReactNode }>(function PageScroll(
  { children },
  ref
) {
  return (
    <ScrollView
      ref={ref}
      contentContainerStyle={styles.pageContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
});

export function TopBar({
  title,
  leftIcon,
  rightIcon,
  onLeftPress,
  onRightPress,
}: {
  title: string;
  leftIcon?: IoniconName;
  rightIcon?: IoniconName;
  onLeftPress?: () => void;
  onRightPress?: () => void;
}) {
  return (
    <View style={styles.topBar}>
      {leftIcon ? (
        <IconButton icon={leftIcon} onPress={onLeftPress} />
      ) : (
        <View style={styles.iconButtonSpacer} />
      )}
      <Text style={styles.topBarTitle}>{title}</Text>
      {rightIcon ? (
        <IconButton icon={rightIcon} onPress={onRightPress} />
      ) : (
        <View style={styles.iconButtonSpacer} />
      )}
    </View>
  );
}

export function IconButton({
  icon,
  onPress,
  active = false,
  disabled = false,
  hapticIntent = 'selection',
}: {
  icon: IoniconName;
  onPress?: () => void;
  active?: boolean;
  disabled?: boolean;
  hapticIntent?: HapticIntent;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        if (!disabled && onPress) {
          void triggerHaptic(hapticIntent);
          onPress();
        }
      }}
      style={({ pressed }) => [styles.iconButton, disabled && styles.disabled, pressed && styles.pressed]}>
      <Ionicons color={palette.text} name={icon} size={active ? 20 : 18} />
    </Pressable>
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.searchField}>
      <Ionicons color={palette.textMuted} name="search-outline" size={16} />
      <TextInput
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        style={styles.searchInput}
        value={value}
      />
    </View>
  );
}

export function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function TextLink({
  label,
  onPress,
  bordered = false,
  disabled = false,
  hapticIntent,
}: {
  label: string;
  onPress?: () => void;
  bordered?: boolean;
  disabled?: boolean;
  hapticIntent?: HapticIntent;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        if (!disabled && onPress) {
          if (hapticIntent) {
            void triggerHaptic(hapticIntent);
          }
          onPress();
        }
      }}
      style={({ pressed }) => [
        styles.textLink,
        bordered && styles.textLinkBordered,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}>
      <Text style={styles.textLinkLabel}>{label}</Text>
    </Pressable>
  );
}

export function ListRow({
  left,
  right,
  onPress,
  onLongPress,
  hapticIntent,
}: {
  left: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  hapticIntent?: HapticIntent;
}) {
  return (
    <Pressable
      onLongPress={onLongPress}
      onPress={() => {
        if (hapticIntent) {
          void triggerHaptic(hapticIntent);
        }
        onPress?.();
      }}
      style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}>
      <View style={styles.listRowLeft}>{left}</View>
      {right ? <View>{right}</View> : null}
    </Pressable>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function EmptyState({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

export function AttachmentPreview({
  index,
  onRemove,
}: {
  index: number;
  onRemove?: () => void;
}) {
  return (
    <View style={styles.attachmentRow}>
      <Text style={styles.attachmentLabel}>Image {index + 1}</Text>
      <Pressable onPress={onRemove} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
        <Ionicons color={palette.textMuted} name="close-outline" size={18} />
      </Pressable>
    </View>
  );
}

export function TagChip({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tagChip, pressed && styles.pressed]}>
      <Text style={styles.tagLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  pageContent: {
    paddingHorizontal: 20,
    paddingBottom: 116,
    paddingTop: 12,
  },
  topBar: {
    alignItems: 'center',
    backgroundColor: palette.background,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  topBarTitle: {
    color: palette.text,
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  iconButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  iconButtonSpacer: {
    height: 36,
    width: 36,
  },
  searchField: {
    alignItems: 'center',
    borderBottomColor: palette.borderStrong,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 10,
    paddingTop: 4,
  },
  searchInput: {
    color: palette.text,
    flex: 1,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 13,
    paddingVertical: 0,
  },
  sectionTitle: {
    color: palette.textMuted,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 11,
    marginBottom: 8,
  },
  card: {
    backgroundColor: palette.surface,
  },
  textLink: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  textLinkBordered: {
    borderColor: palette.borderStrong,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
  },
  textLinkLabel: {
    color: palette.text,
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 13,
  },
  listRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingVertical: 12,
  },
  listRowLeft: {
    flex: 1,
    paddingRight: 12,
  },
  divider: {
    backgroundColor: palette.border,
    height: StyleSheet.hairlineWidth,
  },
  emptyState: {
    alignItems: 'flex-start',
    paddingVertical: 24,
  },
  emptyTitle: {
    color: palette.text,
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 14,
    marginBottom: 6,
  },
  emptySubtitle: {
    color: palette.textSecondary,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 12,
    lineHeight: 20,
  },
  attachmentRow: {
    alignItems: 'center',
    borderBottomColor: palette.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  attachmentLabel: {
    color: palette.textSecondary,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 12,
  },
  tagChip: {
    borderColor: palette.borderStrong,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagLabel: {
    color: palette.textMuted,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 11,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.35,
  },
});
