import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { db } from '../../src/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, increment, serverTimestamp, orderBy } from 'firebase/firestore';
import { Zap, Activity, GraduationCap, Target, Flame, ChevronRight, BookOpen, Check, Award, Sparkles, Brain, Star } from 'lucide-react-native';
import { showToast } from '../../src/services/notificationService';
import { generateEducationalContent, generateGrowthTasks } from '../../src/services/growthHubService';

const { width } = Dimensions.get('window');

export default function GrowthScreen() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'wellness' | 'education' | 'tasks'>('wellness');
  const [habits, setHabits] = useState<any[]>([]);
  const [growthTasks, setGrowthTasks] = useState<any[]>([]);
  const [educationContent, setEducationContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const familyId = profile?.familyId;
  const isParent = ['Father', 'Mother', 'Guardian'].includes(profile?.familyRole || '');

  useEffect(() => {
    if (!familyId || !user) {
      setLoading(false);
      return;
    }

    const hQ = query(collection(db, 'habits'), where('userId', '==', user.uid));
    const hUnsub = onSnapshot(hQ, (snap) => {
      setHabits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const tQ = query(collection(db, 'growthTasks'), where('familyId', '==', familyId), orderBy('createdAt', 'desc'));
    const tUnsub = onSnapshot(tQ, (snap) => {
      setGrowthTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const eQ = query(collection(db, 'educationContent'), where('familyId', '==', familyId), orderBy('createdAt', 'desc'));
    const eUnsub = onSnapshot(eQ, (snap) => {
      setEducationContent(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => {
      hUnsub();
      tUnsub();
      eUnsub();
    };
  }, [familyId, user?.uid]);

  const updateHabit = async (habitId: string) => {
    try {
      await updateDoc(doc(db, 'habits', habitId), {
        currentValue: increment(1)
      });
      showToast('success', { title: 'Pulse Tracked', message: '+1 Progressive Unit detected.' });
    } catch (e) {
      showToast('error', { title: 'Sync Error', message: 'Failed to record progress.' });
    }
  };

  const completeTask = async (taskId: string, points: number) => {
    try {
      await updateDoc(doc(db, 'growthTasks', taskId), {
        isCompleted: true,
        completedAt: serverTimestamp()
      });
      showToast('success', { title: 'Domain Mastered!', message: `Awarded ${points} XP.` });
    } catch (e) {
      showToast('error', { title: 'Commit Error', message: 'Failed to finalize mission.' });
    }
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
      <View style={styles.tabNav}>
        {[
          { id: 'wellness', icon: Activity },
          { id: 'education', icon: GraduationCap },
          { id: 'tasks', icon: Target },
        ].map((tab) => (
          <TouchableOpacity 
            key={tab.id} 
            onPress={() => setActiveTab(tab.id as any)}
            style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
          >
            <tab.icon size={20} color={activeTab === tab.id ? '#fff' : '#aaa'} />
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Growth Hub</Text>
          <Text style={styles.subtitle}>Family Excellence Node</Text>
        </View>

        {activeTab === 'wellness' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Milestone Tracks</Text>
            {habits.map(habit => {
              const progress = Math.min(100, ((habit.currentValue || 0) / (habit.targetValue || 1)) * 100);
              return (
                <View key={habit.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardTitle}>{habit.name}</Text>
                      <Text style={styles.cardMeta}>{habit.currentValue || 0} / {habit.targetValue} {habit.unit}</Text>
                    </View>
                    <Flame size={20} color="#fbbf24" />
                  </View>
                  <View style={styles.progressShell}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                  </View>
                  <TouchableOpacity style={styles.trackBtn} onPress={() => updateHabit(habit.id)}>
                    <Text style={styles.trackBtnText}>LOG PROGRESS</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {activeTab === 'education' && (
          <View style={styles.section}>
             <Text style={styles.sectionLabel}>Academic Assets</Text>
             {educationContent.length === 0 ? (
               <View style={styles.empty}>
                 <BookOpen size={48} color="#eee" />
                 <Text style={styles.emptyText}>No Curated Modules Found</Text>
               </View>
             ) : (
               educationContent.map(content => (
                 <TouchableOpacity key={content.id} style={styles.eduCard}>
                   <View style={styles.eduIcon}>
                     <GraduationCap size={24} color="#3b82f6" />
                   </View>
                   <View style={styles.eduContent}>
                     <Text style={styles.eduTitle}>{content.title}</Text>
                     <Text style={styles.eduText} numberOfLines={2}>{content.content}</Text>
                   </View>
                   <ChevronRight size={16} color="#ccc" />
                 </TouchableOpacity>
               ))
             )}
          </View>
        )}

        {activeTab === 'tasks' && (
          <View style={styles.section}>
             <Text style={styles.sectionLabel}>Training Missions</Text>
             {growthTasks.map(task => (
               <View key={task.id} style={[styles.taskItem, task.isCompleted && styles.taskDone]}>
                 <TouchableOpacity 
                   style={[styles.taskCheck, task.isCompleted && styles.taskCheckActive]}
                   onPress={() => !task.isCompleted && completeTask(task.id, task.points)}
                 >
                   {task.isCompleted && <Check size={16} color="#fff" />}
                 </TouchableOpacity>
                 <View style={styles.taskInfo}>
                   <Text style={[styles.taskTitle, task.isCompleted && styles.taskTitleDone]}>{task.title}</Text>
                   <Text style={styles.taskCategory}>{task.category}</Text>
                 </View>
                 <View style={styles.xpBox}>
                   <Text style={styles.xpText}>+{task.points} XP</Text>
                 </View>
               </View>
             ))}
          </View>
        )}
      </ScrollView>

      {isParent && (
        <View style={styles.parentDrawer}>
          <TouchableOpacity 
             style={styles.aiBtn}
             onPress={() => showToast('info', { title: 'Command Node', message: 'Use web terminal for granular AI generation.' })}
          >
            <Sparkles size={16} color="#fff" />
            <Text style={styles.aiBtnText}>DEPLOY AI CONTENT</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },
  content: { padding: 24, paddingTop: 40, paddingBottom: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabNav: { flexDirection: 'row', padding: 20, gap: 10, justifyContent: 'center' },
  tabBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f8f8f8', alignItems: 'center', justifyContent: 'center' },
  tabBtnActive: { backgroundColor: '#000' },
  header: { marginBottom: 30 },
  title: { fontSize: 32, fontWeight: '900', fontStyle: 'italic', letterSpacing: -1 },
  subtitle: { fontSize: 9, fontWeight: '900', color: '#aaa', textTransform: 'uppercase', letterSpacing: 2 },
  section: { gap: 15 },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: '#ccc', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  card: { backgroundColor: '#fff', borderRadius: 30, padding: 25, borderWidth: 1, borderColor: '#eee', gap: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '900', fontStyle: 'italic' },
  cardMeta: { fontSize: 12, fontWeight: 'bold', color: '#aaa' },
  progressShell: { height: 6, backgroundColor: '#f5f5f5', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#000' },
  trackBtn: { backgroundColor: '#fcfcfc', borderStyle: 'dashed', borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 15, alignItems: 'center' },
  trackBtnText: { fontSize: 10, fontWeight: '900', color: '#888', letterSpacing: 1 },
  eduCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fcfcfc', padding: 20, borderRadius: 25, borderWidth: 1, borderColor: '#f0f0f0', gap: 15 },
  eduIcon: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  eduContent: { flex: 1 },
  eduTitle: { fontSize: 15, fontWeight: '900' },
  eduText: { fontSize: 11, color: '#aaa', marginTop: 4, fontWeight: '500' },
  empty: { padding: 40, alignItems: 'center', opacity: 0.3 },
  emptyText: { fontSize: 10, fontWeight: '900', marginTop: 15 },
  taskItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: '#f5f5f5', gap: 15 },
  taskDone: { opacity: 0.5 },
  taskCheck: { width: 32, height: 32, borderRadius: 10, borderWidth: 2, borderColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  taskCheckActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 14, fontWeight: '800' },
  taskTitleDone: { textDecorationLine: 'line-through' },
  taskCategory: { fontSize: 9, fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', marginTop: 2 },
  xpBox: { backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  xpText: { fontSize: 9, fontWeight: '900', color: '#92400e' },
  parentDrawer: { position: 'absolute', bottom: 30, left: 24, right: 24 },
  aiBtn: { backgroundColor: '#000', padding: 20, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 5 },
  aiBtnText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 }
});
