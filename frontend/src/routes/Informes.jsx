import React, { useState, useEffect } from 'react';
import '../styles/patients.css';

import { socket, IP } from '../main';

const Informes = () => {
    const [estudios, setEstudios] = useState([]);

    const cerrarSesion = () => {
        localStorage.clear();
        window.location.reload();
    };

    // Función para manejar la subida del archivo
    const handleFileChange = (e, dni) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('dni', dni);  // Pasamos el DNI del paciente al backend
            // Usar fetch para enviar el archivo al backend
            fetch(`${IP}/upload`, {
                method: 'POST',
                body: formData,  // El cuerpo de la solicitud es el FormData
            })
                .then(response => response.json())  // Respuesta como JSON
                .then(data => {
                    console.log('Archivo subido con éxito:', data);
                })
                .catch(error => {
                    console.log('Error al subir el archivo:', error);
                });
        } else {
            alert('Solo se permiten archivos PDF');
        }
    };

    // Reset página cuando se busca
    useEffect(() => {
        socket.emit('informes', (response) => {
            console.log(response);
        });
    }, []);

    return (
        <>
            <button onClick={cerrarSesion}>Cerrar Sesion</button>
            <div className="patients-container">
                <table className="patients-table">
                    <thead>
                        <tr>
                            <th>DNI</th>
                            <th>Nombre</th>
                        </tr>
                    </thead>
                    <tbody>
                        {estudios.map((patient) => (
                            <tr key={patient.dni}>
                                <td>{patient.dni}</td>
                                <td>{patient.nombre.replaceAll('_', ' ')}</td>
                                <td>
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={(e) => handleFileChange(e, patient.dni)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <table className="patients-table">
                    <thead>
                        <tr>
                            <th>DNI</th>
                            <th>Nombre</th>
                        </tr>
                    </thead>
                    <tbody>
                        {estudios.map((patient) => (
                            <tr key={patient.dni}>
                                <td>{patient.dni}</td>
                                <td>{patient.nombre.replaceAll('_', ' ')}</td>
                                <td>
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={(e) => handleFileChange(e, patient.dni)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default Informes;