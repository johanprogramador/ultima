"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import axios from "axios"
import { FaBuilding, FaEdit, FaPlus, FaTrash, FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa"
import "../styles/SedesExistentes.css"

const SedesExistentes = () => {
  // Estados principales
  const [sedes, setSedes] = useState([])
  const [filteredSedes, setFilteredSedes] = useState([])
  const [selectedSede, setSelectedSede] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Estado para nueva sede
  const [newSede, setNewSede] = useState({
    nombre: "",
    direccion: "",
    ciudad: "",
  })
  
  // Estado para alertas
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "error",
  })

  // Estados para búsqueda y paginación
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)

  // Ref para el debounce del buscador
  const searchTimeoutRef = useRef(null)

  // API base URL
  const API_URL = "http://127.0.0.1:8000/api/sedes/"

  // Función para aplicar filtros
  const applyFilters = useCallback((term) => {
    if (!sedes.length) return

    let filtered = [...sedes]

    if (term) {
      const lowerTerm = term.toLowerCase()
      filtered = filtered.filter(
        (sede) =>
          (sede.nombre && sede.nombre.toLowerCase().includes(lowerTerm)) ||
          (sede.direccion && sede.direccion.toLowerCase().includes(lowerTerm)) ||
          (sede.ciudad && sede.ciudad.toLowerCase().includes(lowerTerm))
      )
    }

    setFilteredSedes(filtered)
    setTotalPages(Math.ceil(filtered.length / itemsPerPage))
    setCurrentPage(1) // Resetear siempre a la primera página al buscar
  }, [sedes, itemsPerPage])

  // Manejador de cambio en el buscador
  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchTerm(value) // Actualiza el estado inmediatamente para que el input responda

    // Limpiar el timeout anterior si existe
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Configurar un nuevo timeout para aplicar el filtro después de 300ms
    searchTimeoutRef.current = setTimeout(() => {
      applyFilters(value)
    }, 300)
  }

  // Obtener las sedes para la página actual
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredSedes.slice(startIndex, endIndex)
  }

  // Calcular el rango de elementos mostrados
  const getItemRange = () => {
    if (filteredSedes.length === 0) return "No hay resultados"
    const startItem = (currentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(startItem + itemsPerPage - 1, filteredSedes.length)
    return `Mostrando ${startItem} a ${endItem} de ${filteredSedes.length} resultados`
  }

  // Mostrar alerta con timeout
  const showAlert = (message, type = "error", duration = 3000) => {
    setAlert({
      show: true,
      message,
      type,
    })
    return setTimeout(() => {
      setAlert(prev => ({...prev, show: false}))
    }, duration)
  }

  // Fetch the list of sedes
  const fetchSedes = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await axios.get(API_URL)
      let sedesData = []

      if (Array.isArray(response.data)) {
        sedesData = response.data
      } else if (response.data.sedes && Array.isArray(response.data.sedes)) {
        sedesData = response.data.sedes
      } else {
        console.error("Formato de respuesta inesperado")
        showAlert("Error al cargar sedes: formato de datos inesperado")
        sedesData = []
      }

      setSedes(sedesData)
      setFilteredSedes(sedesData) // Inicializar filteredSedes con todos los datos
      setTotalPages(Math.ceil(sedesData.length / itemsPerPage))
    } catch (error) {
      console.error("Error al obtener sedes:", error)
      const errorMessage = error.response?.data?.message || 
                         error.message || 
                         "Error al conectar con el servidor"
      showAlert(`Error al cargar sedes: ${errorMessage}`)
      setSedes([])
      setFilteredSedes([])
    } finally {
      setIsLoading(false)
    }
  }, [itemsPerPage])

  // Fetch sede details
  const fetchSedeDetails = async (sedeId) => {
    setIsLoading(true)
    try {
      const response = await axios.get(`${API_URL}${sedeId}/`)
      setSelectedSede(response.data)
      setShowDetailModal(true)
    } catch (error) {
      console.error("Error al obtener detalles:", error)
      const errorMessage = error.response?.data?.message || 
                         "Error al cargar detalles de la sede"
      showAlert(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Validar datos de sede
  const validateSede = (sedeData, isNew = false) => {
    const errors = []
    
    if (!sedeData.nombre?.trim()) errors.push("El nombre es obligatorio")
    if (isNew && !sedeData.direccion?.trim()) errors.push("La dirección es obligatoria")
    if (isNew && !sedeData.ciudad?.trim()) errors.push("La ciudad es obligatoria")
    
    return errors
  }

  // Edit sede
  const editSede = async (sedeId, updatedSedeData) => {
    const validationErrors = validateSede(updatedSedeData)
    if (validationErrors.length > 0) {
      showAlert(validationErrors.join(", "))
      return
    }

    setIsLoading(true)
    try {
      await axios.put(`${API_URL}${sedeId}/`, updatedSedeData)
      await fetchSedes()
      setShowDetailModal(false)
      showAlert("Sede actualizada correctamente", "success")
    } catch (error) {
      console.error("Error al editar:", error)
      const errorMessage = error.response?.data?.message || 
                         "Error al actualizar la sede"
      showAlert(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Delete sede
  const deleteSede = async (sedeId) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta sede?")) return
    
    setIsLoading(true)
    try {
      await axios.delete(`${API_URL}${sedeId}/`)
      await fetchSedes()
      showAlert("Sede eliminada correctamente", "success")
    } catch (error) {
      console.error("Error al eliminar:", error)
      const errorMessage = error.response?.data?.message || 
                         "Error al eliminar la sede"
      showAlert(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Add new sede
  const addSede = async () => {
    const validationErrors = validateSede(newSede, true)
    if (validationErrors.length > 0) {
      showAlert(validationErrors.join(", "))
      return
    }

    setIsLoading(true)
    try {
      await axios.post(API_URL, newSede)
      await fetchSedes()
      setShowForm(false)
      setNewSede({ nombre: "", direccion: "", ciudad: "" })
      showAlert("Sede creada correctamente", "success")
    } catch (error) {
      console.error("Error al crear:", error)
      const errorMessage = error.response?.data?.message || 
                         "Error al crear la sede"
      showAlert(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Load sedes when component mounts
  useEffect(() => {
    fetchSedes()
  }, [fetchSedes])

  // Limpiar timeout al desmontar el componente
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // Componente de alerta
  const AlertModal = ({ message, type, onClose }) => {
    return (
      <div className="modal-overlay">
        <div className="modal-container alert-container">
          <div className={`alert-modal ${type}`}>
            <p>{message}</p>
            <button className="close-button" onClick={onClose}>
              &times;
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Manejador para cerrar modales
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowDetailModal(false)
      setShowForm(false)
    }
  }

  return (
    <div className="records-container">
      <div className="user-card">
        <div className="card-header">
          <h2>Sedes existentes</h2>
          <button 
            className="add-user-btn" 
            onClick={() => setShowForm(true)}
            disabled={isLoading}
          >
            <FaPlus />
          </button>
        </div>

        {/* Mensajes de alerta */}
        {alert.show && (
          <AlertModal 
            message={alert.message} 
            type={alert.type} 
            onClose={() => setAlert(prev => ({...prev, show: false}))} 
          />
        )}

        {/* Buscador - Versión corregida */}
        <div className="search-container">
          <div className="search-input-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar sedes por nombre, dirección o ciudad..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="search-input"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Estado de carga */}
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
          </div>
        )}

        {/* Lista de sedes */}
        <div className="user-list">
          {getCurrentPageItems().length > 0 ? (
            getCurrentPageItems().map((sede) => (
              <div key={sede.id} className="user-item">
                <div className="user-avatar">
                  <FaBuilding />
                </div>
                <div 
                  className="user-info" 
                  onClick={() => !isLoading && fetchSedeDetails(sede.id)}
                  style={{ cursor: isLoading ? "not-allowed" : "pointer" }}
                >
                  <div className="user-name">{sede.nombre}</div>
                  <div className="user-access">Dirección: {sede.direccion || "No especificada"}</div>
                  <div className="user-access">Ciudad: {sede.ciudad || "No especificada"}</div>
                </div>
                <div className="user-actions">
                  <button 
                    className="action-button-modern edit" 
                    onClick={() => !isLoading && fetchSedeDetails(sede.id)}
                    disabled={isLoading}
                  >
                    <FaEdit />
                  </button>
                  <button 
                    className="action-button-modern delete" 
                    onClick={() => !isLoading && deleteSede(sede.id)}
                    disabled={isLoading}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>{isLoading ? "Cargando..." : "No hay sedes disponibles."}</p>
          )}
        </div>

        {/* Paginación */}
        {filteredSedes.length > 0 && (
          <div className="pagination-container">
            <div className="pagination-info">{getItemRange()}</div>
            <div className="pagination-controls">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || isLoading}
                className="pagination-arrow"
                aria-label="Página anterior"
              >
                <FaChevronLeft />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0 || isLoading}
                className="pagination-arrow"
                aria-label="Página siguiente"
              >
                <FaChevronRight />
              </button>
            </div>
            <div className="pagination-progress-bar">
              <div 
                className="pagination-progress" 
                style={{ width: `${(currentPage / totalPages) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Modal para ver y editar detalles de la sede */}
        {showDetailModal && selectedSede && (
          <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-container modern-modal" onClick={(e) => e.stopPropagation()}>
              <button 
                className="close-button" 
                onClick={() => setShowDetailModal(false)}
                disabled={isLoading}
              >
                &times;
              </button>
              <div className="modal-content">
                <h1 className="modal-title">Detalles de la sede</h1>
                <div className="input-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    value={selectedSede.nombre || ""}
                    onChange={(e) => setSelectedSede({ ...selectedSede, nombre: e.target.value })}
                    placeholder="Nombre"
                    disabled={isLoading}
                    className={!selectedSede.nombre?.trim() ? "input-error" : ""}
                  />
                </div>
                <div className="input-group">
                  <label>Dirección</label>
                  <input
                    type="text"
                    value={selectedSede.direccion || ""}
                    onChange={(e) => setSelectedSede({ ...selectedSede, direccion: e.target.value })}
                    placeholder="Dirección"
                    disabled={isLoading}
                  />
                </div>
                <div className="input-group">
                  <label>Ciudad</label>
                  <input
                    type="text"
                    value={selectedSede.ciudad || ""}
                    onChange={(e) => setSelectedSede({ ...selectedSede, ciudad: e.target.value })}
                    placeholder="Ciudad"
                    disabled={isLoading}
                  />
                </div>
                <button 
                  className="create-button" 
                  onClick={() => editSede(selectedSede.id, selectedSede)}
                  disabled={isLoading}
                >
                  {isLoading ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para agregar nueva sede */}
        {showForm && (
          <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-container modern-modal" onClick={(e) => e.stopPropagation()}>
              <button 
                className="close-button" 
                onClick={() => setShowForm(false)}
                disabled={isLoading}
              >
                &times;
              </button>
              <div className="modal-content">
                <h1 className="modal-title">Agregar Sede</h1>
                <div className="input-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    placeholder="Nombre de la sede"
                    value={newSede.nombre}
                    onChange={(e) => setNewSede({ ...newSede, nombre: e.target.value })}
                    disabled={isLoading}
                    className={!newSede.nombre?.trim() ? "input-error" : ""}
                  />
                </div>
                <div className="input-group">
                  <label>Dirección *</label>
                  <input
                    type="text"
                    placeholder="Dirección"
                    value={newSede.direccion}
                    onChange={(e) => setNewSede({ ...newSede, direccion: e.target.value })}
                    disabled={isLoading}
                    className={!newSede.direccion?.trim() ? "input-error" : ""}
                  />
                </div>
                <div className="input-group">
                  <label>Ciudad *</label>
                  <input
                    type="text"
                    placeholder="Ciudad"
                    value={newSede.ciudad}
                    onChange={(e) => setNewSede({ ...newSede, ciudad: e.target.value })}
                    disabled={isLoading}
                    className={!newSede.ciudad?.trim() ? "input-error" : ""}
                  />
                </div>
                <button 
                  className="create-button" 
                  onClick={addSede}
                  disabled={isLoading}
                >
                  {isLoading ? "Creando..." : "Agregar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SedesExistentes