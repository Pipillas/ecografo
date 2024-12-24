// PasswordModal.js

import React, { useState } from 'react';
import { socket } from '../main';
import '../styles/passwordmodal.css';

const PasswordModal = ({ isOpen, onClose, usuario }) => {
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        const formData = new FormData(e.target);
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');

        // Validaciones
        if (newPassword !== confirmPassword) {
            setError('Las contraseñas nuevas no coinciden');
            setLoading(false);
            return;
        }

        if (newPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            setLoading(false);
            return;
        }

        // Enviar al servidor
        socket.emit('cambiar-password', {
            id: usuario.id,
            passwordNueva: newPassword
        }, (response) => {
            setLoading(false);

            if (response.error) {
                setError(response.error);
                return;
            }

            if (response.success) {
                setSuccess('Contraseña actualizada correctamente');
                e.target.reset();
                setTimeout(() => {
                    onClose();
                    setSuccess('');
                }, 500);
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-container" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Cambiar Contraseña</h2>
                    <button className="modal-close" onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="modal-form">
                    {error && (
                        <div className="alert alert-error">
                            <i className="fas fa-exclamation-circle"></i>
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="alert alert-success">
                            <i className="fas fa-check-circle"></i>
                            {success}
                        </div>
                    )}
                    <div className="form-group">
                        <label htmlFor="newPassword">Nueva Contraseña</label>
                        <div className="password-input">
                            <input
                                type="password"
                                id="newPassword"
                                name="newPassword"
                                required
                                disabled={loading}
                                minLength="6"
                            />
                            <i className="fas fa-lock"></i>
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirmar Contraseña</label>
                        <div className="password-input">
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                required
                                disabled={loading}
                                minLength="6"
                            />
                            <i className="fas fa-lock"></i>
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i>
                                    Guardando...
                                </>
                            ) : (
                                'Guardar'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PasswordModal;
