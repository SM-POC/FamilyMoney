
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("[MoneyMate] index.tsx module execution started.");

const clearBootScreen = () => {
  const bootScreen = document.getElementById('boot-screen');
  if (bootScreen) {
    console.log("[MoneyMate] Clearing boot screen...");
    bootScreen.style.opacity = '0';
    setTimeout(() => {
      bootScreen.style.display = 'none';
      bootScreen.style.visibility = 'hidden';
    }, 600);
  }
};

const mountApp = () => {
  console.log("[MoneyMate] Mounting React app...");
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("[MoneyMate] Critical Failure: #root element missing.");
    return;
  }

  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("[MoneyMate] React component tree rendered.");
    
    // Safety: ensure boot screen is removed
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(clearBootScreen);
      });
    } else {
      setTimeout(clearBootScreen, 300);
    }
  } catch (error) {
    console.error("[MoneyMate] Render Error:", error);
    throw error;
  }
};

mountApp();
