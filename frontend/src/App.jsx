// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './routes/Login';
import Estudios from './routes/Estudios';
import Estudio from './routes/Estudio';
import ProtectedRoute from './components/ProtectedRoute'; // Importa la ruta protegida
import Patients from './routes/Patients';

function App() {
  return (
    <Router>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<Login />} />

        {/* Rutas protegidas */}
        <Route path="/estudios" element={<ProtectedRoute element={Estudios} />} />
        <Route path="/estudio/:id" element={<ProtectedRoute element={Estudio} />} />
        <Route path="/patients" element={<ProtectedRoute element={Patients} />} />

        {/* Redirigir rutas no definidas a /login */}
        <Route path="*" element={<Navigate to="/estudios" replace />} />
      </Routes>
    </Router>
  );
};

export default App;