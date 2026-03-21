import { useRef } from 'react';
import { Loader, Zap, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface WordInputSectionProps {
  word: string;
  example: string;
  isLoading: boolean;
  isSettingsConfigured: boolean;
  onWordChange: (value: string) => void;
  onExampleChange: (value: string) => void;
  onGenerate: () => void;
  onClear: () => void;
  hasClearableContent: boolean;
}

export function WordInputSection({
  word,
  example,
  isLoading,
  isSettingsConfigured,
  onWordChange,
  onExampleChange,
  onGenerate,
  onClear,
  hasClearableContent,
}: WordInputSectionProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isWordMissing =
    word.trim() !== '' &&
    example.trim() !== '' &&
    !example.toLowerCase().includes(word.toLowerCase().trim());

  const handleExampleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
    onExampleChange(e.target.value);
  };

  const handleExampleSelectionChange = (
    e: React.MouseEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    const target = e.target as HTMLTextAreaElement;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    if (start == null || end == null) return;
    const selected = target.value.slice(start, end).trim();
    if (selected.length > 0 && selected.length < 50) {
      onWordChange(selected);
    }
  };

  const renderHighlightedExample = () => {
    const trimmedWord = word.trim();
    if (!trimmedWord || !example) return <span>{example}</span>;
    const regex = new RegExp(`(${trimmedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = example.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-primary/25 text-transparent rounded px-0.5">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            English Word <span className="text-destructive normal-case font-normal">*</span>
          </label>
          <Input
            type="text"
            value={word}
            onChange={(e) => onWordChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onGenerate()}
            placeholder="e.g., serendipity"
            disabled={isLoading}
            className="h-11 text-lg font-semibold px-4"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Example Sentence <span className="text-destructive normal-case font-normal">*</span>
          </label>
          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none overflow-hidden rounded-md px-3 py-2 text-sm whitespace-pre-wrap break-words text-transparent leading-normal"
            >
              {renderHighlightedExample()}
            </div>
            <Textarea
              ref={textareaRef}
              value={example}
              onChange={handleExampleChange}
              onMouseUp={handleExampleSelectionChange}
              onKeyUp={handleExampleSelectionChange}
              placeholder="e.g., Finding that old book in the library was pure serendipity."
              rows={2}
              disabled={isLoading}
              style={{ overflow: 'hidden' }}
              className={cn(
                'relative z-10 leading-normal bg-transparent',
                isWordMissing && 'border-destructive focus-visible:ring-destructive'
              )}
            />
          </div>
          {isWordMissing && (
            <p className="mt-1.5 text-xs text-destructive">
              The word must be present in the example sentence.
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={onGenerate}
            disabled={isLoading || !isSettingsConfigured || !word.trim() || !example.trim() || isWordMissing}
            className="w-full sm:w-auto gap-2"
          >
            {isLoading ? (
              <><Loader size={14} className="animate-spin" />Generating...</>
            ) : (
              <><Zap size={14} />Generate</>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onClear}
            disabled={isLoading || !hasClearableContent}
            className="w-full sm:w-auto gap-2"
          >
            <RotateCcw size={14} />
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
