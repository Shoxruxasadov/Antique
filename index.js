import { registerRootComponent } from 'expo';
import React from 'react';
import App from './App';
import { AppErrorBoundary } from './components/AppErrorBoundary';

function Root() {
  return (
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
}

registerRootComponent(Root);
