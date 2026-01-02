import { createContext, useContext, useState, useEffect } from 'react';

const DriverContext = createContext();

export const useDriver = () => {
  const context = useContext(DriverContext);
  if (!context) {
    throw new Error('useDriver deve ser usado dentro de DriverProvider');
  }
  return context;
};

export const DriverProvider = ({ children }) => {
  const [driverStatus, setDriverStatus] = useState('offline');
  const [currentRide, setCurrentRide] = useState(null);
  const [driverEarnings, setDriverEarnings] = useState({
    lastRide: 0,
    totalToday: 125.50,
    ridesCompleted: 8
  });

  // Dados mockados de corridas
  const mockRides = [
    {
      id: Date.now(),
      passengerName: 'Maria Silva',
      passengerPhoto: '👩‍💼',
      origin: 'Shopping Center',
      destination: 'Aeroporto Internacional',
      price: 28.50,
      distance: '12.5 km',
      eta: '18 min',
      serviceType: 'STANDARD_RIDE'
    },
    {
      id: Date.now() + 1,
      passengerName: 'João Santos',
      passengerPhoto: '👨‍💼',
      origin: 'Centro Histórico',
      destination: 'Praia de Copacabana',
      price: 35.00,
      distance: '15.2 km',
      eta: '22 min',
      serviceType: 'TOUR_GUIDE'
    },
    {
      id: Date.now() + 2,
      passengerName: 'Ana Costa',
      passengerPhoto: '👵',
      origin: 'Hospital São Lucas',
      destination: 'Residência',
      price: 18.75,
      distance: '8.3 km',
      eta: '12 min',
      serviceType: 'ELDERLY_ASSISTANCE'
    }
  ];

  const goOnline = () => {
    setDriverStatus('online');
    
    // Simular recebimento de corrida após 5-10 segundos
    const delay = Math.random() * 5000 + 5000; // 5-10 segundos
    setTimeout(() => {
      if (driverStatus === 'online') {
        const randomRide = mockRides[Math.floor(Math.random() * mockRides.length)];
        setCurrentRide({
          ...randomRide,
          receivedAt: new Date()
        });
        setDriverStatus('ride_received');
      }
    }, delay);
  };

  const goOffline = () => {
    setDriverStatus('offline');
    setCurrentRide(null);
  };

  const acceptRide = () => {
    if (!currentRide) return;
    
    setDriverStatus('on_trip');
    
    // Simular viagem (15-25 segundos)
    const tripDuration = Math.random() * 10000 + 15000;
    setTimeout(() => {
      setDriverStatus('completed');
    }, tripDuration);
  };

  const declineRide = () => {
    setCurrentRide(null);
    setDriverStatus('online');
    
    // Simular nova corrida após recusar
    setTimeout(() => {
      if (driverStatus === 'online') {
        const randomRide = mockRides[Math.floor(Math.random() * mockRides.length)];
        setCurrentRide({
          ...randomRide,
          receivedAt: new Date()
        });
        setDriverStatus('ride_received');
      }
    }, 8000);
  };

  const completeRide = () => {
    if (!currentRide) return;

    // Atualizar ganhos
    setDriverEarnings(prev => ({
      lastRide: currentRide.price,
      totalToday: prev.totalToday + currentRide.price,
      ridesCompleted: prev.ridesCompleted + 1
    }));

    setDriverStatus('completed');
  };

  const finishRideAndGoOnline = () => {
    setCurrentRide(null);
    setDriverStatus('online');
    
    // Simular nova corrida
    setTimeout(() => {
      if (driverStatus === 'online') {
        const randomRide = mockRides[Math.floor(Math.random() * mockRides.length)];
        setCurrentRide({
          ...randomRide,
          receivedAt: new Date()
        });
        setDriverStatus('ride_received');
      }
    }, 10000);
  };

  const value = {
    driverStatus,
    currentRide,
    driverEarnings,
    goOnline,
    goOffline,
    acceptRide,
    declineRide,
    completeRide,
    finishRideAndGoOnline
  };

  return (
    <DriverContext.Provider value={value}>
      {children}
    </DriverContext.Provider>
  );
};

export default DriverContext;
