import React, { useState, useEffect } from 'react';
import '../styles/patients.css';

const Patients = () => {
    const [patients, setPatients] = useState([
        { dni: '12345678', name: 'Juan Pérez' },
        { dni: '87654321', name: 'María García' },
        { dni: '11223344', name: 'Carlos López' },
        { dni: '22334455', name: 'Ana Martínez' },
        { dni: '33445566', name: 'Pedro Sánchez' },
        { dni: '44556677', name: 'Laura Rodríguez' },
        { dni: '55667788', name: 'Miguel Torres' },
        { dni: '66778899', name: 'Carmen Ruiz' },
        { dni: '77889900', name: 'David Moreno' },
        { dni: '88990011', name: 'Isabel Díaz' },
    ]);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Reset página cuando se busca
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handleDelete = (dni, name) => {
        if (window.confirm(`¿Estás seguro que deseas borrar al paciente ${name} ?`)) {
            const newPatients = patients.filter(patient => patient.dni !== dni);
            setPatients(newPatients);

            // Si al borrar nos quedamos sin items en la página actual, retrocedemos una página
            const newTotalPages = Math.ceil(newPatients.length / itemsPerPage);
            if (currentPage > newTotalPages) {
                setCurrentPage(Math.max(1, newTotalPages));
            }
        }
    };

    const handleResetPassword = (dni, name) => {
        if (window.confirm(`¿Estás seguro que deseas resetear la contraseña del paciente ${name} ?`)) {
            console.log('Reseteando contraseña para:', dni);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    // Filtrar pacientes
    const filteredPatients = patients.filter(patient =>
        patient.dni.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calcular total de páginas
    const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);

    // Obtener pacientes de la página actual
    const currentPatients = filteredPatients.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePreviousPage = () => {
        setCurrentPage(prev => Math.max(prev - 1, 1));
    };

    const handleNextPage = () => {
        setCurrentPage(prev => Math.min(prev + 1, totalPages));
    };

    return (
        <div className="patients-container">
            <div className="search-container">
                <input
                    type="text"
                    placeholder="Buscar por DNI o nombre..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="search-input"
                />
            </div>

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
                            <td>{patient.name}</td>
                            <td className="actions-cell">
                                <button
                                    onClick={() => handleDelete(patient.dni, patient.name)}
                                    className="button delete"
                                >
                                    Borrar
                                </button>
                                <button
                                    onClick={() => handleResetPassword(patient.dni, patient.name)}
                                    className="button reset"
                                >
                                    Resetear
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {totalPages > 0 && (
                <div className="pagination">
                    <button
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                        className="button pagination-button"
                    >
                        Anterior
                    </button>
                    <span className="page-info">
                        Página {currentPage} de {totalPages}
                    </span>
                    <button
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        className="button pagination-button"
                    >
                        Siguiente
                    </button>
                </div>
            )}
        </div>
    );
};

export default Patients;