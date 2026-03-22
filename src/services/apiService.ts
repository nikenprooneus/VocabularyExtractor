import { APIConfig, GeneratedResult, OutputField } from '../types/index';
import { ApiJsonSchema, sanitizeSchemaForGemini } from '../utils/schemaBuilder';

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 60000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out after 60s. Check your connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  google: 'https://generativelanguage.googleapis.com',
  deepseek: 'https://api.deepseek.com/v1',
};

function getBaseUrl(config: APIConfig): string {
  if (config.provider === 'custom' || config.provider === 'openai-compatible') {
    return config.baseUrl;
  }
  return PROVIDER_BASE_URLS[config.provider] ?? config.baseUrl;
}

async function callOpenAICompatible(
  baseUrl: string,
  config: APIConfig,
  messages: { role: string; content: string }[],
  maxTokens: number,
  jsonSchema?: ApiJsonSchema
): Promise<string> {
  const params = config.apiParams;
  const useTemperature = params?.useTemperature ?? true;
  const useMaxTokens = params?.useMaxTokens ?? true;
  const useSchema = params?.useJsonSchema ?? true;

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
  };

  if (useTemperature) body.temperature = config.temperature;
  if (useMaxTokens) body.max_completion_tokens = maxTokens;

  if (jsonSchema && useSchema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'vocabulary_extraction',
        strict: true,
        schema: jsonSchema,
      },
    };
  }

  const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
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
  maxTokens: number,
  jsonSchema?: ApiJsonSchema
): Promise<string> {
  const params = config.apiParams;
  const useTemperature = params?.useTemperature ?? true;
  const useMaxTokens = params?.useMaxTokens ?? true;
  const useSchema = params?.useJsonSchema ?? true;

  const body: Record<string, unknown> = {
    model: config.model,
    system: systemMessage,
    messages: [{ role: 'user', content: userMessage }],
  };

  if (useMaxTokens) body.max_tokens = maxTokens;
  if (useTemperature) body.temperature = config.temperature;

  if (jsonSchema && useSchema) {
    body.tools = [
      {
        name: 'vocabulary_extraction',
        description: 'Extract vocabulary information as structured data',
        input_schema: jsonSchema,
      },
    ];
    body.tool_choice = { type: 'tool', name: 'vocabulary_extraction' };
  }

  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  await assertJsonResponse(response);

  const data = await response.json();

  if (jsonSchema) {
    const toolUse = data.content?.find((block: { type: string }) => block.type === 'tool_use');
    if (toolUse?.input) {
      return JSON.stringify(toolUse.input);
    }
  }

  const content = data.content?.[0]?.text;
  if (!content) throw new Error('No response from API');
  return content;
}

async function callGemini(
  config: APIConfig,
  systemMessage: string,
  userMessage: string,
  maxTokens: number,
  jsonSchema?: ApiJsonSchema
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

  const params = config.apiParams;
  const useTemperature = params?.useTemperature ?? true;
  const useMaxTokens = params?.useMaxTokens ?? true;
  const useSchema = params?.useJsonSchema ?? true;

  const generationConfig: Record<string, unknown> = {};

  if (useTemperature) generationConfig.temperature = config.temperature;
  if (useMaxTokens) generationConfig.maxOutputTokens = maxTokens;

  if (jsonSchema && useSchema) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseSchema = sanitizeSchemaForGemini(jsonSchema);
  }

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemMessage }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig,
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
    const statusPrefix = `API Error (${response.status})`;
    let detail: string | null = null;
    try {
      const error = await response.clone().json();
      detail =
        error.error?.message ??
        error.message ??
        error.error_message ??
        null;
    } catch {
      const text = await response.text();
      if (text.includes('<!doctype') || text.includes('<html')) {
        detail = 'Invalid API endpoint. Verify your Base URL.';
      }
    }
    throw new Error(detail ? `${statusPrefix}: ${detail}` : statusPrefix);
  }
}

export async function testConnection(config: APIConfig): Promise<void> {
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
}

export async function generateVocabulary(
  word: string,
  example: string,
  promptTemplate: string,
  outputFields: OutputField[],
  config: APIConfig,
  jsonSchema?: ApiJsonSchema
): Promise<GeneratedResult> {
  let prompt = promptTemplate;
  prompt = prompt.replace(/\{\{Word\}\}/g, word);
  prompt = prompt.replace(/\{\{Example\}\}/g, example || '(No example provided)');

  const systemMessage = jsonSchema
    ? 'You are a helpful linguistic assistant. Provide detailed, accurate analysis for the given word and example sentence. Return your response as a JSON object following the provided schema exactly.'
    : `You are a helpful linguistic assistant. Provide detailed, step-by-step analysis and explanations. For structured data fields, use marker tags in the format: &FieldName&{value}. Available tags: ${outputFields.map((f) => `&${f.name}&{value}`).join(', ')}. You can include these tags anywhere in your natural language response.`;

  const baseUrl = getBaseUrl(config);
  let rawContent: string;

  if (config.provider === 'anthropic') {
    rawContent = await callAnthropic(config, systemMessage, prompt, config.maxTokens, jsonSchema);
  } else if (config.provider === 'google') {
    rawContent = await callGemini(config, systemMessage, prompt, config.maxTokens, jsonSchema);
  } else if (config.provider === 'custom' || config.provider === 'openai-compatible') {
    try {
      rawContent = await callOpenAICompatible(
        baseUrl,
        config,
        [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt },
        ],
        config.maxTokens,
        jsonSchema
      );
    } catch (err) {
      const isSchemaError =
        err instanceof Error &&
        (err.message.includes('400') || err.message.includes('422') || err.message.includes('response_format'));
      if (isSchemaError) {
        rawContent = await callOpenAICompatible(
          baseUrl,
          config,
          [
            { role: 'system', content: systemMessage },
            { role: 'user', content: prompt },
          ],
          config.maxTokens
        );
      } else {
        throw err;
      }
    }
  } else {
    rawContent = await callOpenAICompatible(
      baseUrl,
      config,
      [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt },
      ],
      config.maxTokens,
      jsonSchema
    );
  }

  return { rawOutput: rawContent };
}
