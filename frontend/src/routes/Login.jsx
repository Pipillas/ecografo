import React, { useState } from 'react'
import '../styles/login.css';
import { socket } from '../main';

function Login() {

    const [showPassword, setShowPassword] = useState(false);
    const [usuario, setUsuario] = useState({
        dni: '',
        clave: ''
    });
    const [mensajeError, setMensajeError] = useState('');

    const inputChangeHandler = (e) => {
        setUsuario(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const entrar = () => {
        socket.emit('entrar', usuario, (response) => {
            if (response.success) {
                localStorage.setItem('token', response.token);
                window.location.href = '/estudios';
            } else {
                setMensajeError(response.message);
            }
        });
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="card-blur"></div>
                <div className="login-form">
                    <div className="form-header">
                        <div className="logo">
                            <i className="fas fa-shield-alt"></i>
                        </div>
                        <h1>Bienvenido</h1>
                        <p>Ingrese sus datos</p>
                    </div>

                    <div className="form-group">
                        <div className="input-with-icon">
                            <i className="fas fa-id-card"></i>
                            <input autoComplete='off' name='dni' onChange={inputChangeHandler} value={usuario.dni} type="text" placeholder="Ingrese su DNI" className="form-input" />
                        </div>
                    </div>

                    <div className="form-group">
                        <div className="input-with-icon">
                            <i className="fas fa-lock"></i>
                            <input autoComplete='off' name='clave' onChange={inputChangeHandler} value={usuario.clave} type={showPassword ? 'text' : 'password'} placeholder="Ingrese su clave" className="form-input" />
                            <button tabIndex="-1" onClick={() => setShowPassword(prev => !prev)} type="button" className="toggle-password">
                                <i className="far fa-eye"></i>
                            </button>
                        </div>
                    </div>

                    <div className="mensaje-error">{mensajeError}</div>

                    <div className="forgot-password">
                        <a href="#" className="hover-underline">Recuperar clave</a>
                    </div>

                    <button onClick={entrar} className="submit-button">
                        <span className="button-content">
                            <span className="button-text">Ingresar</span>
                            <i className="fas fa-arrow-right"></i>
                        </span>
                    </button>
                </div>
            </div>
        </div >
    )
}

export default Login;