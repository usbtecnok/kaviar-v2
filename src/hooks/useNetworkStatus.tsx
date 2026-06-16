import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

interface NetworkStatus {
  isConnected: boolean;
}

const NetworkContext = createContext<NetworkStatus>({ isConnected: true });

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected !== false);
    });
  }, []);

  return (
    <NetworkContext.Provider value={{ isConnected }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetworkStatus(): NetworkStatus {
  return useContext(NetworkContext);
}
