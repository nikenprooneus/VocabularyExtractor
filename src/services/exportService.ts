import { ExportPayload, GeneratedResult } from '../types/index';

export async function exportToWebhook(
  word: string,
  example: string,
  results: GeneratedResult,
  webhookUrl: string,
): Promise<void> {
  const payload: ExportPayload = {
    word,
    example,
    results,
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Webhook error: ${response.status}`);
  }
}
