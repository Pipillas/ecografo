// src/components/ProtectedRoute.js
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { socket } from '../main';

const ProtectedRoute = ({ element: Component }) => {
    const [isValid, setIsValid] = useState(null); // Controla si el token es válido o no
    const token = localStorage.getItem('token');
    const [usuario, setUsuario] = useState({});

    useEffect(() => {
        if (token) {
            // Enviar el token al servidor para validación
            socket.emit('validate-token', token, (response) => {
                if (response.valid) {
                    setUsuario(response.decoded);
                    setIsValid(true); // Token válido
                } else {
                    setIsValid(false); // Token no válido
                    console.error(response.message); // Mostrar el mensaje de error
                }
            });
        } else {
            setIsValid(false); // No hay token
        }
    }, [token]);

    // Mientras no se haya validado el token, puedes mostrar un cargando o un placeholder
    if (isValid === null) {
        return <div className="content-wrapper"></div>;
    }

    // Si el token no es válido, redirige al login
    if (!isValid) {
        return <Navigate to="/login" />;
    }

    // Si el token es válido y tiene acceso, renderiza el componente
    return <Component usuario={usuario} />;
};

export default ProtectedRoute;