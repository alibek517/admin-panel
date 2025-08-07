import io from 'socket.io-client';

const API_BASE = 'http://192.168.1.8:4356';

const socket = io(API_BASE, {
  auth: { token: localStorage.getItem('token') },
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export { socket };
