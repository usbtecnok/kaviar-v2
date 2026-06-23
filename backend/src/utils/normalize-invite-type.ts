export type CanonicalInviteType = 'driver' | 'passenger' | 'manager' | 'pet' | 'guide' | 'lead';

const MAP: Record<string, CanonicalInviteType | undefined> = {
  driver: 'driver',
  motorista: 'driver',
  passenger: 'passenger',
  passageiro: 'passenger',
  manager: 'manager',
  gestor: 'manager',
  pet: 'pet',
  guide: 'guide',
  guia: 'guide',
  lead: 'lead',
};

export function normalizeInviteType(input: unknown): CanonicalInviteType | null {
  if (input == null) return null;
  const s = String(input).trim().toLowerCase();
  if (!s) return null;
  return MAP[s] ?? null;
}

export const KNOWN_INVITE_TYPES: CanonicalInviteType[] = ['driver', 'passenger', 'manager', 'pet', 'guide', 'lead'];
