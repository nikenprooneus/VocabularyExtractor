import type { Session } from '@supabase/supabase-js';

export interface OutputField {
  id: string;
  name: string;
}

export interface FlashcardConfig {
  id: string;
  cardOrder: number;
  frontFieldId: string;
  backFieldIds: string[];
}

export interface Settings {
  apiKey: string;
  baseUrl: string;
  model: string;
  outputFields: OutputField[];
  promptTemplate: string;
  webhookUrl: string;
  flashcardConfigs: FlashcardConfig[];
}

export interface GeneratedResult {
  [key: string]: string | undefined;
  rawOutput?: string;
}

export interface ExportPayload {
  word: string;
  example: string;
  results: GeneratedResult;
}

export interface APIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface DatabaseSettings {
  id: string;
  user_id: string;
  api_key: string;
  base_url: string;
  model: string;
  prompt_template: string;
  webhook_url: string;
  flashcard_configs: FlashcardConfig[];
  created_at: string;
  updated_at: string;
}

export interface OutputFieldDB {
  id: string;
  user_id: string;
  name: string;
  display_order: number;
  created_at: string;
}

export interface VocabularyEntry {
  id: string;
  user_id: string;
  word: string;
  example: string;
  results: GeneratedResult;
  created_at: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
