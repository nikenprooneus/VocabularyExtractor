import { OutputField, GeneratedResult, ParsedMeaning } from '../types';

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

export function parsePolysemicMarkerTags(
  rawText: string,
  outputFields: OutputField[]
): ParsedMeaning[] {
  const countMatch = rawText.match(/&No of Definition&\{(\d+)\}/i);
  const count = countMatch ? parseInt(countMatch[1], 10) : 0;

  if (count <= 0) {
    const single: ParsedMeaning = {};
    outputFields.forEach((field) => {
      const pattern = new RegExp(`&${escapeRegex(field.name)}&\\{([^}]*)\\}`, 'i');
      const m = rawText.match(pattern);
      single[field.name] = m && m[1] ? m[1].trim() : '';
    });
    return [single];
  }

  const meanings: ParsedMeaning[] = [];
  for (let i = 1; i <= count; i++) {
    const meaning: ParsedMeaning = {};
    outputFields.forEach((field) => {
      const numberedPattern = new RegExp(
        `&${escapeRegex(field.name)}\\s+${i}&\\{([^}]*)\\}`,
        'i'
      );
      const m = rawText.match(numberedPattern);
      meaning[field.name] = m && m[1] ? m[1].trim() : '';
    });
    meanings.push(meaning);
  }
  return meanings;
}
