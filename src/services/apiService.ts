import { APIConfig, GeneratedResult, OutputField } from '../types/index';
import { ApiJsonSchema } from '../utils/schemaBuilder';

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
  maxTokens: number,
  jsonSchema?: ApiJsonSchema
): Promise<string> {
  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    temperature: config.temperature,
    max_tokens: maxTokens,
  };

  if (jsonSchema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'vocabulary_extraction',
        strict: true,
        schema: jsonSchema,
      },
    };
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
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
  const body: Record<string, unknown> = {
    model: config.model,
    max_tokens: maxTokens,
    temperature: config.temperature,
    system: systemMessage,
    messages: [{ role: 'user', content: userMessage }],
  };

  if (jsonSchema) {
    body.tools = [
      {
        name: 'vocabulary_extraction',
        description: 'Extract vocabulary information as structured data',
        input_schema: jsonSchema,
      },
    ];
    body.tool_choice = { type: 'tool', name: 'vocabulary_extraction' };
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
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

  const generationConfig: Record<string, unknown> = {
    temperature: config.temperature,
    maxOutputTokens: maxTokens,
  };

  if (jsonSchema) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseSchema = jsonSchema;
  }

  const response = await fetch(url, {
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
  } else if (config.provider === 'custom') {
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
