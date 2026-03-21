import * as React from 'react';
import { cn } from '@/lib/utils';

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue>({
  open: false,
  setOpen: () => {},
});

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

function DropdownMenuTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  const { setOpen } = React.useContext(DropdownMenuContext);
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: React.MouseEventHandler }>, {
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        setOpen((v) => !v);
      },
    });
  }
  return (
    <button onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}>
      {children}
    </button>
  );
}

interface DropdownMenuContentProps {
  className?: string;
  align?: 'start' | 'center' | 'end';
  children: React.ReactNode;
}

function DropdownMenuContent({ className, align = 'end', children }: DropdownMenuContentProps) {
  const { open, setOpen } = React.useContext(DropdownMenuContext);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen]);

  if (!open) return null;

  const alignClass = align === 'end' ? 'right-0' : align === 'start' ? 'left-0' : 'left-1/2 -translate-x-1/2';

  return (
    <div
      ref={ref}
      className={cn(
        'absolute mt-1.5 z-50 min-w-[10rem] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg py-1',
        alignClass,
        className
      )}
    >
      {children}
    </div>
  );
}

function DropdownMenuItem({
  className,
  children,
  onSelect,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { onSelect?: () => void }) {
  const { setOpen } = React.useContext(DropdownMenuContext);
  return (
    <div
      role="menuitem"
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
        className
      )}
      onClick={() => {
        onSelect?.();
        setOpen(false);
      }}
      {...props}
    >
      {children}
    </div>
  );
}

function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn('my-1 h-px bg-border', className)} />;
}

function DropdownMenuLabel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('px-3 py-2 text-xs font-medium text-muted-foreground', className)}>
      {children}
    </div>
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
};
