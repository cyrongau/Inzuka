import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { db } from '../../src/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { Send, Smile, Paperclip, MoreHorizontal, MessageSquare } from 'lucide-react-native';
import { triggerSystemNotification } from '../../src/services/notificationService';

export default function ChatScreen() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  const familyId = profile?.familyId;

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'messages'),
      where('familyId', '==', familyId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse();
      setMessages(msgs);
      setLoading(false);
    });

    return () => unsub();
  }, [familyId]);

  const sendMessage = async () => {
    if (!text.trim() || !familyId || !user) return;
    const msgText = text.trim();
    const msgData = {
      familyId,
      senderId: user.uid,
      senderName: user.displayName || 'Family Member',
      text: msgText,
      createdAt: serverTimestamp(),
    };
    setText('');
    
    // Add message
    await addDoc(collection(db, 'messages'), msgData);

    // Queue system notification for family (SMS/Push)
    triggerSystemNotification({
      userId: user.uid,
      familyId: familyId,
      type: 'push',
      title: 'New Family Sync',
      body: `${user.displayName?.split(' ')[0]}: ${msgText.substring(0, 50)}...`,
      metadata: { type: 'chat', familyId }
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!familyId) {
     return (
       <View style={styles.center}>
         <MessageSquare size={48} color="#eee" />
         <Text style={styles.emptyTitle}>Chat Node Inactive</Text>
         <Text style={styles.emptyText}>Initialize household connection to unlock secure messaging.</Text>
       </View>
     );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
      style={styles.root}
    >
      <ScrollView 
        ref={scrollViewRef}
        style={styles.container} 
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={styles.scrollContent}
      >
        {messages.map((msg) => {
          const isOwn = msg.senderId === user?.uid;
          return (
            <View key={msg.id} style={[styles.msgWrapper, isOwn ? styles.msgOwn : styles.msgOther]}>
              {!isOwn && <Text style={styles.sender}>{msg.senderName}</Text>}
              <View style={[styles.msgBubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                <Text style={[styles.msgText, isOwn ? styles.textOwn : styles.textOther]}>{msg.text}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.inputArea}>
        <TouchableOpacity style={styles.iconBtn}>
          <Paperclip size={20} color="#aaa" />
        </TouchableOpacity>
        <TextInput 
          style={styles.input}
          placeholder="Pulse message..."
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
          <Send size={20} color={text.trim() ? '#fff' : '#aaa'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  scrollContent: {
    padding: 20,
    gap: 15,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#aaa',
    marginTop: 10,
    fontSize: 12,
    fontWeight: 'bold',
  },
  msgWrapper: {
    maxWidth: '80%',
  },
  msgOwn: {
    alignSelf: 'flex-end',
  },
  msgOther: {
    alignSelf: 'flex-start',
  },
  sender: {
    fontSize: 9,
    fontWeight: '900',
    color: '#aaa',
    textTransform: 'uppercase',
    marginBottom: 4,
    marginLeft: 10,
  },
  msgBubble: {
    padding: 15,
    borderRadius: 22,
  },
  bubbleOwn: {
    backgroundColor: '#000',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#f8f8f8',
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontSize: 14,
    fontWeight: '600',
  },
  textOwn: {
    color: '#fff',
  },
  textOther: {
    color: '#000',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    backgroundColor: '#fff',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    maxHeight: 100,
    fontWeight: '600',
  },
  iconBtn: {
    padding: 10,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
