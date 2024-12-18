import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { io } from 'socket.io-client';

export const IP = 'https://ecografiaprueba.us.to';
export const socket = io(IP);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)