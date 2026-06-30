import AsyncStorage from '@react-native-async-storage/async-storage';
import { Router } from 'expo-router';
import { authStore } from '../auth/auth.store';

export const PENDING_GROUP_INVITE_CODE_KEY = 'pending_group_invite_code';

export function normalizeGroupInviteCode(value?: string | null): string {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

export function isGroupInviteCode(value?: string | null): boolean {
  const code = normalizeGroupInviteCode(value);
  return code.startsWith('GKV-') || code.startsWith('GKR-');
}

export function getGroupInviteCodeFromUrl(url?: string | null): string {
  if (!url) return '';

  try {
    const parsed = new URL(url);
    const inviteCode = normalizeGroupInviteCode(parsed.searchParams.get('inviteCode'));
    if (isGroupInviteCode(inviteCode)) return inviteCode;

    const pathParts = [parsed.hostname, ...parsed.pathname.split('/')]
      .map((part) => normalizeGroupInviteCode(part))
      .filter(Boolean);
    return pathParts.find(isGroupInviteCode) || '';
  } catch {
    const match = String(url).match(/\bGK[VR]-[A-Z0-9]+\b/i);
    return match ? normalizeGroupInviteCode(match[0]) : '';
  }
}

export function passengerGroupsRoute(code: string) {
  return `/(passenger)/groups?inviteCode=${encodeURIComponent(normalizeGroupInviteCode(code))}` as const;
}

export async function savePendingGroupInviteCode(code: string) {
  const normalized = normalizeGroupInviteCode(code);
  if (!isGroupInviteCode(normalized)) return;
  await AsyncStorage.setItem(PENDING_GROUP_INVITE_CODE_KEY, normalized);
}

export async function consumePendingGroupInviteCode(): Promise<string> {
  const code = normalizeGroupInviteCode(await AsyncStorage.getItem(PENDING_GROUP_INVITE_CODE_KEY));
  if (code) await AsyncStorage.removeItem(PENDING_GROUP_INVITE_CODE_KEY);
  return isGroupInviteCode(code) ? code : '';
}

export async function routePassengerInviteCode(router: Router, code: string): Promise<boolean> {
  const normalized = normalizeGroupInviteCode(code);
  if (!isGroupInviteCode(normalized)) return false;

  await authStore.init();
  if (authStore.isAuthenticated() && authStore.getUserType() === 'PASSENGER') {
    router.push(passengerGroupsRoute(normalized));
    return true;
  }

  await savePendingGroupInviteCode(normalized);
  router.push('/(auth)/login');
  return true;
}

export async function routePassengerInviteUrl(router: Router, url?: string | null): Promise<boolean> {
  return routePassengerInviteCode(router, getGroupInviteCodeFromUrl(url));
}
