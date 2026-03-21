import { supabase } from '../lib/supabase';
import {
  cacheAnnotation,
  getCachedAnnotationsForBook,
  deleteCachedAnnotation,
  setCachedAnnotations,
} from './annotationCacheService';
import type { Annotation, AnnotationColor, DatabaseAnnotation } from '../types';

function toAnnotation(row: DatabaseAnnotation): Annotation {
  return {
    id: row.id,
    userId: row.user_id,
    bookId: row.book_id,
    cfi: row.cfi,
    text: row.text,
    color: row.color as AnnotationColor,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchAnnotationsForBook(
  userId: string,
  bookId: string
): Promise<Annotation[]> {
  try {
    const { data, error } = await supabase
      .from('annotations')
      .select('*')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const annotations = (data as DatabaseAnnotation[]).map(toAnnotation);
    await setCachedAnnotations(annotations);
    return annotations;
  } catch {
    return getCachedAnnotationsForBook(userId, bookId);
  }
}

export async function createAnnotation(
  userId: string,
  bookId: string,
  cfi: string,
  text: string,
  color: AnnotationColor,
  note: string = ''
): Promise<Annotation> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const optimistic: Annotation = {
    id,
    userId,
    bookId,
    cfi,
    text,
    color,
    note,
    createdAt: now,
    updatedAt: now,
  };

  await cacheAnnotation(optimistic);

  try {
    const { data, error } = await supabase
      .from('annotations')
      .insert({
        id,
        user_id: userId,
        book_id: bookId,
        cfi,
        text,
        color,
        note,
      })
      .select()
      .single();

    if (error) throw error;

    const saved = toAnnotation(data as DatabaseAnnotation);
    await cacheAnnotation(saved);
    return saved;
  } catch {
    return optimistic;
  }
}

export async function updateAnnotationNote(
  annotation: Annotation,
  note: string
): Promise<Annotation> {
  const updated = { ...annotation, note, updatedAt: new Date().toISOString() };
  await cacheAnnotation(updated);

  try {
    const { data, error } = await supabase
      .from('annotations')
      .update({ note, updated_at: updated.updatedAt })
      .eq('id', annotation.id)
      .select()
      .single();

    if (error) throw error;

    const saved = toAnnotation(data as DatabaseAnnotation);
    await cacheAnnotation(saved);
    return saved;
  } catch {
    return updated;
  }
}

export async function updateAnnotationColor(
  annotation: Annotation,
  color: AnnotationColor
): Promise<Annotation> {
  const updated = { ...annotation, color, updatedAt: new Date().toISOString() };
  await cacheAnnotation(updated);

  try {
    const { data, error } = await supabase
      .from('annotations')
      .update({ color, updated_at: updated.updatedAt })
      .eq('id', annotation.id)
      .select()
      .single();

    if (error) throw error;

    const saved = toAnnotation(data as DatabaseAnnotation);
    await cacheAnnotation(saved);
    return saved;
  } catch {
    return updated;
  }
}

export async function deleteAnnotation(id: string): Promise<void> {
  await deleteCachedAnnotation(id);

  try {
    const { error } = await supabase
      .from('annotations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch {
    // Already removed from cache; cloud delete will retry on next sync opportunity
  }
}
