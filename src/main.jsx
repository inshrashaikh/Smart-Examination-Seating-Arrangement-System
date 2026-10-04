import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { I18nProvider } from './i18n/index.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* Global error surface used by the axios response interceptor.
          Styled to match the in-app ToastContext so the two never clash. */}
      <Toaster
        position="top-center"
        gutter={10}
        toastOptions={{
          duration: 4500,
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '14px',
            padding: '12px 16px',
            boxShadow: '0 18px 40px -18px rgba(15, 23, 42, 0.7)',
            maxWidth: '440px',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#0f172a' } },
          error: {
            iconTheme: { primary: '#f43f5e', secondary: '#0f172a' },
            duration: 6000,
          },
        }}
      />
      <I18nProvider>
        <App />
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>
);