"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import {
  FaEdit,
  FaPlus,
  FaTrash,
  FaDesktop,
  FaTabletAlt,
  FaMobileAlt,
  FaServer,
  FaArchive,
  FaLaptop,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa"
import "../styles/Devices.css"

// Componente principal
const Dispositivos = () => {
  const [dispositivos, setDispositivos] = useState([])
  const [filteredDispositivos, setFilteredDispositivos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [newDevice, setNewDevice] = useState(initialDeviceState())
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [posiciones, setPosiciones] = useState([])
  const [sedes, setSedes] = useState([])
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "error", // Puede ser "error" o "success"
  })
  const [isSubmitting, setIsSubmitting] = useState(false) // Estado para controlar envíos múltiples

  // Estados para búsqueda y paginación
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)

  // Estado inicial de un dispositivo
  function initialDeviceState() {
    return {
      tipo: "COMPUTADOR",
      marca: "DELL",
      modelo: "",
      serial: "",
      estado: "BUENO",
      capacidad_memoria_ram: "8GB",
      capacidad_disco_duro: "500GB",
      tipo_disco_duro: "HDD",
      tipo_memoria_ram: "DDR4",
      ubicacion: "SEDE",
      razon_social: "",
      regimen: "ECCC",
      placa_cu: "",
      posicion: null, // Clave foránea a Posicion
      sede: null, // Clave foránea a Sede
      procesador: "", // Agregado
      sistema_operativo: "", // Agregado
      proveedor: "",
    }
  }

  // Obtener la lista de dispositivos
  const fetchDispositivos = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/dispositivos/")
      setDispositivos(response.data)
      applyFilters(response.data)
    } catch (error) {
      console.error("Error al obtener dispositivos:", error)
      setDispositivos([])
      setFilteredDispositivos([])
    }
  }

  // Obtener las posiciones
  const fetchPosiciones = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/posiciones/")
      if (response.data && Array.isArray(response.data.results)) {
        setPosiciones(response.data.results)
      } else {
        console.error("La respuesta de posiciones no tiene el formato esperado:", response.data)
        setPosiciones([])
      }
    } catch (error) {
      console.error("Error al obtener posiciones:", error)
      setPosiciones([])
    }
  }

  // Obtener las sedes
  const fetchSedes = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/sede/")
      if (response.data.sedes && Array.isArray(response.data.sedes)) {
        setSedes(response.data.sedes)
      } else {
        setSedes([])
      }
    } catch (error) {
      console.error("Error al obtener sedes:", error)
      setSedes([])
    }
  }

  // Aplicar filtros a los dispositivos
  const applyFilters = (devicesData = dispositivos) => {
    let filtered = [...devicesData]

    if (searchTerm) {
      filtered = filtered.filter(
        (device) =>
          (device.tipo && device.tipo.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (device.marca && device.marca.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (device.modelo && device.modelo.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (device.serial && device.serial.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (device.estado && device.estado.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (device.placa_cu && device.placa_cu.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (device.sistema_operativo && device.sistema_operativo.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    setFilteredDispositivos(filtered)
    setTotalPages(Math.ceil(filtered.length / itemsPerPage))
  }

  // Obtener los dispositivos para la página actual
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredDispositivos.slice(startIndex, endIndex)
  }

  // Calcular el rango de elementos mostrados
  const getItemRange = () => {
    const startItem = (currentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(startItem + itemsPerPage - 1, filteredDispositivos.length)
    return `Mostrando ${startItem} a ${endItem} de ${filteredDispositivos.length} resultados`
  }

  const validateDevice = (device) => {
    if (!device.modelo || !device.serial) {
      setAlert({
        show: true,
        message: "El modelo y el serial son campos obligatorios.",
        type: "error",
      })
      return false
    }
    return true
  }

  // Crear un nuevo dispositivo
  const addDevice = async () => {
    if (isSubmitting) return // Evitar múltiples envíos
    if (!validateDevice(newDevice)) return
    
    setIsSubmitting(true)
    try {
      await axios.post("http://127.0.0.1:8000/api/dispositivos/", newDevice)
      fetchDispositivos()
      setShowForm(false)
      setNewDevice(initialDeviceState())
      setAlert({
        show: true,
        message: "Dispositivo agregado exitosamente.",
        type: "success",
      })
    } catch (error) {
      console.error("Error al agregar el dispositivo:", error)
      setAlert({
        show: true,
        message: "Hubo un error al agregar el dispositivo.",
        type: "error",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Actualizar un dispositivo
  const updateDevice = async () => {
    if (isSubmitting) return // Evitar múltiples envíos
    if (!validateDevice(selectedDevice)) return

    setIsSubmitting(true)
    try {
      // Clonar el dispositivo y limpiar los datos incorrectos
      const cleanDeviceData = { ...selectedDevice }

      if (!cleanDeviceData.posicion) {
        delete cleanDeviceData.posicion // Eliminar si está vacío
      } else if (typeof cleanDeviceData.posicion === 'string') {
        cleanDeviceData.posicion = Number.parseInt(cleanDeviceData.posicion) // Asegurar número
      }

      if (!cleanDeviceData.sede) {
        delete cleanDeviceData.sede // Eliminar si está vacío
      } else if (typeof cleanDeviceData.sede === 'string') {
        cleanDeviceData.sede = Number.parseInt(cleanDeviceData.sede) // Asegurar número
      }

      console.log("Enviando datos corregidos:", cleanDeviceData)

      await axios.put(`http://127.0.0.1:8000/api/dispositivos/${selectedDevice.id}/`, cleanDeviceData)
      await fetchDispositivos() // Esperar a que se actualice la lista
      setShowDetailModal(false)
      setAlert({
        show: true,
        message: "Dispositivo actualizado exitosamente.",
        type: "success",
      })
    } catch (error) {
      console.error("Error al actualizar el dispositivo:", error.response?.data || error)
      setAlert({
        show: true,
        message: "Hubo un error al actualizar el dispositivo.",
        type: "error",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Eliminar un dispositivo
  const deleteDevice = async (deviceId) => {
    if (isSubmitting) return // Evitar múltiples envíos
    
    setIsSubmitting(true)
    try {
      await axios.delete(`http://127.0.0.1:8000/api/dispositivos/${deviceId}/`)
      await fetchDispositivos() // Esperar a que se actualice la lista
      setAlert({
        show: true,
        message: "Dispositivo eliminado exitosamente.",
        type: "success",
      })
    } catch (error) {
      console.error("Error al eliminar el dispositivo:", error)
      setAlert({
        show: true,
        message: "Hubo un error al eliminar el dispositivo.",
        type: "error",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Obtener el ícono según el tipo de dispositivo
  const getDeviceIcon = (tipo) => {
    switch (tipo) {
      case "COMPUTADOR":
        return <FaLaptop />
      case "DESKTOP":
        return <FaArchive />
      case "MONITOR":
        return <FaDesktop />
      case "TABLET":
        return <FaTabletAlt />
      case "MOVIL":
        return <FaMobileAlt />
      default:
        return <FaServer />
    }
  }

  // Efecto para cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      await fetchDispositivos()
      await fetchPosiciones()
      await fetchSedes()
    }
    fetchData()
  }, [])

  // Efecto para aplicar filtros cuando cambia el término de búsqueda
  useEffect(() => {
    applyFilters()
    setCurrentPage(1) // Resetear a la primera página cuando cambia la búsqueda
  }, [searchTerm])

  // Efecto para cerrar la alerta automáticamente después de 1 segundo
  useEffect(() => {
    if (alert.show) {
      const timer = setTimeout(() => {
        setAlert({ ...alert, show: false })
      }, 1000) // Cerrar la alerta después de 1 segundo
      return () => clearTimeout(timer) // Limpiar el timer si el componente se desmonta
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

  return (
    <div>
      <div className="user-card">
        <div className="card-header">
          <h2>Gestión de Dispositivos</h2>
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
              placeholder="Buscar dispositivos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* Lista de dispositivos */}
        <DeviceList
          dispositivos={getCurrentPageItems()}
          setSelectedDevice={setSelectedDevice}
          setShowDetailModal={setShowDetailModal}
          deleteDevice={deleteDevice}
          getDeviceIcon={getDeviceIcon}
          isSubmitting={isSubmitting}
        />

        {/* Paginación */}
        {filteredDispositivos.length > 0 && (
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

        {/* Modal para agregar dispositivo */}
        {showForm && (
          <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-container modern-modal" onClick={(e) => e.stopPropagation()}>
              <button className="close-button" onClick={() => setShowForm(false)}>
                &times;
              </button>
              <div className="modal-content">
                <h1 className="modal-title">Agregar Dispositivo</h1>
                <DeviceForm
                  device={newDevice}
                  setDevice={setNewDevice}
                  onSubmit={addDevice}
                  posiciones={posiciones}
                  sedes={sedes}
                  isSubmitting={isSubmitting}
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal para editar dispositivo */}
        {showDetailModal && selectedDevice && (
          <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-container modern-modal" onClick={(e) => e.stopPropagation()}>
              <button className="close-button" onClick={() => setShowDetailModal(false)}>
                &times;
              </button>
              <div className="modal-content">
                <h1 className="modal-title">Editar Dispositivo</h1>
                <DeviceForm
                  device={selectedDevice}
                  setDevice={setSelectedDevice}
                  onSubmit={updateDevice}
                  posiciones={posiciones}
                  sedes={sedes}
                  isSubmitting={isSubmitting}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Componente para la lista de dispositivos
const DeviceList = ({ dispositivos, setSelectedDevice, setShowDetailModal, deleteDevice, getDeviceIcon, isSubmitting }) => (
  <div className="user-list">
    {dispositivos.length > 0 ? (
      dispositivos.map((device) => (
        <div key={device.id} className="user-item">
          <div className="user-avatar">{getDeviceIcon(device.tipo)}</div>
          <div
            className="user-info"
            onClick={() => {
              setSelectedDevice(device)
              setShowDetailModal(true)
            }}
          >
            <div className="user-name">
              {device.tipo} - {device.marca} {device.modelo}
            </div>
            <div className="user-access">Serial: {device.serial}</div>
          </div>
          <div className="user-actions">
            <button
              className="action-button-modern edit"
              onClick={() => {
                setSelectedDevice(device)
                setShowDetailModal(true)
              }}
              disabled={isSubmitting}
            >
              <FaEdit />
            </button>
            <button 
              className="action-button-modern delete" 
              onClick={() => deleteDevice(device.id)}
              disabled={isSubmitting}
            >
              <FaTrash />
            </button>
          </div>
        </div>
      ))
    ) : (
      <p>No hay dispositivos disponibles.</p>
    )}
  </div>
)

// Componente para el formulario de dispositivos
const DeviceForm = ({ device, setDevice, onSubmit, posiciones, sedes, isSubmitting }) => {
  if (!device) return null

  const handleSubmit = (e) => {
    e.preventDefault() // Prevenir el comportamiento por defecto del formulario
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit}>
      {renderInput("Modelo", "modelo", device, setDevice)}
      {renderInput("Serial", "serial", device, setDevice)}
      {renderInput("Placa CU", "placa_cu", device, setDevice)}
      {renderSelect("Tipo", "tipo", device, setDevice, [
        { value: "COMPUTADOR", label: "Computador" },
        { value: "DESKTOP", label: "Desktop" },
        { value: "MONITOR", label: "Monitor" },
        { value: "TABLET", label: "Tablet" },
        { value: "MOVIL", label: "Celular" },
      ])}
      {renderSelect("Sistema Operativo", "sistema_operativo", device, setDevice, [
        { value: "NA", label: "No Aplica" },
        { value: "SERVER", label: "Server" },
        { value: "WIN10", label: "Windows 10" },
        { value: "WIN11", label: "Windows 11" },
        { value: "WIN7", label: "Windows 7" },
        { value: "VACIO", label: "Sin Sistema Operativo" },
      ])}
      {renderInput("Procesador", "procesador", device, setDevice)}
      {renderInput("Proveedor", "proveedor", device, setDevice)}
      {renderSelect("Marca", "marca", device, setDevice, [
        { value: "DELL", label: "Dell" },
        { value: "HP", label: "HP" },
        { value: "LENOVO", label: "Lenovo" },
        { value: "APPLE", label: "Apple" },
        { value: "SAMSUNG", label: "Samsung" },
      ])}
      {renderSelect("Estado", "estado", device, setDevice, [
        { value: "REPARAR", label: "En reparación" },
        { value: "BUENO", label: "Buen estado" },
        { value: "PERDIDO", label: "Perdido/robado" },
        { value: "COMPRADO", label: "Comprado" },
        { value: "MALO", label: "Mal estado" },
      ])}
      {renderSelect("Regimen", "regimen", device, setDevice, [
        { value: "ECCC", label: "ECCC" },
        { value: "ECOL", label: "ECOL" },
        { value: "CNC", label: "CNC" },
      ])}
      {renderSelect("Tipo de Disco Duro", "tipo_disco_duro", device, setDevice, [
        { value: "HDD", label: "HDD (Disco Duro Mecánico)" },
        { value: "SSD", label: "SSD (Disco de Estado Sólido)" },
        { value: "HYBRID", label: "Híbrido (HDD + SSD)" },
      ])}
      {renderSelect("Capacidad de Disco Duro", "capacidad_disco_duro", device, setDevice, [
        { value: "120GB", label: "120 GB" },
        { value: "250GB", label: "250 GB" },
        { value: "500GB", label: "500 GB" },
        { value: "1TB", label: "1 TB" },
        { value: "2TB", label: "2 TB" },
        { value: "4TB", label: "4 TB" },
        { value: "8TB", label: "8 TB" },
      ])}
      {renderSelect("Tipo de Memoria RAM", "tipo_memoria_ram", device, setDevice, [
        { value: "DDR", label: "DDR" },
        { value: "DDR2", label: "DDR2" },
        { value: "DDR3", label: "DDR3" },
        { value: "DDR4", label: "DDR4" },
        { value: "LPDDR4", label: "LPDDR4" },
        { value: "LPDDR5", label: "LPDDR5" },
      ])}
      {renderSelect("Capacidad de Memoria RAM", "capacidad_memoria_ram", device, setDevice, [
        { value: "2GB", label: "2 GB" },
        { value: "4GB", label: "4 GB" },
        { value: "8GB", label: "8 GB" },
        { value: "16GB", label: "16 GB" },
        { value: "32GB", label: "32 GB" },
        { value: "64GB", label: "64 GB" },
      ])}
      {renderSelect("Ubicación", "ubicacion", device, setDevice, [
        { value: "CASA", label: "Casa" },
        { value: "CLIENTE", label: "Cliente" },
        { value: "SEDE", label: "Sede" },
        { value: "OTRO", label: "Otro" },
      ])}
      {renderInput("Razón Social", "razon_social", device, setDevice)}
      {renderSelect(
        "Posición",
        "posicion",
        device,
        setDevice,
        posiciones.map((pos) => ({
          value: pos.id,
          label: pos.nombre,
        })),
      )}
      {renderSelect(
        "Sede",
        "sede",
        device,
        setDevice,
        Array.isArray(sedes)
          ? sedes.map((sede) => ({
              value: sede.id,
              label: sede.nombre,
            }))
          : [],
      )}

      <button 
        type="submit" 
        className="create-button" 
        disabled={isSubmitting}
      >
        {isSubmitting ? "Procesando..." : (device.id ? "Guardar cambios" : "Agregar")}
      </button>
    </form>
  )
}

// Función para renderizar un input
const renderInput = (label, field, device, setDevice) => (
  <div className="input-group">
    <label>{label}</label>
    <input
      type="text"
      value={device[field] || ""}
      onChange={(e) => setDevice({ ...device, [field]: e.target.value })}
      placeholder={label}
    />
  </div>
)

// Función para renderizar un select
const renderSelect = (label, field, device, setDevice, options) => (
  <div className="input-group">
    <label>{label}</label>
    <select value={device[field] || ""} onChange={(e) => setDevice({ ...device, [field]: e.target.value || null })}>
      <option value="">Seleccione una opción</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
)

export default Dispositivos
