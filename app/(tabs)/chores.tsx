import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { db } from '../../src/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ChoreStats } from '../../src/components/native/ChoreStats.native';
import { TaskItem } from '../../src/components/native/TaskItem.native';
import { ChoreForm } from '../../src/components/native/ChoreForm.native';
import { Plus, Wind, Baby, Home as HomeIcon, Layers, Filter } from 'lucide-react-native';
import { showToast, triggerSystemNotification } from '../../src/services/notificationService';

const CATEGORIES = [
  { id: 'cleaning', label: 'Cleaning', icon: Wind },
  { id: 'kids', label: 'Children', icon: Baby },
  { id: 'outside', label: 'Outside', icon: HomeIcon },
  { id: 'other', label: 'Other', icon: Layers },
];

export default function ChoresScreen() {
  const { user, profile } = useAuth();
  const [chores, setChores] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user || !profile?.familyId) {
      if (!user) setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'chores'),
      where('familyId', '==', profile.familyId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setChores(items);
      setLoading(false);
    });

    const membersUnsub = onSnapshot(
      query(collection(db, 'users'), where('familyId', '==', profile.familyId)),
      (snap) => {
        setFamilyMembers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
      }
    );

    return () => {
      unsub();
      membersUnsub();
    };
  }, [user, profile?.familyId]);

  const toggleChore = async (chore: any) => {
    const ref = doc(db, 'chores', chore.id);
    const newState = !chore.completed;
    await updateDoc(ref, { completed: newState });
    
    if (newState) {
      showToast('success', { title: 'Goal Achieved', message: `"${chore.title}" has been completed.` });
      triggerSystemNotification({
        userId: user!.uid,
        familyId: profile!.familyId,
        type: 'push',
        title: 'Duty Fulfilled',
        body: `${user?.displayName?.split(' ')[0]} completed: ${chore.title}`,
        metadata: { type: 'chore', id: chore.id }
      });
    }
  };

  const deleteChore = (id: string) => {
    deleteDoc(doc(db, 'chores', id));
  };

  const toggleStep = (chore: any, stepId: string) => {
    const ref = doc(db, 'chores', chore.id);
    const newSteps = chore.checkList.map((s: any) => 
      s.id === stepId ? { ...s, completed: !s.completed } : s
    );
    updateDoc(ref, { checkList: newSteps });
  };

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
        <Text>Please sign in to view household chores.</Text>
      </View>
    );
  }

  const filteredChores = chores.filter(c => filter === 'all' || c.category === filter);
  const completedCount = chores.filter(c => c.completed).length;

  return (
    <View style={styles.root}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Harmony Chores</Text>
          <Text style={styles.subtitle}>Household Operational Layer</Text>
        </View>

        <ChoreStats total={chores.length} completed={completedCount} />

        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <TouchableOpacity 
              onPress={() => setFilter('all')}
              style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
            >
              <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All Nodes</Text>
            </TouchableOpacity>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setFilter(cat.id)}
                style={[styles.filterBtn, filter === cat.id && styles.filterBtnActive]}
              >
                <cat.icon size={12} color={filter === cat.id ? "#fff" : "#aaa"} />
                <Text style={[styles.filterText, filter === cat.id && styles.filterTextActive]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.ledger}>
          {filteredChores.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No tasks found in this domain.</Text>
            </View>
          ) : (
            filteredChores.map(chore => (
              <TaskItem 
                key={chore.id}
                chore={chore}
                onToggle={() => toggleChore(chore)}
                onDelete={() => deleteChore(chore.id)}
                onToggleCheckList={(stepId) => toggleStep(chore, stepId)}
                onLogSupplies={() => {}}
              />
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setShowAdd(true)}
      >
        <Plus size={32} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={showAdd}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <ChoreForm 
            userId={user.uid}
            familyId={profile?.familyId || ''}
            familyMembers={familyMembers}
            categories={CATEGORIES}
            onSuccess={() => setShowAdd(false)}
            onCancel={() => setShowAdd(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 100,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#000',
  },
  subtitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 2,
  },
  filterRow: {
    marginVertical: 15,
  },
  filterScroll: {
    gap: 10,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
  },
  filterBtnActive: {
    backgroundColor: '#000',
  },
  filterText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#aaa',
    textTransform: 'uppercase',
  },
  filterTextActive: {
    color: '#fff',
  },
  ledger: {
    marginTop: 10,
    gap: 12,
  },
  empty: {
    padding: 60,
    alignItems: 'center',
    backgroundColor: '#fcfcfc',
    borderRadius: 35,
    borderWidth: 1,
    borderColor: '#f5f5f5',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ccc',
    textTransform: 'uppercase',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  }
});
