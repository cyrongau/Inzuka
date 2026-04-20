import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { db } from '../../src/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Plane, MapPin, Calendar, DollarSign, Plus, Trash2, CheckCircle2, Circle, ChevronDown, Luggage, Sparkles } from 'lucide-react-native';
import { format, differenceInDays } from 'date-fns';
import { showToast } from '../../src/services/notificationService';

export default function HolidaysScreen() {
  const { user, profile } = useAuth();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');

  const familyId = profile?.familyId;

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'trips'), where('familyId', '==', familyId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTrips(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [familyId]);

  const addTrip = async () => {
    if (!title.trim() || !destination.trim() || !familyId) return;
    try {
      await addDoc(collection(db, 'trips'), {
        title,
        destination,
        startDate,
        endDate,
        budget: parseInt(budget) || 0,
        packingList: [
          { item: 'Passports', packed: false },
          { item: 'Tickets', packed: false },
          { item: 'Chargers', packed: false }
        ],
        userId: user!.uid,
        familyId: familyId,
        createdAt: serverTimestamp()
      });
      showToast('success', { title: 'Itinerary Created', message: `Destination: ${destination} has been mapped.` });
      setTitle('');
      setDestination('');
      setStartDate('');
      setEndDate('');
      setBudget('');
      setShowAdd(false);
    } catch (e) {
      showToast('error', { title: 'Blueprint Error', message: 'Failed to record travel details.' });
    }
  };

  const togglePacked = async (tripId: string, itemIdx: number) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    const newList = [...trip.packingList];
    newList[itemIdx] = { ...newList[itemIdx], packed: !newList[itemIdx].packed };
    await updateDoc(doc(db, 'trips', tripId), { packingList: newList });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Global Ops</Text>
          <Text style={styles.subtitle}>Family Travel & Logistics</Text>
        </View>

        {trips.length === 0 ? (
          <View style={styles.empty}>
            <Luggage size={48} color="#ccc" />
            <Text style={styles.emptyText}>No active itineraries found.</Text>
          </View>
        ) : (
          trips.map(trip => {
            const tripDate = trip.startDate ? new Date(trip.startDate) : new Date();
            const daysRemaining = isNaN(tripDate.getTime()) ? 0 : differenceInDays(tripDate, new Date());
            const packedCount = trip.packingList?.filter((i: any) => i.packed).length || 0;
            const progress = trip.packingList?.length ? (packedCount / trip.packingList.length) : 0;
            const isExpanded = expandedTripId === trip.id;

            return (
              <View key={trip.id} style={styles.tripCard}>
                <TouchableOpacity 
                   onPress={() => setExpandedTripId(isExpanded ? null : trip.id)}
                   style={styles.tripHeader}
                >
                  <View style={styles.daysBadge}>
                    <Text style={styles.daysNum}>{Math.max(0, daysRemaining)}</Text>
                    <Text style={styles.daysLabel}>Days</Text>
                  </View>
                  <View style={styles.tripInfo}>
                    <Text style={styles.tripTitle}>{trip.title}</Text>
                    <View style={styles.tripMeta}>
                      <MapPin size={10} color="#3b82f6" />
                      <Text style={styles.tripDest}>{trip.destination}</Text>
                    </View>
                  </View>
                  <ChevronDown size={20} color="#aaa" style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                    </View>
                    
                    <Text style={styles.sectionHeading}>Logistic Checklist</Text>
                    {trip.packingList?.map((item: any, idx: number) => (
                      <TouchableOpacity 
                        key={idx} 
                        style={styles.checkItem}
                        onPress={() => togglePacked(trip.id, idx)}
                      >
                         <Text style={[styles.checkText, item.packed && styles.checkTextDone]}>{item.item}</Text>
                         {item.packed ? <CheckCircle2 size={18} color="#3b82f6" /> : <Circle size={18} color="#eee" />}
                      </TouchableOpacity>
                    ))}

                    <View style={styles.aiBox}>
                      <Sparkles size={16} color="#3b82f6" />
                      <Text style={styles.aiText}>
                        Prep for {trip.destination}: Check visa requirements and bank travel notices. Ensure travel insurance is active.
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
        <Plus size={32} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Map New Trip</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Trip Title" 
              value={title} 
              onChangeText={setTitle} 
            />
            <TextInput 
              style={styles.input} 
              placeholder="Destination" 
              value={destination} 
              onChangeText={setDestination} 
            />
            <View style={styles.row}>
              <TextInput 
                style={[styles.input, { flex: 1 }]} 
                placeholder="Budget (KES)" 
                keyboardType="numeric"
                value={budget} 
                onChangeText={setBudget} 
              />
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={addTrip}>
              <Text style={styles.saveBtnText}>Record Itinerary</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
              <Text style={styles.cancelBtnText}>Abort</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },
  contentContainer: { padding: 24, paddingTop: 40, paddingBottom: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { marginBottom: 30 },
  title: { fontSize: 32, fontWeight: '900', fontStyle: 'italic', letterSpacing: -1 },
  subtitle: { fontSize: 9, fontWeight: '900', color: '#aaa', textTransform: 'uppercase', letterSpacing: 2 },
  empty: { padding: 60, alignItems: 'center', gap: 20 },
  emptyText: { fontSize: 10, fontWeight: '900', color: '#ccc', textTransform: 'uppercase' },
  tripCard: { backgroundColor: '#fcfcfc', borderRadius: 30, borderWidth: 1, borderColor: '#eee', marginBottom: 15, overflow: 'hidden' },
  tripHeader: { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 15 },
  daysBadge: { width: 50, height: 50, backgroundColor: '#000', borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  daysNum: { color: '#fff', fontSize: 18, fontWeight: '900' },
  daysLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 7, fontWeight: '900', textTransform: 'uppercase' },
  tripInfo: { flex: 1 },
  tripTitle: { fontSize: 16, fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase' },
  tripMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  tripDest: { fontSize: 10, color: '#3b82f6', fontWeight: '900' },
  expandedContent: { padding: 20, paddingTop: 0, gap: 15 },
  progressBar: { height: 4, backgroundColor: '#eee', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#3b82f6' },
  sectionHeading: { fontSize: 10, fontWeight: '900', color: '#aaa', textTransform: 'uppercase', letterSpacing: 1 },
  checkItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  checkText: { fontSize: 13, fontWeight: 'bold' },
  checkTextDone: { textDecorationLine: 'line-through', color: '#ccc' },
  aiBox: { backgroundColor: '#eff6ff', padding: 15, borderRadius: 20, gap: 10 },
  aiText: { fontSize: 11, color: '#1e40af', lineHeight: 16, fontWeight: '500' },
  fab: { position: 'absolute', bottom: 30, right: 30, width: 64, height: 64, borderRadius: 32, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', elevation: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 35, padding: 30, gap: 15 },
  modalTitle: { fontSize: 24, fontWeight: '900', fontStyle: 'italic', marginBottom: 10 },
  input: { backgroundColor: '#f8f8f8', padding: 18, borderRadius: 15, fontWeight: 'bold' },
  row: { flexDirection: 'row', gap: 10 },
  saveBtn: { backgroundColor: '#000', padding: 20, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#fff', fontWeight: '900', textTransform: 'uppercase' },
  cancelBtn: { padding: 10, alignItems: 'center' },
  cancelBtnText: { color: '#aaa', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }
});
