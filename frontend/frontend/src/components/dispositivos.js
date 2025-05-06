/* eslint-disable react-hooks/exhaustive-deps */
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
  FaFileExcel,
} from "react-icons/fa"
import * as XLSX from "xlsx"
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
  const [usuarios, setUsuarios] = useState([])
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "error",
  })

  // Definición de opciones según el modelo Django
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

  const fabricantes = [
    { value: 'DELL', label: 'Dell' },
    { value: 'HP', label: 'HP' },
    { value: 'LENOVO', label: 'Lenovo' },
    { value: 'APPLE', label: 'Apple' },
    { value: 'SAMSUNG', label: 'Samsung' },
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

  const razonesSociales = [
    { value: 'ECCC', label: 'ECCC' },
    { value: 'ECOL', label: 'ECOL' },
    { value: 'CNC', label: 'CNC' },
    { value: 'BODEGA_CN', label: 'Bodega CN' },
    { value: 'COMPRADO', label: 'Comprado' },
    { value: 'PROPIO', label: 'Propio' },
  ]

  const capacidadesDiscoDuro = [
    { value: '120GB', label: '120 GB' },
    { value: '250GB', label: '250 GB' },
    { value: '500GB', label: '500 GB' },
    { value: '1TB', label: '1 TB' },
    { value: '2TB', label: '2 TB' },
    { value: '4TB', label: '4 TB' },
    { value: '8TB', label: '8 TB' },
  ]

  const capacidadesMemoriaRam = [
    { value: '2GB', label: '2 GB' },
    { value: '4GB', label: '4 GB' },
    { value: '8GB', label: '8 GB' },
    { value: '16GB', label: '16 GB' },
    { value: '32GB', label: '32 GB' },
    { value: '64GB', label: '64 GB' },
  ]
  
  const sistemasOperativos = [
    { value: 'NA', label: 'No Aplica' },
    { value: 'SERVER', label: 'Server' },
    { value: 'WIN10', label: 'Windows 10' },
    { value: 'WIN11', label: 'Windows 11' },
    { value: 'WIN7', label: 'Windows 7' },
    { value: 'VACIO', label: 'Sin Sistema Operativo' },
    { value: 'MACOS', label: 'MacOS' },
  ]

  const procesadores = [
    { value: 'AMD_A12', label: 'AMD A12' },
    { value: 'AMD_A8_5500B', label: 'AMD A8-5500B APU' },
    { value: 'AMD_RYZEN', label: 'AMD RYZEN' },
    { value: 'AMD_RYZEN_3_2200GE', label: 'AMD Ryzen 3 2200GE' },
    { value: 'I3_6200U', label: 'Intel Core i3 6200U' },
    { value: 'I5_4430S', label: 'Intel Core i5 4430s' },
    { value: 'I5_4460', label: 'Intel Core i5 4460' },
    { value: 'I5_4590', label: 'Intel Core i5 4590' },
    { value: 'I5_4600', label: 'Intel Core i5 4600' },
    { value: 'I5_4670', label: 'Intel Core i5 4670' },
    { value: 'I5_4750', label: 'Intel Core i5 4750' },
    { value: 'I5_6500', label: 'Intel Core i5 6500' },
    { value: 'I5_6500T', label: 'Intel Core i5 6500T' },
    { value: 'I5_7500', label: 'Intel Core i5 7500' },
    { value: 'I5_8400T', label: 'Intel Core i5 8400T' },
    { value: 'I5_8500', label: 'Intel Core i5 8500' },
    { value: 'I5_10TH', label: 'Intel Core i5 10th Gen' },
    { value: 'I5_11TH', label: 'Intel Core i5 11th Gen' },
    { value: 'I5_12TH', label: 'Intel Core i5 12th Gen' },
    { value: 'I7_8TH', label: 'Intel Core i7 8th Gen' },
    { value: 'I7_12TH', label: 'Intel Core i7 12th Gen' },
    { value: 'I7_13TH', label: 'Intel Core i7 13th Gen' },
    { value: 'I7_7TH', label: 'Intel Core i7 7th Gen' },
    { value: 'I7_8565U', label: 'Intel Core i7 8565U @ 1.80GHz' },
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

  // Estado para alertas de confirmación
  const [confirmAlert, setConfirmAlert] = useState({
    show: false,
    message: "",
    onConfirm: null,
    onCancel: null,
  })

  // Estados para búsqueda y paginación
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)

  // Estado inicial de un dispositivo
  function initialDeviceState() {
    return {
      tipo: "",
      marca: "",
      modelo: "",
      serial: "",
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

  // Obtener la lista de dispositivos
  const fetchDispositivos = async () => {
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

  // Obtener los usuarios
  const fetchUsuarios = async () => {
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
  }

  // Aplicar filtros a los dispositivos
  const applyFilters = (devicesData = dispositivos) => {
    // Asegurarse de que devicesData es un array
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
    if (!validateDevice(newDevice)) return

    try {
      // Limpiar datos antes de enviar
      const deviceToSend = { ...newDevice }

      // Convertir IDs a números o eliminarlos si son null/undefined
      deviceToSend.posicion = deviceToSend.posicion ? Number(deviceToSend.posicion) : null
      deviceToSend.sede = deviceToSend.sede ? Number(deviceToSend.sede) : null
      deviceToSend.usuario_asignado = deviceToSend.usuario_asignado ? Number(deviceToSend.usuario_asignado) : null

      // Eliminar campos vacíos
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
        // Mostrar mensajes específicos del backend si existen
        errorMessage = Object.values(error.response.data).flat().join(", ")
      }

      setAlert({
        show: true,
        message: errorMessage,
        type: "error",
      })
    }
  }

  // Actualizar un dispositivo
  const updateDevice = async () => {
    if (!validateDevice(selectedDevice)) return

    try {
      // Clonar el dispositivo y limpiar los datos incorrectos
      const cleanDeviceData = { ...selectedDevice }

      // Limpiar campos de relaciones si están vacíos
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

      // Eliminar usuario_asignado si no es necesario en el backend
      if (!cleanDeviceData.usuario_asignado) {
        delete cleanDeviceData.usuario_asignado
      } else {
        cleanDeviceData.usuario_asignado = Number.parseInt(cleanDeviceData.usuario_asignado)
      }

      await axios.put(`http://127.0.0.1:8000/api/dispositivos/${selectedDevice.id}/`, cleanDeviceData)
      fetchDispositivos()
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
        message: "Error al actualizar el dispositivo. Verifique los datos.",
        type: "error",
      })
    }
  }

  // Eliminar un dispositivo
  const deleteDevice = async (deviceId) => {
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
  }

  // Confirmar eliminación
  const confirmDelete = (deviceId) => {
    setConfirmAlert({
      show: true,
      message: "¿Estás seguro de que deseas eliminar este dispositivo?",
      onConfirm: () => {
        deleteDevice(deviceId)
        setConfirmAlert({ ...confirmAlert, show: false })
      },
      onCancel: () => setConfirmAlert({ ...confirmAlert, show: false }),
    })
  }

  // Confirmar guardar cambios
  const confirmSaveChanges = (deviceId, updatedDeviceData) => {
    setConfirmAlert({
      show: true,
      message: "¿Deseas guardar los cambios realizados?",
      onConfirm: () => {
        updateDevice(deviceId, updatedDeviceData)
        setConfirmAlert({ ...confirmAlert, show: false })
      },
      onCancel: () => setConfirmAlert({ ...confirmAlert, show: false }),
    })
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
      case "HP_PRODISPLAY_P201":
        return <FaDesktop />
      case "PORTATIL":
        return <FaLaptop />
      case "TODO_EN_UNO":
        return <FaDesktop />
      default:
        return <FaServer />
    }
  }

  // Función para exportar a Excel
  const exportToExcel = () => {
    try {
      // Preparar los datos para exportar
      const dataToExport = filteredDispositivos.map((device) => {
        // Buscar nombres de relaciones
        const posicionNombre = posiciones.find((p) => p.id === device.posicion)?.nombre || ""
        const sedeNombre = sedes.find((s) => s.id === device.sede)?.nombre || ""
        const usuarioNombre = usuarios.find((u) => u.id === device.usuario_asignado)
          ? `${usuarios.find((u) => u.id === device.usuario_asignado).nombre} ${usuarios.find((u) => u.id === device.usuario_asignado).apellido}`
          : ""

        return {
          Tipo: device.tipo || "",
          Marca: device.marca || "",
          Modelo: device.modelo || "",
          Serial: device.serial || "",
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

      // Crear una hoja de trabajo
      const worksheet = XLSX.utils.json_to_sheet(dataToExport)

      // Crear un libro de trabajo
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Dispositivos")

      // Generar el archivo Excel
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
  }

  // Efecto para cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      await fetchDispositivos()
      await fetchPosiciones()
      await fetchSedes()
      await fetchUsuarios()
    }
    fetchData()
  }, [])

  // Efecto para aplicar filtros cuando cambia el término de búsqueda
  useEffect(() => {
    applyFilters()
    setCurrentPage(1)
  }, [searchTerm])

  // Efecto para cerrar la alerta automáticamente
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
          deleteDevice={confirmDelete}
          getDeviceIcon={getDeviceIcon}
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
                  usuarios={usuarios}
                  tiposDispositivos={tiposDispositivos}
                  fabricantes={fabricantes}
                  estadosDispositivo={estadosDispositivo}
                  estadosUso={estadosUso}
                  sistemasOperativos={sistemasOperativos}
                  procesadores={procesadores}
                  ubicaciones={ubicaciones}
                  razonesSociales={razonesSociales}
                  estadosPropiedad={estadosPropiedad}
                  capacidadesMemoriaRam={capacidadesMemoriaRam}
                  capacidadesDiscoDuro={capacidadesDiscoDuro}
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
                  onSubmit={() => confirmSaveChanges(selectedDevice.id, selectedDevice)}
                  posiciones={posiciones}
                  sedes={sedes}
                  usuarios={usuarios}
                  tiposDispositivos={tiposDispositivos}
                  fabricantes={fabricantes}
                  estadosDispositivo={estadosDispositivo}
                  estadosUso={estadosUso}
                  sistemasOperativos={sistemasOperativos}
                  procesadores={procesadores}
                  ubicaciones={ubicaciones}
                  razonesSociales={razonesSociales}
                  estadosPropiedad={estadosPropiedad}
                  capacidadesMemoriaRam={capacidadesMemoriaRam}
                  capacidadesDiscoDuro={capacidadesDiscoDuro}
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
const DeviceList = ({ dispositivos, setSelectedDevice, setShowDetailModal, deleteDevice, getDeviceIcon }) => (
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
            <button className="action-button-modern delete" onClick={() => deleteDevice(device.id)}>
              <FaTrash />
            </button>
          </div>
        </div>
      ))
    ) : (
      <p className="no-results">No hay dispositivos disponibles.</p>
    )}
  </div>
)

// Componente para el formulario de dispositivos
const DeviceForm = ({
  device,
  setDevice,
  onSubmit,
  posiciones,
  sedes,
  usuarios,
  tiposDispositivos,
  fabricantes,
  estadosDispositivo,
  estadosUso,
  sistemasOperativos,
  procesadores,
  ubicaciones,
  razonesSociales,
  estadosPropiedad,
  capacidadesMemoriaRam,
  capacidadesDiscoDuro,
}) => {
  if (!device) return null

  return (
    <div className="device-form">
      <div className="form-columns">
        <div className="form-column">
          {renderSelect("Tipo*", "tipo", device, setDevice, tiposDispositivos)}
          {renderSelect("Marca*", "marca", device, setDevice, fabricantes)}
          {renderInput("Modelo*", "modelo", device, setDevice)}
          {renderInput("Serial*", "serial", device, setDevice)}
          {renderInput("Placa CU", "placa_cu", device, setDevice)}
          {renderSelect("Estado*", "estado", device, setDevice, estadosDispositivo)}
          {renderSelect("Estado de Uso", "estado_uso", device, setDevice, estadosUso)}
          {renderSelect("Sistema Operativo", "sistema_operativo", device, setDevice, sistemasOperativos)}
          {renderSelect("Procesador", "procesador", device, setDevice, procesadores)}
        </div>

        <div className="form-column">
          {renderSelect("Capacidad Memoria RAM", "capacidad_memoria_ram", device, setDevice, capacidadesMemoriaRam)}
          {renderSelect("Capacidad Disco Duro", "capacidad_disco_duro", device, setDevice, capacidadesDiscoDuro)}
          {renderSelect("Ubicación", "ubicacion", device, setDevice, ubicaciones)}
          {renderSelect("Razón Social", "razon_social", device, setDevice, razonesSociales)}
          {renderInput("Régimen", "regimen", device, setDevice)}
          {renderSelect("Estado Propiedad", "estado_propiedad", device, setDevice, estadosPropiedad)}
          {renderInput("Proveedor", "proveedor", device, setDevice)}
          {renderInput("Piso", "piso", device, setDevice)}
        </div>

        <div className="form-column">
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
            sedes.map((sede) => ({
              value: sede.id,
              label: sede.nombre,
            })),
          )}
          {renderSelect(
            "Usuario Asignado",
            "usuario_asignado",
            device,
            setDevice,
            usuarios.map((user) => ({
              value: user.id,
              label: `${user.nombre} ${user.apellido}`,
            })),
          )}
          <div className="input-group">
            <label>Observaciones</label>
            <textarea
              value={device.observaciones || ""}
              onChange={(e) => setDevice({ ...device, observaciones: e.target.value })}
              placeholder="Observaciones adicionales"
              rows="3"
            />
          </div>
        </div>
      </div>

      <button className="create-button" onClick={onSubmit}>
        {device.id ? "Guardar cambios" : "Agregar Dispositivo"}
      </button>
    </div>
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
      required={label.includes("*")}
    />
  </div>
)

// Función para renderizar un select
const renderSelect = (label, field, device, setDevice, options) => (
  <div className="input-group">
    <label>{label}</label>
    <select
      value={device[field] || ""}
      onChange={(e) => setDevice({ ...device, [field]: e.target.value || null })}
      required={label.includes("*")}
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