
/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react" // Añadimos React a los imports
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
  FaFileExcel,
} from "react-icons/fa"
import * as XLSX from "xlsx"
import "../styles/Devices.css"

// ... el resto del código permanece igual ...
// Moved constant options outside the component
const tiposDispositivos = [
  { value: 'COMPUTADOR', label: 'Computador' },
  { value: 'DESKTOP', label: 'Desktop' },
  { value: 'MONITOR', label: 'Monitor' },
  { value: 'TABLET', label: 'Tablet' },
  { value: 'MOVIL', label: 'Celular' },
  { value: 'HP_PRODISPLAY_P201', label: 'HP ProDisplay P201' },
  { value: 'PORTATIL', label: 'Portátil' },
  { value: 'TODO_EN_UNO', label: 'Todo en uno' },
]

const estadosDispositivo = [
  { value: 'BUENO', label: 'Bueno' },
  { value: 'BODEGA_CN', label: 'Bodega CN' },
  { value: 'BODEGA', label: 'Bodega' },
  { value: 'MALA', label: 'Mala' },
  { value: 'MALO', label: 'Malo' },
  { value: 'PENDIENTE_BAJA', label: 'Pendiente/Baja' },
  { value: 'PERDIDO_ROBADO', label: 'Perdido/Robado' },
  { value: 'REPARAR', label: 'Reparar' },
  { value: 'REPARAR_BAJA', label: 'Reparar/Baja' },
  { value: 'SEDE', label: 'Sede' },
  { value: 'STOCK', label: 'Stock' },
]

const ubicaciones = [
  { value: 'CASA', label: 'Casa' },
  { value: 'CLIENTE', label: 'Cliente' },
  { value: 'SEDE', label: 'Sede' },
  { value: 'OTRO', label: 'Otro' },
]

const estadosPropiedad = [
  { value: 'PROPIO', label: 'Propio' },
  { value: 'ARRENDADO', label: 'Arrendado' },
  { value: 'DONADO', label: 'Donado' },
  { value: 'OTRO', label: 'Otro' },
]

const estadosUso = [
  { value: 'DISPONIBLE', label: 'Disponible' },
  { value: 'EN_USO', label: 'En uso' },
  { value: 'INHABILITADO', label: 'Inhabilitado' },
]

function initialDeviceState() {
  return {
    tipo: "",
    marca: "",
    modelo: "",
    serial: null,
    estado: "",
    estado_uso: "",
    capacidad_memoria_ram: "",
    capacidad_disco_duro: "",
    sistema_operativo: "",
    procesador: "",
    ubicacion: "",
    razon_social: "",
    regimen: "",
    placa_cu: "",
    piso: "",
    estado_propiedad: "",
    proveedor: "",
    posicion: null,
    sede: null,
    usuario_asignado: null,
    observaciones: "",
  }
}

const DeviceForm = React.memo(({
  device,
  onChange,
  posiciones,
  sedes,
  usuarios,
}) => {
  useEffect(() => {
    if ((device.estado === 'MALO' || device.estado === 'MALA') && device.estado_uso !== 'INHABILITADO') {
      onChange('estado_uso', 'INHABILITADO')
    }
  }, [device.estado, onChange])

  const handleInputChange = (field, value) => {
    onChange(field, value)
  }

  const renderInput = (label, field, required = false) => (
    <div className="input-group">
      <label>{label}{required ? "*" : ""}</label>
      <input
        type="text"
        value={device[field] || ""}
        onChange={(e) => handleInputChange(field, e.target.value)}
        placeholder={label}
        required={required}
      />
    </div>
  )

  const renderSelect = (label, field, options) => {
    const isDisabled = (field === 'estado_uso' && 
                      (device.estado === 'MALO' || device.estado === 'MALA'))
    
    return (
      <div className="input-group">
        <label>{label}</label>
        <select
          value={device[field] || ""}
          onChange={(e) => handleInputChange(field, e.target.value)}
          disabled={isDisabled}
        >
          <option value="">Seleccione una opción</option>
          {options.map((opt) => (
            <option 
              key={opt.value} 
              value={opt.value}
              disabled={opt.disabled}
            >
              {opt.label}
            </option>
          ))}
        </select>
        {isDisabled && (
          <p className="field-note">Automáticamente inhabilitado para dispositivos en mal estado</p>
        )}
      </div>
    )
  }

  return (
    <div className="device-form">
      <div className="form-columns">
        <div className="form-column">
          {renderSelect("Tipo*", "tipo", tiposDispositivos)}
          {renderInput("Marca*", "marca", true)}
          {renderInput("Modelo*", "modelo", true)}
          {renderInput("Serial", "serial")}
          {renderInput("Placa CU", "placa_cu")}
          {renderSelect("Estado", "estado", estadosDispositivo)}
          {renderSelect("Estado de Uso", "estado_uso", estadosUso.map(estado => ({
            ...estado,
            disabled: (device.estado === 'MALO' || device.estado === 'MALA') && 
                      estado.value !== 'INHABILITADO'
          })))}
          {renderInput("Sistema Operativo", "sistema_operativo")}
          {renderInput("Procesador", "procesador")}
        </div>

        <div className="form-column">
          {renderInput("Capacidad Memoria RAM", "capacidad_memoria_ram")}
          {renderInput("Capacidad Disco Duro", "capacidad_disco_duro")}
          {renderSelect("Ubicación", "ubicacion", ubicaciones)}
          {renderInput("Razón Social", "razon_social")}
          {renderInput("Régimen", "regimen")}
          {renderSelect("Estado Propiedad", "estado_propiedad", estadosPropiedad)}
          {renderInput("Proveedor", "proveedor")}
          {renderInput("Piso", "piso")}
        </div>

        <div className="form-column">
          {renderSelect(
            "Posición",
            "posicion",
            posiciones.map((pos) => ({
              value: pos.id,
              label: pos.nombre,
            })),
          )}
          {renderSelect(
            "Sede",
            "sede",
            sedes.map((sede) => ({
              value: sede.id,
              label: sede.nombre,
            })),
          )}
          {renderSelect(
            "Usuario Asignado",
            "usuario_asignado",
            usuarios.map((user) => ({
              value: user.id,
              label: `${user.nombre} ${user.apellido}`,
            })),
          )}
          <div className="input-group">
            <label>Observaciones</label>
            <textarea
              value={device.observaciones || ""}
              onChange={(e) => handleInputChange("observaciones", e.target.value)}
              placeholder="Observaciones adicionales"
              rows="3"
            />
          </div>
        </div>
      </div>

      <button className="create-button" type="button">
        {device.id ? "Guardar cambios" : "Agregar Dispositivo"}
      </button>
    </div>
  )
})

DeviceForm.displayName = 'DeviceForm'

const Dispositivos = () => {
  const [dispositivos, setDispositivos] = useState([])
  const [filteredDispositivos, setFilteredDispositivos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [newDevice, setNewDevice] = useState(initialDeviceState())
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [posiciones, setPosiciones] = useState([])
  const [sedes, setSedes] = useState([])
  const [usuarios, setUsuarios] = useState([])
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
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)

  const fetchDispositivos = useCallback(async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/dispositivos/")

      let data = []
      if (Array.isArray(response.data)) {
        data = response.data
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        data = response.data.data
      } else if (response.data?.results && Array.isArray(response.data.results)) {
        data = response.data.results
      } else {
        console.error("Formato inesperado en dispositivos:", response.data)
        data = []
      }

      setDispositivos(data)
      applyFilters(data)
    } catch (error) {
      console.error("Error al obtener dispositivos:", error)
      setDispositivos([])
      setFilteredDispositivos([])
    }
  }, [])

  const fetchPosiciones = useCallback(async () => {
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
  }, [])

  const fetchSedes = useCallback(async () => {
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
  }, [])

  const fetchUsuarios = useCallback(async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/usuarios/")
      if (response.data && Array.isArray(response.data)) {
        setUsuarios(response.data)
      } else {
        setUsuarios([])
      }
    } catch (error) {
      console.error("Error al obtener usuarios:", error)
      setUsuarios([])
    }
  }, [])

  const applyFilters = useCallback((devicesData = dispositivos) => {
    let filtered = Array.isArray(devicesData) ? [...devicesData] : []

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
  }, [dispositivos, itemsPerPage, searchTerm])

  const getCurrentPageItems = useCallback(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredDispositivos.slice(startIndex, endIndex)
  }, [currentPage, filteredDispositivos, itemsPerPage])

  const getItemRange = useCallback(() => {
    const startItem = (currentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(startItem + itemsPerPage - 1, filteredDispositivos.length)
    return `Mostrando ${startItem} a ${endItem} de ${filteredDispositivos.length} resultados`
  }, [currentPage, filteredDispositivos.length, itemsPerPage])

  const validateDevice = useCallback((device) => {
    if (!device.modelo) {
      setAlert({
        show: true,
        message: "El modelo es un campo obligatorio.",
        type: "error",
      })
      return false
    }

    if ((device.estado === 'MALO' || device.estado === 'MALA') && device.estado_uso !== 'INHABILITADO') {
      setAlert({
        show: true,
        message: "Cuando el estado del dispositivo es 'Malo', el estado de uso debe ser 'Inhabilitado'.",
        type: "error",
      })
      return false
    }

    return true
  }, [])

  const addDevice = useCallback(async () => {
    if (!validateDevice(newDevice)) return

    try {
      const deviceToSend = { ...newDevice }
      deviceToSend.posicion = deviceToSend.posicion ? Number(deviceToSend.posicion) : null
      deviceToSend.sede = deviceToSend.sede ? Number(deviceToSend.sede) : null
      deviceToSend.usuario_asignado = deviceToSend.usuario_asignado ? Number(deviceToSend.usuario_asignado) : null

      Object.keys(deviceToSend).forEach((key) => {
        if (deviceToSend[key] === "" || deviceToSend[key] === null) {
          delete deviceToSend[key]
        }
      })

      const response = await axios.post("http://127.0.0.1:8000/api/dispositivos/", deviceToSend)

      if (response.status === 201) {
        fetchDispositivos()
        setShowForm(false)
        setNewDevice(initialDeviceState())
        setAlert({
          show: true,
          message: "Dispositivo agregado exitosamente.",
          type: "success",
        })
      }
    } catch (error) {
      console.error("Error al agregar el dispositivo:", error)
      let errorMessage = "Hubo un error al agregar el dispositivo."

      if (error.response?.data) {
        if (error.response.data.details) {
          errorMessage = Object.entries(error.response.data.details)
            .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
            .join('\n')
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data
        } else if (Array.isArray(error.response.data)) {
          errorMessage = error.response.data.join('\n')
        }
      }

      setAlert({
        show: true,
        message: errorMessage,
        type: "error",
      })
    }
  }, [fetchDispositivos, newDevice, validateDevice])

  const updateDevice = useCallback(async () => {
    if (!validateDevice(selectedDevice)) return

    try {
      const cleanDeviceData = { ...selectedDevice }

      if (!cleanDeviceData.posicion) {
        delete cleanDeviceData.posicion
      } else {
        cleanDeviceData.posicion = Number.parseInt(cleanDeviceData.posicion)
      }

      if (!cleanDeviceData.sede) {
        delete cleanDeviceData.sede
      } else {
        cleanDeviceData.sede = Number.parseInt(cleanDeviceData.sede)
      }

      if (!cleanDeviceData.usuario_asignado) {
        delete cleanDeviceData.usuario_asignado
      } else {
        cleanDeviceData.usuario_asignado = Number.parseInt(cleanDeviceData.usuario_asignado)
      }

      const response = await axios.put(
        `http://127.0.0.1:8000/api/dispositivos/${selectedDevice.id}/`,
        cleanDeviceData
      )

      if (response.status === 200) {
        fetchDispositivos()
        setShowDetailModal(false)
        setAlert({
          show: true,
          message: "Dispositivo actualizado exitosamente.",
          type: "success",
        })
      }
    } catch (error) {
      console.error("Error al actualizar el dispositivo:", error)
      let errorMessage = "Error al actualizar el dispositivo."

      if (error.response?.data) {
        if (error.response.data.details) {
          errorMessage = Object.entries(error.response.data.details)
            .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
            .join('\n')
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error
        }
      }

      setAlert({
        show: true,
        message: errorMessage,
        type: "error",
      })
    }
  }, [fetchDispositivos, selectedDevice, validateDevice])

  const deleteDevice = useCallback(async (deviceId) => {
    try {
      const response = await axios.delete(`http://127.0.0.1:8000/api/dispositivos/${deviceId}/`)

      if (response.status === 204) {
        fetchDispositivos()
        setAlert({
          show: true,
          message: "Dispositivo eliminado exitosamente.",
          type: "success",
        })
      }
    } catch (error) {
      console.error("Error al eliminar el dispositivo:", error)

      let errorMessage = "Hubo un error al eliminar el dispositivo."
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail
      }

      setAlert({
        show: true,
        message: errorMessage,
        type: "error",
      })
    }
  }, [fetchDispositivos])

  const confirmDelete = useCallback((deviceId) => {
    setConfirmAlert({
      show: true,
      message: "¿Estás seguro de que deseas eliminar este dispositivo?",
      onConfirm: () => {
        deleteDevice(deviceId)
        setConfirmAlert({ ...confirmAlert, show: false })
      },
      onCancel: () => setConfirmAlert({ ...confirmAlert, show: false }),
    })
  }, [confirmAlert, deleteDevice])

  const confirmSaveChanges = useCallback(() => {
    setConfirmAlert({
      show: true,
      message: "¿Deseas guardar los cambios realizados?",
      onConfirm: () => {
        updateDevice()
        setConfirmAlert({ ...confirmAlert, show: false })
      },
      onCancel: () => setConfirmAlert({ ...confirmAlert, show: false }),
    })
  }, [confirmAlert, updateDevice])

  const getDeviceIcon = useCallback((tipo) => {
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
      case "HP_PRODISPLAY_P201":
        return <FaDesktop />
      case "PORTATIL":
        return <FaLaptop />
      case "TODO_EN_UNO":
        return <FaDesktop />
      default:
        return <FaServer />
    }
  }, [])

  const exportToExcel = useCallback(() => {
    try {
      const dataToExport = filteredDispositivos.map((device) => {
        const posicionNombre = posiciones.find((p) => p.id === device.posicion)?.nombre || ""
        const sedeNombre = sedes.find((s) => s.id === device.sede)?.nombre || ""
        const usuarioNombre = usuarios.find((u) => u.id === device.usuario_asignado)
          ? `${usuarios.find((u) => u.id === device.usuario_asignado).nombre} ${usuarios.find((u) => u.id === device.usuario_asignado).apellido}`
          : ""

        return {
          Tipo: device.tipo || "",
          Marca: device.marca || "",
          Modelo: device.modelo || "",
          Serial: device.serial || "Sin serial",
          Estado: device.estado || "",
          "Estado de Uso": device.estado_uso || "",
          "Sistema Operativo": device.sistema_operativo || "",
          Procesador: device.procesador || "",
          "Memoria RAM": device.capacidad_memoria_ram || "",
          "Disco Duro": device.capacidad_disco_duro || "",
          "Placa CU": device.placa_cu || "",
          Ubicación: device.ubicacion || "",
          "Razón Social": device.razon_social || "",
          Régimen: device.regimen || "",
          Piso: device.piso || "",
          "Estado Propiedad": device.estado_propiedad || "",
          Proveedor: device.proveedor || "",
          Posición: posicionNombre,
          Sede: sedeNombre,
          "Usuario Asignado": usuarioNombre,
          Observaciones: device.observaciones || "",
        }
      })

      const worksheet = XLSX.utils.json_to_sheet(dataToExport)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Dispositivos")

      const date = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(workbook, `Reporte_Dispositivos_${date}.xlsx`)

      setAlert({
        show: true,
        message: "Reporte Excel generado exitosamente.",
        type: "success",
      })
    } catch (error) {
      console.error("Error al exportar a Excel:", error)
      setAlert({
        show: true,
        message: "Error al generar el reporte Excel.",
        type: "error",
      })
    }
  }, [filteredDispositivos, posiciones, sedes, usuarios])

  useEffect(() => {
    const fetchData = async () => {
      await fetchDispositivos()
      await fetchPosiciones()
      await fetchSedes()
      await fetchUsuarios()
    }
    fetchData()
  }, [fetchDispositivos, fetchPosiciones, fetchSedes, fetchUsuarios])

  useEffect(() => {
    applyFilters()
    setCurrentPage(1)
  }, [searchTerm, applyFilters])

  useEffect(() => {
    if (alert.show) {
      const timer = setTimeout(() => {
        setAlert({ ...alert, show: false })
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [alert])

  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      setShowDetailModal(false)
      setShowForm(false)
    }
  }, [])

  const AlertModal = useCallback(({ message, type, onClose }) => {
    return (
      <div className="modal-overlay">
        <div className="modal-container alert-container">
          <div className={`alert-modal ${type}`}>
            {typeof message === 'string' ? (
              message.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))
            ) : (
              <p>{JSON.stringify(message)}</p>
            )}
            <button className="close-button" onClick={onClose}>
              &times;
            </button>
          </div>
        </div>
      </div>
    )
  }, [])

  const ConfirmAlert = useCallback(({ message, onConfirm, onCancel }) => {
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
  }, [])

  const DeviceList = useCallback(({ dispositivos, setSelectedDevice, setShowDetailModal, deleteDevice, getDeviceIcon }) => (
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
              <div className="user-access">Serial: {device.serial || "Sin serial"}</div>
              <div className="user-details">
                <span>Estado: {device.estado} </span>
                {device.placa_cu && <span> Placa: {device.placa_cu}</span>}
              </div>
            </div>
            <div className="user-actions">
              <button
                className="action-button-modern edit"
                onClick={() => {
                  setSelectedDevice(device)
                  setShowDetailModal(true)
                }}
              >
                <FaEdit />
              </button>
              <button className="action-button-modern delete" onClick={() => confirmDelete(device.id)}>
                <FaTrash />
              </button>
            </div>
          </div>
        ))
      ) : (
        <p className="no-results">No hay dispositivos disponibles.</p>
      )}
    </div>
  ), [confirmDelete])

  return (
    <div className="devices-container">
      <div className="user-card">
        <div className="card-header">
          <h2>Gestión de Dispositivos</h2>
          <div className="header-actions">
            <div className="export-buttons">
              <button className="export-btn excel" onClick={exportToExcel} title="Exportar a Excel">
                <FaFileExcel /> Excel
              </button>
            </div>
            <button className="add-user-btn" onClick={() => setShowForm(true)}>
              <FaPlus />
            </button>
          </div>
        </div>

        {alert.show && (
          <AlertModal message={alert.message} type={alert.type} onClose={() => setAlert({ ...alert, show: false })} />
        )}

        {confirmAlert.show && (
          <ConfirmAlert
            message={confirmAlert.message}
            onConfirm={confirmAlert.onConfirm}
            onCancel={confirmAlert.onCancel}
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
          deleteDevice={confirmDelete}
          getDeviceIcon={getDeviceIcon}
        />

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
                  onChange={(field, value) => setNewDevice(prev => ({...prev, [field]: value}))}
                  posiciones={posiciones}
                  sedes={sedes}
                  usuarios={usuarios}
                />
                <button className="create-button" onClick={addDevice}>
                  Agregar Dispositivo
                </button>
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
                  onChange={(field, value) => setSelectedDevice(prev => ({...prev, [field]: value}))}
                  posiciones={posiciones}
                  sedes={sedes}
                  usuarios={usuarios}
                />
                <button className="create-button" onClick={confirmSaveChanges}>
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dispositivos