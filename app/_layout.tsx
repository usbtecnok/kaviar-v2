import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import * as Notifications from "expo-notifications";
import { startNetInfoListener, stopNetInfoListener } from "../src/services/net-info-listener";

const variant = process.env.EXPO_PUBLIC_APP_VARIANT;

if (variant === 'driver') {
  if (Platform.OS === 'android') {
    // Deletar canais antigos (som imutável — ficam travados com som default)
    Notifications.deleteNotificationChannelAsync('rides');
    Notifications.deleteNotificationChannelAsync('rides_kaviar');
    Notifications.deleteNotificationChannelAsync('rides_kaviar_v2');
    Notifications.deleteNotificationChannelAsync('rides_kaviar_v3');

    // Criar canal com som customizado — top-level, antes do React montar
    Notifications.setNotificationChannelAsync('rides_kaviar_v4', {
      name: 'Corridas KAVIAR',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'kaviar_ride.wav',
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
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
