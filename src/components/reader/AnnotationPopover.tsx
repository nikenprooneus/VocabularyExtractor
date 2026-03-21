import { useEffect, useRef, useState } from 'react';
import { Highlighter, Trash2, StickyNote, X, Check } from 'lucide-react';
import type { Annotation, AnnotationColor, PendingSelection } from '../../types';

const COLOR_OPTIONS: { value: AnnotationColor; label: string; bg: string; border: string }[] = [
  { value: 'yellow', label: 'Yellow',  bg: 'bg-yellow-300',  border: 'border-yellow-400' },
  { value: 'green',  label: 'Green',   bg: 'bg-green-300',   border: 'border-green-400'  },
  { value: 'blue',   label: 'Blue',    bg: 'bg-blue-300',    border: 'border-blue-400'   },
  { value: 'pink',   label: 'Pink',    bg: 'bg-pink-300',    border: 'border-pink-400'   },
];

interface NewSelectionPopoverProps {
  selection: PendingSelection;
  onHighlight: (color: AnnotationColor) => void;
  onDismiss: () => void;
}

interface ExistingAnnotationPopoverProps {
  annotation: Annotation;
  rect: DOMRect;
  onColorChange: (color: AnnotationColor) => void;
  onNoteChange: (note: string) => void;
  onDelete: () => void;
  onDismiss: () => void;
}

type PopoverProps =
  | ({ mode: 'new' } & NewSelectionPopoverProps)
  | ({ mode: 'existing' } & ExistingAnnotationPopoverProps);

const POPOVER_WIDTH = 220;
const POPOVER_OFFSET = 10;

function getPopoverStyle(rect: DOMRect, estimatedHeight: number): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const rectCenterX = rect.left + rect.width / 2;
  let left = rectCenterX - POPOVER_WIDTH / 2;
  left = Math.max(8, Math.min(left, vw - POPOVER_WIDTH - 8));

  const spaceAbove = rect.top;
  const spaceBelow = vh - rect.bottom;

  let top: number;
  if (spaceAbove >= estimatedHeight + POPOVER_OFFSET) {
    top = rect.top - estimatedHeight - POPOVER_OFFSET;
  } else if (spaceBelow >= estimatedHeight + POPOVER_OFFSET) {
    top = rect.bottom + POPOVER_OFFSET;
  } else {
    top = Math.max(8, rect.top - estimatedHeight - POPOVER_OFFSET);
  }

  return { position: 'fixed', top, left, width: POPOVER_WIDTH, zIndex: 9999 };
}

function NewSelectionPopover({ selection, onHighlight, onDismiss }: NewSelectionPopoverProps) {
  const style = getPopoverStyle(selection.rect, 72);

  return (
    <div style={style} className="annotation-popover">
      <div className="bg-[#1c1a18] border border-[#3a3835] rounded-xl shadow-2xl p-2 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 px-1">
          <Highlighter size={12} className="text-[#c9a96e]" />
          <span className="text-[10px] text-[#8a8680] font-medium uppercase tracking-wider">Highlight</span>
          <button
            onClick={onDismiss}
            className="ml-auto p-0.5 rounded text-[#6b6762] hover:text-[#e8e4de] transition-colors"
          >
            <X size={12} />
          </button>
        </div>
        <div className="flex items-center gap-1.5 justify-center">
          {COLOR_OPTIONS.map(({ value, bg, border }) => (
            <button
              key={value}
              onClick={() => onHighlight(value)}
              title={value}
              className={`w-7 h-7 rounded-full ${bg} border-2 ${border} hover:scale-110 transition-transform shadow-sm`}
            />
          ))}
        </div>
        {selection.text && (
          <p className="text-[9px] text-[#6b6762] px-1 truncate max-w-full">
            &ldquo;{selection.text.slice(0, 60)}{selection.text.length > 60 ? '…' : ''}&rdquo;
          </p>
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

  const estimatedHeight = isEditingNote ? 180 : 120;
  const style = getPopoverStyle(rect, estimatedHeight);

  useEffect(() => {
    if (isEditingNote) {
      textareaRef.current?.focus();
    }
  }, [isEditingNote]);

  const handleNoteSave = () => {
    onNoteChange(noteValue);
    setIsEditingNote(false);
  };

  return (
    <div style={style} className="annotation-popover">
      <div className="bg-[#1c1a18] border border-[#3a3835] rounded-xl shadow-2xl p-2 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 px-1">
          <Highlighter size={12} className="text-[#c9a96e]" />
          <span className="text-[10px] text-[#8a8680] font-medium uppercase tracking-wider">Annotation</span>
          <button
            onClick={onDismiss}
            className="ml-auto p-0.5 rounded text-[#6b6762] hover:text-[#e8e4de] transition-colors"
          >
            <X size={12} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 justify-center">
          {COLOR_OPTIONS.map(({ value, bg, border }) => (
            <button
              key={value}
              onClick={() => onColorChange(value)}
              title={value}
              className={`w-7 h-7 rounded-full ${bg} border-2 transition-transform shadow-sm ${
                annotation.color === value
                  ? `${border} scale-110 ring-2 ring-white/30`
                  : 'border-transparent hover:scale-105'
              }`}
            />
          ))}
        </div>

        {isEditingNote ? (
          <div className="flex flex-col gap-1.5 px-0.5">
            <textarea
              ref={textareaRef}
              value={noteValue}
              onChange={e => setNoteValue(e.target.value)}
              placeholder="Add a note…"
              rows={3}
              className="w-full text-[10px] bg-[#2e2c29] text-[#e8e4de] border border-[#3a3835] rounded-lg p-1.5 resize-none focus:outline-none focus:border-[#c9a96e] placeholder-[#4a4845]"
            />
            <div className="flex items-center gap-1">
              <button
                onClick={handleNoteSave}
                className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-[#c9a96e] text-[#1c1a18] text-[10px] font-medium hover:bg-[#d4b47a] transition-colors"
              >
                <Check size={11} />
                Save
              </button>
              <button
                onClick={() => { setNoteValue(annotation.note); setIsEditingNote(false); }}
                className="flex-1 flex items-center justify-center py-1 rounded-lg bg-[#2e2c29] text-[#8a8680] text-[10px] hover:text-[#e8e4de] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-0.5">
            <button
              onClick={() => setIsEditingNote(true)}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#2e2c29] text-[#8a8680] text-[10px] hover:text-[#e8e4de] hover:bg-[#3a3835] transition-colors"
            >
              <StickyNote size={11} />
              {annotation.note ? 'Edit note' : 'Add note'}
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg bg-[#2e2c29] text-[#8a8680] hover:text-red-400 hover:bg-red-900/20 transition-colors"
              title="Delete annotation"
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}

        {annotation.note && !isEditingNote && (
          <p className="text-[9px] text-[#8a8680] px-1 italic leading-relaxed line-clamp-2">
            {annotation.note}
          </p>
        )}
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
