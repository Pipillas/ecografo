import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/patients.css';
import { socket } from '../main';

const Patients = () => {
    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState(''); // Estado para el término de búsqueda
    const [currentPage, setCurrentPage] = useState(1); // Página actual para paginación
    const patientsPerPage = 10; // Número de pacientes por página

    const navigate = useNavigate();
    const location = useLocation();

    const cerrarSesion = () => {
        localStorage.clear();
        window.location.reload();
    };

    // Función para buscar pacientes
    const buscarPacientes = (text) => {
        socket.emit('pacientes', text, (response) => {
            if (response.success) {
                setPatients(response.pacientes);
                setCurrentPage(1); // Reinicia a la primera página en cada búsqueda
            } else {
                console.log(response.error);
            }
        });
    };

    // useEffect inicial para cargar todos los pacientes
    useEffect(() => {
        buscarPacientes(searchTerm); // Cargar todos los pacientes inicialmente
    }, [searchTerm]);

    // Lógica para la paginación
    const indexOfLastPatient = currentPage * patientsPerPage;
    const indexOfFirstPatient = indexOfLastPatient - patientsPerPage;
    const currentPatients = patients.slice(indexOfFirstPatient, indexOfLastPatient);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

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
                        {/* Input para buscar pacientes */}
                        <input
                            type="text"
                            placeholder="Buscar por DNI o Nombre"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                buscarPacientes(e.target.value); // Buscar al escribir
                            }}
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
                                    {currentPatients.map((patient) => (
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
                                                                        console.log(response.error);
                                                                        return;
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
                        {/* Los estilos de la paginacion estan en el css de tabla.css */}
                        {/* Paginación */}
                        {patients.length > patientsPerPage && (
                            <div className="pagination">
                                {Array.from({
                                    length: Math.ceil(patients.length / patientsPerPage),
                                }).map((_, i) => (
                                    <button
                                        key={i + 1}
                                        className={`pagination-button ${currentPage === i + 1 ? 'active' : ''}`}
                                        onClick={() => paginate(i + 1)}
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
