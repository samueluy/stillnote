import * as FileSystem from 'expo-file-system/legacy';
import type { ImagePickerAsset } from 'expo-image-picker';

export async function persistImageAsset(asset: ImagePickerAsset) {
  const mediaDirectory = `${FileSystem.documentDirectory}stillnote-media`;
  const filename = `${Date.now()}-${asset.fileName ?? 'attachment.jpg'}`;
  const destination = `${mediaDirectory}/${filename}`;

  const info = await FileSystem.getInfoAsync(mediaDirectory);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(mediaDirectory, { intermediates: true });
  }

  await FileSystem.copyAsync({
    from: asset.uri,
    to: destination,
  });

  return {
    uri: destination,
    width: asset.width ?? 0,
    height: asset.height ?? 0,
  };
}
