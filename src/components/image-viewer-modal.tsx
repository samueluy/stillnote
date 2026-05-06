import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { IconButton, palette } from '@/src/components/primitives';

export function ImageViewerModal({
  uri,
  visible,
  onClose,
}: {
  uri: string | null;
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.scrim}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFillObject} />
        <View style={styles.inner}>
          <View style={styles.header}>
            <View />
            <IconButton icon="close-outline" onPress={onClose} />
          </View>
          {uri ? <Image contentFit="contain" source={{ uri }} style={styles.image} /> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    alignItems: 'center',
    backgroundColor: 'rgba(19,19,19,0.35)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  inner: {
    alignSelf: 'stretch',
    backgroundColor: palette.background,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  image: {
    flex: 1,
    width: '100%',
  },
});
