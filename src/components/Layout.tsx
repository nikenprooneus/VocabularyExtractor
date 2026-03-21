import { ReactNode, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Zap, Settings, Shield, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { NavLinks } from './NavLinks';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    if (!confirm('Are you sure you want to sign out?')) return;
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate('/login');
    } catch {
      toast.error('Failed to sign out');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  const isAdmin = user?.role === 'admin';
  const isFullBleed = location.pathname === '/knowledge-graph' || location.pathname === '/reader';

  const userInitials = user?.email ? user.email.slice(0, 2).toUpperCase() : '??';

  return (
    <div className={cn(isFullBleed ? 'h-screen flex flex-col overflow-hidden' : 'min-h-screen', 'bg-background')}>
      <header className="sticky top-0 z-50 flex-shrink-0 border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 gap-4">
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 mr-2">
              <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-foreground hidden sm:block">
                Vocab Extractor
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-0.5 flex-1">
              <NavLinks isActive={isActive} isAdmin={isAdmin} />
            </nav>

            <div className="flex items-center gap-2 ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 px-2">
                    <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground flex-shrink-0">
                      {userInitials}
                    </span>
                    <span className="hidden sm:block text-sm text-muted-foreground truncate max-w-[120px]">
                      {user?.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Signed in as</p>
                    <p className="text-sm text-foreground font-medium truncate mt-0.5">{user?.email}</p>
                    {isAdmin && (
                      <span className="inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 bg-amber-400/10 text-amber-400 rounded text-xs font-semibold border border-amber-400/20">
                        <Shield size={10} />
                        Admin
                      </span>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate('/settings')}>
                    <Settings size={14} className="text-muted-foreground" />
                    Settings
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onSelect={() => navigate('/admin')}>
                      <Shield size={14} className="text-amber-400" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={handleSignOut}
                    className="text-destructive hover:text-destructive focus:text-destructive"
                  >
                    <LogOut size={14} />
                    {isLoggingOut ? 'Signing out...' : 'Sign out'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu size={18} />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                        <Zap className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                      Vocab Extractor
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-1 px-4 pt-2">
                    <NavLinks
                      isActive={isActive}
                      isAdmin={isAdmin}
                      mobile
                      onClick={() => setMobileOpen(false)}
                    />
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {isFullBleed ? (
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      )}
    </div>
  );
}
