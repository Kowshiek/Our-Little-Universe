import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import { BattleProvider } from './context/BattleContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <BattleProvider>
        <App />
      </BattleProvider>
    </AuthProvider>
  </React.StrictMode>
);
