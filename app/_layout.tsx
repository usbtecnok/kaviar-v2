import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { Stack, useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { startNetInfoListener, stopNetInfoListener } from "../src/services/net-info-listener";
import { checkAppVersion, VersionCheckResult } from "../src/services/version-check";
import { UpdateRequiredModal } from "../src/components/UpdateRequiredModal";

const variant = Constants.expoConfig?.extra?.APP_VARIANT as string | undefined;

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
  const [updateInfo, setUpdateInfo] = useState<VersionCheckResult | null>(null);

  useEffect(() => {
    startNetInfoListener();

    const appVariant = variant === 'driver' ? 'driver' : variant === 'passenger' ? 'passenger' : null;
    if (appVariant) {
      checkAppVersion(appVariant).then(setUpdateInfo);
    } else {
      console.warn('[VersionCheck] APP_VARIANT not detected, skipping version check');
    }

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
    <>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
      {updateInfo && (
        <UpdateRequiredModal
          visible
          message={updateInfo.message}
          apkUrl={updateInfo.apkUrl}
        />
      )}
    </>
  );
}
