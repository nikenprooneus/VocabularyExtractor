import { Label } from '../ui/label';

interface WebhookSectionProps {
  webhookUrl: string;
  onWebhookUrlChange: (value: string) => void;
}

export function WebhookSection({
  webhookUrl,
  onWebhookUrlChange,
}: WebhookSectionProps) {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">Google Sheets Webhook</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Connect to Zapier or Make to export vocabulary cards</p>
      </div>
      <div className="p-6 space-y-3">
        <Label htmlFor="webhook-url">Webhook URL</Label>
        <input
          id="webhook-url"
          type="text"
          value={webhookUrl}
          onChange={(e) => onWebhookUrlChange(e.target.value)}
          placeholder="https://hooks.zapier.com/hooks/catch/..."
          className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
        <p className="text-xs text-muted-foreground">
          Leave empty to disable exports. Paste your webhook URL from Zapier or Make (formerly Integromat).
        </p>
      </div>
    </div>
  );
}
