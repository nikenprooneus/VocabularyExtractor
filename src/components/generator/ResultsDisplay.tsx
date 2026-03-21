import { useState } from 'react';
import { Copy } from 'lucide-react';
import { Settings as SettingsType, GeneratedResult, ParsedMeaning, ConceptTreeNode } from '../../types/index';
import { FlashcardItem } from '../FlashcardItem';
import { ConceptTreesSection } from '../concepttree/ConceptTreesSection';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface ResultsDisplayProps {
  results: GeneratedResult;
  settings: SettingsType;
  showRawOutput: boolean;
  onToggleRawOutput: () => void;
  onCopyRawOutput: () => void;
  parsedMeaning?: ParsedMeaning | null;
  word?: string;
  conceptTreeRawOutput?: string;
  onConceptSelectionChange?: (nodes: ConceptTreeNode[], selectedNames: Set<string>, conceptLink: string, contextDefinition: string) => void;
}

export function ResultsDisplay({
  results,
  settings,
  parsedMeaning,
  word,
  conceptTreeRawOutput,
  onConceptSelectionChange,
}: ResultsDisplayProps) {
  const hasBothOutputs = !!(results.rawOutput && conceptTreeRawOutput);

  return (
    <>
      {results['Definition'] && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Definition</p>
            <p className="text-base sm:text-lg leading-relaxed text-foreground font-normal">
              {results['Definition']}
            </p>
          </CardContent>
        </Card>
      )}

      {settings.flashcardConfigs && settings.flashcardConfigs.length > 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">Flashcards</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {settings.flashcardConfigs
                .filter(config => config.frontFieldId)
                .sort((a, b) => a.cardOrder - b.cardOrder)
                .map((config) => (
                  <FlashcardItem
                    key={config.id}
                    config={config}
                    results={results}
                    outputFields={settings.outputFields}
                  />
                ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">Extracted Fields</p>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {settings.outputFields
                .filter(field => field.name !== 'Definition')
                .map((field) => (
                  <div key={field.id}>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      {field.name}
                    </label>
                    <Textarea
                      readOnly
                      value={results[field.name] || ''}
                      rows={3}
                      className="bg-muted/40 cursor-default focus-visible:ring-0"
                    />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {parsedMeaning && word && onConceptSelectionChange && (
        <ConceptTreesSection
          meaning={parsedMeaning}
          word={word}
          onSelectionChange={onConceptSelectionChange}
        />
      )}

      {hasBothOutputs ? (
        <Card>
          <CardHeader className="pb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Full AI Analysis</p>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <Tabs defaultValue="tmrnd">
              <TabsList className="w-full">
                <TabsTrigger value="tmrnd" className="flex-1">TMRND Analysis</TabsTrigger>
                <TabsTrigger value="concept" className="flex-1">Concept Tree Analysis</TabsTrigger>
              </TabsList>
              <TabsContent value="tmrnd">
                <RawOutputPanel
                  rawOutput={results.rawOutput!}
                  onCopy={() => navigator.clipboard.writeText(results.rawOutput!)}
                />
              </TabsContent>
              <TabsContent value="concept">
                <RawOutputPanel
                  rawOutput={conceptTreeRawOutput!}
                  onCopy={() => navigator.clipboard.writeText(conceptTreeRawOutput!)}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : results.rawOutput ? (
        <RawOutputCard
          rawOutput={results.rawOutput}
          onCopy={() => navigator.clipboard.writeText(results.rawOutput!)}
        />
      ) : null}
    </>
  );
}

interface RawOutputPanelProps {
  rawOutput: string;
  onCopy: () => void;
}

function RawOutputPanel({ rawOutput, onCopy }: RawOutputPanelProps) {
  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={onCopy}
        className="absolute top-2 right-2 gap-1.5 text-muted-foreground hover:text-foreground z-10 h-7 px-2"
      >
        <Copy size={12} />
        Copy
      </Button>
      <div className="bg-muted/40 border border-border rounded-md p-4 max-h-72 overflow-y-auto">
        <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed pt-6">
          {rawOutput}
        </pre>
      </div>
    </div>
  );
}

interface RawOutputCardProps {
  rawOutput: string;
  onCopy: () => void;
}

function RawOutputCard({ rawOutput, onCopy }: RawOutputCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Full AI Analysis</p>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopy}
              className="gap-1.5 text-muted-foreground h-7 px-2"
            >
              <Copy size={12} />
              Copy
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(v => !v)}
              className="text-muted-foreground h-7 px-2 text-xs"
            >
              {open ? 'Hide' : 'Show'}
            </Button>
          </div>
        </div>
        {open && (
          <div className="bg-muted/40 border border-border rounded-md p-4 max-h-96 overflow-y-auto">
            <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
              {rawOutput}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
