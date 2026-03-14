import { OutputField, GeneratedResult } from '../types';

export function parseMarkerTags(rawText: string, outputFields: OutputField[]): GeneratedResult {
  const result: GeneratedResult = {
    rawOutput: rawText
  };

  outputFields.forEach(field => {
    const pattern = new RegExp(`&${escapeRegex(field.name)}&\\{([^}]+)\\}`, 'i');
    const match = rawText.match(pattern);

    if (match && match[1]) {
      result[field.name] = match[1].trim();
    } else {
      result[field.name] = '';
    }
  });

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getMarkerTag(fieldName: string): string {
  return `&${fieldName}&{}`;
}
