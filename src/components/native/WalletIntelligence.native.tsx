import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { FileSearch, Zap, Smartphone, MessageSquareText, ShieldCheck, CheckCircle2, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { scanReceipt, parseTransactionText } from '../../services/geminiService';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, runTransaction } from 'firebase/firestore';
import { showToast, triggerSystemNotification } from '../../services/notificationService';

interface WalletIntelligenceProps {
  userId: string;
  familyId?: string;
  walletId: string;
}

export const WalletIntelligence: React.FC<WalletIntelligenceProps> = ({
  userId,
  familyId,
  walletId
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsText, setSmsText] = useState('');
  const [reviewData, setReviewData] = useState<any>(null);

  const handleOcrScan = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showToast('error', { title: 'Permission Denied', message: 'Camera access is required for scanning.' });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setIsProcessing(true);
        try {
          const data = await scanReceipt(result.assets[0].base64, 'image/jpeg');
          setReviewData({ ...data, source: 'receipt_scan', type: 'payment' });
          showToast('success', { title: 'Signal Extracted', message: 'Ledger artifact recognized.' });
        } catch (e) {
          console.error(e);
          showToast('error', { title: 'Extraction Failed', message: 'Artifact signal too weak.' });
        } finally {
          setIsProcessing(false);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSmsParse = async () => {
    if (!smsText.trim()) return;
    setIsProcessing(true);
    setShowSmsModal(false);
    try {
      const data = await parseTransactionText(smsText);
      setReviewData({ ...data, source: 'sms_parse', type: 'payment' });
      setSmsText('');
      showToast('success', { title: 'Pulse Recovered', message: 'Cognitive parsing complete.' });
    } catch (e) {
      console.error(e);
      showToast('error', { title: 'Signal Lost', message: 'Could not resolve transaction signal.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const finalizeTransaction = async () => {
    if (!reviewData || !walletId) return;
    setIsProcessing(true);
    try {
      const amount = reviewData.amount;
      await runTransaction(db, async (txn) => {
        const walletRef = doc(db, 'wallets', walletId);
        const wSnap = await txn.get(walletRef);
        const currentBalance = wSnap.data()?.balance || 0;
        
        txn.update(walletRef, { 
          balance: currentBalance - amount,
          updatedAt: serverTimestamp()
        });

        txn.set(doc(collection(db, 'transactions')), {
          fromUserId: userId,
          toUserId: 'merchant_ai_logged',
          amount,
          type: 'payment',
          status: 'completed',
          description: reviewData.description || reviewData.merchant || 'AI Logged Transaction',
          familyId: familyId || null,
          createdAt: serverTimestamp()
        });
      });
      showToast('success', { title: 'Sync Finalized', message: `KES ${amount} deducted from capital pool.` });
      
      triggerSystemNotification({
        userId,
        familyId,
        type: 'push',
        title: 'Capital Deployment',
        body: `Spent KES ${amount} at ${reviewData.merchant || 'Merchant'}`,
        metadata: { type: 'wallet', amount }
      });

      setReviewData(null);
    } catch (e) {
      console.error(e);
      showToast('error', { title: 'Sync Failed', message: 'Transaction could not be committed.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerTitleContainer}>
            <Zap size={20} color="#fbbf24" strokeWidth={3} />
            <Text style={styles.headerTitle}>Cognitive Inflow</Text>
          </View>
          {isProcessing && <ActivityIndicator size="small" color="#fbbf24" />}
        </View>

        <Text style={styles.description}>
          Port automated ledger synchronization into your physical artifacts.
        </Text>

        <View style={styles.actionGrid}>
          <TouchableOpacity 
            style={styles.primaryAction} 
            onPress={handleOcrScan}
            disabled={isProcessing}
          >
            <Text style={styles.primaryActionText}>Lens Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.secondaryAction} 
            onPress={() => setShowSmsModal(true)}
            disabled={isProcessing}
          >
            <Text style={styles.secondaryActionText}>Signal Paste</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <View style={styles.dotGroup}>
            <View style={[styles.dot, { opacity: 0.3 }]} />
            <View style={[styles.dot, { opacity: 0.1 }]} />
          </View>
          <Text style={styles.footerText}>Resilience AI Active</Text>
        </View>
      </View>

      {/* SMS Signal Modal */}
      <Modal
        visible={showSmsModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Signal Inflow</Text>
                <Text style={styles.modalSubtitle}>Inject transaction artifacts</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSmsModal(false)} style={styles.closeButton}>
                <X size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.textArea}
              placeholder="Paste M-Pesa or Bank notification signal here..."
              multiline
              value={smsText}
              onChangeText={setSmsText}
              placeholderTextColor="#999"
            />

            <TouchableOpacity 
              style={styles.analyzeButton}
              onPress={handleSmsParse}
              disabled={!smsText.trim() || isProcessing}
            >
              <Text style={styles.analyzeButtonText}>ANALYZE SIGNAL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      <Modal
        visible={!!reviewData}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reviewContent}>
            <Text style={styles.reviewLabel}>Sync Review</Text>
            <Text style={styles.reviewAmountLabel}>Extracted Amount</Text>
            <Text style={styles.reviewAmount}>
              KES {reviewData?.amount?.toLocaleString() || '0'}
            </Text>

            <View style={styles.divide} />

            <View style={styles.reviewInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Identity</Text>
                <Text style={styles.infoValue}>{reviewData?.merchant || reviewData?.description || 'Unknown'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Domain</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{reviewData?.category || 'General'}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={finalizeTransaction}
              disabled={isProcessing}
            >
              <Text style={styles.confirmButtonText}>CONFIRM SYNC</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => setReviewData(null)}
              style={styles.discardButton}
              disabled={isProcessing}
            >
              <Text style={styles.discardButtonText}>Discard artifact</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  card: {
    backgroundColor: '#000',
    borderRadius: 30,
    padding: 30,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontStyle: 'italic',
  },
  description: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: 'bold',
    lineHeight: 18,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 20,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 15,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  secondaryActionText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  footer: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dotGroup: {
    flexDirection: 'row',
    gap: -8,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
  },
  footerText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 40,
    padding: 30,
    minHeight: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  modalTitle: {
    fontSize: 32,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#000',
  },
  modalSubtitle: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#aaa',
    fontStyle: 'italic',
  },
  closeButton: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 15,
  },
  textArea: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 25,
    padding: 25,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  analyzeButton: {
    backgroundColor: '#000',
    paddingVertical: 25,
    borderRadius: 25,
    alignItems: 'center',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3,
  },
  reviewContent: {
    backgroundColor: '#fff',
    borderRadius: 40,
    padding: 40,
    alignItems: 'center',
  },
  reviewLabel: {
    fontSize: 32,
    fontWeight: '900',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  reviewAmountLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#aaa',
    letterSpacing: 1,
    marginBottom: 20,
  },
  reviewAmount: {
    fontSize: 48,
    fontWeight: '900',
    fontStyle: 'italic',
    marginBottom: 30,
  },
  divide: {
    height: 1,
    backgroundColor: '#eee',
    width: '100%',
    marginBottom: 30,
  },
  reviewInfo: {
    width: '100%',
    backgroundColor: '#f8f8f8',
    borderRadius: 30,
    padding: 25,
    marginBottom: 30,
    gap: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#aaa',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  badge: {
    backgroundColor: '#000',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  confirmButton: {
    backgroundColor: '#000',
    paddingVertical: 25,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3,
  },
  discardButton: {
    paddingVertical: 10,
  },
  discardButtonText: {
    color: '#aaa',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  }
});
