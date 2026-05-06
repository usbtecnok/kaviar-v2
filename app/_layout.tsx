import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
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
  useEffect(() => {
    startNetInfoListener();
    return () => stopNetInfoListener();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
