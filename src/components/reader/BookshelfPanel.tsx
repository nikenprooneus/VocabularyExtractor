import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, BookOpen, Trash2, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchAllReadingProgress, deleteReadingProgress } from '../../services/readerService';
import type { ReadingProgress } from '../../types';

const SAMPLE_BOOK = {
  title: "Alice's Adventures in Wonderland",
  author: 'Lewis Carroll',
  url: 'https://www.gutenberg.org/cache/epub/11/pg11.epub',
};

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
  const [loadingSample, setLoadingSample] = useState(false);
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

  const handleLoadSample = async () => {
    setLoadingSample(true);
    setError(null);
    try {
      const res = await fetch(SAMPLE_BOOK.url);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const file = new File([blob], 'alice-in-wonderland.epub', { type: 'application/epub+zip' });
      onOpenFile(file);
    } catch {
      setError('Failed to download the sample book. Please try uploading an EPUB manually.');
    } finally {
      setLoadingSample(false);
    }
  };

  const handleDelete = async (bookId: string) => {
    if (!user) return;
    try {
      await deleteReadingProgress(user.id, bookId);
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

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-[#2e2c29]" />
        <span className="text-[10px] text-[#4e4c49] uppercase tracking-wider">or try a sample</span>
        <div className="flex-1 h-px bg-[#2e2c29]" />
      </div>

      <button
        onClick={handleLoadSample}
        disabled={loadingSample}
        className="w-full flex items-center gap-3 px-4 py-3 bg-[#2e2c29] hover:bg-[#3a3835] border border-[#3e3c39] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-8"
      >
        <div className="w-9 h-12 bg-[#c9a96e]/10 border border-[#c9a96e]/20 rounded flex items-center justify-center flex-shrink-0">
          <BookOpen size={16} className="text-[#c9a96e]" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-[#e8e4de] truncate">{SAMPLE_BOOK.title}</p>
          <p className="text-xs text-[#6b6762]">{SAMPLE_BOOK.author} · Project Gutenberg</p>
        </div>
        {loadingSample && (
          <div className="w-4 h-4 border-2 border-[#c9a96e]/30 border-t-[#c9a96e] rounded-full animate-spin flex-shrink-0" />
        )}
      </button>

      {!loadingLibrary && library.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-[#6b6762] uppercase tracking-wider mb-3">
            Recent Books
          </h3>
          <ul className="space-y-2">
            {library.map(book => (
              <li
                key={book.bookId}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#1e1c1a] border border-[#2e2c29] hover:border-[#3a3835] transition-colors group"
              >
                <div className="w-8 h-10 rounded bg-[#2e2c29] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen size={14} className="text-[#6b6762]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#c8c4be] truncate">{book.bookTitle}</p>
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
                <button
                  onClick={() => handleDelete(book.bookId)}
                  className="p-1.5 rounded text-[#4e4c49] hover:text-red-400 hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove from library"
                >
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
