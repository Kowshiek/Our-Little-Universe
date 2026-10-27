import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import { UniverseProvider } from './context/UniverseContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <UniverseProvider>
        <App />
      </UniverseProvider>
    </AuthProvider>
  </React.StrictMode>
);
