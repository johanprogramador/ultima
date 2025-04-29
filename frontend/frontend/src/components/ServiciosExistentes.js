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
  const [newService, setNewService] = useState({
    nombre: "",
    codigo_analitico: "",
    sede: "",
  })
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "error",
  })
  const [confirmAlert, setConfirmAlert] = useState({
    show: false,
    message: "",
    onConfirm: null,
    onCancel: null,
  })

  // Estados para búsqueda y paginación
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(6)
  const [totalPages, setTotalPages] = useState(1)

  // Fetch the list of services
  const fetchServices = useCallback(async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/servicios/")
      console.log(" Lista actualizada de servicios:", response.data)
      const servicesData = Array.isArray(response.data) ? response.data : []
      setServices(servicesData)
      applyFilters(servicesData)
    } catch (error) {
      console.error("Error al obtener servicios:", error)
      setServices([])
      setFilteredServices([])
    }
  }, [])

  // Fetch the list of sedes
  const fetchSedes = useCallback(async () => {
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
    }
  }

  // Edit service
  const editService = async (serviceId, updatedServiceData) => {
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

      console.log("📢 Enviando datos a la API (PUT):", payload)

      await axios.put(`http://127.0.0.1:8000/api/servicios/${serviceId}/`, payload)

      setTimeout(() => {
        fetchServices()
        setShowDetailModal(false)
      }, 200)

      setAlert({
        show: true,
        message: "Servicio editado exitosamente.",
        type: "success",
      })
    } catch (error) {
      console.error("🚨 Error al editar el servicio:", error)
      setAlert({
        show: true,
        message: "Hubo un error al editar el servicio.",
        type: "error",
      })
    }
  }

  // Delete service
  const deleteService = async (serviceId) => {
    try {
      await axios.delete(`http://127.0.0.1:8000/api/servicios/${serviceId}/`)
      fetchServices()
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
    }
  }

  // Confirm delete
  const confirmDelete = (serviceId) => {
    setConfirmAlert({
      show: true,
      message: "¿Estás seguro de que deseas eliminar este servicio?",
      onConfirm: () => {
        deleteService(serviceId)
        setConfirmAlert({ ...confirmAlert, show: false })
      },
      onCancel: () => setConfirmAlert({ ...confirmAlert, show: false }),
    })
  }

  // Confirm save changes
  const confirmSaveChanges = (serviceId, updatedServiceData) => {
    setConfirmAlert({
      show: true,
      message: "¿Deseas guardar los cambios realizados?",
      onConfirm: () => {
        editService(serviceId, updatedServiceData)
        setConfirmAlert({ ...confirmAlert, show: false })
      },
      onCancel: () => setConfirmAlert({ ...confirmAlert, show: false }),
    })
  }

  const addService = async () => {
    if (!newService.nombre) {
      setAlert({
        show: true,
        message: "El campo 'nombre' es obligatorio.",
        type: "error",
      })
      return
    }

    try {
      const payload = {
        nombre: newService.nombre,
        codigo_analitico: newService.codigo_analitico,
        sedes: newService.sede ? [Number.parseInt(newService.sede, 10)] : [],
        color: newService.color || "#FFFFFF",
      }

      console.log("Enviando datos al backend:", payload)

      await axios.post("http://127.0.0.1:8000/api/servicios/", payload)
      setShowForm(false)
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
    const startItem = (currentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(startItem + itemsPerPage - 1, filteredServices.length)
    return `Mostrando ${startItem} a ${endItem} de ${filteredServices.length} resultados`
  }

  // Load services and sedes when component mounts
  useEffect(() => {
    fetchServices()
    fetchSedes()
  }, [fetchServices, fetchSedes])

  // Efecto para aplicar filtros cuando cambia el término de búsqueda
  useEffect(() => {
    applyFilters()
    setCurrentPage(1)
  }, [searchTerm])

  // Efecto para cerrar la alerta automáticamente después de 1 segundo
  useEffect(() => {
    if (alert.show) {
      const timer = setTimeout(() => {
        setAlert({ ...alert, show: false })
      }, 1000)
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
  const ConfirmAlert = ({ message, onConfirm, onCancel }) => {
    return (
      <div className="alert-overlay">
        <div className="modal-container confirm-container">
        <div className="confirm-modal">
        <p>{message}</p>
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
          <button className="add-user-btn" onClick={() => setShowForm(true)}>
            <FaPlus />
          </button>
        </div>

        {/* Mensajes de alerta */}
        {alert.show && (
          <AlertModal message={alert.message} type={alert.type} onClose={() => setAlert({ ...alert, show: false })} />
        )}

        {/* Alerta de confirmación */}
        {confirmAlert.show && (
          <ConfirmAlert
            message={confirmAlert.message}
            onConfirm={confirmAlert.onConfirm}
            onCancel={confirmAlert.onCancel}
          />
        )}

        {/* Buscador */}
        <div className="search-container">
          <div className="search-input-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar servicios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* Lista de servicios */}
        <div className="user-list">
          {getCurrentPageItems().length > 0 ? (
            getCurrentPageItems().map((service) => (
              <div key={service.id} className="user-item">
                <div className="user-avatar">
                  <FaServicestack />
                </div>
                <div className="user-info" onClick={() => fetchServiceDetails(service.id)}>
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
                  <button className="action-button-modern edit" onClick={() => fetchServiceDetails(service.id)}>
                    <FaEdit />
                  </button>
                  <button className="action-button-modern delete" onClick={() => confirmDelete(service.id)}>
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>No hay servicios disponibles.</p>
          )}
        </div>

        {/* Paginación */}
        {filteredServices.length > 0 && (
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

        {/* Modal para ver y editar detalles del servicio */}
        {showDetailModal && selectedService && (
          <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-container modern-modal" onClick={(e) => e.stopPropagation()}>
              <button className="close-button" onClick={() => setShowDetailModal(false)}>
                &times;
              </button>
              <div className="modal-content">
                <h1 className="modal-title">Detalles del servicio</h1>
                <div className="input-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    value={selectedService.nombre || ""}
                    onChange={(e) => setSelectedService({ ...selectedService, nombre: e.target.value })}
                    placeholder="Nombre"
                  />
                </div>
                <div className="input-group">
                  <label>Código analítico</label>
                  <input
                    type="text"
                    value={selectedService.codigo_analitico || ""}
                    onChange={(e) => setSelectedService({ ...selectedService, codigo_analitico: e.target.value })}
                    placeholder="Código analítico"
                  />
                </div>
                <div className="input-group">
                  <label>Seleccionar color</label>
                  <input
                    type="color"
                    value={selectedService.color || "#000000"}
                    onChange={(e) => setSelectedService({ ...selectedService, color: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>Sede</label>
                  <select
                    value={selectedService.sede || ""}
                    onChange={(e) => setSelectedService({ ...selectedService, sede: e.target.value })}
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
                >
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para agregar nuevo servicio */}
        {showForm && (
          <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-container modern-modal" onClick={(e) => e.stopPropagation()}>
              <button className="close-button" onClick={() => setShowForm(false)}>
                &times;
              </button>
              <div className="modal-content">
                <h1 className="modal-title">Agregar Servicio</h1>
                <div className="input-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    placeholder="Nombre del servicio"
                    value={newService.nombre}
                    onChange={(e) => setNewService({ ...newService, nombre: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Código analítico</label>
                  <input
                    type="text"
                    placeholder="Código analítico"
                    value={newService.codigo_analitico}
                    onChange={(e) => setNewService({ ...newService, codigo_analitico: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Seleccionar color</label>
                  <input
                    type="color"
                    value={newService.color || "#000000"}
                    onChange={(e) => setNewService({ ...newService, color: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Sede</label>
                  <select
                    value={newService.sede || ""}
                    onChange={(e) => setNewService({ ...newService, sede: e.target.value })}
                  >
                    <option value="">Seleccionar sede</option>
                    {sedes.map((sede) => (
                      <option key={sede.id} value={sede.id}>
                        {sede.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="create-button" onClick={addService}>
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

export default ServiciosExistentes