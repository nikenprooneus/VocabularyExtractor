import { Plus, Trash2, GripVertical, Copy, Lock } from 'lucide-react';
import { OutputField } from '../../types/index';
import { getMarkerTag } from '../../utils/parsingUtils';
import toast from 'react-hot-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Label } from '../ui/label';

interface SortableFieldItemProps {
  field: OutputField;
  onRemove: (id: string) => void;
  isProtectedField?: boolean;
}

function SortableFieldItem({ field, onRemove, isProtectedField = false }: SortableFieldItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const markerTag = getMarkerTag(field.name);

  const handleCopyTag = () => {
    navigator.clipboard.writeText(markerTag);
    toast.success('Tag copied to clipboard!');
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-muted/40 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Drag handle"
        >
          <GripVertical size={20} />
        </div>
        <div className="flex-1 flex items-center justify-between min-w-0">
          <div className="flex items-center gap-2 truncate">
            <span className="text-foreground font-medium truncate">{field.name}</span>
            {isProtectedField && (
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium border border-primary/20 flex-shrink-0 flex items-center gap-1">
                <Lock size={10} /> Required
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 ml-4">
            <button
              onClick={handleCopyTag}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={`Copy tag for ${field.name}`}
              title="Copy tag"
            >
              <Copy size={14} />
            </button>
            <code className="text-[11px] bg-background border border-border text-muted-foreground px-1.5 py-0.5 rounded font-mono">
              {markerTag}
            </code>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isProtectedField) onRemove(field.id);
              }}
              disabled={isProtectedField}
              className={`p-1 transition-colors ${
                isProtectedField
                  ? 'invisible'
                  : 'text-muted-foreground hover:text-red-400 cursor-pointer'
              }`}
              aria-label={`Delete ${field.name}`}
              title={isProtectedField ? '' : 'Delete field'}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface OutputFieldsSectionProps {
  outputFields: OutputField[];
  newFieldName: string;
  onNewFieldNameChange: (value: string) => void;
  onAddField: () => void;
  onRemoveField: (id: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
  protectedFieldNames?: string[];
}

export function OutputFieldsSection({
  outputFields,
  newFieldName,
  onNewFieldNameChange,
  onAddField,
  onRemoveField,
  onDragEnd,
  protectedFieldNames,
}: OutputFieldsSectionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const protected_ = new Set(protectedFieldNames ?? ['Definition']);

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">Dynamic Output Fields</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Define the fields the AI will extract for each word</p>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <Label className="mb-1.5">Add New Field</Label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newFieldName}
              onChange={(e) => onNewFieldNameChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddField()}
              placeholder="e.g., Phonetic, Vietnamese Meaning"
              className="flex-1 px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
            <button
              onClick={onAddField}
              className="bg-primary hover:opacity-90 text-primary-foreground py-2.5 px-4 rounded-lg text-sm font-medium transition flex items-center gap-2"
            >
              <Plus size={16} />
              Add
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {outputFields.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No fields added yet</p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={outputFields.map((field) => field.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {outputFields.map((field) => (
                    <SortableFieldItem
                      key={field.id}
                      field={field}
                      onRemove={onRemoveField}
                      isProtectedField={protected_.has(field.name)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="text-xs text-muted-foreground bg-primary/5 border border-primary/20 p-4 rounded-lg space-y-2">
          <p className="font-semibold text-foreground">Use Marker Tags in your prompt:</p>
          <p>Each field has a marker tag displayed below its name. Copy these tags and use them in your prompt template to extract specific values from the AI's response.</p>
        </div>
      </div>
    </div>
  );
}
