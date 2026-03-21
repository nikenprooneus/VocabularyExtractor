import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SheetContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue>({
  open: false,
  onOpenChange: () => {},
});

interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Sheet({ open = false, onOpenChange = () => {}, children }: SheetProps) {
  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  );
}

function SheetTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  const { onOpenChange } = React.useContext(SheetContext);
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: () => onOpenChange(true),
    });
  }
  return (
    <button onClick={() => onOpenChange(true)}>
      {children}
    </button>
  );
}

interface SheetContentProps {
  side?: 'left' | 'right' | 'top' | 'bottom';
  className?: string;
  children: React.ReactNode;
}

function SheetContent({ side = 'right', className, children }: SheetContentProps) {
  const { open, onOpenChange } = React.useContext(SheetContext);

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  const slideClasses: Record<NonNullable<SheetContentProps['side']>, string> = {
    right: 'inset-y-0 right-0 h-full w-3/4 max-w-sm border-l border-border',
    left: 'inset-y-0 left-0 h-full w-3/4 max-w-sm border-r border-border',
    top: 'inset-x-0 top-0 w-full border-b border-border',
    bottom: 'inset-x-0 bottom-0 w-full border-t border-border',
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          'fixed z-50 bg-[#16140f] text-foreground shadow-xl transition ease-in-out',
          slideClasses[side],
          className
        )}
      >
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
    </>
  );
}

function SheetHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex flex-col space-y-2 text-center sm:text-left p-6', className)}>
      {children}
    </div>
  );
}

function SheetTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <h3 className={cn('text-lg font-semibold text-foreground', className)}>
      {children}
    </h3>
  );
}

export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle };
