import type { Href } from 'expo-router';

import type { UserRole } from '@/services/appData';

export type RoleRouteRole = UserRole | 'Bloodbank';

export function getHomeRouteForRole(role: RoleRouteRole): Href {
  switch (role) {
    case 'ambulance':
      return '/(ambulance)' as Href;
    case 'BloodBank':
    case 'Bloodbank':
      return '/(bloodbank)/bloodbank' as Href;
    case 'government':
      return '/(government)/index' as Href;
    case 'citizen':
    default:
      return '/(citizen)/vitals';
  }
}

export function getProfileSetupRouteForRole(role: RoleRouteRole): Href {
  switch (role) {
    case 'ambulance':
      return '/(ambulance)/profile-setup' as Href;
    case 'BloodBank':
    case 'Bloodbank':
      return '/(bloodbank)/profile-setup' as Href;
    case 'government':
      return '/(government)/profile-setup' as Href;
    case 'citizen':
    default:
      return '/Profile-setup';
  }
}
