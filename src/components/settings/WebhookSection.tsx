interface WebhookSectionProps {
  webhookUrl: string;
  onWebhookUrlChange: (value: string) => void;
}

export function WebhookSection({
  webhookUrl,
  onWebhookUrlChange,
}: WebhookSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Google Sheets Webhook</h2>
      <div className="space-y-4">
        <input
          type="text"
          value={webhookUrl}
          onChange={(e) => onWebhookUrlChange(e.target.value)}
          placeholder="https://hooks.zapier.com/hooks/catch/..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500">
          Leave empty to disable exports. Paste your webhook URL from Zapier or Make (formerly
          Integromat).
        </p>
      </div>
    </div>
  );
}
