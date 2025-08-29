import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { getOrCreateSyncKey, applyPairingHashIfPresent } from './lib/storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const qc = new QueryClient();

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Handle pairing hash `#k=`
    const applied = applyPairingHashIfPresent();
    if (applied) {
      // Clear the hash from URL by navigating to same path without hash
      navigate(location.pathname + location.search, { replace: true });
    }
    getOrCreateSyncKey();
  }, []);

  return (
    <QueryClientProvider client={qc}>
      <div className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 bg-white border-b">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/" className="font-semibold">Eat Better</Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link to="/">Dashboard</Link>
              <Link to="/today">Today's Food</Link>
              <Link to="/settings">Settings</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-4">
          <Outlet />
        </main>
      </div>
    </QueryClientProvider>
  );
}
