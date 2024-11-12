import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { io } from 'socket.io-client';

export const IP = 'http://192.168.0.26:4000';
export const socket = io(IP);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)