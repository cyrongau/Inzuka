import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { db } from '../../src/lib/firebase';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { 
  Home as HomeIcon, 
  CheckSquare, 
  TrendingUp, 
  ShoppingCart, 
  Clock, 
  CheckCircle2,
  Flame,
  Plus,
  ArrowRight
} from 'lucide-react-native';

export default function HomeScreen() {
  const { user, profile, logout, signIn } = useAuth();
  const [myChores, setMyChores] = useState<any[]>([]);
  const [myHabits, setMyHabits] = useState<any[]>([]);
  const [shoppingCount, setShoppingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const familyId = profile?.familyId;
    
    // Fetch Chores
    const baseQuery = familyId 
      ? query(collection(db, 'chores'), where('familyId', '==', familyId))
      : query(collection(db, 'chores'), where('assignedToUserId', '==', user.uid));

    const unsubChores = onSnapshot(baseQuery, (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMyChores(items.filter((c: any) => c.assignedToUserId === user.uid || !c.assignedToUserId).slice(0, 5));
      setLoading(false);
    });

    // Fetch Habits
    const habitsQ = query(collection(db, 'habits'), where('userId', '==', user.uid), limit(3));
    const unsubHabits = onSnapshot(habitsQ, (snap) => {
      setMyHabits(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch Shopping Count
    if (familyId) {
      const shoppingQ = query(collection(db, 'shoppingLists'), where('familyId', '==', familyId));
      const unsubShopping = onSnapshot(shoppingQ, (snap) => {
        let total = 0;
        snap.docs.forEach(doc => {
          total += (doc.data().items || []).filter((i: any) => !i.bought).length;
        });
        setShoppingCount(total);
      });

      return () => {
        unsubChores();
        unsubHabits();
        unsubShopping();
      };
    }

    return () => {
      unsubChores();
      unsubHabits();
    };
  }, [user, profile?.familyId]);

  if (!user) {
    return (
      <View style={styles.center}>
        <View style={styles.logoContainer}>
          <HomeIcon size={48} color="#000" />
        </View>
        <Text style={styles.welcomeTitle}>Ecosystem for Haus</Text>
        <Text style={styles.welcomeSubtitle}>Initialize your domestic operating system</Text>
        <TouchableOpacity style={styles.mainBtn} onPress={signIn}>
          <Text style={styles.mainBtnText}>Initialize Connection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const completedChores = myChores.filter(c => c.completed).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Sup, {user.displayName?.split(' ')[0]}</Text>
          <Text style={styles.statusLine}>System Pulse: Optimized</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.profileIcon}>
           <Text style={styles.profileInitial}>{user.displayName?.charAt(0)}</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#f0f7ff' }]}>
          <CheckSquare size={20} color="#3b82f6" />
          <Text style={styles.statValue}>{completedChores}/{myChores.length}</Text>
          <Text style={styles.statLabel}>Tasks</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}>
          <TrendingUp size={20} color="#22c55e" />
          <Text style={styles.statValue}>KES --</Text>
          <Text style={styles.statLabel}>Spend</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#fff7ed' }]}>
          <ShoppingCart size={20} color="#f97316" />
          <Text style={styles.statValue}>{shoppingCount}</Text>
          <Text style={styles.statLabel}>Items</Text>
        </View>
        <TouchableOpacity style={[styles.statCard, { backgroundColor: '#000' }]} onPress={() => {}}>
           <Flame size={20} color="#fff" />
           <Text style={[styles.statValue, { color: '#fff' }]}>2,450</Text>
           <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.4)' }]}>Growth XP</Text>
        </TouchableOpacity>
      </View>

      {/* Main Schedule */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>MY SCHEDULE</Text>
          <TouchableOpacity><ArrowRight size={16} color="#aaa" /></TouchableOpacity>
        </View>
        
        {myChores.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No tasks assigned for today.</Text>
          </View>
        ) : (
          <View style={styles.scheduleList}>
            {myChores.map((task) => (
              <View key={task.id} style={styles.taskItem}>
                <View style={[styles.taskIcon, task.completed && styles.taskIconCompleted]}>
                  {task.completed ? <CheckCircle2 size={20} color="#fff" /> : <Clock size={20} color="#ddd" />}
                </View>
                <View style={styles.taskInfo}>
                  <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>{task.title}</Text>
                  <Text style={styles.taskMeta}>{task.category?.toUpperCase()} • {task.dueTime || 'Anytime'}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Habits Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>GROWTH PULSE</Text>
          <Plus size={16} color="#aaa" />
        </View>
        <View style={styles.habitContainer}>
          {myHabits.map((habit) => (
            <View key={habit.id} style={styles.habitItem}>
              <View style={styles.habitHeader}>
                <Text style={styles.habitName}>{habit.name}</Text>
                <Text style={styles.habitStreak}>{habit.completedDates?.length || 0}d</Text>
              </View>
              <View style={styles.habitProgress}>
                 <View style={[styles.habitFill, { width: `${Math.min(100, ((habit.completedDates?.length || 0) / 7) * 100)}%` }]} />
              </View>
            </View>
          ))}
          {myHabits.length === 0 && (
             <Text style={styles.emptyHabitText}>No habits active in this node.</Text>
          )}
        </View>
      </View>

      {/* Notice Board */}
      <View style={styles.noticeBoard}>
        <Text style={styles.noticeTitle}>Domestic Registry</Text>
        <Text style={styles.noticeBody}>All subsystems are operative. Family ledger and supply chain synchronized.</Text>
        <TouchableOpacity style={styles.noticeBtn}>
           <Text style={styles.noticeBtnText}>View Protocols</Text>
        </TouchableOpacity>
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
    paddingTop: 60,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 40,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '900',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#aaa',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  statusLine: {
    fontSize: 9,
    fontWeight: '900',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 2,
  },
  profileIcon: {
    width: 50,
    height: 50,
    borderRadius: 20,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 30,
  },
  statCard: {
    width: '48%',
    borderRadius: 25,
    padding: 20,
    gap: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ccc',
    letterSpacing: 2.5,
  },
  scheduleList: {
    gap: 12,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fcfcfc',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f5f5f5',
    gap: 15,
  },
  taskIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  taskIconCompleted: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000',
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#bbb',
  },
  taskMeta: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#aaa',
    marginTop: 2,
  },
  habitContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 30,
    padding: 25,
    gap: 15,
  },
  habitItem: {
    gap: 8,
  },
  habitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  habitName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  habitStreak: {
    fontSize: 10,
    fontWeight: '900',
    color: '#f97316',
  },
  habitProgress: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 2,
  },
  habitFill: {
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 2,
  },
  noticeBoard: {
    backgroundColor: '#000',
    borderRadius: 35,
    padding: 35,
    marginTop: 10,
  },
  noticeTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  noticeBody: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 25,
  },
  noticeBtn: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  noticeBtnText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  mainBtn: {
    backgroundColor: '#000',
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 5,
  },
  mainBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fcfcfc',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
  },
  emptyText: {
    color: '#bbb',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  emptyHabitText: {
    color: '#ccc',
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  }
});
