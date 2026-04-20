import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Zap, Camera, MessageSquareText, ShieldCheck, X, Sparkles, Brain, Save } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { scanReceipt, parseTransactionText } from '../../services/geminiService';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { showToast } from '../../services/notificationService';

interface BudgetIntelligenceProps {
  userId: string;
  onExtractionComplete?: () => void;
}

export const BudgetIntelligence: React.FC<BudgetIntelligenceProps> = ({
  userId,
  onExtractionComplete
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
          setReviewData(data);
          showToast('success', { title: 'Signal Extracted', message: 'AI has parsed the receipt artifact.' });
        } catch (e) {
          console.error(e);
          showToast('error', { title: 'Extraction Failed', message: 'Could not parse this artifact.' });
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
      setReviewData(data);
      setSmsText('');
      showToast('success', { title: 'Pulse Parsed', message: 'SMS transaction data recovered.' });
    } catch (e) {
      console.error(e);
      showToast('error', { title: 'Parsing Error', message: 'Signal was too noisy to parse.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const saveToLedger = async () => {
    if (!reviewData || !userId) return;
    setIsProcessing(true);
    try {
      await addDoc(collection(db, 'expenses'), {
        userId,
        amount: reviewData.amount,
        category: reviewData.category,
        description: `${reviewData.merchant} (${reviewData.transactionType})`,
        date: reviewData.date || new Date().toISOString(),
        isPaid: true,
        createdAt: serverTimestamp(),
        source: 'Native AI Extraction'
      });
      showToast('success', { title: 'Ledger Synced', message: `KES ${reviewData.amount} committed to database.` });
      setReviewData(null);
      if (onExtractionComplete) onExtractionComplete();
    } catch (e) {
      console.error(e);
      showToast('error', { title: 'Sync Failed', message: 'Database connection interrupted.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleGroup}>
            <Brain size={20} color="#000" />
            <Text style={styles.title}>Budget Oracle</Text>
          </View>
          {isProcessing && <ActivityIndicator size="small" color="#000" />}
        </View>

        <Text style={styles.description}>
          AI-driven expense mapping and artifact extraction for the family ledger.
        </Text>

        <View style={styles.buttonStack}>
          <TouchableOpacity 
            style={styles.primaryBtn} 
            onPress={handleOcrScan}
            disabled={isProcessing}
          >
            <Camera size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Snap Receipt</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryBtn} 
            onPress={() => setShowSmsModal(true)}
            disabled={isProcessing}
          >
            <MessageSquareText size={18} color="#000" />
            <Text style={styles.secondaryBtnText}>Paste SMS Signal</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SMS Modal */}
      <Modal visible={showSmsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Signal Inflow</Text>
              <TouchableOpacity onPress={() => setShowSmsModal(false)}>
                <X size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Paste text records here..."
              multiline
              value={smsText}
              onChangeText={setSmsText}
              placeholderTextColor="#999"
            />
            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={handleSmsParse}
              disabled={!smsText.trim() || isProcessing}
            >
              <Text style={styles.actionBtnText}>ANALYZE SIGNAL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      <Modal visible={!!reviewData} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.reviewCard}>
            <Sparkles size={32} color="#000" style={{ marginBottom: 15 }} />
            <Text style={styles.reviewHeading}>Extraction Success</Text>
            
            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>Detected Amount</Text>
              <Text style={styles.amount}>KES {reviewData?.amount?.toLocaleString()}</Text>
            </View>

            <View style={styles.detailList}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Merchant</Text>
                <Text style={styles.detailValue}>{reviewData?.merchant || 'Unknown'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Domain</Text>
                <View style={styles.tag}>
                   <Text style={styles.tagText}>{reviewData?.category || 'General'}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.saveBtn} 
              onPress={saveToLedger}
              disabled={isProcessing}
            >
              <Save size={18} color="#fff" />
              <Text style={styles.saveBtnText}>COMMIT TO LEDGER</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={() => setReviewData(null)}
              disabled={isProcessing}
            >
              <Text style={styles.cancelBtnText}>Discard artifact</Text>
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
    backgroundColor: '#fff',
    borderRadius: 35,
    padding: 30,
    borderWidth: 2,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
    lineHeight: 18,
    marginBottom: 25,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  buttonStack: {
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: '#000',
    borderRadius: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  secondaryBtn: {
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  secondaryBtnText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 30,
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  input: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    padding: 20,
    fontSize: 16,
    color: '#000',
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  actionBtn: {
    backgroundColor: '#000',
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 40,
    padding: 40,
    alignItems: 'center',
  },
  reviewHeading: {
    fontSize: 28,
    fontWeight: '900',
    fontStyle: 'italic',
    marginBottom: 25,
  },
  amountBox: {
    backgroundColor: '#f8f8f8',
    borderRadius: 25,
    padding: 25,
    width: '100%',
    alignItems: 'center',
    marginBottom: 25,
  },
  amountLabel: {
    fontSize: 10,
    color: '#aaa',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },
  amount: {
    fontSize: 36,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  detailList: {
    width: '100%',
    gap: 15,
    marginBottom: 30,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#aaa',
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  tag: {
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  saveBtn: {
    backgroundColor: '#000',
    width: '100%',
    paddingVertical: 20,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cancelBtn: {
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: '#aaa',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  }
});
