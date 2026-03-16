import { z } from 'zod';
import { OutputField } from '../types';

export interface ApiJsonSchema {
  type: 'object';
  properties: Record<string, { type: string; description?: string }>;
  required: string[];
  additionalProperties: false;
}

export function buildApiJsonSchema(outputFields: OutputField[]): ApiJsonSchema {
  const properties: Record<string, { type: string; description?: string }> = {};
  const required: string[] = [];

  for (const field of outputFields) {
    properties[field.name] = { type: 'string' };
    required.push(field.name);
  }

  return {
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  };
}

export type DynamicZodSchema = z.ZodObject<Record<string, z.ZodCatch<z.ZodString>>>;

export function buildZodSchema(outputFields: OutputField[]): DynamicZodSchema {
  const shape: Record<string, z.ZodCatch<z.ZodString>> = {};

  for (const field of outputFields) {
    shape[field.name] = z.string().catch('');
  }

  return z.object(shape);
}
