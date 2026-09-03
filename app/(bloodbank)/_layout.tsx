import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Href, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { getCurrentUser } from '@/services/appData';
import { hasRoleProfile } from '@/services/roleProfiles';

export default function BloodBankLayout() {
  const router = useRouter();

  useEffect(() => {
    getCurrentUser().then(async (user) => {
      if (user?.role === 'BloodBank' && !(await hasRoleProfile('BloodBank', user.id))) {
        router.replace('/(bloodbank)/profile-setup' as Href);
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
        name="bloodbank"
        options={{
          title: 'Blood Bank',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'water' : 'water-outline'}
              color={color}
              size={22}
            />
          ),
        }}
      />
    </Tabs>
  );
}
