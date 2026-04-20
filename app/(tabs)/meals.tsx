import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { db } from '../../src/lib/firebase';
import { collection, query, where, onSnapshot, setDoc, doc } from 'firebase/firestore';
import { Coffee, Sun, Moon, ChevronLeft, ChevronRight, Utensils } from 'lucide-react-native';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', icon: Coffee },
  { id: 'lunch', label: 'Lunch', icon: Sun },
  { id: 'dinner', label: 'Dinner', icon: Moon },
];

export default function MealsScreen() {
  const { user, profile } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const familyId = profile?.familyId;

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'mealPlans'), where('familyId', '==', familyId));
    const unsub = onSnapshot(q, (snapshot) => {
      setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, [familyId]);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getPlanForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return plans.find(p => p.date === dateStr) || { date: dateStr, meals: {} };
  };

  const activePlan = getPlanForDate(selectedDate);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Nourishment</Text>
        <Text style={styles.subtitle}>Family Menu Layer</Text>
      </View>

      <View style={styles.navigator}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navScroll}>
          {weekDays.map((day, i) => {
            const isSelected = isSameDay(day, selectedDate);
            return (
              <TouchableOpacity
                key={i}
                onPress={() => setSelectedDate(day)}
                style={[styles.dayCard, isSelected && styles.dayCardActive]}
              >
                <Text style={[styles.dayName, isSelected && styles.dayNameActive]}>{format(day, 'EEE').toUpperCase()}</Text>
                <Text style={[styles.dayNum, isSelected && styles.dayNumActive]}>{format(day, 'd')}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.planSection}>
        <View style={styles.planHeader}>
           <Text style={styles.planDate}>{format(selectedDate, 'EEEE, MMMM do')}</Text>
        </View>

        <View style={styles.mealsList}>
          {MEAL_TYPES.map(type => (
            <View key={type.id} style={styles.mealItem}>
              <View style={styles.mealIcon}>
                <type.icon size={22} color="#000" />
              </View>
              <View style={styles.mealInfo}>
                <Text style={styles.mealType}>{type.label.toUpperCase()}</Text>
                <Text style={styles.mealName}>{activePlan.meals?.[type.id] || 'Nothing planned'}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.recipeBtn}>
        <Utensils size={20} color="#000" />
        <Text style={styles.recipeBtnText}>Browse Recipe Book</Text>
      </TouchableOpacity>
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
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  subtitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  navigator: {
    marginVertical: 20,
  },
  navScroll: {
    gap: 12,
  },
  dayCard: {
    width: 65,
    height: 85,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  dayCardActive: {
    backgroundColor: '#000',
  },
  dayName: {
    fontSize: 8,
    fontWeight: '900',
    color: '#aaa',
  },
  dayNameActive: {
    color: 'rgba(255,255,255,0.4)',
  },
  dayNum: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
  },
  dayNumActive: {
    color: '#fff',
  },
  planSection: {
    marginTop: 20,
    gap: 20,
  },
  planHeader: {
    marginBottom: 10,
  },
  planDate: {
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  mealsList: {
    gap: 15,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 20,
    borderRadius: 25,
    gap: 15,
  },
  mealIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealInfo: {
    flex: 1,
  },
  mealType: {
    fontSize: 8,
    fontWeight: '900',
    color: '#aaa',
    letterSpacing: 1.5,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000',
    fontStyle: 'italic',
  },
  recipeBtn: {
    marginTop: 40,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
    padding: 25,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  recipeBtnText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  }
});
