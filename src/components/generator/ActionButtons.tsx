import { Loader, Save, Send } from 'lucide-react';

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
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex gap-3">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader size={18} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={18} />
              Save to History
            </>
          )}
        </button>
        <button
          onClick={onExport}
          disabled={isExporting || !webhookUrl}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2"
        >
          {isExporting ? (
            <>
              <Loader size={18} className="animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Send size={18} />
              Export to Google Sheets
            </>
          )}
        </button>
      </div>
      {!webhookUrl && (
        <p className="text-xs text-gray-500 mt-2">
          Webhook URL not configured. Configure it in Settings to enable exports.
        </p>
      )}
    </div>
  );
}
