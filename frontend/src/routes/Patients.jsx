import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/patients.css';
import { socket } from '../main';

const Patients = () => {
    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const patientsPerPage = 10;

    const navigate = useNavigate();
    const location = useLocation();

    const cerrarSesion = () => {
        localStorage.clear();
        window.location.reload();
    };

    const buscarPacientes = (text = '', page = 1) => {
        socket.emit('pacientes', { text, page, limit: patientsPerPage }, (response) => {
            if (response.success) {
                setPatients(response.pacientes);
                setTotalPages(Math.ceil(response.totalPatients / patientsPerPage));
                setCurrentPage(page);
            } else {
                console.error(response.error);
            }
        });
    };

    useEffect(() => {
        if (page > totalPages) {
            setPage(1);
        }
    }, [totalPages]);

    useEffect(() => {
        buscarPacientes(searchTerm, currentPage);
    }, [currentPage, searchTerm]);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

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
                    <h1>Lista de Pacientes</h1>
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

                <div className="tables-wrapper-2">
                    <div className="table-section">
                        <input
                            type="text"
                            placeholder="Buscar por DNI o Nombre"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        <div className="responsive-table">
                            <table className="patients-table">
                                <thead>
                                    <tr>
                                        <th>DNI</th>
                                        <th>Nombre</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {patients.map((patient) => (
                                        <tr key={patient.dni}>
                                            <td>{patient.dni}</td>
                                            <td>{patient.nombre.replaceAll('_', ' ').toUpperCase()}</td>
                                            <td>
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm(`¿Está seguro que desea cambiar la contraseña de ${patient.nombre}?`)) {
                                                            socket.emit(
                                                                'cambiar-password',
                                                                {
                                                                    id: patient._id,
                                                                    passwordNueva: patient.dni,
                                                                },
                                                                (response) => {
                                                                    if (response.error) {
                                                                        console.error(response.error);
                                                                    }
                                                                }
                                                            );
                                                        }
                                                    }}
                                                    className="action-button cancel-action"
                                                >
                                                    Reset
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {patients.length === 0 && (
                                <p style={{ marginTop: '10px' }}>
                                    No se encontraron pacientes para el criterio de búsqueda.
                                </p>
                            )}
                        </div>
                        {totalPages > 1 && (
                            <div className="pagination">
                                {Array.from({ length: totalPages }, (_, i) => (
                                    <button
                                        key={i + 1}
                                        className={`pagination-button ${currentPage === i + 1 ? 'active' : ''}`}
                                        onClick={() => handlePageChange(i + 1)}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Patients;
