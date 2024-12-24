import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/patients.css';
import { socket, IP } from '../main';

const Informes = () => {
    const [uploadingStudyId, setUploadingStudyId] = useState(null);
    const [estudiosInformados, setEstudiosInformados] = useState([]);
    const [estudiosNoInformados, setEstudiosNoInformados] = useState([]);
    const navigate = useNavigate();
    const location = useLocation();

    const cerrarSesion = () => {
        localStorage.clear();
        window.location.reload();
    };

    const handleFileChange = (e, patient, estNombre, estId) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            setUploadingStudyId(estId); // Marcar que estamos subiendo este estudio
            const formData = new FormData();
            formData.append('file', file);
            formData.append('id', estId);

            fetch(`${IP}/upload/${patient.nombre}${patient.dni}/${estNombre}`, {
                method: 'POST',
                body: formData,
            })
                .then(response => response.json())
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
            setEstudiosInformados(response.estudiosInformados);
            setEstudiosNoInformados(response.estudiosNoInformados);
        });
    };

    function formatStudyString(studyString) {
        // Extraemos las partes con substring:
        const initials = studyString.substring(0, 3);      // EEE
        const year = studyString.substring(3, 7);          // YYYY
        const month = studyString.substring(7, 9);         // MM
        const day = studyString.substring(9, 11);          // DD
        const hour = studyString.substring(11, 13);        // HH
        const minute = studyString.substring(13, 15);      // mm
        // const seconds = studyString.substring(15, 17);  // ss (si quisieras usarlo)

        // Formateamos a DD/MM/YY (sólo últimos 2 dígitos del año) HH:MM
        const shortYear = year.slice(-2);
        return `${initials} ${day}/${month}/${shortYear} ${hour}:${minute}`;
    }

    useEffect(() => {
        socket.on('cambios', () => {
            fetchData();
            setUploadingStudyId(null); // Vuelve a estado normal
        });

        fetchData();

        return () => {
            socket.off('cambios');
        };
    }, []);

    return (
        <div className="content-wrapper">
            <nav className="nav-container">
                <div className="nav-user">
                    <i className="fas fa-user-shield"></i>
                    <span className="user-name">Administrador</span>
                </div>
                <div className="nav-actions">
                    <div onClick={cerrarSesion} className="nav-link">
                        <i className="fas fa-sign-out-alt"></i>
                        Cerrar Sesión
                    </div>
                </div>
            </nav>

            <div className="table-container">
                <div className="table-header">
                    <h1>Panel de Administración</h1>
                </div>
                <div className="admin-nav">
                    <button
                        className={`admin-nav-button ${location.pathname.includes('/informes') ? 'active' : ''}`}
                        onClick={() => navigate('/informes')}
                    >
                        <i className="fas fa-file-medical"></i>
                        Informes
                    </button>
                    <button
                        className={`admin-nav-button ${location.pathname.includes('/pacientes') ? 'active' : ''}`}
                        onClick={() => navigate('/pacientes')}
                    >
                        <i className="fas fa-users"></i>
                        Lista de Pacientes
                    </button>
                </div>

                <div className="tables-wrapper">
                    <div className="table-section">
                        <h2 className="table-title">Estudios No Informados</h2>
                        <div className="responsive-table">
                            <div className="scroll">
                                <table className="patients-table">
                                    <thead>
                                        <tr>
                                            <th>DNI</th>
                                            <th className="nombre">Nombre</th>
                                            <th>Estudio</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {estudiosNoInformados.map((patient) => {
                                            return patient.estudios.map((est) => (
                                                <tr onClick={() => window.open(`/estudio/${est.id}`)} key={est.id}>
                                                    <td>{patient.dni}</td>
                                                    <td className="nombre">{patient.nombre.replaceAll('_', ' ')}</td>
                                                    <td>{formatStudyString(est.nombre)}</td>
                                                    <td onClick={(e) => e.stopPropagation()}>
                                                        <label className="action-button custom-file-upload">
                                                            <input
                                                                type="file"
                                                                accept=".pdf"
                                                                onChange={(e) => handleFileChange(e, patient, est.nombre, est.id)}
                                                            />
                                                            {
                                                                uploadingStudyId === est.id
                                                                    ? <i className="fas fa-spinner fa-spin"></i> // Ícono de spinner
                                                                    : 'Subir'
                                                            }
                                                        </label>
                                                    </td>
                                                </tr>
                                            ));
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="table-section">
                        <h2 className="table-title">Estudios Informados</h2>
                        <div className="responsive-table">
                            <div className="scroll">
                                <table className="patients-table">
                                    <thead>
                                        <tr>
                                            <th>DNI</th>
                                            <th className="th-nombre">Nombre</th>
                                            <th>Estudio</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {estudiosInformados.map((patient) => {
                                            return patient.estudios.map((est) => (
                                                <tr onClick={() => window.open(`/estudio/${est.id}`)} key={est.id}>
                                                    <td>{patient.dni}</td>
                                                    <td className="nombre">{patient.nombre.replaceAll('_', ' ')}</td>
                                                    <td>{formatStudyString(est.nombre)}</td>
                                                    <td onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            onClick={() => {
                                                                if (window.confirm(`Esta seguro que desea borrar el informe de ${patient.nombre}?\n¡Esta acción es irreversible!`)) {
                                                                    socket.emit('cambiar-informe', est.id)
                                                                }
                                                            }}
                                                            className="action-button cancel-action"
                                                        >
                                                            Cancelar
                                                        </button>
                                                    </td>
                                                </tr>
                                            ));
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Informes;