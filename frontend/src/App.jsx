// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './routes/Login';
import Estudios from './routes/Estudios';
import ProtectedRoute from './components/ProtectedRoute'; // Importa la ruta protegida

function App() {
  return (
    <Router>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<Login />} />

        {/* Rutas protegidas */}
        <Route path="/estudios" element={<ProtectedRoute element={Estudios} />} />

        {/* Redirigir rutas no definidas a /login */}
        <Route path="*" element={<Navigate to="/estudios" replace />} />
      </Routes>
    </Router>
  );
}

export default App;