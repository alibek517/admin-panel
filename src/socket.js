import io from 'socket.io-client';

const API_BASE = 'https://alikafecrm.uz';

const socket = io(API_BASE, {
  auth: { token: localStorage.getItem('token') },
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export { socket };