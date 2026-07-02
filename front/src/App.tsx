import React from 'react';
import { DashboardProvider as GlobalProvider } from './hooks/DashboardContext';
import AppRouter from './router/Router';
import './index.css';

function App() {
  return (
    <GlobalProvider>
      <AppRouter />
    </GlobalProvider>
  );
}

export default App;
