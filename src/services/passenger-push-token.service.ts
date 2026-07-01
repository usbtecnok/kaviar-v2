import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { apiClient } from '../api/client';
import { authStore } from '../auth/auth.store';

const PASSENGER_EXPO_PROJECT_ID = '23cab91b-82a5-4d92-9709-017279a2539d';

let inFlightRegistration: Promise<boolean> | null = null;
let inFlightTokenKey: string | null = null;
let lastSuccessfulAuthToken: string | null = null;
let lastSuccessfulRegistrationAt = 0;
let lastFailureAt = 0;

const SUCCESS_COOLDOWN_MS = 5 * 60 * 1000;
const FAILURE_RETRY_COOLDOWN_MS = 30 * 1000;

type AuthResolution = {
  token: string | null;
  hasAuthToken: boolean;
  canProceedAsPassenger: boolean;
  userType: string | null;
  source: 'store' | 'storage' | 'none';
};

function normalizeUserType(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  return raw.trim().toLowerCase();
}

async function resolvePassengerAuth(): Promise<AuthResolution> {
  const storeToken = authStore.getToken();
  const storageToken = await AsyncStorage.getItem('auth_token');
  const token = storeToken || storageToken;

  const storeUserType = normalizeUserType(authStore.getUserType());
  let storageUserType: string | null = null;

  if (!storeUserType) {
    const rawUser = await AsyncStorage.getItem('auth_user');
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser) as { user_type?: string };
        storageUserType = normalizeUserType(parsed?.user_type);
      } catch {
        storageUserType = null;
      }
    }
  }

  const userType = storeUserType || storageUserType;
  const hasAuthToken = Boolean(token);

  // If user type is not hydrated yet but token exists, allow flow to continue.
  const canProceedAsPassenger = hasAuthToken && (!userType || userType === 'passenger');

  return {
    token,
    hasAuthToken,
    canProceedAsPassenger,
    userType,
    source: storeToken ? 'store' : storageToken ? 'storage' : 'none',
  };
}

type PassengerPushDiagnosticPayload = {
  stage: string;
  hasAuthToken?: boolean;
  notificationStatus?: string;
  finalStatus?: string;
  hasExpoToken?: boolean;
  platform?: string;
  errorCode?: string;
};

async function sendPassengerPushTokenDiagnostic(payload: PassengerPushDiagnosticPayload): Promise<void> {
  try {
    await apiClient.post('/api/passengers/me/push-token/diagnostic', payload);
  } catch (error) {
    console.info('[PassengerPushToken] diagnostic failed', {
      stage: payload.stage,
      error: error instanceof Error ? error.message : 'unknown_error',
    });
  }
}

export async function ensurePassengerPushTokenRegistration(source: string): Promise<boolean> {
  await sendPassengerPushTokenDiagnostic({
    stage: 'service_started',
    platform: Platform.OS,
  });

  const auth = await resolvePassengerAuth();
  if (!auth.canProceedAsPassenger) {
    await sendPassengerPushTokenDiagnostic({
      stage: 'auth_missing',
      hasAuthToken: auth.hasAuthToken,
      finalStatus: auth.hasAuthToken ? 'auth_user_type_mismatch' : 'no_auth_token',
      platform: Platform.OS,
      errorCode: auth.userType && auth.userType !== 'passenger' ? `user_type_${auth.userType}` : undefined,
    });

    await sendPassengerPushTokenDiagnostic({
      stage: 'skipped_no_auth',
      hasAuthToken: auth.hasAuthToken,
      finalStatus: 'skipped',
      platform: Platform.OS,
    });

    console.info('[PassengerPushToken] skipped: auth not ready', {
      source,
      hasAuthToken: auth.hasAuthToken,
      userType: auth.userType,
      tokenSource: auth.source,
    });
    return false;
  }

  await sendPassengerPushTokenDiagnostic({
    stage: 'auth_resolved',
    hasAuthToken: auth.hasAuthToken,
    finalStatus: 'auth_resolved',
    platform: Platform.OS,
  });

  const authToken = auth.token;
  if (!authToken) {
    await sendPassengerPushTokenDiagnostic({
      stage: 'auth_missing',
      hasAuthToken: false,
      finalStatus: 'no_auth_token',
      platform: Platform.OS,
    });
    return false;
  }

  const now = Date.now();
  if (
    lastSuccessfulAuthToken === authToken
    && now - lastSuccessfulRegistrationAt < SUCCESS_COOLDOWN_MS
  ) {
    await sendPassengerPushTokenDiagnostic({
      stage: 'skipped_recent_attempt',
      hasAuthToken: true,
      finalStatus: 'skipped_recent_attempt',
      platform: Platform.OS,
    });
    return true;
  }

  if (now - lastFailureAt < FAILURE_RETRY_COOLDOWN_MS) {
    await sendPassengerPushTokenDiagnostic({
      stage: 'skipped_recent_failure',
      hasAuthToken: true,
      finalStatus: 'skipped_recent_failure',
      platform: Platform.OS,
    });
    return false;
  }

  if (inFlightRegistration) {
    return inFlightRegistration;
  }

  inFlightTokenKey = authToken;
  inFlightRegistration = (async () => {
    try {
      await sendPassengerPushTokenDiagnostic({
        stage: 'permission_check_started',
        hasAuthToken: true,
        platform: Platform.OS,
      });

      const currentPermissions = await Notifications.getPermissionsAsync();
      let permissions = currentPermissions;

      if (currentPermissions.status !== 'granted') {
        try {
          permissions = await Notifications.requestPermissionsAsync();
        } catch (error) {
          await sendPassengerPushTokenDiagnostic({
            stage: 'permission_denied',
            hasAuthToken: true,
            notificationStatus: currentPermissions.status,
            finalStatus: 'request_permissions_error',
            platform: Platform.OS,
            errorCode: error instanceof Error ? error.message : 'request_permissions_unknown_error',
          });
          console.warn('[PassengerPushToken] permission request failed', {
            source,
            platform: Platform.OS,
            error: error instanceof Error ? error.message : 'unknown_error',
          });
          return false;
        }
      }

      if (permissions.status !== 'granted') {
        await sendPassengerPushTokenDiagnostic({
          stage: 'permission_denied',
          hasAuthToken: true,
          notificationStatus: permissions.status,
          finalStatus: 'permission_denied',
          platform: Platform.OS,
        });
        console.info('[PassengerPushToken] skipped: notification permission denied', { source });
        return false;
      }

      await sendPassengerPushTokenDiagnostic({
        stage: 'permission_granted',
        hasAuthToken: true,
        notificationStatus: permissions.status,
        platform: Platform.OS,
      });

      await sendPassengerPushTokenDiagnostic({
        stage: 'expo_token_started',
        hasAuthToken: true,
        notificationStatus: permissions.status,
        platform: Platform.OS,
      });

      let token: string;
      try {
        const tokenResponse = await Notifications.getExpoPushTokenAsync({
          projectId: PASSENGER_EXPO_PROJECT_ID,
        });
        token = tokenResponse.data;
      } catch (error) {
        await sendPassengerPushTokenDiagnostic({
          stage: 'expo_token_failed',
          hasAuthToken: true,
          notificationStatus: permissions.status,
          finalStatus: 'expo_token_failed',
          hasExpoToken: false,
          platform: Platform.OS,
          errorCode: error instanceof Error ? error.message : 'expo_token_unknown_error',
        });
        console.warn('[PassengerPushToken] expo token fetch failed', {
          source,
          platform: Platform.OS,
          error: error instanceof Error ? error.message : 'unknown_error',
        });
        return false;
      }

      if (!token || typeof token !== 'string') {
        await sendPassengerPushTokenDiagnostic({
          stage: 'expo_token_failed',
          hasAuthToken: true,
          notificationStatus: permissions.status,
          finalStatus: 'expo_token_empty',
          hasExpoToken: false,
          platform: Platform.OS,
          errorCode: 'empty_expo_token',
        });
        console.warn('[PassengerPushToken] expo token empty', { source, platform: Platform.OS });
        return false;
      }

      await sendPassengerPushTokenDiagnostic({
        stage: 'expo_token_success',
        hasAuthToken: true,
        notificationStatus: permissions.status,
        hasExpoToken: true,
        platform: Platform.OS,
      });

      let fcmToken: string | undefined;
      try {
        const { data } = await Notifications.getDevicePushTokenAsync();
        fcmToken = data as string;
      } catch {
        // Non-blocking: Expo token is the primary registration path.
      }

      await sendPassengerPushTokenDiagnostic({
        stage: 'backend_update_started',
        hasAuthToken: true,
        notificationStatus: permissions.status,
        hasExpoToken: true,
        platform: Platform.OS,
      });

      try {
        await apiClient.put('/api/passengers/me/push-token', {
          token,
          fcmToken,
          platform: Platform.OS,
        });
      } catch (error) {
        await sendPassengerPushTokenDiagnostic({
          stage: 'backend_update_failed',
          hasAuthToken: true,
          notificationStatus: permissions.status,
          hasExpoToken: true,
          platform: Platform.OS,
          finalStatus: 'backend_update_failed',
          errorCode: error instanceof Error ? error.message : 'backend_update_unknown_error',
        });
        throw error;
      }

      await sendPassengerPushTokenDiagnostic({
        stage: 'backend_update_success',
        hasAuthToken: true,
        notificationStatus: permissions.status,
        hasExpoToken: true,
        platform: Platform.OS,
        finalStatus: 'success',
      });

      lastSuccessfulAuthToken = authToken;
      lastSuccessfulRegistrationAt = Date.now();
      lastFailureAt = 0;
      console.info('[PassengerPushToken] registered', { source, platform: Platform.OS });
      return true;
    } catch (error) {
      lastFailureAt = Date.now();
      console.warn('[PassengerPushToken] registration failed', { source, platform: Platform.OS, error: error instanceof Error ? error.message : 'unknown_error' });
      return false;
    } finally {
      inFlightRegistration = null;
      inFlightTokenKey = null;
    }
  })();

  return inFlightRegistration;
}