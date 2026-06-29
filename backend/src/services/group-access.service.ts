export const KAVIAR_GROUP_TYPES = [
  'private_group',
  'local_community',
  'family',
  'school',
  'company',
  'condo',
  'elderly_support',
  'other',
] as const;

export const KAVIAR_GROUP_STATUSES = ['draft', 'active', 'paused', 'archived'] as const;
export const KAVIAR_GROUP_MEMBER_TYPES = ['passenger', 'driver', 'responsible'] as const;
export const KAVIAR_GROUP_MEMBER_ROLES = ['member', 'responsible', 'trusted_driver'] as const;
export const KAVIAR_GROUP_MEMBER_STATUSES = ['pending', 'active', 'blocked', 'removed'] as const;

export type KaviarGroupType = typeof KAVIAR_GROUP_TYPES[number];

type TerritoryScope = {
  territoryIds?: string[];
  neighborhoodIds?: string[];
  accessLevel?: string;
} | null;

export function cleanString(value: unknown, max = 255): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

export function isAllowedValue<T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
  return typeof value === 'string' && allowed.includes(value as T[number]);
}

export function validateGroupType(value: unknown): KaviarGroupType | null {
  if (typeof value !== 'string') return 'private_group';
  const normalized = value.trim();
  if (normalized.toLowerCase() === 'religious') return null;
  return isAllowedValue(normalized, KAVIAR_GROUP_TYPES) ? normalized : null;
}

export function getGroupScopeWhere(admin: any, scope: TerritoryScope) {
  if (admin?.role === 'SUPER_ADMIN') return {};

  const territoryIds = scope?.territoryIds || [];
  const neighborhoodIds = scope?.neighborhoodIds || [];
  const or: any[] = [];

  if (territoryIds.length > 0) or.push({ territory_id: { in: territoryIds } });
  if (neighborhoodIds.length > 0) or.push({ neighborhood_id: { in: neighborhoodIds } });

  if (or.length === 0) return { id: '__no_territory_scope__' };
  return { OR: or };
}

export function canAccessGroup(group: any, admin: any, scope: TerritoryScope): boolean {
  if (admin?.role === 'SUPER_ADMIN') return true;
  if (!group) return false;

  const territoryIds = scope?.territoryIds || [];
  const neighborhoodIds = scope?.neighborhoodIds || [];

  return Boolean(
    (group.territory_id && territoryIds.includes(group.territory_id)) ||
    (group.neighborhood_id && neighborhoodIds.includes(group.neighborhood_id))
  );
}

export function canWriteGroups(admin: any): boolean {
  return admin?.role === 'SUPER_ADMIN' || admin?.role === 'TERRITORIAL_MANAGER';
}

export function assertGroupCreateScope(data: any, admin: any, scope: TerritoryScope): boolean {
  if (admin?.role === 'SUPER_ADMIN') return true;

  const territoryIds = scope?.territoryIds || [];
  const neighborhoodIds = scope?.neighborhoodIds || [];

  if (data.territory_id && territoryIds.includes(data.territory_id)) return true;
  if (data.neighborhood_id && neighborhoodIds.includes(data.neighborhood_id)) return true;
  return false;
}

export function publicGroupSelect() {
  return {
    id: true,
    public_name: true,
    internal_name: true,
    type: true,
    responsible_name: true,
    responsible_phone: true,
    responsible_email: true,
    description: true,
    rules: true,
    status: true,
    community_id: true,
    neighborhood_id: true,
    territory_id: true,
    created_by_admin_id: true,
    created_at: true,
    updated_at: true,
  };
}

export function invitePublicPayload(invite: any) {
  const remainingUses = invite.max_uses == null ? null : Math.max(invite.max_uses - invite.used_count, 0);
  const expired = invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now();
  const limited = remainingUses !== null && remainingUses <= 0;

  return {
    code: invite.code,
    status: expired ? 'expired' : limited ? 'limit_reached' : invite.status,
    expires_at: invite.expires_at,
    remaining_uses: remainingUses,
    group: {
      id: invite.group.id,
      public_name: invite.group.public_name,
      description: invite.group.description,
    },
  };
}
