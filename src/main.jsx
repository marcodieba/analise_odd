import React from 'react';
import ReactDOM from 'react-dom/client';

// --- ADICIONE ESTAS DUAS LINHAS ---
import '@unocss/reset/tailwind.css'; // Um "reset" de CSS que imita o do Tailwind para consistência
import 'uno.css'; // A importação principal que gera os estilos
// ------------------------------------

import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);