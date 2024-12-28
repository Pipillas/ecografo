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
        const fileInput = e.target;           // Guardamos la referencia al input
        const file = fileInput.files[0];      // Tomamos el archivo seleccionado

        if (!file) return;                    // Si no hay archivo (el usuario canceló)

        if (file.type !== 'application/pdf') {
            alert('Solo se permiten archivos PDF');
            fileInput.value = null; // Limpia el valor para permitir una nueva subida
            return;
        }

        // Marcar que estamos subiendo este estudio
        setUploadingStudyId(estId);

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
                alert(`Error al subir el archivo: ${error}`);
                setUploadingStudyId(null);    // Asegurar volver a estado normal
                fileInput.value = null;       // Limpiar el input aunque haya error
                console.log('Error al subir el archivo:', error);
            });
    };


    const fetchData = () => {
        socket.emit('informes', (response) => {
            setEstudiosInformados(response.estudiosInformados);
            setEstudiosNoInformados(response.estudiosNoInformados);
        });
    };

    /*
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
    */

    function formatStudyString(studyString) {
        // Usamos una expresión regular para capturar las iniciales y las partes de la fecha y hora
        const match = studyString.match(/^([A-Z]+)(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?$/);

        if (!match) {
            throw new Error("El formato del string no es válido");
        }

        // Desglosamos las partes
        const initials = match[1]; // Parte de las iniciales (puede ser 2 o más letras)
        const year = match[2];
        const month = match[3];
        const day = match[4];
        const hour = match[5];
        const minute = match[6];

        // Formateamos la salida a DD/MM/YY HH:MM (podemos incluir segundos si es necesario)
        const shortYear = year.slice(-2);
        return `${initials} ${day}/${month}/${shortYear} ${hour}:${minute}`;
    }

    function extractDateFromStudyName(studyName) {
        // Asumiendo formato "EEEYYYYMMDDHHmm"
        const year = studyName.substring(3, 7);   // "2023"
        const month = studyName.substring(7, 9);  // "10"
        const day = studyName.substring(9, 11);   // "09"
        const hour = studyName.substring(11, 13); // "10"
        const minute = studyName.substring(13, 15); // "30"

        // Devolvemos un string "YYYYMMDDHHmm"
        return `${year}${month}${day}${hour}${minute}`;
    }

    const sortedStudies = flattenEstudios(estudiosNoInformados).sort((a, b) => {
        const dateA = extractDateFromStudyName(a.nombreEstudio);
        const dateB = extractDateFromStudyName(b.nombreEstudio);

        // Si querés lo más viejo primero:
        return dateA.localeCompare(dateB);
    });

    function flattenEstudios(estudiosNoInformados) {
        const allStudies = [];

        estudiosNoInformados.forEach((patient) => {
            patient.estudios.forEach((est) => {
                // Anexamos la info del paciente dentro del propio "estudio"
                allStudies.push({
                    id: est.id,
                    nombreEstudio: est.nombre,        // "EEE202311081430"
                    dni: patient.dni,
                    nombrePaciente: patient.nombre,   // "Juan_Perez"
                });
            });
        });

        return allStudies;
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
                                        {sortedStudies.map((study) => (
                                            <tr
                                                key={study.id}
                                                onClick={() => window.open(`/estudio/${study.id}`)}
                                            >
                                                {/* DNI y nombre del paciente (reemplazando '_' por espacio) */}
                                                <td>{study.dni}</td>
                                                <td className="nombre">{study.nombrePaciente.replaceAll('_', ' ').toUpperCase()}</td>
                                                {/* Formateamos el nombre del estudio (EEE + dd/mm/yy HH:mm) */}
                                                <td>{formatStudyString(study.nombreEstudio)}</td>
                                                {/* Botón de subir archivo (evitamos que el click abra el estudio) */}
                                                <td onClick={(e) => e.stopPropagation()}>
                                                    <label className="action-button custom-file-upload">
                                                        <input
                                                            type="file"
                                                            accept=".pdf"
                                                            onChange={(e) => handleFileChange(
                                                                e,
                                                                // simulamos "patient" con los datos mínimos
                                                                { nombre: study.nombrePaciente, dni: study.dni },
                                                                study.nombreEstudio,
                                                                study.id
                                                            )}
                                                        />
                                                        {
                                                            uploadingStudyId === study.id
                                                                ? <i className="fas fa-spinner fa-spin"></i>
                                                                : 'Subir'
                                                        }
                                                    </label>
                                                </td>
                                            </tr>
                                        ))}
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
                                                    <td className="nombre">{patient.nombre.replaceAll('_', ' ').toUpperCase()}</td>
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