import type { Session } from '@supabase/supabase-js';

export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'custom' | 'openai-compatible';

export interface LLMApiParams {
  useTemperature: boolean;
  useMaxTokens: boolean;
  useJsonSchema: boolean;
}

export interface LLMProviderProfile {
  id: string;
  name: string;
  provider: LLMProvider;
  apiKey: string;
  baseURL?: string;
  model: string;
  isCustomModel?: boolean;
  maxTokens?: number;
  apiParams?: LLMApiParams;
}

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
  llmProfiles: LLMProviderProfile[];
  activeLlmProfileId: string;
  temperature: number;
  llmMaxTokens: number;
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
  provider: LLMProvider;
  temperature: number;
  maxTokens: number;
  apiParams?: LLMApiParams;
}

export interface DatabaseLLMProfile {
  id: string;
  user_id: string;
  name: string;
  provider: string;
  api_key: string;
  base_url: string | null;
  model: string;
  is_custom_model: boolean;
  max_tokens: number | null;
  api_params: LLMApiParams | null;
  created_at: string;
  updated_at: string;
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
  llm_provider: string;
  temperature: number;
  llm_max_tokens: number;
  prompt_template: string;
  webhook_url: string;
  concept_tree_prompt_template: string;
  concept_tree_output_fields: OutputField[];
  active_llm_profile_id: string | null;
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

export interface Tone {
  id: string;
  name: string;
}

export interface Dialect {
  id: string;
  name: string;
}

export interface Mode {
  id: string;
  name: string;
}

export interface Nuance {
  id: string;
  name: string;
}

export interface Register {
  id: string;
  name: string;
}

export interface LookupTables {
  tones: Tone[];
  dialects: Dialect[];
  modes: Mode[];
  nuances: Nuance[];
  registers: Register[];
  wordLinks: WordLink[];
}

export interface ResolvedLookupIds {
  toneId: string | null;
  dialectId: string | null;
  modeId: string | null;
  nuanceId: string | null;
  registerId: string | null;
}

export interface Word {
  id: string;
  userId: string;
  word: string;
  example: string;
  note: GeneratedResult;
  toneId: string | null;
  dialectId: string | null;
  modeId: string | null;
  nuanceId: string | null;
  registerId: string | null;
  createdAt: string;
}

export interface WordWithContext extends Word {
  conceptId: string | null;
  wordLinkId: string | null;
  contextDefinition: string | null;
}

export type VocabularyEntry = Word;

export interface WordLink {
  id: string;
  name: string;
}

export interface Concept {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
}

export interface ConceptConcept {
  id: string;
  userId: string;
  parentId: string;
  childId: string;
}

export interface ConceptWord {
  id: string;
  userId: string;
  wordId: string;
  conceptId: string | null;
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
  concepts: Concept[];
  conceptConcepts: ConceptConcept[];
  conceptWords: ConceptWord[];
  wordLinks: WordLink[];
  conceptBank: string;
  refreshConcepts: () => Promise<void>;
  saveConceptsFromMeaning: (
    nodes: ConceptTreeNode[],
    wordId: string,
    wordText: string,
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

// ─── Knowledge Graph Types ────────────────────────────────────────────────────

export type GraphNodeType = 'concept' | 'word' | 'tmrnd';
export type TmrndSubType = 'tone' | 'mode' | 'nuance' | 'register' | 'dialect';

export interface WordGraphPayload {
  wordId: string;
  word: string;
  example: string;
  note: GeneratedResult;
  toneId: string | null;
  dialectId: string | null;
  modeId: string | null;
  nuanceId: string | null;
  registerId: string | null;
  conceptId: string | null;
  wordLinkId: string | null;
  wordLinkName: string | null;
  contextDefinition: string | null;
}

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  tmrndSubType?: TmrndSubType;
  payload?: WordGraphPayload;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export type GraphLinkType = 'concept-concept' | 'word-concept' | 'word-tmrnd';

export interface GraphLink {
  source: string;
  target: string;
  label?: string;
  linkType: GraphLinkType;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface GraphFilters {
  conceptText: string;
  wordText: string;
  toneId: string;
  dialectId: string;
  modeId: string;
  nuanceId: string;
  registerId: string;
  wordLinkId: string;
}

// ─── Annotation Types ─────────────────────────────────────────────────────────

export type AnnotationColor = 'yellow' | 'green' | 'blue' | 'pink' | 'gray';

export interface Annotation {
  id: string;
  userId: string;
  bookId: string;
  cfi: string;
  text: string;
  color: AnnotationColor;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseAnnotation {
  id: string;
  user_id: string;
  book_id: string;
  cfi: string;
  text: string;
  color: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface SelectionRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export interface PendingSelection {
  cfi: string;
  text: string;
  contextText: string;
  rect: SelectionRect;
}

// ─── Reader / EPUB Types ──────────────────────────────────────────────────────

export interface ReadingProgress {
  id: string;
  userId: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string | null;
  coverUrl: string | null;
  fileUrl: string | null;
  fileName: string | null;
  cfi: string | null;
  percentage: number | null;
  lastOpenedAt: string;
  createdAt: string;
}

export interface DatabaseReadingProgress {
  id: string;
  user_id: string;
  book_id: string;
  book_title: string;
  book_author: string | null;
  cover_url: string | null;
  file_url: string | null;
  file_name: string | null;
  cfi: string | null;
  percentage: number | null;
  last_opened_at: string;
  created_at: string;
}

export interface EpubTocItem {
  id: string;
  href: string;
  label: string;
  subitems?: EpubTocItem[];
}

export interface EpubMetadata {
  title: string;
  author: string;
  identifier: string;
  coverUrl: string | null;
}

export interface ReaderState {
  bookId: string | null;
  bookTitle: string;
  bookAuthor: string;
  coverUrl: string | null;
  currentCfi: string | null;
  percentage: number;
  toc: EpubTocItem[];
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
}

