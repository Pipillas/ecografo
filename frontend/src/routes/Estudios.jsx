import React, { useEffect, useState } from 'react';
import '../styles/tabla.css'
import { IP, socket } from '../main';
import PasswordModal from '../components/PasswordModal'; // Agregar esta importación

function Estudios({ usuario }) {
    const [estudios, setEstudios] = useState([]);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false); // Agregar este estado

    function extraerFecha(cadena) {
        const regex = /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/;
        const match = cadena.match(regex);

        if (match) {
            const [_, year, month, day, hour, minute] = match;
            return `${day}/${month}/${year} ${hour}:${minute}`;
        }

        return null;
    }

    function compartirEnlace(estudioId) {
        const url = `https://ecoalem489.com/estudio/${estudioId}`;
        if (navigator.share) {
            navigator.share({
                title: 'Compartir Estudio',
                url: url,
            })
                .then(() => console.log('Compartido exitosamente'))
                .catch((error) => console.error('Error al compartir:', error));
        } else {
            // Fallback para navegadores que no soportan la API Web Share
            const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
            window.open(waUrl, '_blank');
        }
    }

    useEffect(() => {
        socket.emit('estudios', usuario.id, (response) => {
            setEstudios(response.usuario.estudios);
        });
    }, []);

    return (
        <div className="content-wrapper">
            <nav className="nav-container">
                <div className="nav-user">
                    <i className="fas fa-user"></i>
                    <span className="user-name">{usuario.nombre?.replace(/_/g, ' ').toUpperCase()}</span>
                </div>
                <div className="nav-actions">
                    <a
                        href="#"
                        className="nav-link"
                        onClick={(e) => {
                            e.preventDefault();
                            setIsPasswordModalOpen(true);
                        }}
                    >
                        <i className="fas fa-key"></i>
                        Cambiar Contraseña
                    </a>
                    <div
                        onClick={() => {
                            localStorage.clear();
                            window.location.reload();
                        }}
                        className="nav-link"
                    >
                        <i className="fas fa-sign-out-alt"></i>
                        Cerrar Sesión
                    </div>
                </div>
            </nav>

            <div className="table-container">
                <div className="table-header">
                    <h1>Mis Estudios</h1>
                </div>
                <div className="table-wrapper">
                    <table className="studies-table">
                        <thead>
                            <tr>
                                <th>Información</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {estudios?.map((estudio, index) => (
                                <tr key={index}>
                                    <td>
                                        <div className="study-info-container">
                                            <div className="study-name">Ecografía</div>
                                            <div className="study-date">{extraerFecha(estudio.nombre)}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="actions-cell">
                                            <button
                                                onClick={() => window.open(`/estudio/${estudio.id}`)}
                                                className="btn-primary"
                                            >
                                                Ver
                                            </button>
                                            <button
                                                onClick={() => compartirEnlace(estudio.id)}
                                                className="btn-primary"
                                            >
                                                Compartir
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <PasswordModal
                usuario={usuario}
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
            />
        </div>
    );
}

export default Estudios;
