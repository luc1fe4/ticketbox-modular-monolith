import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';

export function BootScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.centerPanel}>
        <ActivityIndicator color="#287565" />
        <Text style={styles.mutedText}>Preparing scanner session...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#eef4f2',
  },
  centerPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
  },
  mutedText: {
    color: '#52636b',
    fontSize: 15,
  },
});
