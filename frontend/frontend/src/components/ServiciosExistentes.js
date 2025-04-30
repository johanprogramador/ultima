"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { FaServicestack, FaEdit, FaPlus, FaTrash, FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa"
import "../styles/ServiciosExistentes.css"

const ServiciosExistentes = () => {
  const [services, setServices] = useState([])
  const [filteredServices, setFilteredServices] = useState([])
  const [sedes, setSedes] = useState([])
  const [selectedService, setSelectedService] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [newService, setNewService] = useState({
    nombre: "",
    codigo_analitico: "",
    sede: "",
    color: "#FFFFFF"
  })
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "error",
  })
  const [confirmAlert, setConfirmAlert] = useState({
    show: false,
    message: "",
    positionsCount: 0,
    onConfirm: null,
    onCancel: null,
  })
  const [servicePositions, setServicePositions] = useState({}) // Nuevo estado para conteo de posiciones

  // Estados para búsqueda y paginación
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(6)
  const [totalPages, setTotalPages] = useState(1)

  // Función para obtener y contar posiciones por servicio
  const fetchServicePositions = useCallback(async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/posiciones/")
      const positionsData = Array.isArray(response.data) ? response.data : 
                          response.data.results ? response.data.results : 
                          response.data.posiciones ? response.data.posiciones : []
      
      const counts = {}
      positionsData.forEach(position => {
        if (position.servicio) {
          const serviceId = position.servicio.id || position.servicio
          counts[serviceId] = (counts[serviceId] || 0) + 1
        }
      })
      setServicePositions(counts)
    } catch (error) {
      console.error("Error al obtener posiciones:", error)
    }
  }, [])

  // Fetch the list of services
  const fetchServices = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/servicios/")
      const servicesData = Array.isArray(response.data) ? response.data : []
      setServices(servicesData)
      applyFilters(servicesData)
    } catch (error) {
      console.error("Error al obtener servicios:", error)
      setAlert({
        show: true,
        message: "Error al cargar servicios",
        type: "error",
      })
      setServices([])
      setFilteredServices([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch the list of sedes
  const fetchSedes = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/sede/")
      if (Array.isArray(response.data.sedes)) {
        setSedes(response.data.sedes)
      } else {
        console.error("La respuesta de sedes no tiene el formato esperado")
        setSedes([])
      }
    } catch (error) {
      console.error("Error al obtener sedes:", error)
      setAlert({
        show: true,
        message: "Error al cargar sedes",
        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Aplicar filtros a los servicios
  const applyFilters = (servicesData = services) => {
    let filtered = [...servicesData]

    if (searchTerm) {
      filtered = filtered.filter(
        (service) =>
          (service.nombre && service.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (service.codigo_analitico && service.codigo_analitico.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (service.sedes &&
            service.sedes.some((sede) => sede.nombre && sede.nombre.toLowerCase().includes(searchTerm.toLowerCase()))),
      )
    }

    setFilteredServices(filtered)
    setTotalPages(Math.ceil(filtered.length / itemsPerPage))
  }

  // Fetch service details
  const fetchServiceDetails = async (serviceId) => {
    setIsLoading(true)
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/servicios/${serviceId}/`)
      const serviceData = response.data

      setSelectedService({
        ...serviceData,
        sede: serviceData.sedes.length > 0 ? serviceData.sedes[0].id : "",
        color: serviceData.color || "#FFFFFF",
      })

      setShowDetailModal(true)
    } catch (error) {
      console.error("Error al obtener los detalles del servicio:", error)
      setAlert({
        show: true,
        message: "No se pudo cargar el servicio.",
        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Edit service
  const editService = async (serviceId, updatedServiceData) => {
    setIsLoading(true)
    try {
      if (!updatedServiceData.nombre) {
        setAlert({
          show: true,
          message: "El campo 'nombre' es obligatorio.",
          type: "error",
        })
        return
      }

      const payload = {
        nombre: updatedServiceData.nombre,
        codigo_analitico: updatedServiceData.codigo_analitico,
        sedes: updatedServiceData.sede ? [Number.parseInt(updatedServiceData.sede, 10)] : [],
        color: updatedServiceData.color || "#FFFFFF",
      }

      await axios.put(`http://127.0.0.1:8000/api/servicios/${serviceId}/`, payload)

      fetchServices()
      setShowDetailModal(false)
      
      setAlert({
        show: true,
        message: "Servicio editado exitosamente.",
        type: "success",
      })
    } catch (error) {
      console.error("Error al editar el servicio:", error)
      setAlert({
        show: true,
        message: "Hubo un error al editar el servicio.",
        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Delete service
  const deleteService = async (serviceId) => {
    setIsLoading(true)
    try {
      await axios.delete(`http://127.0.0.1:8000/api/servicios/${serviceId}/`)
      fetchServices()
      fetchServicePositions() // Actualizar conteo después de eliminar
      setAlert({
        show: true,
        message: "Servicio eliminado exitosamente.",
        type: "success",
      })
    } catch (error) {
      console.error("Error al eliminar el servicio:", error)
      setAlert({
        show: true,
        message: "Hubo un error al eliminar el servicio.",
        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Confirm delete with positions count
  const confirmDelete = async (serviceId) => {
    setIsLoading(true)
    try {
      const count = servicePositions[serviceId] || 0
      setConfirmAlert({
        show: true,
        message: "¿Estás seguro de que deseas eliminar este servicio?",
        positionsCount: count,
        onConfirm: () => {
          deleteService(serviceId)
          setConfirmAlert(prev => ({...prev, show: false}))
        },
        onCancel: () => setConfirmAlert(prev => ({...prev, show: false})),
      })
    } catch (error) {
      console.error("Error al confirmar eliminación:", error)
      setConfirmAlert({
        show: true,
        message: "¿Estás seguro de que deseas eliminar este servicio?",
        positionsCount: null,
        onConfirm: () => {
          deleteService(serviceId)
          setConfirmAlert(prev => ({...prev, show: false}))
        },
        onCancel: () => setConfirmAlert(prev => ({...prev, show: false})),
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Confirm save changes
  const confirmSaveChanges = (serviceId, updatedServiceData) => {
    setConfirmAlert({
      show: true,
      message: "¿Deseas guardar los cambios realizados?",
      positionsCount: null,
      onConfirm: () => {
        editService(serviceId, updatedServiceData)
        setConfirmAlert(prev => ({...prev, show: false}))
      },
      onCancel: () => setConfirmAlert(prev => ({...prev, show: false})),
    })
  }

  const addService = async () => {
    setIsLoading(true)
    if (!newService.nombre) {
      setAlert({
        show: true,
        message: "El campo 'nombre' es obligatorio.",
        type: "error",
      })
      setIsLoading(false)
      return
    }

    try {
      const payload = {
        nombre: newService.nombre,
        codigo_analitico: newService.codigo_analitico,
        sedes: newService.sede ? [Number.parseInt(newService.sede, 10)] : [],
        color: newService.color || "#FFFFFF",
      }

      await axios.post("http://127.0.0.1:8000/api/servicios/", payload)
      setShowForm(false)
      setNewService({
        nombre: "",
        codigo_analitico: "",
        sede: "",
        color: "#FFFFFF"
      })
      fetchServices()
      setAlert({
        show: true,
        message: "Servicio agregado exitosamente.",
        type: "success",
      })
    } catch (error) {
      console.error("Error al agregar el servicio:", error)
      setAlert({
        show: true,
        message: "Hubo un error al agregar el servicio.",
        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Obtener los servicios para la página actual
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredServices.slice(startIndex, endIndex)
  }

  // Calcular el rango de elementos mostrados
  const getItemRange = () => {
    if (filteredServices.length === 0) return "No hay resultados"
    const startItem = (currentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(startItem + itemsPerPage - 1, filteredServices.length)
    return `Mostrando ${startItem} a ${endItem} de ${filteredServices.length} resultados`
  }

  // Load services and sedes when component mounts
  useEffect(() => {
    const loadInitialData = async () => {
      await fetchServices()
      await fetchSedes()
      await fetchServicePositions()
    }
    loadInitialData()
  }, [])

  // Efecto para aplicar filtros cuando cambia el término de búsqueda
  useEffect(() => {
    applyFilters()
    setCurrentPage(1)
  }, [searchTerm])

  // Efecto para cerrar la alerta automáticamente después de 3 segundos
  useEffect(() => {
    if (alert.show) {
      const timer = setTimeout(() => {
        setAlert({ ...alert, show: false })
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [alert])

  // Manejador para cerrar el modal cuando se hace clic fuera de él
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowDetailModal(false)
      setShowForm(false)
    }
  }

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

  // Componente de alerta de confirmación
  const ConfirmAlert = ({ message, positionsCount, onConfirm, onCancel }) => {
    return (
      <div className="alert-overlay">
        <div className="modal-container confirm-container">
          <div className="confirm-modal">
            <p style={{ 
              whiteSpace: 'pre-line', 
              textAlign: 'center',
              marginBottom: '15px',
              lineHeight: '1.5',
              fontSize: '16px'
            }}>
              {message}
            </p>
            
            {positionsCount !== null && (
              <div className="positions-info">
                {positionsCount > 0 ? (
                  <div className="positions-warning">
                    <p style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
                      ⚠️ Este servicio tiene {positionsCount} posición(es) asociada(s)
                    </p>
                  </div>
                ) : (
                  <p style={{ color: '#666', fontStyle: 'italic' }}>
                    Este servicio no tiene posiciones asociadas
                  </p>
                )}
              </div>
            )}

            <div className="confirm-buttons">
              <button className="confirm-button cancel" onClick={onCancel}>
                Cancelar
              </button>
              <button className="alert-button accept" onClick={onConfirm}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="records-container">
      <div className="user-card">
        <div className="card-header">
          <h2>Servicios existentes</h2>
          <button 
            className="add-user-btn" 
            onClick={() => setShowForm(true)}
            disabled={isLoading}
          >
            <FaPlus />
          </button>
        </div>

        {alert.show && (
          <AlertModal 
            message={alert.message} 
            type={alert.type} 
            onClose={() => setAlert({ ...alert, show: false })} 
          />
        )}

        {confirmAlert.show && (
          <ConfirmAlert
            message={confirmAlert.message}
            positionsCount={confirmAlert.positionsCount}
            onConfirm={confirmAlert.onConfirm}
            onCancel={confirmAlert.onCancel}
          />
        )}

        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
          </div>
        )}

        <div className="search-container">
          <div className="search-input-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar servicios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="user-list">
          {getCurrentPageItems().length > 0 ? (
            getCurrentPageItems().map((service) => (
              <div key={service.id} className="user-item">
                <div className="user-avatar">
                  <FaServicestack />
                </div>
                <div 
                  className="user-info" 
                  onClick={() => !isLoading && fetchServiceDetails(service.id)}
                  style={{ cursor: isLoading ? "not-allowed" : "pointer" }}
                >
                  <div className="user-name">{service.nombre}</div>
                  <div className="color-box" style={{ backgroundColor: service.color || "#ccc" }}></div>
                  <div className="user-access">
                    Sedes:{" "}
                    {service.sedes && service.sedes.length > 0
                      ? service.sedes
                          .map((sede) => sede.nombre)
                          .join(", ")
                      : "No asignadas"}
                  </div>
                </div>
                <div className="user-actions">
                  <button 
                    className="action-button-modern edit" 
                    onClick={() => !isLoading && fetchServiceDetails(service.id)}
                    disabled={isLoading}
                  >
                    <FaEdit />
                  </button>
                  <button 
                    className="action-button-modern delete" 
                    onClick={() => !isLoading && confirmDelete(service.id)}
                    disabled={isLoading}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>{isLoading ? "Cargando..." : "No hay servicios disponibles."}</p>
          )}
        </div>

        {filteredServices.length > 0 && (
          <div className="pagination-container">
            <div className="pagination-info">{getItemRange()}</div>
            <div className="pagination-controls">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || isLoading}
                className="pagination-arrow"
                aria-label="Página anterior"
              >
                <FaChevronLeft />
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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

        {showDetailModal && selectedService && (
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
                <h1 className="modal-title">Detalles del servicio</h1>
                <div className="input-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    value={selectedService.nombre || ""}
                    onChange={(e) => setSelectedService({ ...selectedService, nombre: e.target.value })}
                    placeholder="Nombre"
                    disabled={isLoading}
                    className={!selectedService.nombre?.trim() ? "input-error" : ""}
                  />
                </div>
                <div className="input-group">
                  <label>Código analítico</label>
                  <input
                    type="text"
                    value={selectedService.codigo_analitico || ""}
                    onChange={(e) => setSelectedService({ ...selectedService, codigo_analitico: e.target.value })}
                    placeholder="Código analítico"
                    disabled={isLoading}
                  />
                </div>
                <div className="input-group">
                  <label>Seleccionar color</label>
                  <input
                    type="color"
                    value={selectedService.color || "#000000"}
                    onChange={(e) => setSelectedService({ ...selectedService, color: e.target.value })}
                    disabled={isLoading}
                  />
                </div>

                <div className="input-group">
                  <label>Sede</label>
                  <select
                    value={selectedService.sede || ""}
                    onChange={(e) => setSelectedService({ ...selectedService, sede: e.target.value })}
                    disabled={isLoading}
                  >
                    <option value="">Seleccionar sede</option>
                    {sedes.map((sede) => (
                      <option key={sede.id} value={sede.id}>
                        {sede.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className="create-button"
                  onClick={() => confirmSaveChanges(selectedService.id, selectedService)}
                  disabled={isLoading}
                >
                  {isLoading ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        )}

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
                <h1 className="modal-title">Agregar Servicio</h1>
                <div className="input-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    placeholder="Nombre del servicio"
                    value={newService.nombre}
                    onChange={(e) => setNewService({ ...newService, nombre: e.target.value })}
                    disabled={isLoading}
                    className={!newService.nombre?.trim() ? "input-error" : ""}
                  />
                </div>
                <div className="input-group">
                  <label>Código analítico</label>
                  <input
                    type="text"
                    placeholder="Código analítico"
                    value={newService.codigo_analitico}
                    onChange={(e) => setNewService({ ...newService, codigo_analitico: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
                <div className="input-group">
                  <label>Seleccionar color</label>
                  <input
                    type="color"
                    value={newService.color || "#000000"}
                    onChange={(e) => setNewService({ ...newService, color: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
                <div className="input-group">
                  <label>Sede</label>
                  <select
                    value={newService.sede || ""}
                    onChange={(e) => setNewService({ ...newService, sede: e.target.value })}
                    disabled={isLoading}
                  >
                    <option value="">Seleccionar sede</option>
                    {sedes.map((sede) => (
                      <option key={sede.id} value={sede.id}>
                        {sede.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <button 
                  className="create-button" 
                  onClick={addService}
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

export default ServiciosExistentes