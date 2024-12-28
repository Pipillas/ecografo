import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './routes/Login';
import Estudios from './routes/Estudios';
import Estudio from './routes/Estudio';
import ProtectedRoute from './components/ProtectedRoute'; // Ruta protegida
import Patients from './routes/Patients';
import Informes from './routes/Informes';

function App() {
  return (
    <Router>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/estudio/:id" element={<Estudio />} /> {/* Cambiado a público */}
        {/* Rutas protegidas para todos los usuarios */}
        <Route path="/estudios" element={<ProtectedRoute element={Estudios} />} />
        {/* <Route path="/estudio/:id" element={<ProtectedRoute element={Estudio} />} /> */}
        {/* Rutas protegidas exclusivas para administradores */}
        <Route path="/pacientes" element={<ProtectedRoute element={Patients} adminOnly={true} />} />
        <Route path="/informes" element={<ProtectedRoute element={Informes} adminOnly={true} />} />
        {/* Redirigir rutas no definidas a /login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
