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

// Configura axios para incluir el token en todas las peticiones
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, error => {
  return Promise.reject(error)
})

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
    type: "error",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)

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
      posicion: null,
      sede: null,
      procesador: "I5_6500",
      sistema_operativo: "WIN10",
      proveedor: "",
      estado_propiedad: "PROPIO",
      usuario_asignado: null,
      disponible: "DISPONIBLE"
    }
  }

  const handleApiError = (error) => {
    console.error("API Error:", error)
    if (error.response?.status === 401) {
      window.location.href = '/login'
    }
    return error.response?.data || { error: "Error de conexión con el servidor" }
  }

  const fetchDispositivos = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/dispositivos/")
      setDispositivos(response.data)
      applyFilters(response.data)
    } catch (error) {
      const apiError = handleApiError(error)
      setAlert({
        show: true,
        message: apiError.error || "Error al obtener dispositivos",
        type: "error"
      })
    }
  }

  const fetchPosiciones = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/posiciones/")
      if (response.data && Array.isArray(response.data.results)) {
        setPosiciones(response.data.results)
      } else {
        console.error("Formato de respuesta inesperado:", response.data)
        setPosiciones([])
      }
    } catch (error) {
      const apiError = handleApiError(error)
      setAlert({
        show: true,
        message: apiError.error || "Error al obtener posiciones",
        type: "error"
      })
    }
  }

  const fetchSedes = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/sede/")
      if (response.data.sedes && Array.isArray(response.data.sedes)) {
        setSedes(response.data.sedes)
      } else {
        setSedes([])
      }
    } catch (error) {
      const apiError = handleApiError(error)
      setAlert({
        show: true,
        message: apiError.error || "Error al obtener sedes",
        type: "error"
      })
    }
  }

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

  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredDispositivos.slice(startIndex, endIndex)
  }

  const getItemRange = () => {
    const startItem = (currentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(startItem + itemsPerPage - 1, filteredDispositivos.length)
    return `Mostrando ${startItem} a ${endItem} de ${filteredDispositivos.length} resultados`
  }

  const validateDevice = (device) => {
    const errors = {}
    
    if (!device.modelo?.trim()) errors.modelo = "El modelo es obligatorio"
    if (!device.serial?.trim()) errors.serial = "El serial es obligatorio"
    if (!device.estado_propiedad?.trim()) errors.estado_propiedad = "El estado de propiedad es obligatorio"
    
    const validProcessors = ["I5_6500", "I5_7500", "I5_8400T", "I5_8500", "I5_10TH", "I5_11TH", "I5_12TH"]
    if (!validProcessors.includes(device.procesador)) {
      errors.procesador = "Procesador no válido"
    }
    
    if (Object.keys(errors).length > 0) {
      setAlert({
        show: true,
        message: Object.values(errors).join(", "),
        type: "error"
      })
      return false
    }
    return true
  }

  const addDevice = async () => {
    if (isSubmitting) return
    if (!validateDevice(newDevice)) return
    
    setIsSubmitting(true)
    try {
      await axios.post("http://127.0.0.1:8000/api/dispositivos/", newDevice)
      fetchDispositivos()
      setShowForm(false)
      setNewDevice(initialDeviceState())
      setAlert({
        show: true,
        message: "Dispositivo agregado exitosamente",
        type: "success"
      })
    } catch (error) {
      const apiError = handleApiError(error)
      setAlert({
        show: true,
        message: apiError.error || "Error al agregar dispositivo",
        type: "error"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateDevice = async () => {
    if (isSubmitting) return
    if (!validateDevice(selectedDevice)) return

    setIsSubmitting(true)
    try {
      const cleanDeviceData = { 
        ...selectedDevice,
        posicion: selectedDevice.posicion || null,
        sede: selectedDevice.sede || null,
        usuario_asignado: selectedDevice.usuario_asignado || null
      }

      await axios.put(
        `http://127.0.0.1:8000/api/dispositivos/${selectedDevice.id}/`,
        cleanDeviceData
      )
      
      await fetchDispositivos()
      setShowDetailModal(false)
      setAlert({
        show: true,
        message: "Dispositivo actualizado exitosamente",
        type: "success"
      })
    } catch (error) {
      const apiError = handleApiError(error)
      setAlert({
        show: true,
        message: apiError.error || "Error al actualizar dispositivo",
        type: "error"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteDevice = async (deviceId) => {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    try {
      await axios.delete(`http://127.0.0.1:8000/api/dispositivos/${deviceId}/`)
      await fetchDispositivos()
      setAlert({
        show: true,
        message: "Dispositivo eliminado exitosamente",
        type: "success"
      })
    } catch (error) {
      const apiError = handleApiError(error)
      setAlert({
        show: true,
        message: apiError.error || "Error al eliminar dispositivo",
        type: "error"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getDeviceIcon = (tipo) => {
    switch (tipo) {
      case "COMPUTADOR": return <FaLaptop />
      case "DESKTOP": return <FaArchive />
      case "MONITOR": return <FaDesktop />
      case "TABLET": return <FaTabletAlt />
      case "MOVIL": return <FaMobileAlt />
      default: return <FaServer />
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      await fetchDispositivos()
      await fetchPosiciones()
      await fetchSedes()
    }
    fetchData()
  }, [])

  useEffect(() => {
    applyFilters()
    setCurrentPage(1)
  }, [searchTerm])

  useEffect(() => {
    if (alert.show) {
      const timer = setTimeout(() => {
        setAlert({ ...alert, show: false })
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [alert])

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowDetailModal(false)
      setShowForm(false)
    }
  }

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

        {alert.show && (
          <AlertModal 
            message={alert.message} 
            type={alert.type} 
            onClose={() => setAlert({ ...alert, show: false })} 
          />
        )}

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

        <DeviceList
          dispositivos={getCurrentPageItems()}
          setSelectedDevice={setSelectedDevice}
          setShowDetailModal={setShowDetailModal}
          deleteDevice={deleteDevice}
          getDeviceIcon={getDeviceIcon}
          isSubmitting={isSubmitting}
        />

        {filteredDispositivos.length > 0 && (
          <div className="pagination-container">
            <div className="pagination-info">{getItemRange()}</div>
            <div className="pagination-controls">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="pagination-arrow"
              >
                <FaChevronLeft />
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="pagination-arrow"
              >
                <FaChevronRight />
              </button>
            </div>
          </div>
        )}

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

const DeviceForm = ({ device, setDevice, onSubmit, posiciones, sedes, isSubmitting }) => {
  const procesadoresOptions = [
    { value: "AMD_A12", label: "AMD A12" },
    { value: "AMD_A8_5500B", label: "AMD A8-5500B APU" },
    { value: "AMD_RYZEN", label: "AMD RYZEN" },
    { value: "AMD_RYZEN_3_2200GE", label: "AMD Ryzen 3 2200GE" },
    { value: "I3_2100", label: "Intel Core i3 2100" },
    { value: "I3_6200U", label: "Intel Core i3 6200U" },
    { value: "I5_4430S", label: "Intel Core i5 4430s" },
    { value: "I5_4460", label: "Intel Core i5 4460" },
    { value: "I5_4590", label: "Intel Core i5 4590" },
    { value: "I5_4600", label: "Intel Core i5 4600" },
    { value: "I5_4670", label: "Intel Core i5 4670" },
    { value: "I5_4750", label: "Intel Core i5 4750" },
    { value: "I5_6500", label: "Intel Core i5 6500" },
    { value: "I5_6500T", label: "Intel Core i5 6500T" },
    { value: "I5_7500", label: "Intel Core i5 7500" },
    { value: "I5_8400T", label: "Intel Core i5 8400T" },
    { value: "I5_8500", label: "Intel Core i5 8500" },
    { value: "I5_10TH", label: "Intel Core i5 10th Gen" },
    { value: "I5_11TH", label: "Intel Core i5 11th Gen" },
    { value: "I5_12TH", label: "Intel Core i5 12th Gen" },
    { value: "I7_8TH", label: "Intel Core i7 8th Gen" },
    { value: "I7_12TH", label: "Intel Core i7 12th Gen" },
    { value: "I7_13TH", label: "Intel Core i7 13th Gen" },
    { value: "I7_7TH", label: "Intel Core i7 7th Gen" },
    { value: "I7_8565U", label: "Intel Core i7 8565U @ 1.80GHz" },
    { value: "CORE_2_DUO_E7400", label: "Intel Core 2 Duo E7400" },
    { value: "CORE_2_DUO_E7500", label: "Intel Core 2 Duo E7500" },
  ]

  const estadosPropiedadOptions = [
    { value: "PROPIO", label: "Propio" },
    { value: "ARRENDADO", label: "Arrendado" },
    { value: "DONADO", label: "Donado" },
    { value: "OTRO", label: "Otro" }
  ]

  const estadosUsoOptions = [
    { value: "DISPONIBLE", label: "Disponible" },
    { value: "EN_USO", label: "En uso" },
    { value: "INHABILITADO", label: "Inhabilitado" }
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
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
        { value: "MACOS", label: "MacOS" },
      ])}
      
      {renderSelect("Procesador", "procesador", device, setDevice, procesadoresOptions)}
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
      
      {renderSelect("Estado de Propiedad", "estado_propiedad", device, setDevice, estadosPropiedadOptions)}
      {renderSelect("Disponibilidad", "disponible", device, setDevice, estadosUsoOptions)}
      
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
      
      {renderSelect("Posición", "posicion", device, setDevice, 
        posiciones.map(pos => ({ value: pos.id, label: pos.nombre }))
      )}
      
      {renderSelect("Sede", "sede", device, setDevice, 
        Array.isArray(sedes) ? sedes.map(sede => ({ value: sede.id, label: sede.nombre })) : []
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

const renderSelect = (label, field, device, setDevice, options) => (
  <div className="input-group">
    <label>{label}</label>
    <select 
      value={device[field] || ""} 
      onChange={(e) => setDevice({ ...device, [field]: e.target.value || null })}
    >
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