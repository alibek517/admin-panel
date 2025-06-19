import React, { createContext, useContext, useEffect, useState } from 'react';
import { socket } from '../socket';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const handleConnect = () => {
      console.log('🟢 WebSocket ulandi');
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log('🔴 WebSocket uzildi');
      setIsConnected(false);
    };

    const handleOrderCreated = (newOrder) => {
      console.log('🆕 Yangi buyurtma keldi:', newOrder);
      setNotifications((prev) => [
        ...prev,
        { id: newOrder.id, message: `Yangi buyurtma #${newOrder.id} keldi!`, timestamp: new Date() },
      ]);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('orderCreated', handleOrderCreated);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('orderCreated', handleOrderCreated);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, notifications, setNotifications }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);