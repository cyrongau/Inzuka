import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Receipt, UtensilsCrossed, ShoppingBag, CheckSquare, Wallet, MessageSquare, Zap } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { View } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { usePushNotifications } from '../../src/hooks/usePushNotifications';

export default function TabLayout() {
  const { user } = useAuth();
  
  // Initialize Push Notifications
  usePushNotifications(user?.uid);

  return (
    <View style={{ flex: 1 }}>
      <Tabs screenOptions={{
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#999',
        headerShown: true,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#eee',
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
          marginBottom: 5,
        }
      }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <Home size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="budget"
          options={{
            title: 'Budget',
            tabBarIcon: ({ color }) => <Receipt size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="meals"
          options={{
            title: 'Kitchen',
            tabBarIcon: ({ color }) => <UtensilsCrossed size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="shopping"
          options={{
            title: 'Shop',
            tabBarIcon: ({ color }) => <ShoppingBag size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="chores"
          options={{
            title: 'Pulse',
            tabBarIcon: ({ color }) => <CheckSquare size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="growth"
          options={{
            title: 'Growth',
            tabBarIcon: ({ color }) => <Zap size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            tabBarIcon: ({ color }) => <MessageSquare size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="wallet"
          options={{
            title: 'Wallet',
            tabBarIcon: ({ color }) => <Wallet size={24} color={color} />,
          }}
        />
      </Tabs>
      <Toast />
    </View>
  );
}
