import { Plus, Trash2 } from 'lucide-react';
import { FlashcardConfig, OutputField } from '../../types/index';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface FlashcardBuilderSectionProps {
  flashcardConfigs: FlashcardConfig[];
  outputFields: OutputField[];
  getAvailableFields: () => OutputField[];
  onAddCard: () => void;
  onDeleteCard: (cardId: string) => void;
  onFrontFieldChange: (cardId: string, fieldId: string) => void;
  onBackFieldAdd: (cardId: string, fieldId: string) => void;
  onRemoveFieldFromCard: (cardId: string, fieldId: string, location: 'front' | 'back') => void;
}

export function FlashcardBuilderSection({
  flashcardConfigs,
  outputFields,
  getAvailableFields,
  onAddCard,
  onDeleteCard,
  onFrontFieldChange,
  onBackFieldAdd,
  onRemoveFieldFromCard,
}: FlashcardBuilderSectionProps) {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Flashcard Builder</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Assign fields to card fronts and backs. Definition always displays separately at the top.
          </p>
        </div>
        <button
          onClick={onAddCard}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-lg text-sm font-medium transition-all"
        >
          <Plus size={14} />
          Add Card
        </button>
      </div>

      <div className="p-6">
        {flashcardConfigs.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p className="text-sm">No flashcard layouts created yet.</p>
            <button
              onClick={onAddCard}
              className="mt-3 text-sm text-primary hover:opacity-80 underline underline-offset-2"
            >
              Create your first card
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {flashcardConfigs.map((config, index) => {
              const frontField = outputFields.find(f => f.id === config.frontFieldId);
              const backFields = config.backFieldIds.map(id => outputFields.find(f => f.id === id)).filter(Boolean) as OutputField[];
              const availableForThis = getAvailableFields();
              const availableForFront = frontField
                ? [frontField, ...availableForThis.filter(f => f.id !== frontField.id)]
                : availableForThis;
              const availableForBack = config.backFieldIds.length > 0 ? [...availableForThis, ...backFields] : availableForThis;

              return (
                <div key={config.id} className="border border-border rounded-xl p-4 bg-muted/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Card {index + 1}</h3>
                    <button
                      onClick={() => onDeleteCard(config.id)}
                      className="text-destructive hover:opacity-80 transition-opacity"
                      title="Delete card"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="mb-1.5">
                        Front Field <span className="text-destructive normal-case font-normal">*</span>
                      </Label>
                      <Select
                        value={config.frontFieldId || ''}
                        onValueChange={(value) => onFrontFieldChange(config.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a field..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableForFront.map(field => (
                            <SelectItem key={field.id} value={field.id}>{field.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="mb-1.5">
                        Back Fields{' '}
                        <span className="normal-case font-normal text-muted-foreground">(up to 3)</span>
                      </Label>
                      {config.backFieldIds.length < 3 && (
                        <Select
                          value=""
                          onValueChange={(value) => onBackFieldAdd(config.id, value)}
                        >
                          <SelectTrigger className="mb-2">
                            <SelectValue placeholder="Add a field..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableForBack.map(field => (
                              <SelectItem key={field.id} value={field.id}>{field.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <div className="space-y-2">
                        {backFields.map((field) => (
                          <div key={field.id} className="flex items-center justify-between bg-background px-3 py-2 rounded-lg border border-border">
                            <span className="text-foreground text-sm">{field.name}</span>
                            <button
                              onClick={() => onRemoveFieldFromCard(config.id, field.id, 'back')}
                              className="text-destructive hover:opacity-80 transition-opacity"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                        {config.backFieldIds.length === 0 && (
                          <p className="text-muted-foreground text-xs">No back fields added yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
