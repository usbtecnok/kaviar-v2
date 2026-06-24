import { useEffect, useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import { Stack, useRouter, usePathname } from "expo-router";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { startNetInfoListener, stopNetInfoListener } from "../src/services/net-info-listener";
import { checkAppVersion, VersionCheckResult } from "../src/services/version-check";
import { attemptOtaUpdate } from "../src/services/ota-updates";
import { UpdateRequiredModal } from "../src/components/UpdateRequiredModal";
import { NetworkProvider } from "../src/hooks/useNetworkStatus";
import { OfflineBanner } from "../src/components/OfflineBanner";
import { RIDE_QUICK_MESSAGE_TEXT_BY_CODE } from "../src/config/rideMessages";

const variant = Constants.expoConfig?.extra?.APP_VARIANT as string | undefined;

function parseRideNotification(data: unknown) {
  if (!data || typeof data !== 'object') return null;
  const payload = data as Record<string, unknown>;
  if (payload.type === 'ride_message') {
    const rideId = typeof payload.rideId === 'string' ? payload.rideId : '';
    const messageId = typeof payload.messageId === 'string' ? payload.messageId : '';
    const messageCode = typeof payload.messageCode === 'string' ? payload.messageCode : '';
    if (!rideId || !messageId || !messageCode) return null;
    return { type: 'ride_message' as const, rideId, messageId, messageCode };
  }
  if (payload.type === 'ride_cancelled') {
    const rideId = typeof payload.rideId === 'string' ? payload.rideId : '';
    const cancelledBy = payload.cancelledBy === 'passenger' || payload.cancelledBy === 'driver' ? payload.cancelledBy : null;
    if (!rideId || !cancelledBy) return null;
    return { type: 'ride_cancelled' as const, rideId, cancelledBy };
  }
  return null;
const rideNotificationState = (globalThis as any).__kaviarRideNotificationState || ((globalThis as any).__kaviarRideNotificationState = {
  seenMessageIds: new Set<string>(),
  seenCancelKeys: new Set<string>(),
});
}

if (variant === 'driver' || variant === 'passenger') {
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
  const pathname = usePathname();
  const [updateInfo, setUpdateInfo] = useState<VersionCheckResult | null>(null);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    startNetInfoListener();

    const appVariant = variant === 'driver' ? 'driver' : variant === 'passenger' ? 'passenger' : null;
    (async () => {
      if (!appVariant) {
        console.warn('[VersionCheck] APP_VARIANT not detected, skipping version check');
        return;
      }

      const applied = await attemptOtaUpdate();
      if (applied) return;

      const versionInfo = await checkAppVersion(appVariant);
      setUpdateInfo(versionInfo);
    })();

    let responseSub: Notifications.Subscription | undefined;
    let receivedSub: Notifications.Subscription | undefined;
    if (variant === 'driver' || variant === 'passenger') {
      receivedSub = Notifications.addNotificationReceivedListener((notification) => {
        const rideEvent = parseRideNotification(notification.request.content.data);
        if (!rideEvent) return;

        if (rideEvent.type === 'ride_message') {
          rideNotificationState.seenMessageIds.add(rideEvent.messageId);
        }

        if (rideEvent.type === 'ride_cancelled') {
          rideNotificationState.seenCancelKeys.add(rideEvent.rideId + ':' + rideEvent.cancelledBy);
        }

        const isRideScreen = pathnameRef.current?.startsWith('/(driver)/complete-ride') || pathnameRef.current?.startsWith('/(passenger)/map');
        if (!isRideScreen && rideEvent.type === 'ride_message') {
          const messageText = RIDE_QUICK_MESSAGE_TEXT_BY_CODE[rideEvent.messageCode as keyof typeof RIDE_QUICK_MESSAGE_TEXT_BY_CODE] || 'Nova mensagem na corrida.';
          Alert.alert('Mensagem na corrida', messageText);
        }

        if (!isRideScreen && rideEvent.type === 'ride_cancelled') {
          Alert.alert(
            'Corrida cancelada',
            rideEvent.cancelledBy === 'passenger'
              ? 'O passageiro cancelou a corrida.'
              : 'O motorista cancelou a corrida.'
          );
        }
      });

      responseSub = Notifications.addNotificationResponseReceivedListener(() => {
        router.push(variant === 'driver' ? '/(driver)/online' : '/(passenger)/map');
      });
    }

    return () => {
      stopNetInfoListener();
      responseSub?.remove();
      receivedSub?.remove();
    };
  }, [router]);

  return (
    <NetworkProvider>
      <OfflineBanner />
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
    </NetworkProvider>
  );
}
