import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { forwardRef } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/src/components/animated-pressable';
import { useTheme } from '@/src/theme/useTheme';
import { theme } from '@/src/theme/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const light = theme.light;
const dark = theme.dark;

export const palette = {
  background: light.bg,
  backgroundAlt: light.bg,
  surface: light.bgCard,
  surfaceMuted: light.accentSoft,
  text: light.textPrimary,
  textMuted: light.textSecondary,
  textSoft: light.textTertiary,
  border: light.border,
  borderStrong: light.borderStrong,
  blue: light.accent,
  blueSoft: light.accentSoft,
  gold: light.gold,
  goldSoft: light.goldSoft,
  tag: light.goldSoft,
  success: light.accent,
  scrim: light.scrim,
};

export const darkPalette = {
  background: dark.bg,
  backgroundAlt: dark.bg,
  surface: dark.bgCard,
  surfaceMuted: dark.accentSoft,
  text: dark.textPrimary,
  textMuted: dark.textSecondary,
  textSoft: dark.textTertiary,
  border: dark.border,
  borderStrong: dark.borderStrong,
  blue: dark.accent,
  blueSoft: dark.accentSoft,
  gold: dark.gold,
  goldSoft: dark.goldSoft,
  tag: dark.goldSoft,
  success: dark.accent,
  scrim: dark.scrim,
};

export function Screen({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top']}>
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
  const { colors } = useTheme();
  return (
    <View style={[styles.topBar, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
      {leftIcon ? (
        <CircleButton icon={leftIcon} onPress={onLeftPress} />
      ) : (
        <View style={styles.circleButton} />
      )}
      <Text style={[styles.topBarTitle, { color: colors.textPrimary }]}>{title}</Text>
      {rightIcon ? (
        <CircleButton icon={rightIcon} onPress={onRightPress} />
      ) : (
        <View style={styles.circleButton} />
      )}
    </View>
  );
}

export function CircleButton({
  icon,
  onPress,
}: {
  icon: IoniconName;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.circleButton, { backgroundColor: colors.border }]}>
      <Ionicons color={colors.textSecondary} name={icon} size={18} />
    </AnimatedPressable>
  );
}

export function SectionTitle({
  title,
  actionIcon,
  onActionPress,
}: {
  title: string;
  actionIcon?: IoniconName;
  onActionPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={[styles.sectionCaps, { color: colors.textTertiary }]}>{title}</Text>
      {actionIcon ? <CircleButton icon={actionIcon} onPress={onActionPress} /> : null}
    </View>
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
  const { colors } = useTheme();
  return (
    <View style={[styles.searchField, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <Ionicons color={colors.textTertiary} name="search-outline" size={18} />
      <TextInput
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        style={[styles.searchInput, { color: colors.textPrimary }]}
        value={value}
      />
    </View>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      {children}
    </View>
  );
}

export function SmartCollectionRow({
  icon,
  label,
  count,
  onPress,
}: {
  icon: IoniconName;
  label: string;
  count?: number;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <AnimatedPressable onPress={onPress} style={styles.row}>
      <View style={[styles.rowIconWrap, { backgroundColor: colors.accentSoft }]}>
        <Ionicons color={colors.textSecondary} name={icon} size={18} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
      {typeof count === 'number' ? (
        <View style={[styles.countPill, { backgroundColor: colors.accentSoft }]}>
          <Text style={[styles.countText, { color: colors.accent }]}>{count}</Text>
        </View>
      ) : null}
      <Ionicons color={colors.borderStrong} name="chevron-forward-outline" size={16} />
    </AnimatedPressable>
  );
}

export function ThreadRow({
  name,
  count,
  icon,
  accent,
  onPress,
}: {
  name: string;
  count: number;
  icon: IoniconName;
  accent: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <AnimatedPressable
      onPress={onPress}
      style={[styles.row, { borderLeftColor: accent, borderLeftWidth: 3 }]}>
      <View style={[styles.threadIconWrap, { backgroundColor: accent + '20' }]}>
        <Ionicons color={accent} name={icon} size={16} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{name}</Text>
      <View style={[styles.countPill, { backgroundColor: colors.accentSoft }]}>
        <Text style={[styles.countText, { color: colors.accent }]}>{count}</Text>
      </View>
      <Ionicons color={colors.borderStrong} name="chevron-forward-outline" size={16} />
    </AnimatedPressable>
  );
}

export function TagChip({
  label,
  outlined = false,
  onPress,
}: {
  label: string;
  outlined?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <AnimatedPressable
      onPress={onPress}
      style={[
        styles.tagChip,
        outlined
          ? { backgroundColor: 'transparent', borderColor: colors.borderStrong, borderWidth: 1 }
          : { backgroundColor: colors.goldSoft },
      ]}>
      {outlined ? <Ionicons color={colors.textTertiary} name="add-outline" size={12} /> : null}
      <Text style={[styles.tagText, { color: outlined ? colors.textTertiary : colors.gold }]}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

export function TextButton({
  icon,
  label,
  onPress,
}: {
  icon?: IoniconName;
  label: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <AnimatedPressable onPress={onPress} style={styles.textButton}>
      {icon ? <Ionicons color={colors.accent} name={icon} size={16} /> : null}
      <Text style={[styles.textButtonLabel, { color: colors.accent }]}>{label}</Text>
    </AnimatedPressable>
  );
}

export function FloatingActionButton({
  icon,
  onPress,
}: {
  icon: IoniconName;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <AnimatedPressable onPress={onPress} style={[styles.fab, { backgroundColor: colors.accent }]}>
      <Ionicons color="#FFFFFF" name={icon} size={22} />
    </AnimatedPressable>
  );
}

export function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <AnimatedPressable
      onPress={onPress}
      style={[
        styles.pill,
        active
          ? { backgroundColor: colors.accent }
          : { backgroundColor: 'transparent', borderColor: colors.borderStrong, borderWidth: 1 },
      ]}>
      <Text
        style={[
          styles.pillText,
          { color: active ? '#FFFFFF' : colors.textTertiary },
        ]}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

export function ToolbarButton({
  icon,
  label,
  onPress,
}: {
  icon: IoniconName;
  label: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <AnimatedPressable
      onPress={onPress}
      style={[styles.toolbarButton, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <Ionicons color={colors.textSecondary} name={icon} size={16} />
      <Text style={[styles.toolbarText, { color: colors.textPrimary }]}>{label}</Text>
    </AnimatedPressable>
  );
}

export function AttachmentPreview({
  index,
  onRemove,
}: {
  index: number;
  onRemove?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.attachmentCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={styles.attachmentBody}>
        <Ionicons color={colors.accent} name="image-outline" size={18} />
        <Text style={[styles.attachmentTitle, { color: colors.textPrimary }]}>
          Attachment {index + 1}
        </Text>
      </View>
      <AnimatedPressable onPress={onRemove}>
        <Ionicons color={colors.textTertiary} name="close-outline" size={18} />
      </AnimatedPressable>
    </View>
  );
}

export function EmptyState({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.emptyState, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.emptyStateSubtitle, { color: colors.textSecondary }]}>
        {subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  pageContent: {
    paddingHorizontal: 24,
    paddingBottom: 136,
    paddingTop: 20,
    gap: 28,
  },
  topBar: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  topBarTitle: {
    fontFamily: 'LibreBaskerville_700Bold',
    fontSize: 18,
  },
  circleButton: {
    alignItems: 'center',
    borderRadius: 100,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionCaps: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  searchField: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  rowIconWrap: {
    alignItems: 'center',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  threadIconWrap: {
    alignItems: 'center',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  rowLabel: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
  },
  countPill: {
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
  },
  tagChip: {
    alignItems: 'center',
    borderRadius: 100,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tagText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  textButton: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  textButtonLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
  },
  fab: {
    alignItems: 'center',
    borderRadius: 16,
    bottom: 108,
    elevation: 4,
    height: 52,
    justifyContent: 'center',
    position: 'absolute',
    right: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    width: 52,
  },
  pill: {
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pillText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
  },
  toolbarButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  toolbarText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  attachmentCard: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  attachmentBody: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  attachmentTitle: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  emptyStateTitle: {
    fontFamily: 'LibreBaskerville_700Bold',
    fontSize: 16,
    marginBottom: 6,
  },
  emptyStateSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
