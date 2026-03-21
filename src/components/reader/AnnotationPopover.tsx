import { useEffect, useRef, useState } from 'react';
import { Palette, Pencil, Highlighter, Trash2, StickyNote, X, Check, ChevronLeft } from 'lucide-react';
import type { Annotation, AnnotationColor, SelectionRect } from '../../types';

const COLOR_SWATCHES: { value: AnnotationColor; hex: string; label: string }[] = [
  { value: 'yellow', hex: '#FFD700', label: 'Yellow' },
  { value: 'green',  hex: '#90EE90', label: 'Green'  },
  { value: 'blue',   hex: '#ADD8E6', label: 'Blue'   },
  { value: 'pink',   hex: '#FF69B4', label: 'Pink'   },
  { value: 'gray',   hex: '#A9A9A9', label: 'Gray'   },
];

const EXISTING_COLOR_OPTIONS: { value: AnnotationColor; bg: string; border: string }[] = [
  { value: 'yellow', bg: 'bg-yellow-300',  border: 'border-yellow-400' },
  { value: 'green',  bg: 'bg-green-300',   border: 'border-green-400'  },
  { value: 'blue',   bg: 'bg-blue-300',    border: 'border-blue-400'   },
  { value: 'pink',   bg: 'bg-pink-300',    border: 'border-pink-400'   },
  { value: 'gray',   bg: 'bg-gray-400',    border: 'border-gray-500'   },
];

interface NewSelectionPopoverProps {
  selection: { cfi: string; text: string; rect: SelectionRect };
  onSave: (color: AnnotationColor, note?: string) => void;
  onDismiss: () => void;
}

interface ExistingAnnotationPopoverProps {
  annotation: Annotation;
  rect: SelectionRect;
  onColorChange: (color: AnnotationColor) => void;
  onNoteChange: (note: string) => void;
  onDelete: () => void;
  onDismiss: () => void;
}

type PopoverProps =
  | ({ mode: 'new' } & NewSelectionPopoverProps)
  | ({ mode: 'existing' } & ExistingAnnotationPopoverProps);

const POPOVER_WIDTH = 240;
const POPOVER_OFFSET = 10;

function getPopoverStyle(rect: SelectionRect, estimatedHeight: number): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const rectCenterX = rect.left + rect.width / 2;
  let left = rectCenterX - POPOVER_WIDTH / 2;
  left = Math.max(8, Math.min(left, vw - POPOVER_WIDTH - 8));

  const spaceBelow = vh - rect.bottom;
  const spaceAbove = rect.top - rect.height;

  let top: number;
  if (spaceBelow >= estimatedHeight + POPOVER_OFFSET) {
    top = rect.bottom + POPOVER_OFFSET;
  } else if (spaceAbove >= estimatedHeight + POPOVER_OFFSET) {
    top = rect.top - rect.height - estimatedHeight - POPOVER_OFFSET;
  } else {
    top = Math.max(8, Math.min(rect.bottom + POPOVER_OFFSET, vh - estimatedHeight - 8));
  }

  return { position: 'fixed', top, left, width: POPOVER_WIDTH, zIndex: 9999 };
}

type NewStage = 'menu' | 'palette' | 'note';

function NewSelectionPopover({ selection, onSave, onDismiss }: NewSelectionPopoverProps) {
  const [stage, setStage] = useState<NewStage>('menu');
  const [noteText, setNoteText] = useState('');
  const [selectedColor, setSelectedColor] = useState<AnnotationColor>('yellow');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const estimatedHeight = stage === 'menu' ? 96 : stage === 'palette' ? 72 : 200;
  const style = getPopoverStyle(selection.rect, estimatedHeight);

  useEffect(() => {
    if (stage === 'note') {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [stage]);

  return (
    <div style={style} className="annotation-popover">
      <div
        className="border border-[#3a3835]/80 rounded-xl shadow-2xl overflow-hidden"
        style={{ background: 'rgba(46, 44, 41, 0.97)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#3a3835]/60">
          <Highlighter size={11} className="text-[#c9a96e]" />
          <span className="text-[10px] text-[#8a8680] font-semibold uppercase tracking-widest flex-1">
            {stage === 'menu' ? 'Annotate' : stage === 'palette' ? 'Choose Color' : 'Add Note'}
          </span>
          {stage !== 'menu' && (
            <button
              onClick={() => setStage('menu')}
              className="p-0.5 rounded text-[#6b6762] hover:text-[#c9a96e] transition-colors"
              title="Back"
            >
              <ChevronLeft size={12} />
            </button>
          )}
          <button
            onClick={onDismiss}
            className="p-0.5 rounded text-[#6b6762] hover:text-[#e8e4de] transition-colors"
          >
            <X size={12} />
          </button>
        </div>

        {stage === 'menu' && (
          <div className="flex gap-2 p-3">
            <button
              onClick={() => setStage('palette')}
              className="flex-1 flex flex-col items-center gap-2 py-3 px-2 rounded-lg border border-[#3a3835] hover:border-[#c9a96e]/50 hover:bg-[#3a3835]/60 transition-all group"
            >
              <div className="w-8 h-8 rounded-full bg-[#3a3835] group-hover:bg-[#c9a96e]/20 flex items-center justify-center transition-colors">
                <Palette size={16} className="text-[#c9a96e]" />
              </div>
              <span className="text-[11px] font-medium text-[#b8b4ae] group-hover:text-[#e8e4de] transition-colors">
                Highlight
              </span>
            </button>
            <button
              onClick={() => { setSelectedColor('yellow'); setStage('note'); }}
              className="flex-1 flex flex-col items-center gap-2 py-3 px-2 rounded-lg border border-[#3a3835] hover:border-[#c9a96e]/50 hover:bg-[#3a3835]/60 transition-all group"
            >
              <div className="w-8 h-8 rounded-full bg-[#3a3835] group-hover:bg-[#c9a96e]/20 flex items-center justify-center transition-colors">
                <Pencil size={16} className="text-[#c9a96e]" />
              </div>
              <span className="text-[11px] font-medium text-[#b8b4ae] group-hover:text-[#e8e4de] transition-colors">
                Note
              </span>
            </button>
          </div>
        )}

        {stage === 'palette' && (
          <div className="p-3 flex flex-col gap-2">
            <div className="flex items-center justify-center gap-2">
              {COLOR_SWATCHES.map(({ value, hex, label }) => (
                <button
                  key={value}
                  onClick={() => onSave(value, undefined)}
                  title={label}
                  className="w-8 h-8 rounded-full border-2 border-black/20 hover:scale-110 transition-transform shadow-md ring-0 hover:ring-2 hover:ring-white/30"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
            {selection.text && (
              <p className="text-[9px] text-[#6b6762] truncate text-center mt-0.5">
                &ldquo;{selection.text.slice(0, 55)}{selection.text.length > 55 ? '…' : ''}&rdquo;
              </p>
            )}
          </div>
        )}

        {stage === 'note' && (
          <div className="p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-center gap-2">
              {COLOR_SWATCHES.map(({ value, hex, label }) => (
                <button
                  key={value}
                  onClick={() => setSelectedColor(value)}
                  title={label}
                  className="w-7 h-7 rounded-full border-2 transition-all shadow-md"
                  style={{
                    backgroundColor: hex,
                    borderColor: selectedColor === value ? '#ffffff' : 'rgba(0,0,0,0.2)',
                    transform: selectedColor === value ? 'scale(1.15)' : 'scale(1)',
                    boxShadow: selectedColor === value ? `0 0 0 2px rgba(201,169,110,0.6)` : undefined,
                  }}
                />
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Write your note…"
              rows={4}
              className="w-full text-[11px] bg-[#1c1a18] text-[#e8e4de] border border-[#3a3835] rounded-lg p-2 resize-none focus:outline-none focus:border-[#c9a96e] placeholder-[#4a4845] leading-relaxed"
            />
            <div className="flex gap-1.5">
              <button
                onClick={() => { setNoteText(''); setStage('menu'); }}
                className="flex-1 py-1.5 rounded-lg bg-[#1c1a18] text-[#8a8680] text-[10px] font-medium border border-[#3a3835] hover:text-[#e8e4de] hover:border-[#4a4845] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => onSave(selectedColor, noteText.trim() || undefined)}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#c9a96e] text-[#1c1a18] text-[10px] font-semibold hover:bg-[#d4b47a] transition-colors"
              >
                <Check size={11} />
                Save Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ExistingAnnotationPopover({
  annotation,
  rect,
  onColorChange,
  onNoteChange,
  onDelete,
  onDismiss,
}: ExistingAnnotationPopoverProps) {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(annotation.note);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const estimatedHeight = isEditingNote ? 200 : 140;
  const style = getPopoverStyle(rect, estimatedHeight);

  useEffect(() => {
    if (isEditingNote) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isEditingNote]);

  const handleNoteSave = () => {
    onNoteChange(noteValue);
    setIsEditingNote(false);
  };

  return (
    <div style={style} className="annotation-popover">
      <div
        className="border border-[#3a3835]/80 rounded-xl shadow-2xl overflow-hidden"
        style={{ background: 'rgba(46, 44, 41, 0.97)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#3a3835]/60">
          <Highlighter size={11} className="text-[#c9a96e]" />
          <span className="text-[10px] text-[#8a8680] font-semibold uppercase tracking-widest flex-1">
            Annotation
          </span>
          <button
            onClick={onDismiss}
            className="p-0.5 rounded text-[#6b6762] hover:text-[#e8e4de] transition-colors"
          >
            <X size={12} />
          </button>
        </div>

        <div className="p-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-center gap-2">
            {EXISTING_COLOR_OPTIONS.map(({ value, bg, border }) => (
              <button
                key={value}
                onClick={() => onColorChange(value)}
                title={value}
                className={`w-7 h-7 rounded-full ${bg} border-2 transition-all shadow-md ${
                  annotation.color === value
                    ? `${border} scale-110 ring-2 ring-white/30`
                    : 'border-transparent hover:scale-105'
                }`}
              />
            ))}
          </div>

          {isEditingNote ? (
            <div className="flex flex-col gap-1.5">
              <textarea
                ref={textareaRef}
                value={noteValue}
                onChange={e => setNoteValue(e.target.value)}
                placeholder="Add a note…"
                rows={4}
                className="w-full text-[11px] bg-[#1c1a18] text-[#e8e4de] border border-[#3a3835] rounded-lg p-2 resize-none focus:outline-none focus:border-[#c9a96e] placeholder-[#4a4845] leading-relaxed"
              />
              <div className="flex gap-1.5">
                <button
                  onClick={() => { setNoteValue(annotation.note); setIsEditingNote(false); }}
                  className="flex-1 py-1.5 rounded-lg bg-[#1c1a18] text-[#8a8680] text-[10px] font-medium border border-[#3a3835] hover:text-[#e8e4de] hover:border-[#4a4845] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNoteSave}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#c9a96e] text-[#1c1a18] text-[10px] font-semibold hover:bg-[#d4b47a] transition-colors"
                >
                  <Check size={11} />
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-1.5">
              <button
                onClick={() => setIsEditingNote(true)}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-[#1c1a18] border border-[#3a3835] text-[#8a8680] text-[10px] hover:text-[#e8e4de] hover:border-[#4a4845] transition-colors"
              >
                <StickyNote size={11} />
                {annotation.note ? 'Edit note' : 'Add note'}
              </button>
              <button
                onClick={onDelete}
                className="p-2 rounded-lg bg-[#1c1a18] border border-[#3a3835] text-[#8a8680] hover:text-red-400 hover:border-red-900/50 hover:bg-red-900/20 transition-colors"
                title="Delete annotation"
              >
                <Trash2 size={11} />
              </button>
            </div>
          )}

          {annotation.note && !isEditingNote && (
            <p className="text-[9px] text-[#8a8680] italic leading-relaxed line-clamp-3 border-t border-[#3a3835]/60 pt-2">
              {annotation.note}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function AnnotationPopover(props: PopoverProps) {
  if (props.mode === 'new') {
    return <NewSelectionPopover {...props} />;
  }
  return <ExistingAnnotationPopover {...props} />;
}
