import { LookupTables, ResolvedLookupIds } from '../types';

const matchId = (value: string | undefined, items: { id: string; name: string }[]): string | null => {
  if (!value?.trim()) return null;
  const normalized = value.toLowerCase().trim();
  return items.find((item) => item.name.toLowerCase().trim() === normalized)?.id ?? null;
};

const findName = (id: string | null | undefined, items: { id: string; name: string }[]): string | undefined => {
  if (!id) return undefined;
  return items.find((item) => item.id === id)?.name;
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

export const rehydrateNoteWithLookupNames = (
  note: Record<string, unknown>,
  ids: ResolvedLookupIds,
  lookups: LookupTables
): Record<string, unknown> => {
  const rehydrated = { ...note };
  const tone = findName(ids.toneId, lookups.tones);
  const dialect = findName(ids.dialectId, lookups.dialects);
  const mode = findName(ids.modeId, lookups.modes);
  const nuance = findName(ids.nuanceId, lookups.nuances);
  const register = findName(ids.registerId, lookups.registers);
  if (tone) rehydrated['Tone'] = tone;
  if (dialect) rehydrated['Dialects'] = dialect;
  if (mode) rehydrated['Modes'] = mode;
  if (nuance) rehydrated['Nuances'] = nuance;
  if (register) rehydrated['Register'] = register;
  return rehydrated;
};
