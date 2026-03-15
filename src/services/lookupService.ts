import { LookupTables, ResolvedLookupIds, ParsedMeaning } from '../types';

const matchId = (value: string | undefined, items: { id: string; name: string }[]): string | null => {
  if (!value?.trim()) return null;
  const normalized = value.toLowerCase().trim();
  return items.find((item) => item.name.toLowerCase().trim() === normalized)?.id ?? null;
};

export const resolveAllLookupIds = (
  meaning: Record<string, string | undefined>,
  lookups: LookupTables
): ResolvedLookupIds => ({
  toneId: matchId(meaning['Tone'], lookups.tones),
  dialectId: matchId(meaning['Dialect'] ?? meaning['Dialects'], lookups.dialects),
  modeId: matchId(meaning['Mode'] ?? meaning['Modes'], lookups.modes),
  nuanceId: matchId(meaning['Nuance'] ?? meaning['Nuances'], lookups.nuances),
  registerId: matchId(meaning['Register'], lookups.registers),
});
