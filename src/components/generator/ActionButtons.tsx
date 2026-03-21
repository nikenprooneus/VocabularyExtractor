import { Loader, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ActionButtonsProps {
  isSaving: boolean;
  isExporting: boolean;
  webhookUrl: string;
  onSave: () => void;
  onExport: () => void;
}

export function ActionButtons({
  isSaving,
  isExporting,
  webhookUrl,
  onSave,
  onExport,
}: ActionButtonsProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="w-full sm:w-auto gap-2"
          >
            {isSaving ? (
              <><Loader size={14} className="animate-spin" />Saving...</>
            ) : (
              <><Save size={14} />Save Complete Analysis</>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onExport}
            disabled={isExporting || !webhookUrl}
            className="w-full sm:w-auto gap-2"
          >
            {isExporting ? (
              <><Loader size={14} className="animate-spin" />Exporting...</>
            ) : (
              <><Send size={14} />Export to Google Sheets</>
            )}
          </Button>
        </div>
        {!webhookUrl && (
          <p className="text-xs text-muted-foreground mt-2">
            Webhook URL not configured. Configure it in Settings to enable exports.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
