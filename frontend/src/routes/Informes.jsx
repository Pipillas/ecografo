import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/patients.css';
import { socket, IP } from '../main';

const Informes = () => {
    const [uploadingStudyId, setUploadingStudyId] = useState(null);
    const [estudiosInformados, setEstudiosInformados] = useState([]);
    const [estudiosNoInformados, setEstudiosNoInformados] = useState([]);
    const [currentPage, setCurrentPage] = useState(1); // Página actual
    const [totalPages, setTotalPages] = useState(1); // Total de páginas
    const studiesPerPage = 20; // Configuración de estudios por página
    const [searchTerm, setSearchTerm] = useState('');
    const [pageOffset, setPageOffset] = useState(0); // Controla qué páginas mostrar en la paginación

    const navigate = useNavigate();
    const location = useLocation();

    const cerrarSesion = () => {
        localStorage.clear();
        window.location.reload();
    };

    const handleFileChange = (e, patient, estNombre, estId) => {
        const fileInput = e.target;
        const file = fileInput.files[0];

        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert('Solo se permiten archivos PDF');
            fileInput.value = null;
            return;
        }

        setUploadingStudyId(estId);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('id', estId);

        fetch(`${IP}/upload/${patient.nombre}${patient.dni}/${estNombre}`, {
            method: 'POST',
            body: formData,
        })
            .then((response) => response.json())
            .then((data) => {
                console.log('Archivo subido con éxito:', data);
            })
            .catch((error) => {
                alert(`Error al subir el archivo: ${error}`);
                setUploadingStudyId(null);
                fileInput.value = null;
                console.log('Error al subir el archivo:', error);
            });
    };

    const buscarInformes = (text = '', page = 1) => {
        socket.emit(
            'informes',
            { text, page, limit: studiesPerPage },
            (response) => {
                if (response.success) {
                    setEstudiosInformados(response.estudiosInformados);
                    setEstudiosNoInformados(response.estudiosNoInformados);
                    setTotalPages(Math.ceil((response.totalInformados + response.totalNoInformados) / studiesPerPage));
                } else {
                    console.error('Error al obtener informes:', response.error);
                }
            }
        );
    };

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(1);
        }
    }, [totalPages]);

    const handlePageChange = (page) => {
        setCurrentPage(page);
        // Ajustar la ventana de paginación para mantener la página actual en el centro si es posible
        if (page > pageOffset + 2) {
            setPageOffset(page - 2);
        } else if (page < pageOffset + 1) {
            setPageOffset(page - 1);
        }
    };

    function formatStudyString(studyString) {
        const match = studyString.match(/^([A-Z]+)(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?$/);

        if (!match) {
            throw new Error('El formato del string no es válido');
        }

        const initials = match[1];
        const year = match[2];
        const month = match[3];
        const day = match[4];
        const hour = match[5];
        const minute = match[6];

        const shortYear = year.slice(-2);
        return `${initials} ${day}/${month}/${shortYear} ${hour}:${minute}`;
    }

    function extractDateFromStudyName(studyName) {
        const year = studyName.substring(3, 7);
        const month = studyName.substring(7, 9);
        const day = studyName.substring(9, 11);
        const hour = studyName.substring(11, 13);
        const minute = studyName.substring(13, 15);

        return `${year}${month}${day}${hour}${minute}`;
    }

    const sortedStudies = flattenEstudios(estudiosNoInformados).sort((a, b) => {
        const dateA = extractDateFromStudyName(a.nombreEstudio);
        const dateB = extractDateFromStudyName(b.nombreEstudio);

        return dateA.localeCompare(dateB);
    });

    function flattenEstudios(estudiosNoInformados) {
        const allStudies = [];

        estudiosNoInformados.forEach((patient) => {
            patient.estudios.forEach((est) => {
                allStudies.push({
                    id: est.id,
                    nombreEstudio: est.nombre,
                    dni: patient.dni,
                    nombrePaciente: patient.nombre,
                });
            });
        });

        return allStudies;
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
        socket.on('cambios', () => {
            buscarInformes(searchTerm, currentPage);
            setUploadingStudyId(null);
        });

        buscarInformes(searchTerm, currentPage);

        return () => {
            socket.off('cambios');
        };
    }, [searchTerm, currentPage]);

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
                        <div className="table-section-header-no-informados">
                            <h2 className="table-title">Estudios NO Informados</h2>
                        </div>
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
                                                <td>{study.dni}</td>
                                                <td className="nombre">{study.nombrePaciente.replaceAll('_', ' ').toUpperCase()}</td>
                                                <td>{formatStudyString(study.nombreEstudio)}</td>
                                                <td onClick={(e) => e.stopPropagation()}>
                                                    <label className="action-button custom-file-upload">
                                                        <input
                                                            type="file"
                                                            accept=".pdf"
                                                            onChange={(e) => handleFileChange(
                                                                e,
                                                                { nombre: study.nombrePaciente, dni: study.dni },
                                                                study.nombreEstudio,
                                                                study.id
                                                            )}
                                                        />
                                                        {uploadingStudyId === study.id ? (
                                                            <i className="fas fa-spinner fa-spin"></i>
                                                        ) : (
                                                            'Subir'
                                                        )}
                                                    </label>

                                                    <button
                                                        className="action-button delete-action"
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Evita que se abra la vista del estudio
                                                            if (window.confirm(`¿Está seguro que desea borrar el estudio ${study.nombreEstudio}? Esta acción es irreversible.`)) {
                                                                socket.emit('eliminar-estudio', study.id);
                                                            }
                                                        }}
                                                    >
                                                        <i className="fas fa-trash-alt"></i>
                                                    </button>


                                                </td>


                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div className="table-section">
                        <div className="table-section-header">
                            <h2 className="table-title">Estudios Informados</h2>
                            <input
                                type="text"
                                placeholder="Buscar por DNI o Nombre"
                                className="search-input informes-search-input"
                                value={searchTerm} // <- Conectar con el estado
                                onChange={(e) => setSearchTerm(e.target.value)} // <- Actualizar búsqueda en tiempo real
                            />

                        </div>
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
                                        {estudiosInformados.map((patient) =>
                                            patient.estudios.map((est) => (
                                                <tr
                                                    onClick={() => window.open(`/estudio/${est.id}`)}
                                                    key={est.id}
                                                >
                                                    <td>{patient.dni}</td>
                                                    <td className="nombre">{patient.nombre.replaceAll('_', ' ').toUpperCase()}</td>
                                                    <td>{formatStudyString(est.nombre)}</td>
                                                    <td onClick={(e) => e.stopPropagation()}>
                                                        <div className="actions-cell">
                                                            <button
                                                                onClick={() => {
                                                                    if (
                                                                        window.confirm(
                                                                            `¿Está seguro que desea borrar el informe de ${patient.nombre}?
¡Esta acción es irreversible!`
                                                                        )
                                                                    ) {
                                                                        socket.emit('cambiar-informe', est.id);
                                                                    }
                                                                }}
                                                                className="action-button cancel-action"
                                                            >
                                                                Cancelar
                                                            </button>
                                                            <button className="action-button compartir-action" onClick={() => compartirEnlace(est.id)}>Compartir</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="pagination">
                                <button
                                    className="pagination-button"
                                    disabled={currentPage === 1}
                                    onClick={() => handlePageChange(currentPage - 1)}
                                >
                                    &lt;
                                </button>

                                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                                    const pageNumber = pageOffset + i + 1;
                                    return pageNumber <= totalPages ? (
                                        <button
                                            key={pageNumber}
                                            className={`pagination-button ${currentPage === pageNumber ? 'active' : ''}`}
                                            onClick={() => handlePageChange(pageNumber)}
                                        >
                                            {pageNumber}
                                        </button>
                                    ) : null;
                                })}

                                <button
                                    className="pagination-button"
                                    disabled={currentPage === totalPages}
                                    onClick={() => handlePageChange(currentPage + 1)}
                                >
                                    &gt;
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Informes;
