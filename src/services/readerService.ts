import { supabase } from '../lib/supabase';
import { cacheEpubBlob, getCachedEpubBlob } from './epubCacheService';
import type { DatabaseReadingProgress, ReadingProgress } from '../types';

const EPUB_BUCKET = 'ebooks';

function toReadingProgress(row: DatabaseReadingProgress): ReadingProgress {
  return {
    id: row.id,
    userId: row.user_id,
    bookId: row.book_id,
    bookTitle: row.book_title,
    bookAuthor: row.book_author,
    coverUrl: row.cover_url,
    fileUrl: row.file_url,
    fileName: row.file_name,
    cfi: row.cfi,
    percentage: row.percentage,
    lastOpenedAt: row.last_opened_at,
    createdAt: row.created_at,
  };
}

export async function fetchAllReadingProgress(userId: string): Promise<ReadingProgress[]> {
  const { data, error } = await supabase
    .from('reading_progress')
    .select('*')
    .eq('user_id', userId)
    .order('last_opened_at', { ascending: false });

  if (error) throw error;
  return (data as DatabaseReadingProgress[]).map(toReadingProgress);
}

export async function fetchReadingProgressByBookId(
  userId: string,
  bookId: string
): Promise<ReadingProgress | null> {
  const { data, error } = await supabase
    .from('reading_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return toReadingProgress(data as DatabaseReadingProgress);
}

export async function upsertReadingProgress(
  userId: string,
  bookId: string,
  fields: {
    bookTitle?: string;
    bookAuthor?: string | null;
    coverUrl?: string | null;
    fileUrl?: string | null;
    fileName?: string | null;
    cfi?: string | null;
    percentage?: number | null;
  }
): Promise<ReadingProgress> {
  const { data, error } = await supabase
    .from('reading_progress')
    .upsert(
      {
        user_id: userId,
        book_id: bookId,
        book_title: fields.bookTitle ?? '',
        book_author: fields.bookAuthor ?? null,
        cover_url: fields.coverUrl ?? null,
        file_url: fields.fileUrl ?? null,
        file_name: fields.fileName ?? null,
        cfi: fields.cfi ?? null,
        percentage: fields.percentage ?? null,
        last_opened_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,book_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return toReadingProgress(data as DatabaseReadingProgress);
}

export async function deleteReadingProgress(userId: string, bookId: string): Promise<void> {
  const { error } = await supabase
    .from('reading_progress')
    .delete()
    .eq('user_id', userId)
    .eq('book_id', bookId);

  if (error) throw error;
}

export async function computeBookId(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function uploadEpubToStorage(
  userId: string,
  bookId: string,
  file: File
): Promise<string | null> {
  try {
    const storagePath = `${userId}/${bookId}/${file.name}`;
    const { error } = await supabase.storage
      .from(EPUB_BUCKET)
      .upload(storagePath, file, { upsert: true, contentType: 'application/epub+zip' });

    if (error) return null;

    const { data } = supabase.storage.from(EPUB_BUCKET).getPublicUrl(storagePath);
    return data?.publicUrl ?? null;
  } catch {
    return null;
  }
}

export async function resolveEpubFile(
  bookId: string,
  fileName: string,
  fileUrl: string | null
): Promise<File | null> {
  try {
    const cached = await getCachedEpubBlob(bookId);
    if (cached) {
      return new File([cached], fileName, { type: 'application/epub+zip' });
    }
  } catch {
    // fall through to cloud fetch
  }

  if (!fileUrl) return null;

  try {
    const res = await fetch(fileUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    try {
      await cacheEpubBlob(bookId, blob);
    } catch {
      // cache failure is non-fatal
    }
    return new File([blob], fileName, { type: 'application/epub+zip' });
  } catch {
    return null;
  }
}
