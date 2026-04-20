import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated } from 'react-native';
import { CheckCircle2, Circle, Clock, User as UserIcon, ListTodo, Trash2, ChevronDown, Package } from 'lucide-react-native';
import { format, isAfter, startOfDay } from 'date-fns';

interface TaskItemProps {
  chore: any;
  onToggle: () => void;
  onDelete: () => void;
  onToggleCheckList: (id: string) => void;
  onLogSupplies: () => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  chore,
  onToggle,
  onDelete,
  onToggleCheckList,
  onLogSupplies
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isOverdue = !chore.completed && chore.dueDate && isAfter(startOfDay(new Date()), startOfDay(new Date(chore.dueDate)));

  const completedSteps = chore.checkList?.filter((i: any) => i.completed).length || 0;
  const totalSteps = chore.checkList?.length || 0;

  return (
    <View style={[
      styles.container,
      chore.completed ? styles.completedContainer : styles.activeContainer
    ]}>
      <View style={styles.mainRow}>
        <TouchableOpacity 
          style={[styles.checkBtn, chore.completed ? styles.checkBtnCompleted : styles.checkBtnActive]}
          onPress={onToggle}
        >
          {chore.completed ? <CheckCircle2 size={24} color="#fff" /> : <Circle size={24} color="#eee" />}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.content}
          onPress={() => setIsExpanded(!isExpanded)}
        >
          <View style={styles.titleContainer}>
            <Text style={[styles.title, chore.completed && styles.titleCompleted]}>
              {chore.title}
            </Text>
            {totalSteps > 0 && (
              <View style={styles.badge}>
                <ListTodo size={10} color="#aaa" />
                <Text style={styles.badgeText}>{completedSteps}/{totalSteps}</Text>
              </View>
            )}
          </View>

          <View style={styles.meta}>
            <Text style={styles.metaText}>{chore.category?.toUpperCase()}</Text>
            <View style={styles.dot} />
            <View style={styles.metaItem}>
              <UserIcon size={12} color="#aaa" />
              <Text style={styles.metaText}>{chore.assignedTo}</Text>
            </View>
            {chore.dueDate && (
              <>
                <View style={styles.dot} />
                <View style={styles.metaItem}>
                  <Clock size={12} color={isOverdue ? "#ef4444" : "#aaa"} />
                  <Text style={[styles.metaText, isOverdue && styles.overdueText]}>
                    {format(new Date(chore.dueDate), 'MMM d')}
                  </Text>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} style={styles.expandBtn}>
          <ChevronDown size={20} color="#ddd" style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} />
        </TouchableOpacity>
      </View>

      {isExpanded && (
        <View style={styles.expandedContent}>
          {totalSteps > 0 && (
            <View style={styles.checklist}>
              <Text style={styles.sectionLabel}>Sequencing Log</Text>
              <View style={styles.stepsGrid}>
                {chore.checkList.map((item: any) => (
                  <TouchableOpacity 
                    key={item.id}
                    onPress={() => onToggleCheckList(item.id)}
                    style={[styles.stepItem, item.completed && styles.stepItemCompleted]}
                  >
                    <View style={[styles.stepDot, item.completed && styles.stepDotCompleted]}>
                      {item.completed && <CheckCircle2 size={10} color="#fff" />}
                    </View>
                    <Text style={[styles.stepText, item.completed && styles.stepTextCompleted]}>
                      {item.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity onPress={onLogSupplies} style={styles.supplyBtn}>
              <Package size={14} color="#4f46e5" />
              <Text style={styles.supplyBtnText}>Log Supply Inflow</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
              <Trash2 size={18} color="#fca5a5" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 30,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  activeContainer: {
    backgroundColor: '#fff',
    borderColor: 'rgba(0,0,0,0.05)',
  },
  completedContainer: {
    backgroundColor: '#f9f9f9',
    borderColor: 'transparent',
    opacity: 0.7,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  checkBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnActive: {
    backgroundColor: '#f8f8f8',
  },
  checkBtnCompleted: {
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    marginLeft: 15,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#000',
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: '#aaa',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#aaa',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overdueText: {
    color: '#ef4444',
  },
  dot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#ddd',
  },
  expandBtn: {
    padding: 10,
  },
  expandedContent: {
    padding: 20,
    paddingTop: 0,
    gap: 15,
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#ccc',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  checklist: {
    backgroundColor: '#fcfcfc',
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  stepsGrid: {
    gap: 8,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    gap: 10,
  },
  stepItemCompleted: {
    opacity: 0.6,
    backgroundColor: '#f8f8f8',
  },
  stepDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotCompleted: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  stepText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  stepTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  supplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
  },
  supplyBtnText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#4f46e5',
    textTransform: 'uppercase',
  },
  deleteBtn: {
    padding: 10,
  }
});
