import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { GameErrorBoundary } from './components/ui/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <GameErrorBoundary>
    <App />
  </GameErrorBoundary>
);
