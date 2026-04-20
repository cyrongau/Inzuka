import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Zap, TrendingUp, ShoppingCart, CheckSquare, Activity, CheckCircle2, Clock, Calendar as CalendarIcon, ChevronRight } from 'lucide-react-native';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';

export default function Dashboard({ user, profile }: any) {
  const [myChores, setMyChores] = useState<any[]>([]);
  const familyId = profile?.familyId;

  useEffect(() => {
    if (!user || !familyId) return;

    // Fetch Chores
    const qChores = query(collection(db, 'chores'), where('familyId', '==', familyId));
    const unsubscribeChores = onSnapshot(qChores, (snap) => {
      const allChores = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const myActiveChores = allChores.filter(c => c.assigneeId === user.uid && !c.completed);
      setMyChores(myActiveChores);
    });

    return () => {
      unsubscribeChores();
    };
  }, [user?.uid, familyId]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeIn.duration(500)}>
        <View style={styles.banner}>
          <Image 
            source={{ uri: `https://picsum.photos/seed/${familyId || 'home'}/800/400` }} 
            style={StyleSheet.absoluteFillObject}
            blurRadius={2}
          />
          <View style={styles.bannerOverlay} />
          
          <Text style={styles.bannerTitle}>Welcome to the Home</Text>
          
          <View style={styles.bannerMetaRow}>
            <Text style={styles.bannerSubtitle}>{user?.displayName}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{profile?.familyRole || 'Resident'}</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard title="Growth XP" value="2,450 XP" icon={<Zap color="#ca8a04" size={24} />} bg="#fefce8" delay={100} />
        <StatCard title="Tasks Today" value={`${myChores.length} Pending`} icon={<CheckSquare color="#3b82f6" size={24} />} bg="#eff6ff" delay={200} />
      </View>
      <View style={styles.statsGrid}>
        <StatCard title="Total Spent" value="KES --" icon={<TrendingUp color="#22c55e" size={24} />} bg="#f0fdf4" delay={300} />
        <StatCard title="Shopping List" value="Loading..." icon={<ShoppingCart color="#f97316" size={24} />} bg="#fff7ed" delay={400} />
      </View>

      {/* Schedule */}
      <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Activity size={20} color="#000" />
            <Text style={styles.cardTitle}>My Schedule</Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.linkText}>View All</Text>
          </TouchableOpacity>
        </View>

        {myChores.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No tasks assigned to you tonight</Text>
          </View>
        ) : (
          myChores.map((task) => (
            <View key={task.id} style={styles.taskItem}>
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 }}>
                <View style={styles.taskIconBg}>
                  <Clock color="#9ca3af" size={20} />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                  <Text style={styles.taskMeta}>{task.category} • {task.dueTime || 'Anytime'}</Text>
                </View>
              </View>
              <View style={styles.statusBadge}>
                 <Text style={styles.statusBadgeText}>PENDING</Text>
              </View>
            </View>
          ))
        )}
      </Animated.View>

    </ScrollView>
  );
}

function StatCard({ title, value, icon, bg, delay }: any) {
  return (
    <Animated.View entering={FadeInUp.delay(delay).springify()} style={styles.statCard}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
        <View style={[styles.statIconContainer, { backgroundColor: bg }]}>
          {icon}
        </View>
      </View>
      <Text style={styles.statLabel}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 60,
    gap: 16,
  },
  banner: {
    height: 240,
    borderRadius: 32,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '900',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  bannerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  roleText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardTitleRow: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontStyle: 'italic',
    color: '#000',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    marginBottom: 12,
  },
  taskIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  taskMeta: {
    fontSize: 10,
    fontWeight: '900',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusBadge: {
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  }
});
