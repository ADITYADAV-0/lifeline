import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Href, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { getCurrentUser } from '@/services/appData';
import { hasRoleProfile } from '@/services/roleProfiles';

export default function AmbulanceLayout() {
  const router = useRouter();

  useEffect(() => {
    getCurrentUser().then(async (user) => {
      if (user?.role === 'ambulance' && !(await hasRoleProfile('ambulance', user.id))) {
        router.replace('/(ambulance)/profile-setup' as Href);
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
          title: 'Ambulance',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'car' : 'car-outline'}
              color={color}
              size={22}
            />
          ),
        }}
      />
    </Tabs>
  );
}
