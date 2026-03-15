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
  conceptTreePromptTemplate: string;
  conceptTreeOutputFields: OutputField[];
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
  concept_tree_prompt_template: string;
  concept_tree_output_fields: OutputField[];
  created_at: string;
  updated_at: string;
}

export interface DatabaseFlashcardConfig {
  id: string;
  user_id: string;
  card_order: number;
  front_field_id: string;
  back_field_ids: string[];
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

export interface WordLink {
  id: string;
  name: string;
}

export interface ConceptWord {
  id: string;
  userId: string;
  name: string;
  parentId: string | null;
  nodeType: 'concept' | 'word';
  wordLinkId?: string | null;
  wordLinkName?: string;
  contextDefinition?: string | null;
  createdAt: string;
}

export interface ParsedMeaning {
  [fieldName: string]: string;
}

export type ConceptNodeStatus = 'EXISTING' | 'NEW';

export interface ConceptTreeNode {
  name: string;
  status: ConceptNodeStatus;
  tier: 'word' | 1 | 2 | 3;
  conceptLink?: string;
}

export interface ConceptContextType {
  concepts: ConceptWord[];
  wordLinks: WordLink[];
  conceptBank: string;
  refreshConcepts: () => Promise<void>;
  saveConceptsFromMeaning: (
    nodes: ConceptTreeNode[],
    wordName: string,
    selectedNames: Set<string>,
    conceptLink?: string,
    contextDefinition?: string
  ) => Promise<void>;
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
