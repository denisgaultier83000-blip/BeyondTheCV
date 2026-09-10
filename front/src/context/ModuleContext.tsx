import React, { createContext, useContext, ReactNode } from 'react';

export type ModuleType = 'job' | 'company' | 'speech' | 'training' | 'progress' | 'overview';

interface ModuleContextValue {
  module: ModuleType;
}

const ModuleContext = createContext<ModuleContextValue>({
  module: 'overview'
});

export interface ModuleProviderProps {
  module: ModuleType;
  children: ReactNode;
}

export const ModuleProvider: React.FC<ModuleProviderProps> = ({ module, children }) => {
  return (
    <ModuleContext.Provider value={{ module }}>
      {children}
    </ModuleContext.Provider>
  );
};

export const useModuleContext = (): ModuleContextValue => {
  return useContext(ModuleContext);
};
