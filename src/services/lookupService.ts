import { LookupTables, ResolvedLookupIds, ParsedMeaning } from '../types';

const matchId = (value: string | undefined, items: { id: string; name: string }[]): string | null => {
  if (!value?.trim()) return null;
  const normalized = value.toLowerCase().trim();
  return items.find((item) => item.name.toLowerCase().trim() === normalized)?.id ?? null;
};

export const resolveAllLookupIds = (
  meaning: ParsedMeaning,
  lookups: LookupTables
): ResolvedLookupIds => ({
  toneId: matchId(meaning['Tone'], lookups.tones),
  dialectId: matchId(meaning['Dialect'], lookups.dialects),
  modeId: matchId(meaning['Mode'], lookups.modes),
  nuanceId: matchId(meaning['Nuance'], lookups.nuances),
  registerId: matchId(meaning['Register'], lookups.registers),
});
