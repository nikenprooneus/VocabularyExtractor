import { APIConfig, GeneratedResult, OutputField } from '../types/index';
import { parseMarkerTags, getMarkerTag } from '../utils/parsingUtils';

const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  google: 'https://generativelanguage.googleapis.com',
  deepseek: 'https://api.deepseek.com/v1',
};

function getBaseUrl(config: APIConfig): string {
  if (config.provider === 'custom') {
    return config.baseUrl;
  }
  return PROVIDER_BASE_URLS[config.provider] ?? config.baseUrl;
}

async function callOpenAICompatible(
  baseUrl: string,
  config: APIConfig,
  messages: { role: string; content: string }[],
  maxTokens: number
): Promise<string> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: maxTokens,
    }),
  });

  await assertJsonResponse(response);

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from API');
  return content;
}

async function callAnthropic(
  config: APIConfig,
  systemMessage: string,
  userMessage: string,
  maxTokens: number
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: maxTokens,
      temperature: config.temperature,
      system: systemMessage,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  await assertJsonResponse(response);

  const data = await response.json();
  const content = data.content?.[0]?.text;
  if (!content) throw new Error('No response from API');
  return content;
}

async function callGemini(
  config: APIConfig,
  systemMessage: string,
  userMessage: string,
  maxTokens: number
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemMessage }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: maxTokens,
      },
    }),
  });

  await assertJsonResponse(response);

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error('No response from API');
  return content;
}

async function assertJsonResponse(response: Response): Promise<void> {
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('text/html')) {
    throw new Error('Received HTML instead of JSON. Check your API endpoint or Base URL.');
  }
  if (!response.ok) {
    let errorMessage = `API error: ${response.status}`;
    try {
      const error = await response.clone().json();
      errorMessage =
        error.error?.message ??
        error.message ??
        error.error_message ??
        errorMessage;
    } catch {
      const text = await response.text();
      if (text.includes('<!doctype') || text.includes('<html')) {
        errorMessage = 'Invalid API endpoint. Verify your Base URL.';
      }
    }
    throw new Error(errorMessage);
  }
}

export async function testConnection(config: APIConfig): Promise<boolean> {
  try {
    const baseUrl = getBaseUrl(config);

    if (config.provider === 'anthropic') {
      await callAnthropic(config, 'You are a helpful assistant.', 'Hello', 10);
    } else if (config.provider === 'google') {
      await callGemini(config, 'You are a helpful assistant.', 'Hello', 10);
    } else {
      await callOpenAICompatible(
        baseUrl,
        config,
        [{ role: 'user', content: 'Hello' }],
        10
      );
    }

    return true;
  } catch {
    return false;
  }
}

export async function generateVocabulary(
  word: string,
  example: string,
  promptTemplate: string,
  outputFields: OutputField[],
  config: APIConfig,
): Promise<GeneratedResult> {
  let prompt = promptTemplate;
  prompt = prompt.replace(/\{\{Word\}\}/g, word);
  prompt = prompt.replace(/\{\{Example\}\}/g, example || '(No example provided)');

  const markerTagExamples = outputFields.map((field) => getMarkerTag(field.name)).join(', ');
  const systemMessage = `You are a helpful linguistic assistant. Provide detailed, step-by-step analysis and explanations. For structured data fields, use marker tags in the format: &FieldName&{value}. Available tags: ${markerTagExamples}. You can include these tags anywhere in your natural language response.`;

  const baseUrl = getBaseUrl(config);
  let rawContent: string;

  if (config.provider === 'anthropic') {
    rawContent = await callAnthropic(config, systemMessage, prompt, config.maxTokens);
  } else if (config.provider === 'google') {
    rawContent = await callGemini(config, systemMessage, prompt, config.maxTokens);
  } else {
    rawContent = await callOpenAICompatible(
      baseUrl,
      config,
      [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt },
      ],
      config.maxTokens
    );
  }

  return parseMarkerTags(rawContent, outputFields);
}
