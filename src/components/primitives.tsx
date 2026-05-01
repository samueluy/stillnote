import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { forwardRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export const palette = {
  background: '#FAF8F5',
  backgroundAlt: '#FFF8F5',
  surface: '#FFFFFF',
  surfaceMuted: '#FBF2ED',
  text: '#1E1B18',
  textMuted: '#727785',
  textSoft: '#8C847A',
  border: '#EAE3DB',
  borderStrong: '#D6D3D1',
  blue: '#1A73E8',
  blueSoft: '#EAF3FF',
  goldSoft: '#F2E0C3',
  tag: '#EFE6E2',
  success: '#747A57',
  scrim: 'rgba(30,27,24,0.38)',
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
      <CircleButton icon={leftIcon ?? 'person-outline'} onPress={onLeftPress} muted />
      <Text style={styles.topBarTitle}>{title}</Text>
      <CircleButton icon={rightIcon ?? 'search-outline'} onPress={onRightPress} />
    </View>
  );
}

export function CircleButton({
  icon,
  onPress,
  muted = false,
}: {
  icon: IoniconName;
  onPress?: () => void;
  muted?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.circleButton,
        muted && styles.circleButtonMuted,
        pressed && styles.pressed,
      ]}>
      <Ionicons color={muted ? palette.success : palette.blue} name={icon} size={18} />
    </Pressable>
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
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
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
  return (
    <View style={styles.searchField}>
      <Ionicons color={palette.textMuted} name="search-outline" size={18} />
      <TextInput
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textSoft}
        style={styles.searchInput}
        value={value}
      />
    </View>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
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
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.rowIconWrap}>
        <Ionicons color={palette.blue} name={icon} size={18} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {typeof count === 'number' ? <Text style={styles.rowCount}>{count}</Text> : null}
      <Ionicons color="#B7BCC9" name="chevron-forward-outline" size={16} />
    </Pressable>
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
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.threadIconWrap, { backgroundColor: accent }]}>
        <Ionicons color={palette.text} name={icon} size={16} />
      </View>
      <Text style={styles.rowLabel}>{name}</Text>
      <Text style={styles.rowCount}>{count}</Text>
      <Ionicons color="#B7BCC9" name="chevron-forward-outline" size={16} />
    </Pressable>
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
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tagChip,
        outlined && styles.tagChipOutlined,
        pressed && styles.pressed,
      ]}>
      {outlined ? <Ionicons color={palette.textMuted} name="add-outline" size={12} /> : null}
      <Text style={[styles.tagText, outlined && styles.tagOutlinedText]}>{label}</Text>
    </Pressable>
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
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}>
      {icon ? <Ionicons color={palette.blue} name={icon} size={16} /> : null}
      <Text style={styles.textButtonLabel}>{label}</Text>
    </Pressable>
  );
}

export function FloatingActionButton({
  icon,
  onPress,
}: {
  icon: IoniconName;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
      <Ionicons color="#FFFFFF" name={icon} size={22} />
    </Pressable>
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
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pill, active && styles.pillActive, pressed && styles.pressed]}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
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
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.toolbarButton, pressed && styles.pressed]}>
      <Ionicons color={palette.text} name={icon} size={16} />
      <Text style={styles.toolbarText}>{label}</Text>
    </Pressable>
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
    <View style={styles.attachmentCard}>
      <View style={styles.attachmentBody}>
        <Ionicons color={palette.blue} name="image-outline" size={18} />
        <Text style={styles.attachmentTitle}>Attachment {index + 1}</Text>
      </View>
      <Pressable onPress={onRemove}>
        <Ionicons color={palette.textMuted} name="close-outline" size={18} />
      </Pressable>
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
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      <Text style={styles.emptyStateSubtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  pageContent: {
    paddingHorizontal: 24,
    paddingBottom: 136,
    paddingTop: 18,
    gap: 28,
  },
  topBar: {
    alignItems: 'center',
    backgroundColor: '#FAF9F6',
    borderBottomColor: 'rgba(231,229,228,0.35)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  topBarTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  circleButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  circleButtonMuted: {
    backgroundColor: '#E9E1DC',
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: '700',
  },
  searchField: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchInput: {
    color: palette.text,
    flex: 1,
    fontSize: 15,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  rowIconWrap: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  threadIconWrap: {
    alignItems: 'center',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  rowLabel: {
    color: palette.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  rowCount: {
    color: palette.textMuted,
    fontSize: 13,
  },
  tagChip: {
    alignItems: 'center',
    backgroundColor: palette.tag,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tagChipOutlined: {
    backgroundColor: palette.surface,
    borderColor: 'rgba(193,198,214,0.5)',
    borderWidth: 1,
  },
  tagText: {
    color: '#414754',
    fontSize: 13,
    fontWeight: '500',
  },
  tagOutlinedText: {
    color: palette.textMuted,
  },
  textButton: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  textButtonLabel: {
    color: palette.blue,
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    alignItems: 'center',
    backgroundColor: palette.blue,
    borderRadius: 999,
    bottom: 108,
    elevation: 8,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    width: 56,
  },
  pill: {
    backgroundColor: '#F2EAE4',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  pillActive: {
    backgroundColor: palette.blueSoft,
  },
  pillText: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextActive: {
    color: palette.blue,
  },
  toolbarButton: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toolbarText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '600',
  },
  attachmentCard: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 14,
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
    color: palette.text,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  emptyStateTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyStateSubtitle: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.82,
  },
});
