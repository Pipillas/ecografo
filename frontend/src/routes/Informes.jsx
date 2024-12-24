import React, { useState, useEffect } from 'react';
import '../styles/patients.css';

import { socket, IP } from '../main';

const Informes = () => {
    const [estudiosInformados, setEstudiosInformados] = useState([]);
    const [estudiosNoInformados, setEstudiosNoInformados] = useState([]);

    const cerrarSesion = () => {
        localStorage.clear();
        window.location.reload();
    };

    // Función para manejar la subida del archivo
    const handleFileChange = (e, patient, estNombre, estId) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('id', estId);
            // Usar fetch para enviar el archivo al backend
            fetch(`${IP}/upload/${patient.nombre}${patient.dni}/${estNombre}`, {
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

    const fetchData = () => {
        socket.emit('informes', (response) => {
            setEstudiosInformados(response.estudiosInformados)
            setEstudiosNoInformados(response.estudiosNoInformados)
        });
    };

    // Reset página cuando se busca
    useEffect(() => {
        socket.on('cambios', fetchData);
        fetchData();
        return () => {
            socket.off('cambios');
        }
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
                            <th></th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {estudiosNoInformados.map((patient) => {
                            return patient.estudios.map((est) =>
                                <tr key={est.id}>
                                    <td>{patient.dni}</td>
                                    <td>{patient.nombre.replaceAll('_', ' ')}</td>
                                    <td>{est.nombre}</td>
                                    <td>
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => handleFileChange(e, patient, est.nombre, est.id)}
                                        />
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                <table className="patients-table">
                    <thead>
                        <tr>
                            <th>DNI</th>
                            <th>Nombre</th>
                            <th></th>
                            <th></th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {estudiosInformados.map((patient) => {
                            return patient.estudios.map((est) =>
                                <tr key={est.id}>
                                    <td>{patient.dni}</td>
                                    <td>{patient.nombre.replaceAll('_', ' ')}</td>
                                    <td>{est.nombre}</td>
                                    <td>
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => handleFileChange(e, patient, est.nombre, est.id)}
                                        />
                                    </td>
                                    <td onClick={() => socket.emit('cambiar-informe', est.id)}>Cancelar</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default Informes;