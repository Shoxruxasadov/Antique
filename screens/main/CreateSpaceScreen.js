import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function CreateSpaceScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
