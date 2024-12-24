import React, { useEffect, useState } from 'react';
import '../styles/login.css';
import { socket } from '../main';
import logo from '../assets/logo.png';

function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const [usuario, setUsuario] = useState({
        dni: '',
        clave: '',
    });
    const [mensajeError, setMensajeError] = useState('');
    const [validandoToken, setValidandoToken] = useState(true); // Estado para verificar si el token es válido

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            // Validar el token al cargar la página
            socket.emit('validate-token', token, (response) => {
                if (response.valid) {
                    if (response.admin) {
                        window.location.href = "/informes";
                    } else {
                        window.location.href = "/estudios";
                    }
                } else {
                    setValidandoToken(false); // Token inválido, muestra el formulario
                }
            });
        } else {
            setValidandoToken(false); // No hay token, muestra el formulario
        }
    }, []);

    const inputChangeHandler = (e) => {
        setUsuario((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const entrar = () => {
        socket.emit('entrar', usuario, (response) => {
            if (response.success) {
                localStorage.setItem('token', response.token);
                if (response.admin) {
                    window.location.href = "/informes";
                } else {
                    window.location.href = "/estudios";
                }
            } else {
                setMensajeError(response.message);
            }
        });
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            entrar();
        }
    };

    if (validandoToken) {
        // Muestra un mensaje o animación mientras se valida el token
        return <div className="content-wrapper">Validando sesión...</div>;
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-form">
                    <div className="form-header">
                        <div className="logo">
                            <img src={logo} alt="Logo Ecografía" />
                        </div>
                        <p>Ingrese sus datos</p>
                    </div>

                    <div className="form-group">
                        <div className="input-with-icon">
                            <i className="fas fa-id-card"></i>
                            <input
                                autoComplete="off"
                                name="dni"
                                onChange={inputChangeHandler}
                                onKeyUp={handleKeyPress}
                                value={usuario.dni}
                                type="text"
                                placeholder="Ingrese su DNI"
                                className="form-input"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <div className="input-with-icon">
                            <i className="fas fa-lock"></i>
                            <input
                                autoComplete="off"
                                name="clave"
                                onChange={inputChangeHandler}
                                onKeyUp={handleKeyPress}
                                value={usuario.clave}
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Ingrese su clave"
                                className="form-input"
                            />
                            <button
                                tabIndex="-1"
                                onClick={() => setShowPassword((prev) => !prev)}
                                type="button"
                                className="toggle-password"
                            >
                                <i className="far fa-eye"></i>
                            </button>
                        </div>
                    </div>

                    <div className="mensaje-error">{mensajeError}</div>

                    <div className="forgot-password">
                        <a href='#' onClick={() => setMensajeError('Para recuperar la contraseña contactese al 291-XXX-XXXX')} className="hover-underline">Recuperar clave</a>
                    </div>

                    <button onClick={entrar} className="submit-button">
                        <span className="button-content">
                            <span className="button-text">Ingresar</span>
                            <i className="fas fa-arrow-right"></i>
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Login;