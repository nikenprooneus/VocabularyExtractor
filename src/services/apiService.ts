import { APIConfig, GeneratedResult, OutputField } from '../types/index';
import { parseMarkerTags, getMarkerTag } from '../utils/parsingUtils';

export async function testConnection(config: APIConfig): Promise<boolean> {
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/html')) {
        throw new Error('Received HTML instead of JSON. Check your Base URL.');
      }
    }

    return response.ok;
  } catch (error) {
    console.error('Connection test error:', error);
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

  const markerTagExamples = outputFields.map(field => getMarkerTag(field.name)).join(', ');
  const systemMessage = `You are a helpful linguistic assistant. Provide detailed, step-by-step analysis and explanations. For structured data fields, use marker tags in the format: &FieldName&{value}. Available tags: ${markerTagExamples}. You can include these tags anywhere in your natural language response.`;

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    }),
  });

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('text/html')) {
    throw new Error('Invalid Base URL: Received HTML instead of JSON. Please check your API endpoint.');
  }

  if (!response.ok) {
    let errorMessage = `API error: ${response.status}`;
    try {
      const error = await response.json();
      errorMessage = error.error?.message || errorMessage;
    } catch {
      const text = await response.text();
      if (text.includes('<!doctype') || text.includes('<html')) {
        errorMessage = 'Invalid API endpoint. Please verify your Base URL ends with /v1';
      }
    }
    throw new Error(errorMessage);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Invalid JSON response from API. Please check your Base URL.');
  }

  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No response from API');
  }

  const result = parseMarkerTags(content, outputFields);

  return result;
}
