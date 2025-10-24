import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Use modern React 18 createRoot API
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = createRoot(rootElement);
root.render(<App />);
