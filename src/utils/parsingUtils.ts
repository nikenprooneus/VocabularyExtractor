import { OutputField, GeneratedResult, ParsedMeaning } from '../types';
import { DynamicZodSchema } from './schemaBuilder';

export function parseStructuredOutput(
  rawText: string,
  zodSchema: DynamicZodSchema,
  outputFields: OutputField[]
): GeneratedResult {
  try {
    const parsed = JSON.parse(rawText);
    const validated = zodSchema.parse(parsed);
    return { ...validated, rawOutput: rawText };
  } catch {
    console.warn('Structured JSON parse failed, falling back to marker-tag extraction');
    return parseMarkerTags(rawText, outputFields);
  }
}

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

export function parseSingleMeaning(
  rawText: string,
  outputFields: OutputField[],
  zodSchema?: DynamicZodSchema
): ParsedMeaning {
  if (zodSchema) {
    try {
      const parsed = JSON.parse(rawText);
      const validated = zodSchema.parse(parsed);
      return validated as ParsedMeaning;
    } catch {
      console.warn('Structured JSON parse failed for concept tree, falling back to marker-tag extraction');
    }
  }

  const meaning: ParsedMeaning = {};
  outputFields.forEach((field) => {
    const pattern = new RegExp(`&${escapeRegex(field.name)}&\\{([^}]*)\\}`, 'i');
    const m = rawText.match(pattern);
    meaning[field.name] = m && m[1] ? m[1].trim() : '';
  });
  return meaning;
}
