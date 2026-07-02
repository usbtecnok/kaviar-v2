import { useEffect, useRef, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import { Stack, useRouter, usePathname } from "expo-router";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { apiClient } from "../src/api/client";
import { authStore } from "../src/auth/auth.store";
import { startNetInfoListener, stopNetInfoListener } from "../src/services/net-info-listener";
import { checkAppVersion, VersionCheckResult } from "../src/services/version-check";
import { attemptOtaUpdate } from "../src/services/ota-updates";
import { UpdateRequiredModal } from "../src/components/UpdateRequiredModal";
import { NetworkProvider } from "../src/hooks/useNetworkStatus";
import { OfflineBanner } from "../src/components/OfflineBanner";
import { RIDE_QUICK_MESSAGE_TEXT_BY_CODE } from "../src/config/rideMessages";
import { getPassengerInviteCodeFromUrl, routePassengerInviteUrl, savePendingPassengerInviteCode } from "../src/utils/groupInviteDeepLink";
import { ensurePassengerPushTokenRegistration } from '../src/services/passenger-push-token.service';

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
}

function parseFixedRouteNotification(data: unknown) {
  if (!data || typeof data !== 'object') return null;
  const payload = data as Record<string, unknown>;
  if (payload.type !== 'fixed_route_message') return null;

  const routeId = typeof payload.routeId === 'string' ? payload.routeId : '';
  const messageId = typeof payload.messageId === 'string' ? payload.messageId : '';
  const reservationId = typeof payload.reservationId === 'string' ? payload.reservationId : '';
  if (!routeId || !messageId) return null;

  return {
    type: 'fixed_route_message' as const,
    routeId,
    reservationId: reservationId || null,
    messageId,
  };
}

const rideNotificationState = (globalThis as any).__kaviarRideNotificationState || ((globalThis as any).__kaviarRideNotificationState = {
  seenMessageIds: new Set<string>(),
  seenCancelKeys: new Set<string>(),
});

const fixedRouteNotificationState = (globalThis as any).__kaviarFixedRouteNotificationState || ((globalThis as any).__kaviarFixedRouteNotificationState = {
  recentRouteIds: new Set<string>(),
  recentReservationIds: new Set<string>(),
  seenMessageIds: new Set<string>(),
});

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
      shouldShowBanner: true,
      shouldShowList: true,
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
    let linkSub: { remove: () => void } | undefined;
    let unsubscribeLogin: (() => void) | undefined;

    if (variant === 'passenger') {
      void ensurePassengerPushTokenRegistration('layout:init');
      unsubscribeLogin = authStore.onLogin(() => {
        void ensurePassengerPushTokenRegistration('layout:onLogin');
      });

      Linking.getInitialURL().then((url) => {
        const code = getPassengerInviteCodeFromUrl(url);
        if (code) savePendingPassengerInviteCode(code).catch(() => {});
      }).catch(() => {});

      linkSub = Linking.addEventListener('url', ({ url }) => {
        routePassengerInviteUrl(router, url).catch(() => {});
      });

    }

    if (variant === 'driver' || variant === 'passenger') {
      receivedSub = Notifications.addNotificationReceivedListener((notification) => {
        const data = notification.request.content.data;
        const rideEvent = parseRideNotification(data);
        const fixedRouteEvent = parseFixedRouteNotification(data);

        if (rideEvent) {
          if (rideEvent.type === 'ride_message') {
            rideNotificationState.seenMessageIds.add(rideEvent.messageId);
          }

          if (rideEvent.type === 'ride_cancelled') {
            rideNotificationState.seenCancelKeys.add(rideEvent.rideId + ':' + rideEvent.cancelledBy);
          }
        }

        if (fixedRouteEvent) {
          fixedRouteNotificationState.recentRouteIds.add(fixedRouteEvent.routeId);
          fixedRouteNotificationState.seenMessageIds.add(fixedRouteEvent.messageId);
          if (fixedRouteEvent.reservationId) {
            fixedRouteNotificationState.recentReservationIds.add(fixedRouteEvent.reservationId);
          }
        }

        const isRideScreen = pathnameRef.current?.startsWith('/(driver)/complete-ride') || pathnameRef.current?.startsWith('/(passenger)/map');
        const isFixedRouteScreen = pathnameRef.current?.startsWith('/(driver)/fixed-routes') || pathnameRef.current?.startsWith('/(passenger)/fixed-routes');

        if (!isRideScreen && rideEvent?.type === 'ride_message') {
          const messageText = RIDE_QUICK_MESSAGE_TEXT_BY_CODE[rideEvent.messageCode as keyof typeof RIDE_QUICK_MESSAGE_TEXT_BY_CODE] || 'Nova mensagem na corrida.';
          Alert.alert('Mensagem na corrida', messageText);
        }

        if (!isRideScreen && rideEvent?.type === 'ride_cancelled') {
          Alert.alert(
            'Corrida cancelada',
            rideEvent.cancelledBy === 'passenger'
              ? 'O passageiro cancelou a corrida.'
              : 'O motorista cancelou a corrida.'
          );
        }

        if (!isFixedRouteScreen && fixedRouteEvent?.type === 'fixed_route_message') {
          Alert.alert('Mensagens da Corrida Compartilhada', 'Voce recebeu uma nova mensagem em sua Corrida Compartilhada.');
        }
      });

      responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        const fixedRouteEvent = parseFixedRouteNotification(data);
        if (fixedRouteEvent) {
          fixedRouteNotificationState.recentRouteIds.add(fixedRouteEvent.routeId);
          fixedRouteNotificationState.seenMessageIds.add(fixedRouteEvent.messageId);
          if (fixedRouteEvent.reservationId) {
            fixedRouteNotificationState.recentReservationIds.add(fixedRouteEvent.reservationId);
          }

          if (variant === 'driver') {
            const routeQuery = `routeId=${encodeURIComponent(fixedRouteEvent.routeId)}`;
            const reservationQuery = fixedRouteEvent.reservationId ? `&reservationId=${encodeURIComponent(fixedRouteEvent.reservationId)}` : '';
            router.push(`/(driver)/fixed-routes?${routeQuery}${reservationQuery}`);
            return;
          }

          const reservationQuery = fixedRouteEvent.reservationId ? `?reservationId=${encodeURIComponent(fixedRouteEvent.reservationId)}` : '';
          router.push(`/(passenger)/fixed-routes${reservationQuery}`);
          return;
        }

        router.push(variant === 'driver' ? '/(driver)/online' : '/(passenger)/map');
      });
    }

    return () => {
      stopNetInfoListener();
      unsubscribeLogin?.();
      linkSub?.remove();
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
