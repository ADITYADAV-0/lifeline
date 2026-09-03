import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Href, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { getCurrentUser } from '@/services/appData';
import { hasRoleProfile } from '@/services/roleProfiles';

export default function GovernmentLayout() {
  const router = useRouter();

  useEffect(() => {
    getCurrentUser().then(async (user) => {
      if (user?.role === 'government' && !(await hasRoleProfile('government', user.id))) {
        router.replace('/(government)/profile-setup' as Href);
      }
    });
  }, [router]);

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
      }}
    >
      <Tabs.Screen
        name="profile-setup"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Government',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'business' : 'business-outline'}
              color={color}
              size={22}
            />
          ),
        }}
      />
    </Tabs>
  );
}
