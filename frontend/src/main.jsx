import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { io } from 'socket.io-client';

export const socket = io('http://192.168.0.26:4000');

export const URL = 'http://192.168.0.26:4000/estudios'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)