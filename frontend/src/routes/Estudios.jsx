import React, { useEffect, useState } from 'react'
import '../styles/tabla.css';
import { socket } from '../main';

function Estudios({ usuario }) {

    const [estudios, setEstudios] = useState([]);

    function extraerFecha(cadena) {
        // Expresión regular para capturar los componentes de la fecha
        const regex = /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/;
        const match = cadena.match(regex);

        if (match) {
            const [_, year, month, day, hour, minute] = match;

            // Construye la fecha en el formato "DD-MM-YYYY HH:MM"
            return `${day}/${month}/${year} ${hour}:${minute}`;
        }

        return null; // Devuelve null si no hay coincidencia
    }

    useEffect(() => {
        socket.emit('estudios', usuario.id, (response) => {
            setEstudios(response.usuario.estudios);
        });
    }, []);

    return (
        <React.Fragment>
            <nav className="nav-container">
                <a href="#" className="nav-link">
                    <i className="fas fa-key"></i>
                    Cambiar Contraseña
                </a>
                <div onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                }} className="nav-link">
                    <i className="fas fa-sign-out-alt"></i>
                    Cerrar Sesión
                </div>
            </nav>

            <div className="table-container">
                <div className="table-blur"></div>
                <div className="table-header">
                    <h1>Mis Estudios</h1>
                </div>
                <table className="studies-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Estudio</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            estudios?.map((estudio, index) => <tr key={index}>
                                <td className="date">{extraerFecha(estudio.nombre)} </td>
                                <td className="study-name">Ecografia</td>
                                <td className="actions-cell">
                                    <button onClick={() => window.open(`/estudio/${estudio.id}`)} className="action-button" title="Ver estudio">
                                        <i className="fas fa-eye"></i>
                                    </button>
                                    <button className="action-button" title="Descargar estudio">
                                        <i className="fas fa-download"></i>
                                    </button>
                                </td>
                            </tr>)
                        }
                    </tbody>
                </table>
            </div>
        </React.Fragment>
    )
}

export default Estudios