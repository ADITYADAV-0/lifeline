import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';


import { useColorScheme } from '@/components/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const symbolName = (name: string) => name as ComponentProps<typeof SymbolView>['name'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0058bc',
        tabBarInactiveTintColor: '#75777e',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#c5c6ce',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 60,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 4,
        },
      }}>
      <Tabs.Screen
  name="vitals"
  options={{
    title: 'Dashboard',
    tabBarIcon: ({ color, focused }) => (
      <Ionicons
        name={focused ? 'heart-circle' : 'heart-circle-outline'}
        color={color}
        size={24}
      />
    ),
  }}
/>
<Tabs.Screen
  name="map"
  options={{
    title: 'Map',
    tabBarIcon: ({ color, focused }) => (
      <Ionicons
        name={focused ? 'map' : 'map-outline'}
        color={color}
        size={24}
      />
    ),
  }}
/>
<Tabs.Screen
  name="medical-id"
  options={{
    title: 'Profile',
    tabBarIcon: ({ color, focused }) => (
      <Ionicons
        name={focused ? 'person-circle' : 'person-circle-outline'}
        color={color}
        size={24}
      />
    ),
  }}
/>
<Tabs.Screen
  name="medica"
  options={{
    title: 'Medica',
    tabBarIcon: ({ color, focused }) => (
      <Ionicons
        name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
        color={color}
        size={24}
      />
    ),
  }}
/>
</Tabs>
  );
}
