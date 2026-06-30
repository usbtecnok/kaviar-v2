import AsyncStorage from '@react-native-async-storage/async-storage';
import { Router } from 'expo-router';
import { authStore } from '../auth/auth.store';

export const PENDING_GROUP_INVITE_CODE_KEY = 'pending_group_invite_code';
export const PENDING_FIXED_ROUTE_INVITE_CODE_KEY = 'pending_fixed_route_invite_code';

export function normalizeGroupInviteCode(value?: string | null): string {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

export function normalizeFixedRouteInviteCode(value?: string | null): string {
  return normalizeGroupInviteCode(value);
}

export function isGroupInviteCode(value?: string | null): boolean {
  const code = normalizeGroupInviteCode(value);
  return code.startsWith('GKV-') || code.startsWith('GKR-');
}

export function isFixedRouteInviteCode(value?: string | null): boolean {
  return normalizeFixedRouteInviteCode(value).startsWith('KFR-');
}

export function isPassengerInviteCode(value?: string | null): boolean {
  return isGroupInviteCode(value) || isFixedRouteInviteCode(value);
}

function getInviteCodeFromUrl(url: string | null | undefined, predicate: (code: string) => boolean): string {
  if (!url) return '';

  try {
    const parsed = new URL(url);
    const inviteCode = normalizeGroupInviteCode(parsed.searchParams.get('inviteCode'));
    if (predicate(inviteCode)) return inviteCode;

    const pathParts = [parsed.hostname, ...parsed.pathname.split('/')]
      .map((part) => normalizeGroupInviteCode(part))
      .filter(Boolean);
    return pathParts.find(predicate) || '';
  } catch {
    const matches = String(url).match(/\b(?:GK[VR]|KFR)-[A-Z0-9]+\b/gi) || [];
    return matches.map((match) => normalizeGroupInviteCode(match)).find(predicate) || '';
  }
}

export function getGroupInviteCodeFromUrl(url?: string | null): string {
  return getInviteCodeFromUrl(url, isGroupInviteCode);
}

export function getFixedRouteInviteCodeFromUrl(url?: string | null): string {
  return getInviteCodeFromUrl(url, isFixedRouteInviteCode);
}

export function getPassengerInviteCodeFromUrl(url?: string | null): string {
  return getInviteCodeFromUrl(url, isPassengerInviteCode);
}

export function passengerGroupsRoute(code: string) {
  return `/(passenger)/groups?inviteCode=${encodeURIComponent(normalizeGroupInviteCode(code))}` as const;
}

export function passengerFixedRoutesRoute(code: string) {
  return `/(passenger)/fixed-routes?inviteCode=${encodeURIComponent(normalizeFixedRouteInviteCode(code))}` as const;
}

export function passengerInviteRoute(code: string) {
  const normalized = normalizeGroupInviteCode(code);
  return isFixedRouteInviteCode(normalized) ? passengerFixedRoutesRoute(normalized) : passengerGroupsRoute(normalized);
}

export async function savePendingGroupInviteCode(code: string) {
  const normalized = normalizeGroupInviteCode(code);
  if (!isGroupInviteCode(normalized)) return;
  await AsyncStorage.multiSet([[PENDING_GROUP_INVITE_CODE_KEY, normalized]]);
  await AsyncStorage.removeItem(PENDING_FIXED_ROUTE_INVITE_CODE_KEY);
}

export async function savePendingFixedRouteInviteCode(code: string) {
  const normalized = normalizeFixedRouteInviteCode(code);
  if (!isFixedRouteInviteCode(normalized)) return;
  await AsyncStorage.multiSet([[PENDING_FIXED_ROUTE_INVITE_CODE_KEY, normalized]]);
  await AsyncStorage.removeItem(PENDING_GROUP_INVITE_CODE_KEY);
}

export async function savePendingPassengerInviteCode(code: string) {
  const normalized = normalizeGroupInviteCode(code);
  if (isFixedRouteInviteCode(normalized)) {
    await savePendingFixedRouteInviteCode(normalized);
    return;
  }
  await savePendingGroupInviteCode(normalized);
}

export async function consumePendingGroupInviteCode(): Promise<string> {
  const code = normalizeGroupInviteCode(await AsyncStorage.getItem(PENDING_GROUP_INVITE_CODE_KEY));
  if (code) await AsyncStorage.removeItem(PENDING_GROUP_INVITE_CODE_KEY);
  return isGroupInviteCode(code) ? code : '';
}

export async function consumePendingFixedRouteInviteCode(): Promise<string> {
  const code = normalizeFixedRouteInviteCode(await AsyncStorage.getItem(PENDING_FIXED_ROUTE_INVITE_CODE_KEY));
  if (code) await AsyncStorage.removeItem(PENDING_FIXED_ROUTE_INVITE_CODE_KEY);
  return isFixedRouteInviteCode(code) ? code : '';
}

export async function consumePendingPassengerInviteCode(): Promise<string> {
  const fixedRouteCode = await consumePendingFixedRouteInviteCode();
  if (fixedRouteCode) return fixedRouteCode;
  return consumePendingGroupInviteCode();
}

export async function routePassengerInviteCode(router: Router, code: string): Promise<boolean> {
  const normalized = normalizeGroupInviteCode(code);
  if (!isPassengerInviteCode(normalized)) return false;

  await authStore.init();
  if (authStore.isAuthenticated() && authStore.getUserType() === 'PASSENGER') {
    router.push(passengerInviteRoute(normalized));
    return true;
  }

  await savePendingPassengerInviteCode(normalized);
  router.push('/(auth)/login');
  return true;
}

export async function routePassengerInviteUrl(router: Router, url?: string | null): Promise<boolean> {
  return routePassengerInviteCode(router, getPassengerInviteCodeFromUrl(url));
}
