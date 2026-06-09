import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.panel}>
        <Text style={styles.kicker}>TicketBox Scanner</Text>
        <Text style={styles.title}>Offline check-in shell</Text>
        <Text style={styles.copy}>
          SQLite-backed ticket snapshots and local check-in events will be implemented in a later
          stage.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f4f7f9',
    padding: 20,
  },
  panel: {
    gap: 12,
    padding: 20,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  kicker: {
    color: '#307d70',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: '#172026',
    fontSize: 26,
    fontWeight: '800',
  },
  copy: {
    color: '#5b6a72',
    fontSize: 15,
    lineHeight: 22,
  },
});
