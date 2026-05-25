import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack, useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { startNetInfoListener, stopNetInfoListener } from "../src/services/net-info-listener";

const variant = process.env.EXPO_PUBLIC_APP_VARIANT;

if (variant === 'driver') {
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('rides', {
      name: 'Corridas',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
    });
    Notifications.setNotificationChannelAsync('rides_kaviar', {
      name: 'Corridas KAVIAR',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'kaviar_ride.wav',
    });
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    startNetInfoListener();

    // Driver: navigate to online screen when tapping push notification
    let responseSub: Notifications.Subscription | undefined;
    if (variant === 'driver') {
      responseSub = Notifications.addNotificationResponseReceivedListener(() => {
        router.push('/(driver)/online');
      });
    }

    return () => {
      stopNetInfoListener();
      responseSub?.remove();
    };
  }, [router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
