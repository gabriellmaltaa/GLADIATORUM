import { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { HeroXGame } from './components/herox/HeroXGame.tsx';
import { GameErrorBoundary } from './components/ui/ErrorBoundary.tsx';
import './index.css';
import './components/herox/herox.css';

const isLegacyClient = new URLSearchParams(window.location.search).get('legacy') === '1';
const LegacyApp = lazy(() => import('./App.tsx'));

createRoot(document.getElementById('root')!).render(
  <GameErrorBoundary>
    {isLegacyClient ? <Suspense fallback={<div className="herox-loading">Abrindo modo legado…</div>}><LegacyApp /></Suspense> : <HeroXGame />}
  </GameErrorBoundary>
);
