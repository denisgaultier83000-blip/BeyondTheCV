import React, { createContext, useContext, ReactNode } from 'react';
import { useDashboardLogic } from '../hooks/useDashboardLogic';

// Inférence du type de retour du hook
type DashboardContextType = ReturnType<typeof useDashboardLogic>;

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const logic = useDashboardLogic();

  return (
    <DashboardContext.Provider value={logic}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}