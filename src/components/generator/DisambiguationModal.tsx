import { useEffect, useRef } from 'react';
import { BookOpen, GitBranch, Sparkles } from 'lucide-react';
import { WordWithContext } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DisambiguationModalProps {
  word: string;
  existingContexts: WordWithContext[];
  onSelectExisting: (existing: WordWithContext) => void;
  onGenerateNew: () => void;
  onClose: () => void;
}

export function DisambiguationModal({
  word,
  existingContexts,
  onSelectExisting,
  onGenerateNew,
  onClose,
}: DisambiguationModalProps) {
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstButtonRef.current?.focus();
  }, []);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4 flex-shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <GitBranch size={14} className="text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Word found</span>
          </div>
          <DialogTitle>"{word}" has existing contexts</DialogTitle>
          <DialogDescription>
            Choose an existing meaning to clone, or generate a new analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-6 space-y-2.5 pb-2">
          {existingContexts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No existing contexts found.</p>
          ) : (
            existingContexts.map((ctx, idx) => (
              <button
                key={ctx.id}
                ref={idx === 0 ? firstButtonRef : undefined}
                onClick={() => onSelectExisting(ctx)}
                className="w-full text-left border border-border rounded-xl p-4 hover:border-primary/50 hover:bg-primary/5 transition-all group focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen size={12} className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  <span className="text-xs font-semibold text-muted-foreground group-hover:text-primary uppercase tracking-wider">
                    Context {idx + 1}
                  </span>
                </div>
                {ctx.example && (
                  <p className="text-sm text-foreground leading-relaxed mb-2 italic">
                    "{ctx.example}"
                  </p>
                )}
                {ctx.contextDefinition && (
                  <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-border group-hover:border-primary/40 pl-3 transition-colors">
                    {ctx.contextDefinition}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-end">
                  <span className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Use this meaning &rarr;
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="p-6 pt-4 border-t border-border flex-shrink-0">
          <Button onClick={onGenerateNew} className="w-full gap-2">
            <Sparkles size={14} />
            Generate New Meaning
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            This will call the AI and create a distinct context entry.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
