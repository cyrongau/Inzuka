import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { db } from '../../src/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ShoppingBag, Package, Plus, Trash2, CheckCircle2, Circle, ChevronRight } from 'lucide-react-native';
import { showToast, triggerSystemNotification } from '../../src/services/notificationService';

export default function ShoppingScreen() {
  const { user, profile } = useAuth();
  const [lists, setLists] = useState<any[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [pantryItems, setPantryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'lists' | 'pantry'>('lists');
  const [newItemName, setNewItemName] = useState('');

  const familyId = profile?.familyId;

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }

    const unsubLists = onSnapshot(query(collection(db, 'shoppingLists'), where('familyId', '==', familyId)), (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setLists(data);
      if (data.length > 0 && !selectedListId) setSelectedListId(data[0].id);
      setLoading(false);
    });

    const unsubPantry = onSnapshot(query(collection(db, 'inventory'), where('familyId', '==', familyId)), (s) => {
      setPantryItems(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubLists(); unsubPantry(); };
  }, [familyId]);

  const addItem = async () => {
    if (!newItemName.trim() || !selectedListId) return;
    const list = lists.find(l => l.id === selectedListId);
    const listRef = doc(db, 'shoppingLists', selectedListId);
    const updatedItems = [...(list?.items || []), { 
      id: Date.now().toString(), 
      name: newItemName, 
      bought: false 
    }];
    await updateDoc(listRef, { items: updatedItems });
    setNewItemName('');
  };

  const toggleItem = async (itemId: string) => {
    if (!selectedListId) return;
    const list = lists.find(l => l.id === selectedListId);
    const item = list.items.find((i: any) => i.id === itemId);
    const newState = !item.bought;
    const updatedItems = list.items.map((i: any) => i.id === itemId ? { ...i, bought: newState } : i);
    await updateDoc(doc(db, 'shoppingLists', selectedListId), { items: updatedItems });
    
    if (newState) {
       showToast('success', { title: 'Supply Acquired', message: `${item.name} has been added to the pantry.` });
       triggerSystemNotification({
         userId: user!.uid,
         familyId: profile!.familyId,
         type: 'push',
         title: 'Supply Chain Update',
         body: `${user?.displayName?.split(' ')[0]} bought: ${item.name}`,
         metadata: { type: 'shopping', itemId }
       });
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!selectedListId) return;
    const list = lists.find(l => l.id === selectedListId);
    const updatedItems = list.items.filter((i: any) => i.id !== itemId);
    await updateDoc(doc(db, 'shoppingLists', selectedListId), { items: updatedItems });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const selectedList = lists.find(l => l.id === selectedListId);

  return (
    <View style={styles.root}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Supply Chain</Text>
          <Text style={styles.subtitle}>Household Resource Sync</Text>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity 
            onPress={() => setActiveTab('lists')}
            style={[styles.tab, activeTab === 'lists' && styles.tabActive]}
          >
            <ShoppingBag size={18} color={activeTab === 'lists' ? '#fff' : '#aaa'} />
            <Text style={[styles.tabText, activeTab === 'lists' && styles.tabTextActive]}>Lists</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab('pantry')}
            style={[styles.tab, activeTab === 'pantry' && styles.tabActive]}
          >
            <Package size={18} color={activeTab === 'pantry' ? '#fff' : '#aaa'} />
            <Text style={[styles.tabText, activeTab === 'pantry' && styles.tabTextActive]}>Pantry</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'lists' ? (
          <View style={styles.tabContent}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.listGroups}>
              {lists.map(l => (
                <TouchableOpacity 
                  key={l.id} 
                  onPress={() => setSelectedListId(l.id)}
                  style={[styles.groupBtn, selectedListId === l.id && styles.groupBtnActive]}
                >
                  <Text style={[styles.groupText, selectedListId === l.id && styles.groupTextActive]}>{l.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedList && (
              <View style={styles.activeList}>
                <View style={styles.addInputRow}>
                  <TextInput 
                    style={styles.input}
                    placeholder="Add item..."
                    value={newItemName}
                    onChangeText={setNewItemName}
                  />
                  <TouchableOpacity onPress={addItem} style={styles.addBtn}>
                    <Plus size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                <View style={styles.itemsList}>
                  {selectedList.items?.map((item: any) => (
                    <View key={item.id} style={[styles.item, item.bought && styles.itemBought]}>
                      <TouchableOpacity onPress={() => toggleItem(item.id)}>
                        {item.bought ? <CheckCircle2 size={24} color="#000" /> : <Circle size={24} color="#eee" />}
                      </TouchableOpacity>
                      <Text style={[styles.itemText, item.bought && styles.itemTextBought]}>{item.name}</Text>
                      <TouchableOpacity onPress={() => deleteItem(item.id)}>
                        <Trash2 size={18} color="#eee" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.tabContent}>
            <View style={styles.pantryGrid}>
              {pantryItems.map(item => (
                <View key={item.id} style={styles.pantryCard}>
                  <Text style={styles.pantryCat}>{item.category}</Text>
                  <Text style={styles.pantryName}>{item.name}</Text>
                  <Text style={styles.pantryQty}>{item.quantity} {item.unit}</Text>
                  <View style={styles.pantryActions}>
                    <TouchableOpacity 
                      onPress={() => updateDoc(doc(db, 'inventory', item.id), { quantity: Math.max(0, item.quantity - 1) })}
                      style={styles.pantryBtn}
                    >
                      <Text>-</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => updateDoc(doc(db, 'inventory', item.id), { quantity: item.quantity + 1 })}
                      style={styles.pantryBtn}
                    >
                      <Text>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
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
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginBottom: 25,
  },
  title: {
    fontSize: 32,
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
  tabs: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 15,
  },
  tabActive: {
    backgroundColor: '#000',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#aaa',
    textTransform: 'uppercase',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabContent: {
    gap: 20,
  },
  listGroups: {
    marginBottom: 10,
  },
  groupBtn: {
    marginRight: 10,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
  },
  groupBtnActive: {
    backgroundColor: '#000',
  },
  groupText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#aaa',
  },
  groupTextActive: {
    color: '#fff',
  },
  activeList: {
    gap: 20,
  },
  addInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 15,
    padding: 15,
    fontWeight: 'bold',
  },
  addBtn: {
    backgroundColor: '#000',
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsList: {
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 20,
    padding: 15,
    gap: 15,
  },
  itemBought: {
    opacity: 0.5,
    borderColor: 'transparent',
    backgroundColor: '#f8f8f8',
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemTextBought: {
    textDecorationLine: 'line-through',
    color: '#aaa',
  },
  pantryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  pantryCard: {
    width: '47%',
    backgroundColor: '#f8f8f8',
    borderRadius: 25,
    padding: 20,
    gap: 5,
  },
  pantryCat: {
    fontSize: 8,
    fontWeight: '900',
    color: '#ccc',
    textTransform: 'uppercase',
  },
  pantryName: {
    fontSize: 14,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  pantryQty: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 5,
  },
  pantryActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  pantryBtn: {
    backgroundColor: '#fff',
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  }
});
