import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { bootstrapNative } from './lib/native/bootstrap';
import { installOfflineQueue } from './lib/offlineQueue';
import './i18n';
import './styles/index.css';

bootstrapNative();
installOfflineQueue();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
