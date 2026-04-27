/** Derive a human-friendly group label from trip_details. */
export function groupLabel(passengers: number, hasLuggage: boolean): string {
  const label = passengers === 1 ? 'Solo' : passengers === 2 ? 'Dupla' : 'Grupo';
  const parts = [label, `${passengers} ${passengers === 1 ? 'pessoa' : 'pessoas'}`];
  if (hasLuggage) parts.push('com bagagem');
  return parts.join(' · ');
}
