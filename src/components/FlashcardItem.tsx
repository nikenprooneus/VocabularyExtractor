import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FlashcardConfig, GeneratedResult, OutputField } from '../types';

interface FlashcardItemProps {
  config: FlashcardConfig;
  results: GeneratedResult;
  outputFields: OutputField[];
}

export function FlashcardItem({ config, results, outputFields }: FlashcardItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const frontField = outputFields.find(f => f.id === config.frontFieldId);
  const backFields = config.backFieldIds
    .map(id => outputFields.find(f => f.id === id))
    .filter((f): f is OutputField => !!f);

  if (!frontField || !results[frontField.name]) {
    return null;
  }

  const frontContent = results[frontField.name];
  const hasBackContent = backFields.some(field => results[field.name]);

  return (
    <div
      onClick={() => setIsExpanded(!isExpanded)}
      className={`rounded-xl border-2 bg-white cursor-pointer transition-all duration-300 h-auto min-h-[140px] overflow-hidden ${
        isExpanded
          ? 'border-blue-400 shadow-lg'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-lg hover:scale-102 hover:bg-gray-50'
      }`}
    >
      <div className="p-5 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">
              {frontField.name}
            </p>
            <p className="text-base text-gray-800 leading-normal">
              {frontContent}
            </p>
          </div>
          <div className={`transition-transform duration-300 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>
            <ChevronDown size={20} className="text-gray-400" />
          </div>
        </div>

        {isExpanded && hasBackContent && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
            {backFields.map((field) => {
              const content = results[field.name];
              if (!content) return null;

              return (
                <div key={field.id}>
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                    {field.name}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {content}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
