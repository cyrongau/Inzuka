import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

interface ChoreStatsProps {
  total: number;
  completed: number;
}

export const ChoreStats: React.FC<ChoreStatsProps> = ({ total, completed }) => {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Household Pulse</Text>
          <Text style={styles.subtitle}>Weekly Completion Velocity</Text>
        </View>
        <Text style={styles.percentage}>{percent}%</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${percent}%` }]} />
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>0% Idle</Text>
          <Text style={styles.footerText}>{completed} of {total} Tasks Sequenced</Text>
          <Text style={styles.footerText}>100% Harmony</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 35,
    padding: 25,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#000',
  },
  subtitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  percentage: {
    fontSize: 36,
    fontWeight: '900',
    color: '#000',
  },
  progressContainer: {
    gap: 12,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
    padding: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#ccc',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
