"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { FaBuilding, FaEdit, FaPlus, FaTrash, FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa"
import "../styles/SedesExistentes.css"

const SedesExistentes = () => {
  const [sedes, setSedes] = useState([])
  const [filteredSedes, setFilteredSedes] = useState([])
  const [selectedSede, setSelectedSede] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newSede, setNewSede] = useState({
    nombre: "",
    direccion: "",
    ciudad: "",
  })
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "error", // Puede ser "error" o "success"
  })

  // Estados para búsqueda y paginación
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)

  // Aplicar filtros a las sedes
  const applyFilters = (sedesData = sedes) => {
    let filtered = [...sedesData]

    if (searchTerm) {
      filtered = filtered.filter(
        (sede) =>
          (sede.nombre && sede.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (sede.direccion && sede.direccion.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (sede.ciudad && sede.ciudad.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    setFilteredSedes(filtered)
    setTotalPages(Math.ceil(filtered.length / itemsPerPage))
  }

  // Obtener las sedes para la página actual
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredSedes.slice(startIndex, endIndex)
  }

  // Calcular el rango de elementos mostrados
  const getItemRange = () => {
    const startItem = (currentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(startItem + itemsPerPage - 1, filteredSedes.length)
    return `Mostrando ${startItem} a ${endItem} de ${filteredSedes.length} resultados`
  }

  // Fetch the list of sedes
  const fetchSedes = useCallback(async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/sedes/")
      console.log(response.data) // Agregar para inspeccionar la respuesta

      let sedesData = []
      // Asegúrate de que la respuesta sea un array
      if (Array.isArray(response.data)) {
        sedesData = response.data
      } else if (response.data.sedes && Array.isArray(response.data.sedes)) {
        // Si la respuesta tiene una clave "sedes"
        sedesData = response.data.sedes
      } else {
        // Si la respuesta no tiene el formato esperado
        console.error("La respuesta de sedes no tiene el formato esperado")
        sedesData = []
      }

      setSedes(sedesData)
      applyFilters(sedesData)
    } catch (error) {
      console.error("Error al obtener sedes:", error)
      setSedes([])
      setFilteredSedes([])
    }
  }, [])

  // Fetch sede details
  const fetchSedeDetails = async (sedeId) => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/sedes/${sedeId}/`)
      setSelectedSede(response.data)
      setShowDetailModal(true)
    } catch (error) {
      console.error("Error al obtener los detalles de la sede:", error)
    }
  }

  // Edit sede
  const editSede = async (sedeId, updatedSedeData) => {
    try {
      if (!updatedSedeData.nombre) {
        setAlert({
          show: true,
          message: "El campo 'nombre' es obligatorio.",
          type: "error",
        })
        return
      }

      await axios.put(`http://127.0.0.1:8000/api/sedes/${sedeId}/`, updatedSedeData)
      fetchSedes()
      setShowDetailModal(false)
      setAlert({
        show: true,
        message: "Sede editada exitosamente.",
        type: "success",
      })
    } catch (error) {
      console.error("Error al editar la sede:", error)
      setAlert({
        show: true,
        message: "Hubo un error al editar la sede.",
        type: "error",
      })
    }
  }

  // Delete sede
  const deleteSede = async (sedeId) => {
    try {
      await axios.delete(`http://127.0.0.1:8000/api/sedes/${sedeId}/`)
      fetchSedes()
      setAlert({
        show: true,
        message: "Sede eliminada exitosamente.",
        type: "success",
      })
    } catch (error) {
      console.error("Error al eliminar la sede:", error)
      setAlert({
        show: true,
        message: "Hubo un error al eliminar la sede.",
        type: "error",
      })
    }
  }

  // Add new sede
  const addSede = async () => {
    if (!newSede.nombre || !newSede.direccion || !newSede.ciudad) {
      setAlert({
        show: true,
        message: "Todos los campos son obligatorios.",
        type: "error",
      })
      return
    }

    try {
      const response = await axios.post("http://127.0.0.1:8000/api/sedes/", newSede)
      console.log(response.data) // Verifica la respuesta de la API
      setShowForm(false)
      fetchSedes()
      setAlert({
        show: true,
        message: "Sede agregada exitosamente.",
        type: "success",
      })
    } catch (error) {
      console.error("Error al agregar la sede:", error)
      setAlert({
        show: true,
        message: "Hubo un error al agregar la sede.",
        type: "error",
      })
    }
  }

  // Load sedes when component mounts
  useEffect(() => {
    fetchSedes()
  }, [fetchSedes])

  // Efecto para aplicar filtros cuando cambia el término de búsqueda
  useEffect(() => {
    applyFilters()
    setCurrentPage(1) // Resetear a la primera página cuando cambia la búsqueda
  }, [])

  // Efecto para cerrar la alerta automáticamente después de 1 segundo
  useEffect(() => {
    if (alert.show) {
      const timer = setTimeout(() => {
        setAlert({ ...alert, show: false })
      }, 1000) // Cerrar la alerta después de 1 segundo
      return () => clearTimeout(timer) // Limpiar el timer si el componente se desmonta
    }
  }, [alert])

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

  // Manejador para cerrar el modal cuando se hace clic fuera de él
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
          <button className="add-user-btn" onClick={() => setShowForm(true)}>
            <FaPlus />
          </button>
        </div>

        {/* Mensajes de alerta */}
        {alert.show && (
          <AlertModal message={alert.message} type={alert.type} onClose={() => setAlert({ ...alert, show: false })} />
        )}

        {/* Buscador */}
        <div className="search-container">
          <div className="search-input-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar sedes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* Lista de sedes */}
        <div className="user-list">
          {getCurrentPageItems().length > 0 ? (
            getCurrentPageItems().map((sede) => (
              <div key={sede.id} className="user-item">
                <div className="user-avatar">
                  <FaBuilding />
                </div>
                <div className="user-info" onClick={() => fetchSedeDetails(sede.id)}>
                  <div className="user-name">{sede.nombre}</div>
                  <div className="user-access">Dirección: {sede.direccion || "No especificada"}</div>
                  <div className="user-access">Ciudad: {sede.ciudad || "No especificada"}</div>
                </div>
                <div className="user-actions">
                  <button className="action-button-modern edit" onClick={() => fetchSedeDetails(sede.id)}>
                    <FaEdit />
                  </button>
                  <button className="action-button-modern delete" onClick={() => deleteSede(sede.id)}>
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>No hay sedes disponibles.</p>
          )}
        </div>

        {/* Paginación */}
        {filteredSedes.length > 0 && (
          <div className="pagination-container">
            <div className="pagination-info">{getItemRange()}</div>
            <div className="pagination-controls">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="pagination-arrow"
                aria-label="Página anterior"
              >
                <FaChevronLeft />
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="pagination-arrow"
                aria-label="Página siguiente"
              >
                <FaChevronRight />
              </button>
            </div>
            <div className="pagination-progress-bar">
              <div className="pagination-progress" style={{ width: `${(currentPage / totalPages) * 100}%` }}></div>
            </div>
          </div>
        )}

        {/* Modal para ver y editar detalles de la sede */}
        {showDetailModal && selectedSede && (
          <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-container modern-modal" onClick={(e) => e.stopPropagation()}>
              <button className="close-button" onClick={() => setShowDetailModal(false)}>
                &times;
              </button>
              <div className="modal-content">
                <h1 className="modal-title">Detalles de la sede</h1>
                <div className="input-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    value={selectedSede.nombre || ""}
                    onChange={(e) => setSelectedSede({ ...selectedSede, nombre: e.target.value })}
                    placeholder="Nombre"
                  />
                </div>
                <div className="input-group">
                  <label>Dirección</label>
                  <input
                    type="text"
                    value={selectedSede.direccion || ""}
                    onChange={(e) => setSelectedSede({ ...selectedSede, direccion: e.target.value })}
                    placeholder="Dirección"
                  />
                </div>
                <div className="input-group">
                  <label>Ciudad</label>
                  <input
                    type="text"
                    value={selectedSede.ciudad || ""}
                    onChange={(e) => setSelectedSede({ ...selectedSede, ciudad: e.target.value })}
                    placeholder="Ciudad"
                  />
                </div>
                <button className="create-button" onClick={() => editSede(selectedSede.id, selectedSede)}>
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para agregar nueva sede */}
        {showForm && (
          <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-container modern-modal" onClick={(e) => e.stopPropagation()}>
              <button className="close-button" onClick={() => setShowForm(false)}>
                &times;
              </button>
              <div className="modal-content">
                <h1 className="modal-title">Agregar Sede</h1>
                <div className="input-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    placeholder="Nombre de la sede"
                    value={newSede.nombre}
                    onChange={(e) => setNewSede({ ...newSede, nombre: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Dirección</label>
                  <input
                    type="text"
                    placeholder="Dirección"
                    value={newSede.direccion}
                    onChange={(e) => setNewSede({ ...newSede, direccion: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Ciudad</label>
                  <input
                    type="text"
                    placeholder="Ciudad"
                    value={newSede.ciudad}
                    onChange={(e) => setNewSede({ ...newSede, ciudad: e.target.value })}
                  />
                </div>
                <button className="create-button" onClick={addSede}>
                  Agregar
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

