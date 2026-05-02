import { View, Text } from 'react-native';
import { Screen } from '@/src/components/primitives';

export default function SearchScreen() {
  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Search</Text>
      </View>
    </Screen>
  );
}
