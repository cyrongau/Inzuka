import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { db } from '../../src/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { BudgetIntelligence } from '../../src/components/native/BudgetIntelligence.native';
import { Receipt, History, TrendingUp, PieChart } from 'lucide-react-native';

export default function BudgetScreen() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc'),
      limit(10)
    );

    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setExpenses(items);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text>Please sign in to manage your budget.</Text>
      </View>
    );
  }

  const totalSpent = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerSection}>
        <Text style={styles.greeting}>Budget Oracle</Text>
        <Text style={styles.subtitle}>Family Ledger Pulse</Text>
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryLabel}>Cycle Outflow</Text>
            <Text style={styles.summaryValue}>KES {totalSpent.toLocaleString()}</Text>
          </View>
          <TrendingUp size={32} color="rgba(255,255,255,0.2)" />
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '45%' }]} />
        </View>
        <Text style={styles.progressText}>45% of allocated capacity used</Text>
      </View>

      {/* AI Intelligence Module */}
      <BudgetIntelligence userId={user.uid} />

      {/* Recent Ledger */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <History size={18} color="#000" />
          <Text style={styles.sectionTitle}>Ledger Entries</Text>
        </View>

        {expenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No records in this cycle.</Text>
          </View>
        ) : (
          <View style={styles.ledgerList}>
            {expenses.map((expense) => (
              <View key={expense.id} style={styles.ledgerItem}>
                <View style={styles.ledgerIcon}>
                  <Receipt size={20} color="#000" />
                </View>
                <View style={styles.ledgerInfo}>
                  <Text style={styles.ledgerDesc} numberOfLines={1}>{expense.description || 'General Expense'}</Text>
                  <Text style={styles.ledgerCat}>{expense.category}</Text>
                </View>
                <Text style={styles.ledgerAmount}>-KES {expense.amount.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 24,
    paddingTop: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSection: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#000',
  },
  subtitle: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#aaa',
  },
  summaryCard: {
    backgroundColor: '#000',
    borderRadius: 35,
    padding: 30,
    marginBottom: 30,
    marginTop: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  progressText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontWeight: 'bold',
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
    textTransform: 'uppercase',
  },
  ledgerList: {
    gap: 12,
  },
  ledgerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 20,
    borderRadius: 25,
    gap: 15,
  },
  ledgerIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerInfo: {
    flex: 1,
  },
  ledgerDesc: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000',
  },
  ledgerCat: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#aaa',
    textTransform: 'uppercase',
  },
  ledgerAmount: {
    fontSize: 14,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#eee',
    borderStyle: 'dashed',
  },
  emptyText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  }
});
