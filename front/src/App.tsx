import React from 'react';
import { DashboardProvider } from './components/DashboardContext';
import AppRouter from './router/Router';
import './index.css';

function App() {
  return (
    <DashboardProvider>
      <AppRouter />
    </DashboardProvider>
  );
}

export default App;
