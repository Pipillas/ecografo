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
                if (response.admin) {
                    setIsAdmin(true);
                    setIsValid(true)
                    setUsuario(response.decoded);
                } else if (response.valid) {
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
        return <div className="content-wrapper">Cargando...</div>;
    }

    // Si el token no es válido, redirige al login
    if (!isValid) {
        return <Navigate to="/login" />;
    }

    // Si es un admin y la ruta requiere admin, renderiza el componente
    if (isAdmin && adminOnly) {
        return <Component usuario={usuario} />;
    }

    return <Component usuario={usuario} />;

};

export default ProtectedRoute;