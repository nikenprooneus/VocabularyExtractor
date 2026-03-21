import { Link } from 'react-router-dom';
import { Settings, Shield, Network, BookOpen, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavLinksProps {
  isActive: (path: string) => boolean;
  isAdmin: boolean;
  mobile?: boolean;
  onClick?: () => void;
}

const navItems = [
  { to: '/', label: 'Generator', icon: Zap },
  { to: '/knowledge-graph', label: 'Knowledge Graph', icon: Network },
  { to: '/reader', label: 'Reader', icon: BookOpen },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function NavLinks({ isActive, isAdmin, mobile = false, onClick }: NavLinksProps) {
  return (
    <>
      {navItems.map(({ to, label, icon: Icon }) => (
        <Button
          key={to}
          variant="ghost"
          size="sm"
          className={cn(
            'gap-1.5 font-medium text-muted-foreground hover:text-foreground',
            mobile && 'w-full justify-start text-base py-3 h-auto',
            isActive(to) && 'text-primary bg-primary/10 hover:bg-primary/15 hover:text-primary'
          )}
          asChild
        >
          <Link to={to} onClick={onClick}>
            <Icon size={mobile ? 18 : 14} />
            {label}
          </Link>
        </Button>
      ))}

      {isAdmin && (
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'gap-1.5 font-medium text-muted-foreground hover:text-foreground',
            mobile && 'w-full justify-start text-base py-3 h-auto',
            isActive('/admin') && 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/15 hover:text-amber-400'
          )}
          asChild
        >
          <Link to="/admin" onClick={onClick}>
            <Shield size={mobile ? 18 : 14} />
            Admin
          </Link>
        </Button>
      )}
    </>
  );
}
