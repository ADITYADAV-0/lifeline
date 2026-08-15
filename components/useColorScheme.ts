import { useColorScheme as useColorSchemeCore } from 'react-native';

export const useColorScheme = () => {
  const coreScheme = useColorSchemeCore();
  const resolved = coreScheme === 'dark' || coreScheme === 'light' ? coreScheme : 'light';
  return resolved as 'light' | 'dark';
};
