import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiClient } from '../api/client';
import { authStore } from '../auth/auth.store';

const PASSENGER_EXPO_PROJECT_ID = '23cab91b-82a5-4d92-9709-017279a2539d';

let inFlightRegistration: Promise<boolean> | null = null;
let lastSuccessfulAuthToken: string | null = null;

function isPassengerSessionReady() {
  return authStore.getUserType() === 'passenger' && Boolean(authStore.getToken());
}

export async function ensurePassengerPushTokenRegistration(source: string): Promise<boolean> {
  const authToken = authStore.getToken();
  if (!isPassengerSessionReady() || !authToken) {
    console.info('[PassengerPushToken] skipped: auth not ready', { source });
    return false;
  }

  if (lastSuccessfulAuthToken === authToken) {
    return true;
  }

  if (inFlightRegistration) {
    return inFlightRegistration;
  }

  inFlightRegistration = (async () => {
    try {
      const currentPermissions = await Notifications.getPermissionsAsync();
      const permissions = currentPermissions.status === 'granted'
        ? currentPermissions
        : await Notifications.requestPermissionsAsync();

      if (permissions.status !== 'granted') {
        console.info('[PassengerPushToken] skipped: notification permission denied', { source });
        return false;
      }

      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId: PASSENGER_EXPO_PROJECT_ID,
      });

      let fcmToken: string | undefined;
      try {
        const { data } = await Notifications.getDevicePushTokenAsync();
        fcmToken = data as string;
      } catch {
        // Non-blocking: Expo token is the primary registration path.
      }

      await apiClient.put('/api/passengers/me/push-token', {
        token,
        fcmToken,
        platform: Platform.OS,
      });

      lastSuccessfulAuthToken = authToken;
      console.info('[PassengerPushToken] registered', { source, platform: Platform.OS });
      return true;
    } catch (error) {
      console.warn('[PassengerPushToken] registration failed', { source, platform: Platform.OS, error: error instanceof Error ? error.message : 'unknown_error' });
      return false;
    } finally {
      inFlightRegistration = null;
    }
  })();

  return inFlightRegistration;
}