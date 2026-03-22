import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, BookOpen, Trash2, Clock, Loader2, CloudOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchAllReadingProgress,
  deleteReadingProgress,
  resolveEpubFile,
} from '../../services/readerService';
import { deleteCachedEpubBlob } from '../../services/epubCacheService';
import type { ReadingProgress } from '../../types';

interface BookshelfPanelProps {
  onOpenFile: (file: File) => void;
}

export function BookshelfPanel({ onOpenFile }: BookshelfPanelProps) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [library, setLibrary] = useState<ReadingProgress[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [openingBookId, setOpeningBookId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadLibrary = useCallback(async () => {
    if (!user) return;
    try {
      const items = await fetchAllReadingProgress(user.id);
      setLibrary(items);
    } catch {
      // Non-fatal
    } finally {
      setLoadingLibrary(false);
    }
  }, [user]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onOpenFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.epub')) {
      onOpenFile(file);
    } else {
      setError('Please drop a valid .epub file.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const getDisplayTitle = (book: ReadingProgress): string => {
    if (book.bookTitle) return book.bookTitle;
    if (book.fileName) return book.fileName.replace(/\.epub$/i, '');
    return 'Unknown Book';
  };

  const handleOpenFromLibrary = async (book: ReadingProgress) => {
    if (openingBookId) return;
    setOpeningBookId(book.bookId);
    setError(null);
    const displayTitle = getDisplayTitle(book);
    try {
      const file = await resolveEpubFile(
        book.bookId,
        book.fileName ?? `${displayTitle}.epub`,
        book.fileUrl
      );
      if (file) {
        onOpenFile(file);
      } else {
        setError(`Could not load "${displayTitle}". The file is not cached locally and no cloud copy is available. Please re-upload the EPUB.`);
      }
    } catch {
      setError(`Failed to open "${displayTitle}". Please re-upload the EPUB file.`);
    } finally {
      setOpeningBookId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteReadingProgress(user.id, bookId);
      await deleteCachedEpubBlob(bookId).catch(() => {});
      setLibrary(prev => prev.filter(b => b.bookId !== bookId));
    } catch {
      // Non-fatal
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 max-w-2xl mx-auto w-full">
      <h2 className="text-lg font-semibold text-[#e8e4de] mb-1">Your Library</h2>
      <p className="text-xs text-[#6b6762] mb-6">Upload an EPUB file or pick from your saved books.</p>

      <input
        ref={fileRef}
        type="file"
        accept=".epub"
        className="hidden"
        onChange={handleFileChange}
      />

      <div
        ref={dropRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all mb-6 ${
          isDragging
            ? 'border-[#c9a96e] bg-[#c9a96e]/5'
            : 'border-[#2e2c29] hover:border-[#3e3c39] hover:bg-[#1e1c1a]'
        }`}
        onClick={() => fileRef.current?.click()}
      >
        <div className="w-12 h-12 rounded-full bg-[#2e2c29] flex items-center justify-center">
          <Upload size={20} className="text-[#8a8680]" />
        </div>
        <div className="text-center">
          <p className="text-sm text-[#b8b4ae] font-medium">Drop an EPUB here</p>
          <p className="text-xs text-[#6b6762] mt-0.5">or click to browse files</p>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 mb-4 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {!loadingLibrary && library.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-[#6b6762] uppercase tracking-wider mb-3">
            Recent Books
          </h3>
          <ul className="space-y-2">
            {library.map(book => {
              const isOpening = openingBookId === book.bookId;
              const hasSource = !!book.fileUrl || !!book.fileName;

              return (
                <li
                  key={book.bookId}
                  onClick={() => handleOpenFromLibrary(book)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#1e1c1a] border border-[#2e2c29] transition-colors group cursor-pointer ${
                    openingBookId ? 'opacity-60 pointer-events-none' : 'hover:border-[#c9a96e]/40 hover:bg-[#252320]'
                  }`}
                >
                  <div className="w-8 h-10 rounded bg-[#2e2c29] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {book.coverUrl ? (
                      <img src={book.coverUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen size={14} className="text-[#6b6762]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#c8c4be] truncate">{getDisplayTitle(book)}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock size={9} className="text-[#4e4c49]" />
                      <p className="text-[10px] text-[#4e4c49]">{formatDate(book.lastOpenedAt)}</p>
                      {book.percentage !== null && (
                        <span className="text-[10px] text-[#4e4c49]">
                          · {Math.round(book.percentage * 100)}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!hasSource && (
                      <span title="No cloud copy — re-upload required" className="p-1">
                        <CloudOff size={11} className="text-[#4e4c49]" />
                      </span>
                    )}
                    {isOpening ? (
                      <Loader2 size={14} className="text-[#c9a96e] animate-spin" />
                    ) : (
                      <button
                        onClick={(e) => handleDelete(e, book.bookId)}
                        className="p-1.5 rounded text-[#4e4c49] hover:text-red-400 hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove from library"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
