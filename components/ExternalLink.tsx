import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';

export function ExternalLink(props: Omit<ComponentProps<typeof Link>, 'href'> & { href: string | { pathname: string } }) {
  return (
    <Link
      target="_blank"
      {...props}
      href={typeof props.href === 'string' ? (props.href as any) : ({ pathname: props.href.pathname } as any)}
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          // Prevent the default behavior of linking to the default browser on native.
          e.preventDefault();
          // Open the link in an in-app browser.
          WebBrowser.openBrowserAsync(typeof props.href === 'string' ? props.href : String(props.href));
        }
      }}
    />
  );
}
