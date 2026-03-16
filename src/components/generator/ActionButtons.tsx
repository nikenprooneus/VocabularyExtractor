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
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-2.5">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white py-2 px-5 rounded-md text-sm font-medium transition-all"
        >
          {isSaving ? (
            <>
              <Loader size={15} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={15} />
              Save Complete Analysis
            </>
          )}
        </button>
        <button
          onClick={onExport}
          disabled={isExporting || !webhookUrl}
          className="w-full sm:w-auto flex items-center justify-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 py-2 px-5 rounded-md text-sm font-medium transition-all"
        >
          {isExporting ? (
            <>
              <Loader size={15} className="animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Send size={15} />
              Export to Google Sheets
            </>
          )}
        </button>
      </div>
      {!webhookUrl && (
        <p className="text-xs text-slate-400 mt-1.5">
          Webhook URL not configured. Configure it in Settings to enable exports.
        </p>
      )}
    </div>
  );
}
