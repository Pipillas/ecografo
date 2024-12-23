import React, { useState, useEffect } from 'react';
import '../styles/patients.css';

import { socket, IP } from '../main';

const Patients = () => {
    const [patients, setPatients] = useState([]);

    const cerrarSesion = () => {
        localStorage.clear();
        window.location.reload();
    };

    // Reset página cuando se busca
    useEffect(() => {
        socket.emit('pacientes', (response) => {
            if (response.success) {
                setPatients(response.pacientes);
            } else {
                console.log(response.error);
            }
        });
    }, []);

    return (
        <div className="patients-container">
            <button onClick={cerrarSesion}>Cerrar Sesion</button>
            <table className="patients-table">
                <thead>
                    <tr>
                        <th>DNI</th>
                        <th>Nombre</th>
                    </tr>
                </thead>
                <tbody>
                    {patients.map((patient) => (
                        <tr key={patient.dni}>
                            <td>{patient.dni}</td>
                            <td>{patient.nombre.replaceAll('_', ' ')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Patients;