import React from 'react';
import { View, Text, TouchableOpacity, Alert, SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { Home, Users, ArrowRight, ShieldCheck } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface HubSelectorProps {
  onSelect: (hub: 'family' | 'community') => void;
  hasFamily: boolean;
  user: any;
}

export default function HubSelector({ onSelect, hasFamily, user }: HubSelectorProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.header}>
          <Text style={styles.title}>
            Choose Your Focus.
          </Text>
          <Text style={styles.subtitle}>
            Welcome back, {user?.displayName || 'User'}. Where would you like to direct your energy today?
          </Text>
        </Animated.View>

        <View style={styles.cardsContainer}>
          {/* Family Hub Card */}
          <Animated.View entering={FadeInUp.delay(200).springify()}>
            <TouchableOpacity 
              onPress={() => onSelect('family')}
              style={styles.card}
              activeOpacity={0.8}
            >
              <View style={[styles.iconContainer, styles.orangeBg]}>
                <Home size={32} color="#ea580c" />
              </View>
              <Text style={styles.cardTitle}>Family Hub</Text>
              <Text style={styles.cardDescription}>
                Manage your household, track budgets, organize chores, and coordinate schedules with your immediate family.
              </Text>
              <View style={styles.actionRow}>
                <Text style={[styles.actionText, styles.orangeText]}>ENTER SANDBOX</Text>
                <ArrowRight size={16} color="#ea580c" />
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Community Hub Card */}
          <Animated.View entering={FadeInUp.delay(300).springify()}>
            <TouchableOpacity 
              onPress={() => hasFamily 
                ? onSelect('community') 
                : Alert.alert('Required', 'You must join or create a Family Hub first before accessing Community Networks.')
              }
              style={[styles.cardDark, !hasFamily && styles.disabledCard]}
              activeOpacity={0.8}
            >
              <View style={[styles.iconContainer, styles.darkIconBg]}>
                 <Users size={32} color="#60a5fa" />
              </View>
              
              <Text style={styles.cardTitleDark}>Community Hub</Text>
              <Text style={styles.cardDescriptionDark}>
                Expand your network. Manage fundraising, table banking, support groups, and extended social circles.
              </Text>

              {!hasFamily ? (
                <View style={styles.actionRow}>
                  <ShieldCheck size={16} color="#f87171" />
                  <Text style={[styles.actionText, styles.redText, {marginLeft: 4}]}>REQUIRES FAMILY REGISTRATION</Text>
                </View>
              ) : (
                <View style={styles.actionRow}>
                  <Text style={[styles.actionText, styles.blueText]}>EXPLORE NETWORKS</Text>
                  <ArrowRight size={16} color="#60a5fa" />
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    fontStyle: 'italic',
    marginBottom: 16,
    color: '#000',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 300,
  },
  cardsContainer: {
    gap: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cardDark: {
    backgroundColor: '#030712',
    borderRadius: 32,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  disabledCard: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  orangeBg: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  darkIconBg: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: '900',
    fontStyle: 'italic',
    marginBottom: 12,
    color: '#000',
  },
  cardTitleDark: {
    fontSize: 28,
    fontWeight: '900',
    fontStyle: 'italic',
    marginBottom: 12,
    color: '#fff',
  },
  cardDescription: {
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 24,
    lineHeight: 22,
  },
  cardDescriptionDark: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    marginBottom: 24,
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginRight: 8,
  },
  orangeText: {
    color: '#ea580c',
  },
  blueText: {
    color: '#60a5fa',
  },
  redText: {
    color: '#f87171'
  }
});
