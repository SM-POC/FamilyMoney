
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const startApp = () => {
  const rootElement = document.getElementById('root');
  const bootScreen = document.getElementById('boot-screen');

  if (!rootElement) {
    console.error("Critical Failure: Root element #root not found in DOM.");
    return;
  }

  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    // Fade out boot screen after a short delay to ensure React has rendered
    setTimeout(() => {
      if (bootScreen) {
        bootScreen.style.opacity = '0';
        bootScreen.style.visibility = 'hidden';
      }
    }, 100);
    
    console.log("MoneyMate initialized successfully.");
  } catch (error) {
    console.error("Mounting Error:", error);
    // Error will be caught by global error handler in index.html
    throw error;
  }
};

// Start initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
