"use client"

import { useState, useEffect, useRef } from "react"
import axios from "axios"
import {
  FaTimes,
  FaPlus,
  FaDownload,
  FaUpload,
  FaSearch,
  FaSearchPlus,
  FaSearchMinus,
  FaUndo,
  FaCheck,
  FaExclamationTriangle,
  FaList,
  FaTable,
  FaChartPie,
} from "react-icons/fa"
import * as XLSX from "xlsx"
import "../styles/Plans.css" // Asegúrate de que esta ruta es correcta

// Add these imports at the top of the file, after the existing imports
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
} from "chart.js"
import { Doughnut } from "react-chartjs-2"

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title)

const API_URL = "http://127.0.0.1:8000/"

const PISOS = [
  { value: "PISO1", label: "Piso 1" },
  { value: "PISO2", label: "Piso 2" },
  { value: "PISO3", label: "Piso 3" },
  { value: "PISO4", label: "Piso 4" },
  { value: "TORRE1", label: "Torre 1" },
]

// Ya no necesitamos la lista de colores predefinidos, ya que los colores vendrán del servicio
// Mantenemos solo el color por defecto para cuando no hay servicio asignado
const COLOR_DEFAULT = "#FFFFFF"

const ESTADOS = [
  { value: "disponible", label: "Disponible", color: "green" },
  { value: "ocupado", label: "Ocupado", color: "red" },
  { value: "reservado", label: "Reservado", color: "orange" },
  { value: "inactivo", label: "Inactivo", color: "gray" },
]

const getContrastColor = (hexcolor) => {
  if (!hexcolor) return "#000000"
  try {
    const hex = hexcolor.replace("#", "")
    const r = Number.parseInt(hex.substr(0, 2), 16)
    const g = Number.parseInt(hex.substr(2, 2), 16)
    const b = Number.parseInt(hex.substr(4, 2), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? "#000000" : "#ffffff"
  } catch (error) {
    console.error("Error en getContrastColor:", error)
    return "#000000"
  }
}

// Mejorar la función cleanHexColor para manejar mejor los colores de Excel
const cleanHexColor = (hexColor) => {
  if (!hexColor) return "#FFFFFF"
  try {
    // Si ya es un color hex válido con #, devolverlo
    if (/^#[0-9A-F]{6}$/i.test(hexColor)) {
      return hexColor
    }

    // Si es un color hex válido sin #, añadirlo
    if (/^[0-9A-F]{6}$/i.test(hexColor)) {
      return `#${hexColor}`
    }

    // Si tiene formato ARGB (8 caracteres), quitar el canal alfa
    let cleanedColor = hexColor
    if (/^[0-9A-F]{8}$/i.test(hexColor)) {
      cleanedColor = hexColor.substring(2)
      return `#${cleanedColor}`
    }

    // Si tiene # pero formato incorrecto, intentar arreglarlo
    if (hexColor.startsWith("#")) {
      cleanedColor = hexColor.substring(1)

      // Si es un color de 3 dígitos (como #RGB), convertirlo a 6 dígitos (#RRGGBB)
      if (/^[0-9A-F]{3}$/i.test(cleanedColor)) {
        return `#${cleanedColor[0]}${cleanedColor[0]}${cleanedColor[1]}${cleanedColor[1]}${cleanedColor[2]}${cleanedColor[2]}`
      }

      // Si es ARGB con #, quitar el canal alfa
      if (/^[0-9A-F]{8}$/i.test(cleanedColor)) {
        return `#${cleanedColor.substring(2)}`
      }
    }

    // Si llegamos aquí y no es un formato reconocido, devolver blanco
    if (!/^#[0-9A-F]{6}$/i.test(`#${cleanedColor}`)) {
      return "#FFFFFF"
    }

    return `#${cleanedColor}`
  } catch (error) {
    console.error("Error en cleanHexColor:", error)
    return "#FFFFFF"
  }
}

const extractColor = (cell) => {
  try {
    if (!cell || !cell.s || !cell.s.fill) return { color: "#FFFFFF", originalColor: "FFFFFF" }

    const cleanColor = (colorStr) => {
      if (!colorStr) return null
      if (colorStr.length === 8 && colorStr.startsWith("FF")) {
        return colorStr.substring(2)
      }
      return colorStr
    }

    let color = null

    // Intentar obtener el color de diferentes propiedades
    if (cell.s.fill.fgColor) {
      if (cell.s.fill.fgColor.rgb) {
        color = cleanColor(cell.s.fill.fgColor.rgb)
      } else if (cell.s.fill.fgColor.theme !== undefined) {
        // Colores de tema de Excel
        const themeColors = {
          0: "FFFFFF", // Blanco
          1: "000000", // Negro
          2: "E7E6E6", // Gris claro
          3: "44546A", // Azul oscuro
          4: "4472C4", // Azul
          5: "ED7D31", // Naranja
          6: "A5A5A5", // Gris
          7: "FFC000", // Amarillo
          8: "5B9BD5", // Azul claro
          9: "70AD47", // Verde
          10: "FF0000", // Rojo
        }
        color = themeColors[cell.s.fill.fgColor.theme] || "FFFFFF"
      } else if (cell.s.fill.fgColor.indexed !== undefined) {
        // Colores indexados de Excel
        const indexedColors = {
          0: "000000", // Negro
          1: "FFFFFF", // Blanco
          2: "FF0000", // Rojo
          3: "00FF00", // Verde
          4: "0000FF", // Azul
          5: "FFFF00", // Amarillo
          6: "FF00FF", // Magenta
          7: "00FFFF", // Cyan
          8: "000000", // Negro
          9: "FFFFFF", // Blanco
          10: "FF0000", // Rojo
          11: "00FF00", // Verde
          12: "0000FF", // Azul
          13: "FFFF00", // Amarillo
          14: "FF00FF", // Magenta
          15: "00FFFF", // Cyan
          16: "800000", // Marrón
          17: "008000", // Verde oscuro
          18: "000080", // Azul marino
          19: "808000", // Oliva
          20: "800080", // Púrpura
          21: "008080", // Verde azulado
          22: "C0C0C0", // Plata
          23: "808080", // Gris
          24: "9999FF", // Lavanda
          25: "993366", // Burdeos
          26: "FFFFCC", // Crema
          27: "CCFFFF", // Azul pálido
          28: "660066", // Morado
          29: "FF8080", // Rosa
          30: "0066CC", // Azul medio
          31: "CCCCFF", // Lila
          32: "000080", // Azul marino
          33: "FF00FF", // Fucsia
          34: "FFFF00", // Amarillo
          35: "00FFFF", // Cyan
          36: "800080", // Púrpura
          37: "800000", // Marrón
          38: "008080", // Verde azulado
          39: "0000FF", // Azul
          40: "00CCFF", // Azul cielo
          41: "CCFFFF", // Azul pálido
          42: "CCFFCC", // Verde pálido
          43: "FFFF99", // Amarillo pálido
          44: "99CCFF", // Azul pastel
          45: "FF99CC", // Rosa pastel
          46: "CC99FF", // Lila pastel
          47: "FFCC99", // Melocotón
          48: "3366FF", // Azul real
          49: "33CCCC", // Turquesa
          50: "99CC00", // Verde oliva
          51: "FFCC00", // Naranja
          52: "FF9900", // Naranja oscuro
          53: "FF6600", // Naranja rojizo
          54: "666699", // Azul grisáceo
          55: "969696", // Gris medio
          56: "003366", // Azul muy oscuro
          57: "339966", // Verde mar
          58: "003300", // Verde muy oscuro
          59: "333300", // Oliva oscuro
          60: "993300", // Marrón oscuro
          61: "993366", // Burdeos
          62: "333399", // Índigo
          63: "333333", // Gris muy oscuro
          64: "FF0000", // Rojo
        }
        color = indexedColors[cell.s.fill.fgColor.indexed] || "FFFFFF"
      }
    }

    // Si no se encontró color en fgColor, intentar con bgColor
    if (!color && cell.s.fill.bgColor) {
      if (cell.s.fill.bgColor.rgb) {
        color = cleanColor(cell.s.fill.bgColor.rgb)
      } else if (cell.s.fill.bgColor.theme !== undefined) {
        const themeColors = {
          0: "FFFFFF",
          1: "000000",
          2: "E7E6E6",
          3: "44546A",
          4: "4472C4",
          5: "ED7D31", // Naranja
          6: "A5A5A5", // Gris
          7: "FFC000", // Amarillo
          8: "5B9BD5", // Azul claro
          9: "70AD47", // Verde
          10: "FF0000", // Rojo
        }
        color = themeColors[cell.s.fill.bgColor.theme] || "FFFFFF"
      } else if (cell.s.fill.bgColor.indexed !== undefined) {
        // Usar los mismos colores indexados definidos anteriormente
        const indexedColors = {
          0: "000000",
          1: "FFFFFF",
          2: "FF0000" /* ... y así sucesivamente ... */,
        }
        color = indexedColors[cell.s.fill.bgColor.indexed] || "FFFFFF"
      }
    }

    // Si aún no hay color y el patrón es sólido, intentar con color
    if (!color && cell.s.fill.patternType === "solid") {
      if (cell.s.fill.color && cell.s.fill.color.rgb) {
        color = cleanColor(cell.s.fill.color.rgb)
      } else if (cell.s.fill.color && cell.s.fill.color.theme !== undefined) {
        const themeColors = {
          0: "FFFFFF",
          1: "000000",
          2: "E7E6E6",
          3: "44546A",
          4: "4472C4",
          5: "ED7D31", // Naranja
          6: "A5A5A5", // Gris
          7: "FFC000", // Amarillo
          8: "5B9BD5", // Azul claro
          9: "70AD47", // Verde
          10: "FF0000", // Rojo
        }
        color = themeColors[cell.s.fill.color.theme] || "FFFFFF"
      } else if (cell.s.fill.color && cell.s.fill.color.indexed !== undefined) {
        // Usar los mismos colores indexados definidos anteriormente
        const indexedColors = {
          0: "000000",
          1: "FFFFFF",
          2: "FF0000" /* ... y así sucesivamente ... */,
        }
        color = indexedColors[cell.s.fill.color.indexed] || "FFFFFF"
      }
    }

    // Intentar con start y end para gradientes
    if (!color && cell.s.fill.start && cell.s.fill.end) {
      if (cell.s.fill.start.rgb) {
        color = cleanColor(cell.s.fill.start.rgb)
      } else if (cell.s.fill.end.rgb) {
        color = cleanColor(cell.s.fill.end.rgb)
      }
    }

    // Si no se encontró ningún color o es "auto", usar blanco
    if (!color || color === "auto") {
      return { color: "#FFFFFF", originalColor: "FFFFFF" }
    }

    // Limpiar el color y asegurarse de que sea un hex válido
    color = color.replace(/^#/, "")
    if (!/^[0-9A-F]{6}$/i.test(color)) {
      return { color: "#FFFFFF", originalColor: "FFFFFF" }
    }

    return {
      color: `#${color}`,
      originalColor: color,
    }
  } catch (error) {
    console.error("Error extracting color:", error)
    return { color: "#FFFFFF", originalColor: "FFFFFF" }
  }
}

function FloorPlan() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [positions, setPositions] = useState({})
  const [rows, setRows] = useState(51)
  const [columns, setColumns] = useState([
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    "AA",
    "AB",
    "AC",
    "AD",
    "AE",
    "AF",
    "AG",
    "AH",
    "AI",
    "AJ",
    "AK",
    "AL",
    "AM",
    "AN",
    "AO",
    "AP",
    "AQ",
    "AR",
    "AS",
    "AT",
    "AU",
    "AV",
    "AW",
    "AX",
    "AY",
    "AZ",
    "BA",
    "BB",
    "BC",
    "BD",
    "BE",
    "BF",
    "BG",
    "BH",
    "BI",
    "BJ",
    "BK",
    "BL",
    "BM",
    "BN",
    "BO",
    "BP",
    "BQ",
    "BR",
    "BS",
    "BT",
    "BU",
    "BV",
    "BW",
  ])
  const [newPosition, setNewPosition] = useState({
    id: null,
    nombre: "",
    tipo: "",
    estado: "disponible",
    detalles: "",
    fila: 1,
    columna: "A",
    color: COLOR_DEFAULT, // Color por defecto
    colorFuente: "#000000",
    colorOriginal: "",
    borde: false,
    bordeDoble: false,
    bordeDetalle: {
      top: false,
      right: false,
      bottom: false,
      left: false,
      topDouble: false,
      rightDouble: false,
      bottomDouble: false,
      leftDouble: false,
    },
    piso: "PISO1",
    sede: "",
    servicio: "",
    dispositivos: [],
    mergedCells: [],
  })
  const [zoomLevel, setZoomLevel] = useState(1)
  const [selectedPiso, setSelectedPiso] = useState("PISO1")
  const [searchTerm, setSearchTerm] = useState("")
  const [deviceSearchTerm, setDeviceSearchTerm] = useState("") // Búsqueda de dispositivos
  const [selectionStart, setSelectionStart] = useState(null)
  const [selectionEnd, setSelectionEnd] = useState(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState({ show: false, message: "", type: "success" })
  const tableContainerRef = useRef(null)
  const [defaultDeviceId, setDefaultDeviceId] = useState(null)
  const [showAllPositions, setShowAllPositions] = useState(false)
  const [allDevices, setAllDevices] = useState([]) // Todos los dispositivos disponibles
  const [assignedDevices, setAssignedDevices] = useState({}) // Mapa de dispositivos asignados: {deviceId: positionId}

  // Modificar el estado viewMode para incluir las estadísticas como un modo de visualización
  const [viewMode, setViewMode] = useState("plano") // "plano", "tabla" o "estadisticas"

  // Estados para los selectores
  const [servicios, setServicios] = useState([])
  const [sedes, setSedes] = useState([])

  // Nuevo estado para el filtro de servicio en las estadísticas
  const [selectedService, setSelectedService] = useState("")

  // Función para cargar los datos de los selectores
  const fetchSelectorData = async () => {
    try {
      console.log("Iniciando carga de datos desde API...")

      // Cargar dispositivos con manejo de errores detallado
      try {
        console.log("Solicitando dispositivos desde:", `${API_URL}api/dispositivos/`)
        const dispositivosResponse = await axios.get(`${API_URL}api/dispositivos/`)
        console.log("Respuesta completa de dispositivos:", dispositivosResponse)

        // Procesar los dispositivos con más detalle
        let dispositivosData = []
        if (dispositivosResponse.data) {
          if (Array.isArray(dispositivosResponse.data)) {
            dispositivosData = dispositivosResponse.data
            console.log("Datos de dispositivos recibidos como array:", dispositivosData.length)
          } else if (dispositivosResponse.data.results && Array.isArray(dispositivosResponse.data.results)) {
            dispositivosData = dispositivosResponse.data.results
            console.log("Datos de dispositivos recibidos como paginación:", dispositivosData.length)
          } else if (dispositivosResponse.data.data && Array.isArray(dispositivosResponse.data.data)) {
            // Extraer datos del campo 'data' si existe
            dispositivosData = dispositivosResponse.data.data
            console.log("Datos de dispositivos extraídos del campo 'data':", dispositivosData.length)
          } else {
            console.log("Formato de respuesta inesperado para dispositivos:", dispositivosResponse.data)
            // Intentar extraer datos de cualquier forma posible
            if (typeof dispositivosResponse.data === "object") {
              console.log("Intentando extraer dispositivos de objeto:", Object.keys(dispositivosResponse.data))
              // Si es un objeto, intentar convertirlo a array
              if (dispositivosResponse.data.data) {
                dispositivosData = dispositivosResponse.data.data
              } else {
                dispositivosData = Object.values(dispositivosResponse.data)
              }
            }
          }
        }

        // Asegurarse de que todos los dispositivos tengan un ID válido
        dispositivosData = dispositivosData.filter((d) => d && d.id)

        console.log("Dispositivos procesados:", dispositivosData)
        setAllDevices(dispositivosData)

        if (dispositivosData.length > 0) {
          console.log("Estableciendo dispositivo por defecto:", dispositivosData[0])
          setDefaultDeviceId(dispositivosData[0].id)
        } else {
          console.warn("No se encontraron dispositivos disponibles")
        }
      } catch (error) {
        console.error("Error específico al cargar dispositivos:", error)
        if (error.response) {
          console.error("Respuesta de error:", error.response.status, error.response.data)
        }

        // Crear dispositivos de prueba si hay error
        const mockDevices = [
          { id: 1, nombre: "Dispositivo 1", serial: "SN001", modelo: "Modelo A", sede: 1 },
          { id: 2, nombre: "Dispositivo 2", serial: "SN002", modelo: "Modelo B", sede: 1 },
          { id: 3, nombre: "Dispositivo 3", serial: "SN003", modelo: "Modelo C", sede: 2 },
          { id: 4, nombre: "Dispositivo 4", serial: "SN004", modelo: "Modelo D", sede: 2 },
          { id: 5, nombre: "Dispositivo 5", serial: "SN005", modelo: "Modelo E", sede: 3 },
          { id: 6, nombre: "Dispositivo 6", serial: "SN006", modelo: "Modelo F", sede: 3 },
          { id: 7, nombre: "Dispositivo 7", serial: "SN007", modelo: "Modelo G", sede: 1 },
          { id: 8, nombre: "Dispositivo 8", serial: "SN008", modelo: "Modelo H", sede: 2 },
          { id: 9, nombre: "Dispositivo 9", serial: "SN009", modelo: "Modelo I", sede: 3 },
          { id: 10, nombre: "Dispositivo 10", serial: "SN010", modelo: "Modelo J", sede: 1 },
        ]
        console.log("Usando dispositivos de prueba:", mockDevices)
        setAllDevices(mockDevices)
        setDefaultDeviceId(1)
      }

      // Cargar servicios y sedes
      try {
        const [serviciosResponse, sedesResponse] = await Promise.all([
          axios.get(`${API_URL}api/servicios/`),
          axios.get(`${API_URL}api/sedes/`),
        ])

        console.log("Respuesta de servicios:", serviciosResponse.data)
        console.log("Respuesta de sedes:", sedesResponse.data)

        setServicios(serviciosResponse.data || [])
        setSedes(sedesResponse.data || [])
      } catch (error) {
        console.error("Error al cargar servicios o sedes:", error)
        setServicios([])
        setSedes([])
      }
    } catch (error) {
      console.error("Error general al cargar datos:", error)
      showNotification("Error al cargar datos del servidor", "error")
    }
  }

  // Función para actualizar el mapa de dispositivos asignados
  const updateAssignedDevices = (positionsData) => {
    const assignedMap = {}

    // Recorrer todas las posiciones y registrar qué dispositivos están asignados a cada una
    Object.values(positionsData).forEach((position) => {
      if (position.dispositivos && position.dispositivos.length > 0) {
        // Normalizar los dispositivos a un array de IDs
        const deviceIds = position.dispositivos.map((d) => (typeof d === "object" ? d.id : Number(d)))

        // Registrar cada dispositivo con su posición asignada
        deviceIds.forEach((deviceId) => {
          assignedMap[deviceId] = position.id
        })
      }
    })

    console.log("Mapa de dispositivos asignados actualizado:", assignedMap)
    setAssignedDevices(assignedMap)
  }

  // Cargar datos iniciales
  useEffect(() => {
    fetchSelectorData()
    fetchPositions()
  }, []) // Ya no depende de selectedPiso para cargar todas las posiciones

  // Función para obtener el color del servicio por ID
  const getServiceColor = (serviceId) => {
    if (!serviceId) return COLOR_DEFAULT

    const service = servicios.find((s) => s.id === Number(serviceId) || s.id === serviceId)
    return service ? service.color : COLOR_DEFAULT
  }

  // Función para obtener el nombre del servicio por ID
  const getServiceName = (serviceId) => {
    if (!serviceId) return ""

    const service = servicios.find((s) => s.id === Number(serviceId) || s.id === serviceId)
    return service ? service.nombre : ""
  }

  // Función para obtener el nombre de la sede por ID
  const getSedeName = (sedeId) => {
    if (!sedeId) return ""

    const sede = sedes.find((s) => s.id === Number(sedeId) || s.id === sedeId)
    return sede ? sede.nombre : ""
  }

  // Función para obtener el nombre del piso por valor
  const getPisoName = (pisoValue) => {
    const piso = PISOS.find((p) => p.value === pisoValue)
    return piso ? piso.label : pisoValue
  }

  // Función para obtener dispositivos disponibles (no asignados a otras posiciones)
  const getAvailableDevices = (currentPositionId) => {
    // Obtener la sede de la posición actual
    const currentSede = newPosition.sede

    // Filtrar dispositivos por sede y disponibilidad
    return allDevices.filter((device) => {
      // Verificar si el dispositivo pertenece a la misma sede
      const isSameSede = !currentSede || !device.sede || device.sede == currentSede

      // Verificar disponibilidad (no asignado o asignado a esta posición)
      const isAvailable = !assignedDevices[device.id] || assignedDevices[device.id] === currentPositionId

      return isSameSede && isAvailable
    })
  }

  // Reemplazar la función fetchPositions para manejar mejor los datos recibidos
  const fetchPositions = async () => {
    try {
      setLoading(true)
      const url = `${API_URL}api/posiciones/`
      console.log("Obteniendo posiciones desde:", url)

      let allPositions = []
      let nextUrl = url

      while (nextUrl) {
        const response = await axios.get(nextUrl)
        console.log("Respuesta completa:", response)

        let positionsData = []
        if (response.data && Array.isArray(response.data)) {
          positionsData = response.data
        } else if (response.data && Array.isArray(response.data.results)) {
          positionsData = response.data.results
          nextUrl = response.data.next // Obtener la URL de la siguiente página
        } else {
          console.warn("Formato de respuesta inesperado:", response.data)
          positionsData = []
          nextUrl = null // Detener la paginación si el formato es incorrecto
        }

        console.log("Datos de posiciones recibidos:", positionsData.length)
        allPositions = allPositions.concat(positionsData)
      }

      console.log("Total de posiciones recibidas:", allPositions.length)

      // Convertir el array a un objeto con id como clave
      const positionsObj = allPositions.reduce((acc, pos) => {
        try {
          // Normalizar el objeto de posición para evitar errores
          const normalizedPos = {
            ...pos,
            // Asegurar que fila sea un número
            fila: Number.parseInt(pos.fila, 10) || 1,

            // Asegurar que mergedCells sea un array válido
            mergedCells: Array.isArray(pos.mergedCells)
              ? pos.mergedCells
              : [{ row: Number.parseInt(pos.fila, 10) || 1, col: pos.columna || "A" }],

            // Asegurar que bordeDetalle sea un objeto válido
            bordeDetalle:
              typeof pos.bordeDetalle === "object" && pos.bordeDetalle !== null
                ? pos.bordeDetalle
                : {
                    top: false,
                    right: false,
                    bottom: false,
                    left: false,
                    topDouble: false,
                    rightDouble: false,
                    bottomDouble: false,
                    leftDouble: false,
                  },

            // Asegurar que dispositivos sea un array y normalizar los valores
            dispositivos: Array.isArray(pos.dispositivos)
              ? pos.dispositivos.map((d) => (typeof d === "object" ? d.id : Number(d)))
              : pos.dispositivos
                ? [typeof pos.dispositivos === "object" ? pos.dispositivos.id : Number(pos.dispositivos)]
                : [],

            // Asegurar otros campos básicos
            nombre: pos.nombre || "",
            tipo: pos.tipo || "",
            estado: pos.estado || "disponible",
            detalles: pos.detalles || "",
            // El color ahora se determina por el servicio, pero mantenemos el campo por compatibilidad
            color: pos.color || COLOR_DEFAULT,
            colorFuente: pos.colorFuente || "#000000",
            colorOriginal: pos.colorOriginal || "",
            borde: Boolean(pos.borde),
            bordeDoble: Boolean(pos.bordeDoble),
            piso: pos.piso || "PISO1",
            sede: pos.sede || null,
            servicio: pos.servicio || null,
          }

          return { ...acc, [pos.id]: normalizedPos }
        } catch (error) {
          console.error("Error al procesar posición:", error, pos)
          return acc
        }
      }, {})

      console.log("Posiciones procesadas:", Object.keys(positionsObj).length)
      setPositions(positionsObj)

      // Actualizar el mapa de dispositivos asignados
      updateAssignedDevices(positionsObj)
    } catch (error) {
      console.error("Error al obtener posiciones:", error)
      if (error.response) {
        console.error("Respuesta del servidor:", error.response.status, error.response.data)
      }
      showNotification("Error al cargar las posiciones", "error")
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type })
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "success" })
    }, 3000)
  }

  // Reemplazar la función importFromExcel completa with this versión mejorada
  const importFromExcel = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setLoading(true)
    showNotification("Procesando archivo Excel...", "success")

    try {
      // 1. Verificar que tengamos dispositivos disponibles
      if (allDevices.length === 0) {
        showNotification(
          "Error: No hay dispositivos disponibles en el sistema. Debe crear al menos un dispositivo antes de importar.",
          "error",
        )
        setLoading(false)
        return
      }

      // Obtener el primer dispositivo disponible para usar como valor por defecto
      const defaultDevice = allDevices[0].id
      console.log("Dispositivo por defecto para importación:", defaultDevice)

      // 2. Preguntar al usuario si desea eliminar las posiciones existentes
      const confirmDelete = window.confirm(
        "¿Desea eliminar las posiciones existentes en este piso antes de importar? Seleccione 'Cancelar' para agregar las nuevas posiciones sin eliminar las existentes.",
      )

      // 3. Si el usuario confirma, eliminar las posiciones existentes
      if (confirmDelete) {
        showNotification("Eliminando posiciones existentes...", "success")
        const currentPositions = Object.values(positions).filter((p) => p.piso === selectedPiso)

        for (const pos of currentPositions) {
          try {
            await axios.delete(`${API_URL}api/posiciones/${pos.id}/`)
            console.log(`Posición eliminada: ${pos.id}`)
          } catch (error) {
            console.error(`Error al eliminar posición ${pos.id}:`, error)
          }
        }
      }

      // 4. Leer el archivo Excel
      const reader = new FileReader()

      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target.result)
          const workbook = XLSX.read(data, {
            type: "array",
            cellStyles: true,
            cellDates: true,
          })

          // 5. Obtener la primera hoja del libro
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]

          // 6. Obtener el rango de celdas
          const range = XLSX.utils.decode_range(worksheet["!ref"])
          console.log("Rango de celdas:", range)

          // 7. Obtener información de celdas combinadas
          const mergedCellsInfo = worksheet["!merges"] || []
          console.log("Celdas combinadas detectadas:", mergedCellsInfo.length)

          // 8. Preparar variables para el seguimiento
          const processedCells = {} // Para rastrear qué celdas ya se han procesado
          const newPositions = {}
          let savedCount = 0
          let errorCount = 0

          // 9. Procesar primero las celdas combinadas
          for (const mergeInfo of mergedCellsInfo) {
            const startRow = mergeInfo.s.r
            const startCol = mergeInfo.s.c
            const endRow = mergeInfo.e.r
            const endCol = mergeInfo.e.c

            // Obtener la celda principal (esquina superior izquierda)
            const mainCellAddress = XLSX.utils.encode_cell({ r: startRow, c: startCol })
            const mainCell = worksheet[mainCellAddress]

            // Extraer el valor y color de la celda - IMPORTANTE: Considerar celdas vacías pero combinadas
            const cellValue =
              mainCell && mainCell.v !== undefined && mainCell.v !== null ? String(mainCell.v).trim() : ""
            const colorInfo = mainCell ? extractColor(mainCell) : { color: "#FFFFFF", originalColor: "FFFFFF" }
            const cellColor = cleanHexColor(colorInfo.color)

            // Crear lista de celdas combinadas
            const mergedCells = []
            for (let r = startRow; r <= endRow; r++) {
              for (let c = startCol; c <= endCol; c++) {
                const actualRow = r + 1
                const colLetter = XLSX.utils.encode_col(c)
                mergedCells.push({ row: actualRow, col: colLetter })
                processedCells[`${actualRow}-${colLetter}`] = true
              }
            }

            // Crear objeto de posición
            const position = {
              nombre: cellValue,
              tipo: "",
              estado: "disponible",
              detalles: "",
              fila: startRow + 1,
              columna: XLSX.utils.encode_col(startCol),
              color: cellColor,
              colorFuente: getContrastColor(cellColor),
              colorOriginal: colorInfo.originalColor,
              piso: selectedPiso,
              mergedCells: mergedCells,
              dispositivos: [], // Inicialmente sin dispositivos
              borde: false,
              bordeDoble: false,
              bordeDetalle: {
                top: false,
                right: false,
                bottom: false,
                left: false,
                topDouble: false,
                rightDouble: false,
                bottomDouble: false,
                leftDouble: false,
              },
            }

            // Intentar encontrar un servicio que coincida con el color
            if (servicios.length > 0) {
              const matchingService = servicios.find((s) => {
                const serviceColor = cleanHexColor(s.color)
                const positionColor = cleanHexColor(cellColor)
                return serviceColor.toLowerCase() === positionColor.toLowerCase()
              })

              if (matchingService) {
                position.servicio = matchingService.id
              }
            }

            // Guardar TODAS las celdas combinadas, incluso si están vacías
            try {
              console.log("Guardando posición combinada:", position)
              const response = await axios.post(`${API_URL}api/posiciones/`, position)
              if (response.status === 201) {
                newPositions[response.data.id] = response.data
                savedCount++
              }
            } catch (error) {
              console.error("Error al guardar posición combinada:", error)
              if (error.response?.data) {
                console.error("Detalles del error:", JSON.stringify(error.response.data))
              }
              errorCount++
            }
          }

          // 10. Procesar celdas individuales
          for (let row = range.s.r; row <= range.e.r; row++) {
            for (let col = range.s.c; col <= range.e.c; col++) {
              const actualRow = row + 1
              const colLetter = XLSX.utils.encode_col(col)

              // Omitir celdas que ya están en áreas combinadas
              if (processedCells[`${actualRow}-${colLetter}`]) {
                continue
              }

              // Omitir celdas que ya están ocupadas en las posiciones existentes (si no confirmó eliminar)
              if (
                !confirmDelete &&
                Object.values(positions).some(
                  (pos) =>
                    pos.piso === selectedPiso &&
                    pos.mergedCells.some((c) => c.row === actualRow && c.col === colLetter),
                )
              ) {
                continue
              }

              const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
              const cell = worksheet[cellAddress]

              // Extraer el valor y color de la celda
              const cellValue = cell && cell.v !== undefined && cell.v !== null ? String(cell.v).trim() : ""
              const colorInfo = cell ? extractColor(cell) : { color: "#FFFFFF", originalColor: "FFFFFF" }
              const cellColor = cleanHexColor(colorInfo.color)

              // Omitir celdas completamente vacías (sin color ni texto)
              if (cellColor === "#FFFFFF" && cellValue === "") {
                continue
              }

              // Crear objeto de posición
              const position = {
                nombre: cellValue,
                tipo: "",
                estado: "disponible",
                detalles: "",
                fila: actualRow,
                columna: colLetter,
                color: cellColor,
                colorFuente: getContrastColor(cellColor),
                colorOriginal: colorInfo.originalColor,
                piso: selectedPiso,
                mergedCells: [{ row: actualRow, col: colLetter }],
                dispositivos: [], // Inicialmente sin dispositivos
                borde: false,
                bordeDoble: false,
                bordeDetalle: {
                  top: false,
                  right: false,
                  bottom: false,
                  left: false,
                  topDouble: false,
                  rightDouble: false,
                  bottomDouble: false,
                  leftDouble: false,
                },
              }

              // Intentar encontrar un servicio que coincida con el color
              if (servicios.length > 0) {
                const matchingService = servicios.find((s) => {
                  const serviceColor = cleanHexColor(s.color)
                  const positionColor = cleanHexColor(cellColor)
                  return serviceColor.toLowerCase() === positionColor.toLowerCase()
                })

                if (matchingService) {
                  position.servicio = matchingService.id
                }
              }

              // Guardar la posición
              try {
                const response = await axios.post(`${API_URL}api/posiciones/`, position)
                if (response.status === 201) {
                  newPositions[response.data.id] = response.data
                  savedCount++

                  // Mostrar progreso cada 10 posiciones
                  if (savedCount % 10 === 0) {
                    showNotification(`Importando... ${savedCount} posiciones guardadas`, "success")
                  }
                }
              } catch (error) {
                console.error("Error al guardar posición individual:", error)
                if (error.response?.data) {
                  console.error("Detalles del error:", JSON.stringify(error.response.data))
                }
                errorCount++
              }
            }
          }

          // 11. Actualizar el estado con las nuevas posiciones
          setPositions((prev) => {
            const updated = { ...prev, ...newPositions }
            updateAssignedDevices(updated)
            return updated
          })

          // 12. Mostrar resumen final
          const resultMessage = `Importación completada: ${savedCount} posiciones guardadas${
            errorCount > 0 ? `, ${errorCount} errores` : ""
          }`
          showNotification(resultMessage, errorCount > 0 ? "error" : "success")

          // 13. Recargar las posiciones para asegurar que se muestren correctamente
          await fetchPositions()
        } catch (error) {
          console.error("Error al procesar el archivo Excel:", error)
          showNotification("Error al procesar el archivo Excel: " + (error.message || "Error desconocido"), "error")
        } finally {
          setLoading(false)
        }
      }

      reader.onerror = () => {
        setLoading(false)
        showNotification("Error al leer el archivo", "error")
      }

      reader.readAsArrayBuffer(file)
    } catch (error) {
      console.error("Error en la importación:", error)
      showNotification("Error en la importación: " + (error.message || "Error desconocido"), "error")
      setLoading(false)
    }
  }

  // Función para exportar a Excel
  const exportToExcel = () => {
    try {
      setLoading(true)
      showNotification("Preparando exportación...", "success")

      // Filtrar las posiciones según el modo de visualización
      const positionsArray = showAllPositions
        ? Object.values(positions)
        : Object.values(positions).filter((pos) => pos.piso === selectedPiso)

      if (positionsArray.length === 0) {
        showNotification("No hay posiciones para exportar", "error")
        setLoading(false)
        return
      }

      // Crear una copia de los datos para la exportación
      const exportData = positionsArray.map((pos) => {
        // Convertir los objetos complejos a formatos más simples para Excel
        return {
          ...pos,
          dispositivos: Array.isArray(pos.dispositivos)
            ? pos.dispositivos.map((d) => (typeof d === "object" ? d.id : d)).join(", ")
            : pos.dispositivos,
          servicio: pos.servicio ? (typeof pos.servicio === "object" ? pos.servicio.id : pos.servicio) : "",
          sede: pos.sede ? (typeof pos.sede === "object" ? pos.sede.id : pos.sede) : "",
          // Convertir mergedCells a formato de texto para Excel
          mergedCellsText: JSON.stringify(pos.mergedCells),
          // Convertir bordeDetalle a formato de texto para Excel
          bordeDetalleText: JSON.stringify(pos.bordeDetalle),
        }
      })

      // Crear la hoja de cálculo
      const worksheet = XLSX.utils.json_to_sheet(exportData)

      // Aplicar estilos a las celdas
      const range = XLSX.utils.decode_range(worksheet["!ref"])

      for (let R = range.s.r + 1; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
          const cell = worksheet[cellAddress]

          if (!cell) continue

          const position = exportData[R - 1]
          if (position) {
            // Inicializar estilos si no existen
            if (!cell.s) cell.s = {}
            if (!cell.s.fill) cell.s.fill = {}
            if (!cell.s.font) cell.s.font = {}

            // Aplicar color de fondo
            const colorHex = position.servicio
              ? getServiceColor(position.servicio).replace("#", "")
              : position.colorOriginal || position.color.replace("#", "")

            cell.s.fill = {
              patternType: "solid",
              fgColor: { rgb: colorHex },
              bgColor: { rgb: colorHex },
            }

            // Aplicar color de texto
            cell.s.font.color = { rgb: position.colorFuente.replace("#", "") }
          }
        }
      }

      // Procesar celdas combinadas
      const merges = []
      positionsArray.forEach((pos) => {
        if (pos.mergedCells && pos.mergedCells.length > 1) {
          try {
            const cells = pos.mergedCells
            const rows = cells.map((c) => Number(c.row))
            const cols = cells.map((c) => XLSX.utils.decode_col(c.col))

            const startRow = Math.min(...rows) - 1
            const endRow = Math.max(...rows) - 1
            const startCol = Math.min(...cols)
            const endCol = Math.max(...cols)

            if (startRow >= 0 && startCol >= 0 && endRow >= startRow && endCol >= startCol) {
              merges.push({
                s: { r: startRow, c: startCol },
                e: { r: endRow, c: endCol },
              })
            }
          } catch (error) {
            console.error("Error al procesar celda combinada:", error, pos)
          }
        }
      })

      if (merges.length > 0) {
        worksheet["!merges"] = merges
      }

      // Crear el libro y añadir la hoja
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Posiciones")

      // Generar nombre de archivo con fecha y hora
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19)
      const fileName = showAllPositions
        ? `Todas_Posiciones_${timestamp}.xlsx`
        : `Posiciones_${selectedPiso}_${timestamp}.xlsx`

      // Convertir el libro a un array buffer
      const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" })

      // Crear un Blob con el array buffer
      const blob = new Blob([wbout], { type: "application/octet-stream" })

      // Crear una URL para el blob
      const url = URL.createObjectURL(blob)

      // Crear un elemento <a> para descargar el archivo
      const a = document.createElement("a")
      a.href = url
      a.download = fileName

      // Añadir el elemento al DOM, hacer clic en él y luego eliminarlo
      document.body.appendChild(a)
      a.click()

      // Limpiar
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 0)

      showNotification(`Exportación completada: ${positionsArray.length} posiciones exportadas`, "success")
    } catch (error) {
      console.error("Error al exportar:", error)
      showNotification("Error al exportar las posiciones: " + (error.message || "Error desconocido"), "error")
    } finally {
      setLoading(false)
    }
  }

  // Función para guardar una posición
  const savePosition = async () => {
    try {
      // Validar que no se excedan 5 dispositivos por posición
      if (newPosition.dispositivos.length > 5) {
        showNotification("No se pueden asignar más de 5 dispositivos a una posición", "error")
        return
      }

      // Convertir explícitamente los tipos de datos
      const fila = Number.parseInt(newPosition.fila, 10)

      // Normalizar los dispositivos - asegurarse de que es un array y contiene solo IDs válidos
      const normalizedDispositivos = Array.isArray(newPosition.dispositivos)
        ? newPosition.dispositivos
            .filter((d) => d !== null && d !== undefined) // Filtrar valores nulos o undefined
            .map((d) => (typeof d === "object" ? d.id : Number(d)))
        : []

      // Crear objeto con estructura completa incluyendo todos los campos requeridos
      const dataToSend = {
        nombre: newPosition.nombre || "",
        tipo: newPosition.tipo || "",
        estado: newPosition.estado || "disponible",
        detalles: newPosition.detalles || "",
        fila: fila,
        columna: newPosition.columna,
        color: newPosition.servicio ? getServiceColor(newPosition.servicio) : COLOR_DEFAULT,
        colorFuente: newPosition.colorFuente || "#000000",
        colorOriginal: newPosition.colorOriginal || "",
        borde: Boolean(newPosition.borde),
        bordeDoble: Boolean(newPosition.bordeDoble),
        piso: newPosition.piso || "PISO1",
        sede: newPosition.sede || null,
        servicio: newPosition.servicio || null,
        dispositivos: normalizedDispositivos,
        bordeDetalle: {
          top: Boolean(newPosition.bordeDetalle?.top),
          right: Boolean(newPosition.bordeDetalle?.right),
          bottom: Boolean(newPosition.bordeDetalle?.bottom),
          left: Boolean(newPosition.bordeDetalle?.left),
          topDouble: Boolean(newPosition.bordeDetalle?.topDouble),
          rightDouble: Boolean(newPosition.bordeDetalle?.rightDouble),
          bottomDouble: Boolean(newPosition.bordeDetalle?.bottomDouble),
          leftDouble: Boolean(newPosition.bordeDetalle?.leftDouble),
        },
        mergedCells:
          Array.isArray(newPosition.mergedCells) && newPosition.mergedCells.length > 0
            ? newPosition.mergedCells.map((cell) => ({
                row: Number(cell.row),
                col: cell.col,
              }))
            : [{ row: fila, col: newPosition.columna }],
        // Añadir un campo para indicar que no se debe crear un movimiento
        no_crear_movimiento: true,
        no_validar_usuario: true,
      }

      // Si es edición, agregar el ID
      if (newPosition.id && !isNaN(newPosition.id)) {
        dataToSend.id = newPosition.id
      }

      console.log("Datos a enviar:", JSON.stringify(dataToSend, null, 2))

      const method = newPosition.id ? "put" : "post"
      const url = newPosition.id ? `${API_URL}api/posiciones/${newPosition.id}/` : `${API_URL}api/posiciones/`

      const response = await axios[method](url, dataToSend, {
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("Respuesta del servidor:", response.data)
      showNotification("Posición guardada correctamente")

      // Recargar las posiciones para asegurar que se muestren correctamente
      await fetchPositions()

      setIsModalOpen(false)
      clearSelection()
    } catch (error) {
      console.error("Error al guardar posición:", error)
      console.error("Detalles del error:", error.response?.data)

      let errorMessage = "Error al guardar la posición"
      if (error.response?.data) {
        // Intentar mostrar errores de validación del backend
        if (typeof error.response.data === "object") {
          const validationErrors = Object.entries(error.response.data)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(", ") : errors}`)
            .join("\n")
          errorMessage += `:\n${validationErrors}`
        } else {
          errorMessage += `: ${error.response.data}`
        }
      }

      showNotification(errorMessage, "error")
    }
  }

  const deletePosition = async (id) => {
    try {
      if (!id) {
        showNotification("Error: No se puede eliminar una posición sin ID", "error")
        return
      }

      const response = await axios.delete(`${API_URL}api/posiciones/${id}/`)

      if (response.status === 204 || response.status === 200) {
        showNotification("Posición eliminada correctamente")

        // Actualizar el estado local eliminando la posición
        setPositions((prevPositions) => {
          const newPositions = { ...prevPositions }
          delete newPositions[id]

          // Actualizar el mapa de dispositivos asignados
          updateAssignedDevices(newPositions)

          return newPositions
        })

        setIsModalOpen(false)
      } else {
        throw new Error(`Error al eliminar: código de estado ${response.status}`)
      }
    } catch (error) {
      console.error("Error al eliminar posición:", error)
      let errorMessage = "Error al eliminar la posición"
      if (error.response?.data) {
        if (typeof error.response.data === "object") {
          errorMessage += ": " + JSON.stringify(error.response.data)
        } else {
          errorMessage += ": " + error.response.data
        }
      }
      showNotification(errorMessage, "error")
    }
  }

  const handleCellMouseDown = (row, col) => {
    setIsSelecting(true)
    setSelectionStart({ row, col })
    setSelectionEnd({ row, col })
  }

  const handleCellMouseEnter = (row, col) => {
    if (isSelecting) {
      setSelectionEnd({ row, col })
    }
  }

  const handleCellMouseUp = () => {
    if (isSelecting) {
      handleCreatePosition()
    }
    setIsSelecting(false)
  }

  const clearSelection = () => {
    setSelectionStart(null)
    setSelectionEnd(null)
    setIsSelecting(false)
  }

  const getSelectedCells = () => {
    if (!selectionStart || !selectionEnd) return []

    const startRow = Math.min(selectionStart.row, selectionEnd.row)
    const endRow = Math.max(selectionStart.row, selectionEnd.row)
    const startColIndex = Math.min(columns.indexOf(selectionStart.col), columns.indexOf(selectionEnd.col))
    const endColIndex = Math.max(columns.indexOf(selectionStart.col), columns.indexOf(selectionEnd.col))

    const cells = []
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startColIndex; c <= endColIndex; c++) {
        cells.push({ row: r, col: columns[c] })
      }
    }
    return cells
  }

  const isCellSelected = (row, col) => {
    if (!selectionStart || !selectionEnd) return false

    const startRow = Math.min(selectionStart.row, selectionEnd.row)
    const endRow = Math.max(selectionStart.row, selectionEnd.row)
    const startColIndex = Math.min(columns.indexOf(selectionStart.col), columns.indexOf(selectionEnd.col))
    const endColIndex = Math.max(columns.indexOf(selectionStart.col), columns.indexOf(selectionEnd.col))

    return (
      row >= startRow && row <= endRow && columns.indexOf(col) >= startColIndex && columns.indexOf(col) <= endColIndex
    )
  }

  const isCellInMergedArea = (row, col, position) => {
    if (!position?.mergedCells?.length) return false
    return position.mergedCells.some((cell) => {
      // Comparación estricta para evitar problemas de tipo
      return Number(cell.row) === Number(row) && cell.col === col
    })
  }

  const handleCreatePosition = () => {
    const selectedCells = getSelectedCells()
    if (selectedCells.length === 0) return

    const startCell = selectedCells[0]
    setNewPosition({
      id: null,
      nombre: "",
      tipo: "",
      estado: "disponible",
      detalles: "",
      fila: startCell.row,
      columna: startCell.col,
      color: COLOR_DEFAULT,
      colorFuente: "#000000",
      colorOriginal: "",
      borde: false,
      bordeDoble: false,
      bordeDetalle: {
        top: false,
        right: false,
        bottom: false,
        left: false,
        topDouble: false,
        rightDouble: false,
        bottomDouble: false,
        leftDouble: false,
      },
      piso: selectedPiso,
      sede: "",
      servicio: "",
      dispositivos: [],
      mergedCells: selectedCells,
    })
    setIsModalOpen(true)
  }

  const getNextColumn = (currentColumns) => {
    const lastColumn = currentColumns[currentColumns.length - 1]
    if (lastColumn.length === 1) {
      return lastColumn === "Z" ? "AA" : String.fromCharCode(lastColumn.charCodeAt(0) + 1)
    } else {
      const firstChar = lastColumn[0]
      const secondChar = lastColumn[1]
      return secondChar === "Z"
        ? String.fromCharCode(firstChar.charCodeAt(0) + 1) + "A"
        : firstChar + String.fromCharCode(secondChar.charCodeAt(0) + 1)
    }
  }

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.1, 2))
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.1, 0.5))
  const handleResetZoom = () => setZoomLevel(1)

  const handleAddNewPosition = () => {
    setNewPosition({
      id: null,
      nombre: "",
      tipo: "",
      estado: "disponible",
      detalles: "",
      fila: 1,
      columna: "A",
      color: COLOR_DEFAULT,
      colorFuente: "#000000",
      colorOriginal: "",
      borde: false,
      bordeDoble: false,
      bordeDetalle: {
        top: false,
        right: false,
        bottom: false,
        left: false,
        topDouble: false,
        rightDouble: false,
        bottomDouble: false,
        leftDouble: false,
      },
      piso: selectedPiso,
      sede: "",
      servicio: "",
      dispositivos: [],
      mergedCells: [],
    })
    setIsModalOpen(true)
  }

  // Función para agregar un dispositivo a la posición actual
  const addDeviceToPosition = (deviceId) => {
    // Verificar si ya tenemos 5 dispositivos
    if (newPosition.dispositivos.length >= 5) {
      showNotification("No se pueden asignar más de 5 dispositivos a una posición", "error")
      return
    }

    // Verificar si el dispositivo ya está asignado a otra posición
    if (assignedDevices[deviceId] && assignedDevices[deviceId] !== newPosition.id) {
      const positionWithDevice = Object.values(positions).find((p) => p.id === assignedDevices[deviceId])
      showNotification(
        `Este dispositivo ya está asignado a la posición ${positionWithDevice?.nombre || assignedDevices[deviceId]}`,
        "error",
      )
      return
    }

    // Agregar el dispositivo si no está ya en la lista
    if (!newPosition.dispositivos.includes(deviceId)) {
      setNewPosition({
        ...newPosition,
        dispositivos: [...newPosition.dispositivos, deviceId],
      })
    }
  }

  // Función para quitar un dispositivo de la posición actual
  const removeDeviceFromPosition = (deviceId) => {
    setNewPosition({
      ...newPosition,
      dispositivos: newPosition.dispositivos.filter((d) => d !== deviceId),
    })
  }

  // Función para filtrar dispositivos por término de búsqueda
  const filterDevices = (devices, searchTerm) => {
    if (!searchTerm) return devices

    return devices.filter((device) => {
      const deviceName = device.serial || device.nombre || device.modelo || `Dispositivo ${device.id}`
      return deviceName.toLowerCase().includes(searchTerm.toLowerCase())
    })
  }

  // Nueva función para obtener estadísticas por servicio
  const getServiceStatistics = () => {
    // Obtener todas las posiciones para la vista actual (filtradas por piso o todas)
    const positionsToAnalyze = showAllPositions
      ? Object.values(positions)
      : Object.values(positions).filter((pos) => pos.piso === selectedPiso)

    // Agrupar posiciones por servicio
    const serviceGroups = {}
    const serviceColors = {}
    const serviceAvailability = {}

    // Inicializar con la categoría "Sin servicio"
    serviceGroups["Sin servicio"] = 0
    serviceColors["Sin servicio"] = "#CCCCCC"
    serviceAvailability["Sin servicio"] = { disponible: 0, ocupado: 0, reservado: 0, inactivo: 0 }

    // Contar posiciones por servicio
    positionsToAnalyze.forEach((pos) => {
      const serviceName = pos.servicio
        ? typeof pos.servicio === "object"
          ? pos.servicio.nombre
          : getServiceName(pos.servicio)
        : "Sin servicio"

      // Contar por servicio
      if (!serviceGroups[serviceName]) {
        serviceGroups[serviceName] = 0
        serviceAvailability[serviceName] = { disponible: 0, ocupado: 0, reservado: 0, inactivo: 0 }
      }
      serviceGroups[serviceName]++

      // Almacenar color del servicio
      if (!serviceColors[serviceName] && pos.servicio) {
        serviceColors[serviceName] = getServiceColor(pos.servicio)
      }

      // Contar por estado de disponibilidad
      if (pos.estado === "disponible") {
        serviceAvailability[serviceName].disponible++
      } else if (pos.estado === "ocupado") {
        serviceAvailability[serviceName].ocupado++
      } else if (pos.estado === "reservado") {
        serviceAvailability[serviceName].reservado++
      } else if (pos.estado === "inactivo") {
        serviceAvailability[serviceName].inactivo++
      }
    })

    return { serviceGroups, serviceColors, serviceAvailability }
  }

  // Nueva función para preparar datos del gráfico
  const prepareChartData = () => {
    const { serviceGroups, serviceColors } = getServiceStatistics()

    const labels = Object.keys(serviceGroups)
    const data = Object.values(serviceGroups)
    const backgroundColor = labels.map((label) => serviceColors[label] || "#CCCCCC")

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor,
          borderColor: backgroundColor.map((color) => (color === "#CCCCCC" ? "#999999" : color)),
          borderWidth: 1,
        },
      ],
    }
  }

  // Nueva función para filtrar posiciones por servicio seleccionado
  const filterPositionsByService = (positionsArray) => {
    if (!selectedService) return positionsArray

    return positionsArray.filter((pos) => {
      const serviceName = pos.servicio
        ? typeof pos.servicio === "object"
          ? pos.servicio.nombre
          : getServiceName(pos.servicio)
        : "Sin servicio"

      return serviceName === selectedService
    })
  }

  // Modificar la variable filteredPositions para incluir el filtro de servicio
  const filteredPositions = filterPositionsByService(
    Object.values(positions).filter((pos) => {
      // Si estamos mostrando todas las posiciones, solo aplicamos el filtro de búsqueda
      if (showAllPositions) {
        return (
          searchTerm === "" ||
          (pos.nombre && pos.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (pos.servicio &&
            typeof pos.servicio === "object" &&
            pos.servicio.nombre &&
            pos.servicio.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (pos.servicio &&
            typeof pos.servicio === "string" &&
            getServiceName(pos.servicio).toLowerCase().includes(searchTerm.toLowerCase()))
        )
      }

      // Si estamos mostrando solo un piso, aplicamos ambos filtros
      return (
        pos.piso === selectedPiso &&
        (searchTerm === "" ||
          (pos.nombre && pos.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (pos.servicio &&
            typeof pos.servicio === "object" &&
            pos.servicio.nombre &&
            pos.servicio.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (pos.servicio &&
            typeof pos.servicio === "string" &&
            getServiceName(pos.servicio).toLowerCase().includes(searchTerm.toLowerCase())))
      )
    }),
  )

  // Nueva función para renderizar el panel de estadísticas
  const renderStatisticsPanel = () => {
    const { serviceGroups, serviceAvailability } = getServiceStatistics()
    const chartData = prepareChartData()

    // Calcular totales
    let totalPositions, totalDisponible, totalOcupado, totalReservado, totalInactivo

    if (selectedService) {
      // Si hay un servicio seleccionado, mostrar solo los datos de ese servicio
      totalPositions = serviceGroups[selectedService] || 0
      totalDisponible = serviceAvailability[selectedService]?.disponible || 0
      totalOcupado = serviceAvailability[selectedService]?.ocupado || 0
      totalReservado = serviceAvailability[selectedService]?.reservado || 0
      totalInactivo = serviceAvailability[selectedService]?.inactivo || 0
    } else {
      // Si no hay servicio seleccionado, mostrar los totales generales
      totalPositions = Object.values(serviceGroups).reduce((sum, count) => sum + count, 0)
      totalDisponible = Object.values(serviceAvailability).reduce((sum, status) => sum + status.disponible, 0)
      totalOcupado = Object.values(serviceAvailability).reduce((sum, status) => sum + status.ocupado, 0)
      totalReservado = Object.values(serviceAvailability).reduce((sum, status) => sum + status.reservado, 0)
      totalInactivo = Object.values(serviceAvailability).reduce((sum, status) => sum + status.inactivo, 0)
    }

    // Estilos inline para el panel de estadísticas
    const statsContainerStyle = {
      marginBottom: "20px",
      backgroundColor: "var(--surface)",
      borderRadius: "var(--radius)",
      padding: "15px",
      boxShadow: "var(--shadow)",
      border: "1px solid var(--border)",
    }

    const statsTitleStyle = {
      fontSize: "1.2rem",
      fontWeight: "600",
      marginBottom: "15px",
      color: "var(--text)",
      textAlign: "center",
    }

    const statsContentStyle = {
      display: "flex",
      flexWrap: "wrap",
      gap: "20px",
    }

    const chartContainerStyle = {
      flex: "1",
      minWidth: "300px",
      height: "300px",
      position: "relative",
    }

    const summaryContainerStyle = {
      flex: "1",
      minWidth: "300px",
    }

    const summaryHeaderStyle = {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "15px",
      flexWrap: "wrap",
      gap: "10px",
    }

    const summaryTitleStyle = {
      fontSize: "1.1rem",
      fontWeight: "600",
      margin: "0",
      color: "var(--text)",
    }

    const serviceFilterStyle = {
      display: "flex",
      alignItems: "center",
      gap: "10px",
    }

    const serviceSelectStyle = {
      padding: "6px 10px",
      backgroundColor: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-sm)",
      color: "var(--text)",
      fontSize: "0.9rem",
    }

    const summaryCardsStyle = {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
      gap: "15px",
    }

    const cardBaseStyle = {
      backgroundColor: "var(--surface)",
      borderRadius: "var(--radius)",
      padding: "15px",
      textAlign: "center",
      boxShadow: "var(--shadow)",
      transition: "transform 0.2s",
    }

    const cardTitleStyle = {
      fontSize: "0.9rem",
      fontWeight: "500",
      margin: "0 0 10px 0",
      color: "var(--text-secondary)",
    }

    const cardValueStyle = {
      fontSize: "1.8rem",
      fontWeight: "700",
      marginBottom: "5px",
      color: "var(--text)",
    }

    const cardPercentageStyle = {
      fontSize: "0.9rem",
      color: "var(--text-secondary)",
    }

    return (
      <div style={statsContainerStyle}>
        <h2 style={statsTitleStyle}>
          {selectedService
            ? `Estadísticas de Posiciones: ${selectedService}`
            : "Estadísticas de Posiciones por Servicio"}
        </h2>

        <div style={statsContentStyle}>
          {/* Contenedor del gráfico */}
          <div style={chartContainerStyle}>
            <Doughnut
              data={chartData}
              options={{
                plugins: {
                  legend: {
                    position: "right",
                    labels: {
                      color: "#e9e9e9",
                      usePointStyle: true,
                      padding: 20,
                      font: {
                        size: 12,
                      },
                    },
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const label = context.label || ""
                        const value = context.raw || 0
                        const percentage = Math.round(
                          (value / Object.values(serviceGroups).reduce((sum, count) => sum + count, 0)) * 100,
                        )
                        return `${label}: ${value} (${percentage}%)`
                      },
                    },
                  },
                },
                maintainAspectRatio: false,
                cutout: "70%",
                onClick: (event, elements) => {
                  if (elements.length > 0) {
                    const clickedIndex = elements[0].index
                    const clickedService = Object.keys(serviceGroups)[clickedIndex]
                    setSelectedService((prevService) => (prevService === clickedService ? "" : clickedService))
                  }
                },
              }}
            />
          </div>

          {/* Contenedor del resumen */}
          <div style={summaryContainerStyle}>
            <div style={summaryHeaderStyle}>
              <h3 style={summaryTitleStyle}>
                {selectedService ? `Resumen: ${selectedService}` : "Resumen de Posiciones"}
              </h3>
              <div style={serviceFilterStyle}>
                <label style={{ color: "#e9e9e9" }}>Filtrar por servicio: </label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  style={serviceSelectStyle}
                >
                  <option value="">Todos los servicios</option>
                  {Object.keys(serviceGroups).map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tarjetas de resumen */}
            <div style={summaryCardsStyle}>
              <div style={{ ...cardBaseStyle, borderLeft: "4px solid #6c63ff" }}>
                <h4 style={cardTitleStyle}>Total</h4>
                <div style={cardValueStyle}>{totalPositions}</div>
              </div>
              <div style={{ ...cardBaseStyle, borderLeft: "4px solid #28a745" }}>
                <h4 style={cardTitleStyle}>Disponibles</h4>
                <div style={cardValueStyle}>{totalDisponible}</div>
                <div style={cardPercentageStyle}>
                  {totalPositions > 0 ? Math.round((totalDisponible / totalPositions) * 100) : 0}%
                </div>
              </div>
              <div style={{ ...cardBaseStyle, borderLeft: "4px solid #ff4757" }}>
                <h4 style={cardTitleStyle}>Ocupadas</h4>
                <div style={cardValueStyle}>{totalOcupado}</div>
                <div style={cardPercentageStyle}>
                  {totalPositions > 0 ? Math.round((totalOcupado / totalPositions) * 100) : 0}%
                </div>
              </div>
              <div style={{ ...cardBaseStyle, borderLeft: "4px solid #ffc107" }}>
                <h4 style={cardTitleStyle}>Reservadas</h4>
                <div style={cardValueStyle}>{totalReservado}</div>
                <div style={cardPercentageStyle}>
                  {totalPositions > 0 ? Math.round((totalReservado / totalPositions) * 100) : 0}%
                </div>
              </div>
              <div style={{ ...cardBaseStyle, borderLeft: "4px solid #8d99ae" }}>
                <h4 style={cardTitleStyle}>Inactivas</h4>
                <div style={cardValueStyle}>{totalInactivo}</div>
                <div style={cardPercentageStyle}>
                  {totalPositions > 0 ? Math.round((totalInactivo / totalPositions) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Reemplazar la función handleEditPosition para manejar mejor los datos
  const handleEditPosition = (position) => {
    try {
      // Crear una copia segura del objeto
      const positionCopy = { ...position }

      // Normalizar los campos críticos
      const normalizedPosition = {
        ...positionCopy,
        // Asegurar que fila sea un número
        fila: Number.parseInt(positionCopy.fila, 10) || 1,

        // Normalizar dispositivos
        dispositivos: Array.isArray(positionCopy.dispositivos)
          ? positionCopy.dispositivos.map((d) => (typeof d === "object" ? d.id : Number(d)))
          : positionCopy.dispositivos
            ? [positionCopy.dispositivos]
            : [],

        // Normalizar servicio
        servicio:
          Array.isArray(positionCopy.servicio) && positionCopy.servicio.length > 0
            ? positionCopy.servicio[0]
            : positionCopy.servicio || "",

        // Normalizar sede
        sede: positionCopy.sede || "",

        // Normalizar colores
        colorFuente: positionCopy.colorFuente || positionCopy.fontColor || "#000000",
        colorOriginal: positionCopy.colorOriginal || "",
        color: positionCopy.color || COLOR_DEFAULT,

        // Normalizar bordes
        borde: Boolean(positionCopy.borde),
        bordeDoble: Boolean(positionCopy.bordeDoble),

        // Normalizar bordeDetalle
        bordeDetalle:
          typeof positionCopy.bordeDetalle === "object" && positionCopy.bordeDetalle !== null
            ? {
                top: Boolean(positionCopy.bordeDetalle.top),
                right: Boolean(positionCopy.bordeDetalle.right),
                bottom: Boolean(positionCopy.bordeDetalle.bottom),
                left: Boolean(positionCopy.bordeDetalle.left),
                topDouble: Boolean(positionCopy.bordeDetalle.topDouble),
                rightDouble: Boolean(positionCopy.bordeDetalle.rightDouble),
                bottomDouble: Boolean(positionCopy.bordeDetalle.bottomDouble),
                leftDouble: Boolean(positionCopy.bordeDetalle.leftDouble),
              }
            : {
                top: false,
                right: false,
                bottom: false,
                left: false,
                topDouble: false,
                rightDouble: false,
                bottomDouble: false,
                leftDouble: false,
              },

        // Normalizar mergedCells
        mergedCells:
          Array.isArray(positionCopy.mergedCells) && positionCopy.mergedCells.length > 0
            ? positionCopy.mergedCells.map((cell) => ({
                row: Number.parseInt(cell.row, 10) || Number.parseInt(positionCopy.fila, 10) || 1,
                col: cell.col || positionCopy.columna || "A",
              }))
            : [{ row: Number.parseInt(positionCopy.fila, 10) || 1, col: positionCopy.columna || "A" }],
      }

      setNewPosition(normalizedPosition)
      setIsModalOpen(true)
    } catch (error) {
      console.error("Error al editar posición:", error)
      showNotification("Error al preparar la posición para editar", "error")
    }
  }

  const handleBorderChange = (side, isDouble = false) => {
    const borderKey = isDouble ? `${side}Double` : side
    const updates = {
      [borderKey]: !newPosition.bordeDetalle[borderKey],
    }

    if (isDouble && updates[borderKey] === true) {
      updates[side] = true
    }

    if (!isDouble && updates[borderKey] === false) {
      updates[`${side}Double`] = false
    }

    const hasDoubleBorder = Object.entries(newPosition.bordeDetalle)
      .filter(([key]) => key.includes("Double"))
      .some((key, value) => (key !== borderKey ? value : updates[borderKey]))

    setNewPosition({
      ...newPosition,
      bordeDetalle: {
        ...newPosition.bordeDetalle,
        ...updates,
      },
      borde: Object.values({
        ...newPosition.bordeDetalle,
        ...updates,
      }).some(Boolean),
      bordeDoble: hasDoubleBorder,
    })
  }

  // Modificar la función renderTableCell para asegurar que todas las celdas se muestren correctamente
  const renderTableCell = (position, row, col, isSelected, isMainCell, colSpan, rowSpan) => {
    // Determinar el color de fondo basado en el servicio
    let backgroundColor

    if (isSelected) {
      backgroundColor = "rgba(108, 99, 255, 0.2)"
    } else if (position && position.servicio) {
      // Usar el color del servicio si existe
      backgroundColor = getServiceColor(position.servicio)
    } else {
      // Usar el color almacenado en la posición como respaldo
      backgroundColor = position?.color || COLOR_DEFAULT
    }

    const textColor = position?.colorFuente || position?.fontColor || getContrastColor(backgroundColor)

    // Añadir un borde más visible para todas las celdas que tienen posición
    const cellBorder = position ? "1px solid #000" : "1px solid var(--border)"

    return (
      <td
        key={`${row}-${col}`}
        colSpan={colSpan}
        rowSpan={rowSpan}
        onMouseDown={() => handleCellMouseDown(row, col)}
        onMouseEnter={() => handleCellMouseEnter(row, col)}
        onClick={() => position && handleEditPosition(position)}
        style={{
          backgroundColor,
          color: textColor,
          borderTop: position?.bordeDetalle?.topDouble
            ? "4px double black"
            : position?.bordeDetalle?.top
              ? "2px solid black"
              : cellBorder,
          borderBottom: position?.bordeDetalle?.bottomDouble
            ? "4px double black"
            : position?.bordeDetalle?.bottom
              ? "2px solid black"
              : cellBorder,
          borderLeft: position?.bordeDetalle?.leftDouble
            ? "4px double black"
            : position?.bordeDetalle?.left
              ? "2px solid black"
              : cellBorder,
          borderRight: position?.bordeDetalle?.rightDouble
            ? "4px double black"
            : position?.bordeDetalle?.right
              ? "2px solid black"
              : cellBorder,
          position: "relative",
          fontWeight: position?.fontWeight || "normal",
          fontSize: "0.8rem",
          // Añadir un indicador visual para todas las posiciones, incluso las vacías
          outline: position ? "1px solid rgba(0, 0, 0, 0.3)" : "none",
        }}
        className={`table-cell ${isSelected ? "selected" : ""} ${isMainCell ? "main-cell" : ""} ${position ? "has-position" : ""}`}
      >
        {position?.nombre || ""}
        {position && (
          <div
            className="status-indicator"
            style={{
              backgroundColor:
                position.estado === "disponible"
                  ? "green"
                  : position.estado === "ocupado"
                    ? "red"
                    : position.estado === "reservado"
                      ? "orange"
                      : "gray",
              // Hacer el indicador más visible
              width: "12px",
              height: "12px",
            }}
          />
        )}
      </td>
    )
  }

  // Renderizar la tabla de todas las posiciones
  const renderAllPositionsTable = () => {
    // Función para obtener el nombre del dispositivo por ID
    const getDeviceName = (deviceId) => {
      const device = allDevices.find((d) => d.id === Number(deviceId) || d.id === deviceId)
      return device ? device.nombre : `Dispositivo ${deviceId}`
    }

    return (
      <div className="all-positions-table">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Piso</th>
              <th>Fila</th>
              <th>Columna</th>
              <th>Estado</th>
              <th>Servicio</th>
              <th>Sede</th>
              <th>Dispositivos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredPositions.map((position) => (
              <tr key={position.id}>
                <td>{position.id}</td>
                <td>{position.nombre}</td>
                <td>{getPisoName(position.piso)}</td>
                <td>{position.fila}</td>
                <td>{position.columna}</td>
                <td>
                  <span
                    style={{
                      display: "inline-block",
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      backgroundColor:
                        position.estado === "disponible"
                          ? "green"
                          : position.estado === "ocupado"
                            ? "red"
                            : position.estado === "reservado"
                              ? "orange"
                              : "gray",
                      marginRight: "5px",
                    }}
                  ></span>
                  {ESTADOS.find((e) => e.value === position.estado)?.label || position.estado}
                </td>
                <td>
                  {typeof position.servicio === "object"
                    ? position.servicio?.nombre
                    : getServiceName(position.servicio)}
                </td>
                <td>{typeof position.sede === "object" ? position.sede?.nombre : getSedeName(position.sede)}</td>
                <td>
                  {position.dispositivos && position.dispositivos.length > 0
                    ? position.dispositivos.map((d) => getDeviceName(d)).join(", ")
                    : "Sin dispositivos"}
                </td>
                <td>
                  <button
                    className="action-button"
                    style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                    onClick={() => handleEditPosition(position)}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="controls-container">
        <div className="tabs">
          {PISOS.map((piso) => (
            <button
              key={piso.value}
              className={`tab-button ${selectedPiso === piso.value ? "active" : ""}`}
              onClick={() => setSelectedPiso(piso.value)}
            >
              {piso.label}
            </button>
          ))}
        </div>

        <div className="search-container">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <button className="action-buttonn" onClick={handleAddNewPosition}>
            <FaPlus /> Nueva Posición
          </button>

          <button className="action-buttonn" onClick={exportToExcel}>
            <FaUpload /> Exportar
          </button>

          <div className="import-container">
            <button className="action-buttonn" onClick={() => document.getElementById("import-excel").click()}>
              <FaDownload /> Importar
            </button>
            <input
              id="import-excel"
              type="file"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={importFromExcel}
            />
          </div>

          {/* Modificar los botones de navegación para establecer directamente el modo deseado */}
          <div className="action-buttonn" style={{ marginLeft: "10px" }}>
            <button
              className={`action-buttonn ${viewMode === "plano" ? "active" : ""}`}
              onClick={() => setViewMode("plano")}
              title="Ver plano"
            >
              <FaTable /> Plano
            </button>
            <button
              className={`action-buttonn ${viewMode === "tabla" ? "active" : ""}`}
              onClick={() => setViewMode("tabla")}
              title="Ver tabla"
            >
              <FaList /> Tabla
            </button>

            {/* Botón para mostrar estadísticas */}
            <button
              className={`action-buttonn ${viewMode === "estadisticas" ? "active" : ""}`}
              onClick={() => setViewMode("estadisticas")}
              title="Estadísticas"
            >
              <FaChartPie /> Estadísticas
            </button>

            {/* Checkbox para mostrar todas las posiciones */}
            <label style={{ display: "flex", alignItems: "center", marginLeft: "10px" }}>
              <input
                type="checkbox"
                checked={showAllPositions}
                onChange={() => setShowAllPositions(!showAllPositions)}
                style={{ marginRight: "5px" }}
              />
              Mostrar todas las posiciones
            </label>
          </div>
        </div>
      </div>

      {viewMode === "estadisticas" && renderStatisticsPanel()}

      {viewMode === "plano" && (
        <>
          <div className="zoom-controls">
            <button className="zoom-button" onClick={handleZoomIn}>
              <FaSearchPlus />
            </button>
            <button className="zoom-button" onClick={handleZoomOut}>
              <FaSearchMinus />
            </button>
            <button className="zoom-button" onClick={handleResetZoom}>
              <FaUndo />
            </button>
            <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>

            <div className="divider"></div>

            <button className="control-button" onClick={() => setRows(rows + 1)}>
              <FaPlus className="mr-2" /> Agregar Fila
            </button>
            <button className="control-button" onClick={() => setColumns([...columns, getNextColumn(columns)])}>
              <FaPlus className="mr-2" /> Agregar Columna
            </button>
          </div>

          <div
            className="table-container"
            ref={tableContainerRef}
            onMouseLeave={() => setIsSelecting(false)}
            onMouseUp={handleCellMouseUp}
          >
            <table className="table" style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top left" }}>
              <thead>
                <tr>
                  <th className="fixed-header"></th>
                  {columns.map((col) => (
                    <th key={col} className="column-header">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: rows }, (_, i) => i + 1).map((row) => (
                  <tr key={row}>
                    <td className="row-header">{row}</td>
                    {columns.map((col) => {
                      const position = filteredPositions.find(
                        (pos) => pos.piso === selectedPiso && pos.fila === row && pos.columna === col,
                      )
                      const isSelected = isCellSelected(row, col)

                      // Verificar si la celda es parte de un área combinada
                      const mergedAreaPosition = filteredPositions.find(
                        (pos) => pos.piso === selectedPiso && isCellInMergedArea(row, col, pos),
                      )

                      // Si la celda está en un área combinada, omitir la renderización si no es la celda principal
                      if (mergedAreaPosition) {
                        const isMainCell = mergedAreaPosition.mergedCells.some(
                          (cell) =>
                            cell.row === row &&
                            cell.col === col &&
                            mergedAreaPosition.fila === row &&
                            mergedAreaPosition.columna === col,
                        )

                        if (!isMainCell) {
                          return null // No renderizar la celda si no es la celda principal
                        }

                        // Calcular colSpan y rowSpan para la celda principal
                        const rows = mergedAreaPosition.mergedCells.map((c) => Number(c.row))
                        const cols = mergedAreaPosition.mergedCells.map((c) => columns.indexOf(c.col))

                        const startRow = Math.min(...rows)
                        const endRow = Math.max(...rows)
                        const startColIndex = Math.min(...cols)
                        const endColIndex = Math.max(...cols)

                        const colSpan = endColIndex - startColIndex + 1
                        const rowSpan = endRow - startRow + 1

                        return renderTableCell(mergedAreaPosition, row, col, isSelected, true, colSpan, rowSpan)
                      }

                      return renderTableCell(position, row, col, isSelected, false, 1, 1)
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {viewMode === "tabla" && renderAllPositionsTable()}

      <div className={`notification ${notification.type}`} style={{ display: notification.show ? "block" : "none" }}>
        {notification.message}
      </div>

      {loading && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="loader"></div>
            <h1 className="h11">Cargando posiciones...</h1>
            <p className="pp">Por favor, espera mientras se procesan los datos.</p>
          </div>
        </div>
      )}

      {notification.show && (
        <div className="notification-overlay">
          <div className={`notification-modal ${notification.type}`}>
            <div className="notification-icon">
              {notification.type === "success" ? <FaCheck /> : <FaExclamationTriangle />}
            </div>
            <p>{notification.message}</p>
          </div>
        </div>
      )}

      {/* Modal para crear/editar posición */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <button
              className="close-button"
              onClick={() => {
                setIsModalOpen(false)
                clearSelection()
              }}
            >
              <FaTimes />
            </button>
            <h2 className="h11">{newPosition.id ? "Editar Posición" : "Agregar Posición"}</h2>

            <div className="form-grid">
              <div className="form-group">
                <label>Id:</label>
                <input value={newPosition.id || ""} disabled={true} placeholder="Se asignará automáticamente" />
              </div>

              <div className="form-group">
                <label>Nombre:</label>
                <input
                  value={newPosition.nombre || ""}
                  onChange={(e) => setNewPosition({ ...newPosition, nombre: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Tipo:</label>
                <input
                  value={newPosition.tipo || ""}
                  onChange={(e) => setNewPosition({ ...newPosition, tipo: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Estado:</label>
                <div className="select-with-preview">
                  <select
                    value={newPosition.estado}
                    onChange={(e) => setNewPosition({ ...newPosition, estado: e.target.value })}
                  >
                    {ESTADOS.map((estado) => (
                      <option key={estado.value} value={estado.value}>
                        {estado.label}
                      </option>
                    ))}
                  </select>
                  <div
                    className="estado-preview"
                    style={{ backgroundColor: ESTADOS.find((e) => e.value === newPosition.estado)?.color }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Servicio:</label>
                <div className="select-with-preview">
                  <select
                    value={newPosition.servicio || ""}
                    onChange={(e) => setNewPosition({ ...newPosition, servicio: e.target.value })}
                  >
                    <option value="">Seleccione un servicio</option>
                    {servicios.map((servicio) => (
                      <option key={servicio.id} value={servicio.id}>
                        {servicio.nombre}
                      </option>
                    ))}
                  </select>
                  <div
                    className="color-preview"
                    style={{
                      backgroundColor: newPosition.servicio ? getServiceColor(newPosition.servicio) : COLOR_DEFAULT,
                    }}
                  />
                </div>
                {newPosition.servicio && (
                  <div className="text-muted">El color de la celda se determinará por el servicio seleccionado</div>
                )}
              </div>

              <div className="form-group">
                <label>Color de Texto:</label>
                <div className="select-with-preview">
                  <input
                    type="color"
                    value={newPosition.colorFuente}
                    onChange={(e) => setNewPosition({ ...newPosition, colorFuente: e.target.value })}
                    className="color-input"
                  />
                  <div className="color-preview" style={{ backgroundColor: newPosition.colorFuente }} />
                </div>
              </div>

              <div className="form-group">
                <label>Piso:</label>
                <select
                  value={newPosition.piso}
                  onChange={(e) => setNewPosition({ ...newPosition, piso: e.target.value })}
                >
                  {PISOS.map((piso) => (
                    <option key={piso.value} value={piso.value}>
                      {piso.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Fila:</label>
                <input
                  type="number"
                  value={newPosition.fila}
                  onChange={(e) => setNewPosition({ ...newPosition, fila: Number.parseInt(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label>Columna:</label>
                <input
                  value={newPosition.columna}
                  onChange={(e) => setNewPosition({ ...newPosition, columna: e.target.value })}
                />
              </div>

              <div className="form-group full-width">
                <label>Bordes:</label>
                <div className="border-controls">
                  <div className="border-control-group">
                    <button
                      type="button"
                      className={`border-button ${newPosition.bordeDetalle?.top ? "active" : ""}`}
                      onClick={() => handleBorderChange("top")}
                    >
                      Superior
                    </button>
                    <button
                      type="button"
                      className={`border-button ${newPosition.bordeDetalle?.topDouble ? "active" : ""}`}
                      onClick={() => handleBorderChange("top", true)}
                    >
                      Doble
                    </button>
                  </div>
                  <div className="border-control-group">
                    <button
                      type="button"
                      className={`border-button ${newPosition.bordeDetalle?.bottom ? "active" : ""}`}
                      onClick={() => handleBorderChange("bottom")}
                    >
                      Inferior
                    </button>
                    <button
                      type="button"
                      className={`border-button ${newPosition.bordeDetalle?.bottomDouble ? "active" : ""}`}
                      onClick={() => handleBorderChange("bottom", true)}
                    >
                      Doble
                    </button>
                  </div>
                  <div className="border-control-group">
                    <button
                      type="button"
                      className={`border-button ${newPosition.bordeDetalle?.left ? "active" : ""}`}
                      onClick={() => handleBorderChange("left")}
                    >
                      Izquierdo
                    </button>
                    <button
                      type="button"
                      className={`border-button ${newPosition.bordeDetalle?.leftDouble ? "active" : ""}`}
                      onClick={() => handleBorderChange("left", true)}
                    >
                      Doble
                    </button>
                  </div>
                  <div className="border-control-group">
                    <button
                      type="button"
                      className={`border-button ${newPosition.bordeDetalle?.right ? "active" : ""}`}
                      onClick={() => handleBorderChange("right")}
                    >
                      Derecho
                    </button>
                    <button
                      type="button"
                      className={`border-button ${newPosition.bordeDetalle?.rightDouble ? "active" : ""}`}
                      onClick={() => handleBorderChange("right", true)}
                    >
                      Doble
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-group full-width">
                <label>Sede:</label>
                <select
                  value={newPosition.sede || ""}
                  onChange={(e) => setNewPosition({ ...newPosition, sede: e.target.value })}
                >
                  <option value="">Seleccione una sede</option>
                  {sedes.map((sede) => (
                    <option key={sede.id} value={sede.id}>
                      {sede.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sección de dispositivos mejorada */}
              <div className="form-group full-width">
                <label>Dispositivos: ({newPosition.dispositivos.length}/5)</label>

                {/* Barra de búsqueda de dispositivos */}
                <div style={{ marginBottom: "10px" }}>
                  <div className="search-box" style={{ width: "100%" }}>
                    <FaSearch className="search-icon" />
                    <input
                      type="text"
                      placeholder="Buscar dispositivos..."
                      value={deviceSearchTerm}
                      onChange={(e) => setDeviceSearchTerm(e.target.value)}
                      className="search-input"
                    />
                  </div>
                </div>

                {/* Contenedor de selección de dispositivos */}
                <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                  {/* Columna de dispositivos disponibles */}
                  <div style={{ flex: 1, border: "1px solid #444", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ background: "#333", padding: "8px", borderBottom: "1px solid #444" }}>
                      <h4 style={{ margin: 0, fontSize: "14px", color: "#fff" }}>
                        Dispositivos Disponibles {newPosition.sede ? `(Sede: ${getSedeName(newPosition.sede)})` : ""}
                      </h4>
                    </div>
                    <div style={{ maxHeight: "200px", overflowY: "auto", background: "#222" }}>
                      {filterDevices(getAvailableDevices(newPosition.id), deviceSearchTerm).length === 0 ? (
                        <div style={{ padding: "10px", color: "#888", textAlign: "center" }}>
                          {deviceSearchTerm
                            ? "No se encontraron dispositivos con ese término"
                            : newPosition.sede
                              ? "No hay dispositivos disponibles para esta sede"
                              : "No hay dispositivos disponibles"}
                        </div>
                      ) : (
                        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                          {filterDevices(getAvailableDevices(newPosition.id), deviceSearchTerm).map((dispositivo) => (
                            <li
                              key={dispositivo.id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "8px 12px",
                                borderBottom: "1px solid #333",
                                background: newPosition.dispositivos.includes(dispositivo.id)
                                  ? "rgba(76, 175, 80, 0.1)"
                                  : "transparent",
                              }}
                            >
                              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                                {dispositivo.serial ||
                                  dispositivo.nombre ||
                                  dispositivo.modelo ||
                                  `Dispositivo ${dispositivo.id}`}
                              </span>
                              <button
                                type="button"
                                style={{
                                  backgroundColor: newPosition.dispositivos.length >= 5 ? "#555" : "transparent",
                                  border: "none",
                                  width: "24px",
                                  height: "24px",
                                  borderRadius: "50%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: newPosition.dispositivos.length >= 5 ? "not-allowed" : "pointer",
                                  fontWeight: "bold",
                                  fontSize: "16px",
                                  color: newPosition.dispositivos.length >= 5 ? "#888" : "#4CAF50",
                                }}
                                onClick={() => addDeviceToPosition(dispositivo.id)}
                                disabled={newPosition.dispositivos.length >= 5}
                                title={
                                  newPosition.dispositivos.length >= 5
                                    ? "Máximo 5 dispositivos permitidos"
                                    : "Agregar dispositivo"
                                }
                              >
                                +
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Columna de dispositivos seleccionados */}
                  <div style={{ flex: 1, border: "1px solid #444", borderRadius: "4px", overflow: "hidden" }}>
                    <div
                      style={{
                        background: "#333",
                        padding: "8px",
                        borderBottom: "1px solid #444",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <h4 style={{ margin: 0, fontSize: "14px", color: "#fff" }}>Dispositivos Seleccionados</h4>
                      <span
                        style={{
                          fontSize: "12px",
                          color: newPosition.dispositivos.length >= 5 ? "#ff4757" : "#fff",
                          fontWeight: newPosition.dispositivos.length >= 5 ? "bold" : "normal",
                        }}
                      >
                        {newPosition.dispositivos.length}/5
                      </span>
                    </div>
                    <div style={{ maxHeight: "200px", overflowY: "auto", background: "#222" }}>
                      {newPosition.dispositivos.length === 0 ? (
                        <div style={{ padding: "10px", color: "#888", textAlign: "center" }}>
                          No hay dispositivos seleccionados
                        </div>
                      ) : (
                        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                          {newPosition.dispositivos.map((id) => {
                            const device = allDevices.find((d) => d.id === id || d.id === Number(id))
                            return (
                              <li
                                key={id}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "8px 12px",
                                  borderBottom: "1px solid #333",
                                }}
                              >
                                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {device
                                    ? device.serial || device.nombre || device.modelo || `Dispositivo ${id}`
                                    : `Dispositivo ${id}`}
                                </span>
                                <button
                                  type="button"
                                  style={{
                                    backgroundColor: "transparent",
                                    border: "none",
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                    fontSize: "16px",
                                    color: "#F44336",
                                  }}
                                  onClick={() => removeDeviceFromPosition(id)}
                                  title="Quitar dispositivo"
                                >
                                  ×
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group full-width">
                <label>Detalles:</label>
                <textarea
                  value={newPosition.detalles || ""}
                  onChange={(e) => setNewPosition({ ...newPosition, detalles: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="form-group full-width">
                <label>Celdas Combinadas:</label>
                <div className="merged-cells-list">
                  {newPosition.mergedCells && newPosition.mergedCells.length > 0 ? (
                    <div className="merged-cells-grid">
                      {newPosition.mergedCells.map((cell, index) => (
                        <div key={index} className="merged-cell-item">
                          {cell.col}
                          {cell.row}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted">No hay celdas combinadas</div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-buttons">
              <button className="save-button" onClick={savePosition}>
                Guardar
              </button>
              {newPosition.id && (
                <button className="delete-button" onClick={() => deletePosition(newPosition.id)}>
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FloorPlan
