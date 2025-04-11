// src/components/Inventory/AdminInventory.js
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../auth';
import { toast } from 'react-toastify';
import DispositivosList from './DispositivosList';
import 'react-toastify/dist/ReactToastify.css';

const AdminInventory = () => {
  const [sedes, setSedes] = useState([]);
  const [selectedSede, setSelectedSede] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchSedes = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Verificar que el usuario sea admin
        if (!user?.isAdmin) {
          throw new Error('Acceso no autorizado');
        }

        const response = await api.get('/api/sedes/');
        
        // Validar la respuesta
        if (!response.data || !Array.isArray(response.data)) {
          throw new Error('Formato de datos inválido');
        }

        setSedes(response.data);
        
        // Seleccionar la primera sede por defecto si existe
        if (response.data.length > 0) {
          setSelectedSede(response.data[0].id.toString());
        }
      } catch (err) {
        console.error('Error al cargar sedes:', err);
        setError(err.message || 'Error al cargar las sedes');
        toast.error(err.message || 'Error al cargar las sedes');
      } finally {
        setLoading(false);
      }
    };

    fetchSedes();
  }, [user]); // Dependencia de user para reaccionar a cambios

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <p>Por favor, recarga la página o contacta al administrador.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-container">
        <p>Cargando sedes...</p>
        {/* Puedes agregar un spinner aquí */}
      </div>
    );
  }

  return (
    <div className="admin-inventory-container">
      <h1>Panel de Administrador</h1>
      <div className="sede-selector-container">
        <label htmlFor="sede-select">Seleccionar Sede:</label>
        <select
          id="sede-select"
          value={selectedSede}
          onChange={(e) => setSelectedSede(e.target.value)}
          disabled={loading || sedes.length === 0}
        >
          <option value="">Todas las sedes</option>
          {sedes.map(sede => (
            <option key={sede.id} value={sede.id}>
              {sede.nombre} ({sede.ciudad || 'Sin ciudad'})
            </option>
          ))}
        </select>
      </div>
      
      <div className="inventory-list-container">
        <DispositivosList 
          sedeId={selectedSede} 
          isAdmin={true}
        />
      </div>
    </div>
  );
};

export default AdminInventory;