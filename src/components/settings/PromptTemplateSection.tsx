import { Label } from '../ui/label';

interface PromptTemplateSectionProps {
  promptTemplate: string;
  onPromptTemplateChange: (value: string) => void;
  mode?: 'tmrnd' | 'concepttree';
}

export function PromptTemplateSection({
  promptTemplate,
  onPromptTemplateChange,
  mode = 'tmrnd',
}: PromptTemplateSectionProps) {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">Prompt Template</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {mode === 'concepttree'
            ? 'Custom prompt for the Concept Tree parallel analysis call'
            : 'Custom prompt for TMRND field extraction'}
        </p>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <Label htmlFor="prompt-template" className="mb-1.5">Template</Label>
          <textarea
            id="prompt-template"
            value={promptTemplate}
            onChange={(e) => onPromptTemplateChange(e.target.value)}
            placeholder={
              mode === 'concepttree'
                ? 'Enter your Concept Tree prompt. Use {{Word}}, {{Concept Bank}}, and numbered tier tags like &Tier1 1&{abstract}.'
                : 'Enter your TMRND prompt template. Use {{Word}}, {{Example}}, and marker tags for output fields.'
            }
            rows={6}
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent font-mono resize-y"
          />
          <p className="text-xs text-muted-foreground mt-1.5">Character count: {promptTemplate.length}</p>
        </div>

        {mode === 'tmrnd' && (
          <div className="text-xs text-muted-foreground bg-muted/50 border border-border p-4 rounded-lg space-y-2">
            <p className="font-semibold text-foreground">Available variables:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <code className="bg-background border border-border px-1.5 py-0.5 rounded font-mono text-foreground">{'{{Word}}'}</code>
                {' '}— The English word
              </li>
              <li>
                <code className="bg-background border border-border px-1.5 py-0.5 rounded font-mono text-foreground">{'{{Example}}'}</code>
                {' '}— The example sentence (optional)
              </li>
            </ul>
            <p className="font-semibold text-foreground">Marker tags:</p>
            <p>Instruct the AI to embed field values inside marker tags. Example:</p>
            <code className="block bg-background border border-border px-3 py-2 rounded font-mono text-foreground">
              &Phonetic&{`{/səˈrɛndɪpɪti/}`}
            </code>
            <p className="text-muted-foreground italic">Tip: Keep this prompt focused on TMRND fields only. Concept Tree analysis has its own dedicated prompt in the Concept Tree tab.</p>
          </div>
        )}

        {mode === 'concepttree' && (
          <div className="text-xs text-muted-foreground bg-muted/50 border border-border p-4 rounded-lg space-y-2">
            <p className="font-semibold text-foreground">Available variables:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <code className="bg-background border border-border px-1.5 py-0.5 rounded font-mono text-foreground">{'{{Word}}'}</code>
                {' '}— The English word
              </li>
              <li>
                <code className="bg-background border border-border px-1.5 py-0.5 rounded font-mono text-foreground">{'{{Concept Bank}}'}</code>
                {' '}— Your saved concept hierarchy (auto-injected at generate time)
              </li>
            </ul>
            <p className="font-semibold text-foreground">Polysemic (multiple meanings) tags:</p>
            <p>Use a count tag followed by numbered field tags to extract multiple meanings:</p>
            <code className="block bg-background border border-border px-3 py-2 rounded font-mono text-foreground mb-1">
              &No of Definition&{`{2}`}
            </code>
            <code className="block bg-background border border-border px-3 py-2 rounded font-mono text-foreground">
              &Tier1 1&{`{abstract}`} &Tier1 2&{`{concrete}`}
            </code>
            <p>
              Fields like{' '}
              <code className="bg-background border border-border px-1 rounded font-mono text-foreground">Tier1</code>,{' '}
              <code className="bg-background border border-border px-1 rounded font-mono text-foreground">Tier2</code>,{' '}
              <code className="bg-background border border-border px-1 rounded font-mono text-foreground">Tier3</code>{' '}
              drive the Concept Tree visualization.
            </p>
            <p className="text-muted-foreground italic">Tip: This prompt runs as a separate parallel API call at generate time, so it will not slow down your TMRND results.</p>
          </div>
        )}
      </div>
    </div>
  );
}
