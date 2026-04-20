import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Plus, Calendar, Clock, Bell, BellOff, User as UserIcon, X, Brain } from 'lucide-react-native';
import { format } from 'date-fns';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface ChoreFormProps {
  userId: string;
  familyId: string;
  familyMembers: any[];
  categories: any[];
  onSuccess: () => void;
  onCancel: () => void;
}

export const ChoreForm: React.FC<ChoreFormProps> = ({
  userId,
  familyId,
  familyMembers,
  categories,
  onSuccess,
  onCancel
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(categories[0].id);
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [newStep, setNewStep] = useState('');
  const [checkList, setCheckList] = useState<{id: string, text: string, completed: boolean}[]>([]);

  const addStep = () => {
    if (!newStep.trim()) return;
    setCheckList([...checkList, { id: Date.now().toString(), text: newStep, completed: false }]);
    setNewStep('');
  };

  const removeStep = (id: string) => {
    setCheckList(checkList.filter(s => s.id !== id));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !familyId) return;

    let finalAssigneeName = 'Unassigned';
    if (assigneeId) {
      const member = familyMembers.find(m => m.uid === assigneeId);
      finalAssigneeName = member?.displayName || member?.email || 'Unknown';
    }

    try {
      await addDoc(collection(db, 'chores'), {
        title,
        category,
        assignedTo: finalAssigneeName,
        assignedToUserId: assigneeId,
        dueDate,
        remindersEnabled,
        checkList,
        completed: false,
        createdBy: userId,
        familyId: familyId,
        createdAt: serverTimestamp()
      });
      onSuccess();
    } catch (e) {
      console.error(e);
      alert('Failed to sequence chore.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Sequence Chore</Text>
          <Text style={styles.subtitle}>Initialize Task Node</Text>
        </View>
        <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
          <X size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Task Identity</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Purify the main hall"
          value={title}
          onChangeText={setTitle}
          placeholderTextColor="#aaa"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Task Domains</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setCategory(cat.id)}
              style={[styles.catBtn, category === cat.id && styles.catBtnActive]}
            >
              <Text style={[styles.catText, category === cat.id && styles.catTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Assignee Agent</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberScroll}>
          {familyMembers.map(member => (
            <TouchableOpacity
              key={member.uid}
              onPress={() => setAssigneeId(member.uid)}
              style={[styles.memberBtn, assigneeId === member.uid && styles.memberBtnActive]}
            >
              <Text style={[styles.memberText, assigneeId === member.uid && styles.memberTextActive]}>
                {member.displayName || member.email?.split('@')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.checklistSection}>
        <Text style={styles.label}>Checklist Sequencing</Text>
        <View style={styles.addStepRow}>
          <TextInput
            style={styles.stepInput}
            placeholder="Define next step..."
            value={newStep}
            onChangeText={setNewStep}
            placeholderTextColor="#aaa"
          />
          <TouchableOpacity onPress={addStep} style={styles.addStepBtn}>
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        {checkList.map((item, idx) => (
          <View key={item.id} style={styles.stepItem}>
            <Text style={styles.stepNumber}>0{idx + 1}</Text>
            <Text style={styles.stepText}>{item.text}</Text>
            <TouchableOpacity onPress={() => removeStep(item.id)}>
              <X size={16} color="#ddd" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <TouchableOpacity onPress={handleSubmit} style={styles.submitBtn}>
        <Text style={styles.submitBtnText}>SEQUENCE CHORE</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  content: {
    padding: 30,
    gap: 25,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
  closeBtn: {
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 15,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ccc',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontStyle: 'italic',
    paddingLeft: 5,
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    padding: 20,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  catScroll: {
    gap: 10,
  },
  catBtn: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  catBtnActive: {
    backgroundColor: '#000',
  },
  catText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#aaa',
    textTransform: 'uppercase',
  },
  catTextActive: {
    color: '#fff',
  },
  memberScroll: {
    gap: 10,
  },
  memberBtn: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 15,
  },
  memberBtnActive: {
    backgroundColor: '#000',
  },
  memberText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#aaa',
  },
  memberTextActive: {
    color: '#fff',
  },
  checklistSection: {
    gap: 12,
  },
  addStepRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stepInput: {
    flex: 1,
    backgroundColor: '#fcfcfc',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#eee',
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 13,
    fontWeight: 'bold',
  },
  addStepBtn: {
    backgroundColor: '#000',
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#f8f8f8',
    gap: 12,
  },
  stepNumber: {
    fontSize: 8,
    fontWeight: '900',
    color: '#ccc',
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#555',
  },
  submitBtn: {
    backgroundColor: '#000',
    paddingVertical: 20,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3,
  }
});
