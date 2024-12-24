import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { socket } from '../main';

const ProtectedRoute = ({ element: Component, adminOnly = false }) => {
    const [isValid, setIsValid] = useState(null); // Controla si el token es válido o no
    const token = localStorage.getItem('token');
    const [usuario, setUsuario] = useState({});
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        if (token) {
            // Enviar el token al servidor para validación
            socket.emit('validate-token', token, (response) => {
                if (response.valid) {
                    setUsuario(response.decoded);
                    setIsValid(true); // Token válido
                    setIsAdmin(response.admin); // Usuario es admin o no
                } else {
                    setIsValid(false); // Token no válido
                    console.error(response.message); // Mostrar el mensaje de error
                }
            });
        } else {
            setIsValid(false); // No hay token
        }
    }, [token]);

    // Mientras no se haya validado el token, muestra un estado de cargando
    if (isValid === null) {
        return <div className="content-wrapper">Cargando...</div>;
    }

    // Si el token no es válido, redirige al login
    if (!isValid) {
        return <Navigate to="/login" />;
    }

    // Si la ruta requiere permisos de administrador y el usuario no es admin, redirige a un acceso denegado
    if (adminOnly && !isAdmin) {
        return <Navigate to="/login" />;
    }

    // Renderiza el componente si pasa todas las validaciones
    return <Component usuario={usuario} />;
};

export default ProtectedRoute;
