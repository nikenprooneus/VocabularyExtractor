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

interface SortableFieldItemProps {
  field: OutputField;
  onRemove: (id: string) => void;
  isDefinitionField?: boolean;
}

function SortableFieldItem({ field, onRemove, isDefinitionField = false }: SortableFieldItemProps) {
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
      className="bg-gray-50 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Drag handle"
        >
          <GripVertical size={20} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-gray-800 font-medium block">{field.name}</span>
            {isDefinitionField && (
              <>
                <Lock size={14} className="text-gray-400" />
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">Required</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded font-mono">
              {markerTag}
            </code>
            <button
              onClick={handleCopyTag}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              aria-label={`Copy tag for ${field.name}`}
              title="Copy tag"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
        {!isDefinitionField && (
          <button
            onClick={() => onRemove(field.id)}
            className="text-red-600 hover:text-red-800 transition-colors"
            aria-label={`Remove ${field.name}`}
          >
            <Trash2 size={18} />
          </button>
        )}
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
}

export function OutputFieldsSection({
  outputFields,
  newFieldName,
  onNewFieldNameChange,
  onAddField,
  onRemoveField,
  onDragEnd,
}: OutputFieldsSectionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Dynamic Output Fields</h2>
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newFieldName}
            onChange={(e) => onNewFieldNameChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAddField()}
            placeholder="e.g., Phonetic, Vietnamese Meaning"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={onAddField}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition flex items-center gap-2"
          >
            <Plus size={18} />
            Add
          </button>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {outputFields.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">No fields added yet</p>
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
                      isDefinitionField={field.name === 'Definition'}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
        <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
          <p className="font-medium mb-1">Use Marker Tags in your prompt:</p>
          <p className="mb-2">Each field has a marker tag displayed below its name. Copy these tags and use them in your prompt template to extract specific values from the AI's response.</p>
          <p className="font-medium mb-1">Concept Tree fields:</p>
          <p>Add fields named <code className="bg-white px-1 rounded font-mono">Tier1</code>, <code className="bg-white px-1 rounded font-mono">Tier2</code>, <code className="bg-white px-1 rounded font-mono">Tier3</code>, and <code className="bg-white px-1 rounded font-mono">Context Definition</code> to enable the Concept Tree visualization. For polysemic words, use numbered tags in your prompt (e.g. <code className="bg-white px-1 rounded font-mono">&Tier1 1&{"{}"}</code>, <code className="bg-white px-1 rounded font-mono">&Tier1 2&{"{}"}</code>) alongside <code className="bg-white px-1 rounded font-mono">&No of Definition&{"{}"}</code>.</p>
        </div>
      </div>
    </div>
  );
}
