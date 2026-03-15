import { ReactNode, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Zap, Shield, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { NavLinks } from './NavLinks';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  const isGraphPage = location.pathname === '/knowledge-graph';

  return (
    <div className={isGraphPage ? 'h-screen flex flex-col bg-slate-950 overflow-hidden' : 'min-h-screen bg-gradient-to-br from-slate-50 to-slate-100'}>
      <header className={isGraphPage ? 'bg-slate-900 border-b border-slate-700/60 flex-shrink-0' : 'bg-white shadow-sm border-b border-slate-200'}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h1 className={`text-2xl font-bold ${isGraphPage ? 'text-slate-100' : 'text-slate-800'}`}>
                  Vocabulary Extractor
                </h1>
              </div>

              <nav className="hidden md:flex items-center gap-1">
                <NavLinks isActive={isActive} isAdmin={!!isAdmin} dark={isGraphPage} />
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-3 px-4 py-2 rounded-lg ${isGraphPage ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <User size={18} className={isGraphPage ? 'text-slate-400' : 'text-slate-600'} />
                <div className="text-sm">
                  <p className={`font-medium ${isGraphPage ? 'text-slate-200' : 'text-slate-800'}`}>{user?.email}</p>
                  <p className="text-xs text-slate-600">
                    {isAdmin ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold">
                        <Shield size={12} />
                        Admin
                      </span>
                    ) : (
                      <span className={isGraphPage ? 'text-slate-500' : 'text-slate-500'}>User</span>
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-all"
              >
                <LogOut size={18} />
                {isLoggingOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </div>

          <nav className="md:hidden flex items-center gap-2 pb-4 overflow-x-auto">
            <NavLinks isActive={isActive} isAdmin={!!isAdmin} mobile />
          </nav>
        </div>
      </header>

      {isGraphPage ? (
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
