import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { db } from '../../src/lib/firebase';
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp, collection, query, where, limit } from 'firebase/firestore';
import { WalletIntelligence } from '../../src/components/native/WalletIntelligence.native';
import { Wallet as WalletIcon, SmartphoneNfc, Send, CreditCard, History } from 'lucide-react-native';

export default function WalletScreen() {
  const { user, profile } = useAuth();
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const walletRef = doc(db, 'wallets', user.uid);
    
    const setupWallet = async () => {
      try {
        const snap = await getDoc(walletRef);
        if (!snap.exists()) {
          await setDoc(walletRef, {
            userId: user.uid,
            balance: 2500.00,
            currency: 'KES',
            updatedAt: serverTimestamp()
          });
        }
      } catch (e) {
        console.error("Native wallet setup err:", e);
      }
    };
    setupWallet();

    const unsub = onSnapshot(walletRef, (snap) => {
      if (snap.exists()) {
        setWallet({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    });

    // Transactions
    const transRef = collection(db, 'transactions');
    const q = query(transRef, where('fromUserId', '==', user.uid), limit(5));
    const unsubTrans = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTransactions(items.sort((a: any, b: any) => {
        const da = a.createdAt?.toDate?.() || new Date(0);
        const db = b.createdAt?.toDate?.() || new Date(0);
        return db.getTime() - da.getTime();
      }));
    });

    return () => {
      unsub();
      unsubTrans();
    };
  }, [user]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!user || !wallet) {
    return (
      <View style={styles.center}>
        <Text>Please sign in to view your wallet.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Wallet Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statsHeader}>
          <View style={styles.statsIconContainer}>
            <WalletIcon size={18} color="rgba(255,255,255,0.6)" />
          </View>
          <Text style={styles.statsLabel}>Liquid Capital Pool</Text>
        </View>
        
        <View style={styles.balanceContainer}>
          <Text style={styles.currency}>{wallet.currency}</Text>
          <Text style={styles.balance}>
            {wallet.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtnSecondary}>
            <SmartphoneNfc size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Funding</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnPrimary}>
            <Send size={20} color="#000" />
            <Text style={styles.actionBtnTextPrimary}>Send</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnSecondary}>
            <CreditCard size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Paying</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Intelligence Module */}
      <WalletIntelligence 
        userId={user.uid}
        familyId={profile?.familyId}
        walletId={wallet.id}
      />

      {/* Recent Activity */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <History size={18} color="#000" />
          <Text style={styles.sectionTitle}>Recent Syncs</Text>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyActivity}>
            <Text style={styles.emptyText}>No recent activity found.</Text>
          </View>
        ) : (
          <View style={styles.transactionList}>
            {transactions.map((tx) => (
              <View key={tx.id} style={styles.transactionItem}>
                <View style={styles.txIcon}>
                  <Text style={styles.txIconText}>
                    {tx.type === 'payment' ? '-' : '+'}
                  </Text>
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                  <Text style={styles.txType}>{tx.type}</Text>
                </View>
                <Text style={styles.txAmount}>
                  {tx.type === 'payment' ? '-' : ''}{wallet.currency} {tx.amount}
                </Text>
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
    padding: 20,
    paddingTop: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsCard: {
    backgroundColor: '#000',
    borderRadius: 40,
    padding: 30,
    marginBottom: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  statsIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 8,
    borderRadius: 12,
  },
  statsLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 35,
  },
  currency: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 20,
    fontWeight: '500',
    marginRight: 10,
  },
  balance: {
    color: '#fff',
    fontSize: 44,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: 'center',
    gap: 6,
  },
  actionBtnSecondary: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  actionBtnTextPrimary: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
    textTransform: 'uppercase',
  },
  emptyActivity: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 30,
  },
  emptyText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: 'bold',
  },
  transactionList: {
    gap: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 25,
    gap: 15,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  txInfo: {
    flex: 1,
  },
  txDesc: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000',
  },
  txType: {
    fontSize: 10,
    color: '#aaa',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '900',
    fontStyle: 'italic',
  }
});
