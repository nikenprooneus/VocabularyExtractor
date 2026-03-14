import { Plus, Trash2 } from 'lucide-react';
import { FlashcardConfig, OutputField } from '../../types/index';

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
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Flashcard Builder</h2>
      <p className="text-sm text-gray-600 mb-4">
        Create flashcards by assigning fields to front and back. Definition field will always display separately at the top.
      </p>

      <div className="space-y-4">
        <button
          onClick={onAddCard}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Add New Card
        </button>

        {flashcardConfigs.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">No flashcards created yet</p>
        ) : (
          <div className="space-y-4">
            {flashcardConfigs.map((config, index) => {
              const frontField = outputFields.find(f => f.id === config.frontFieldId);
              const backFields = config.backFieldIds.map(id => outputFields.find(f => f.id === id)).filter(Boolean) as OutputField[];
              const availableForThis = getAvailableFields();
              const availableForFront = config.frontFieldId ? availableForThis : [...availableForThis, frontField].filter(Boolean) as OutputField[];
              const availableForBack = config.backFieldIds.length > 0 ? [...availableForThis, ...backFields] : availableForThis;

              return (
                <div key={config.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Card {index + 1}</h3>
                    <button
                      onClick={() => onDeleteCard(config.id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Front Field <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={config.frontFieldId}
                        onChange={(e) => onFrontFieldChange(config.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a field...</option>
                        {availableForFront.map(field => (
                          <option key={field.id} value={field.id}>{field.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Back Fields (up to 3)
                      </label>
                      {config.backFieldIds.length < 3 && (
                        <select
                          value=""
                          onChange={(e) => onBackFieldAdd(config.id, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                        >
                          <option value="">Add a field...</option>
                          {availableForBack.map(field => (
                            <option key={field.id} value={field.id}>{field.name}</option>
                          ))}
                        </select>
                      )}
                      <div className="space-y-2">
                        {backFields.map((field) => (
                          <div key={field.id} className="flex items-center justify-between bg-white px-3 py-2 rounded border border-gray-200">
                            <span className="text-gray-800 text-sm">{field.name}</span>
                            <button
                              onClick={() => onRemoveFieldFromCard(config.id, field.id, 'back')}
                              className="text-red-600 hover:text-red-800 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                        {config.backFieldIds.length === 0 && (
                          <p className="text-gray-400 text-xs">No back fields added yet</p>
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
