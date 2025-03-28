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
} from "react-icons/fa"
import * as XLSX from "xlsx"
import "../styles/Plans.css"

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
const COLOR_DEFAULT = "#B0BEC5"

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

const cleanHexColor = (hexColor) => {
  if (!hexColor) return "#FFFFFF"
  try {
    let cleanedColor = hexColor.startsWith("#") ? hexColor : `#${hexColor}`
    if (cleanedColor.length === 9 && cleanedColor.startsWith("#FF")) {
      cleanedColor = `#${cleanedColor.substring(3)}`
    }
    if (!/^#[0-9A-F]{6}$/i.test(cleanedColor)) {
      return "#FFFFFF"
    }
    return cleanedColor
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

    if (cell.s.fill.fgColor) {
      if (cell.s.fill.fgColor.rgb) {
        color = cleanColor(cell.s.fill.fgColor.rgb)
      } else if (cell.s.fill.fgColor.theme !== undefined) {
        const themeColors = {
          0: "FFFFFF",
          1: "000000",
          2: "E7E6E6",
          3: "44546A",
          4: "4472C4",
          5: "ED7D31",
          6: "A5A5A5",
          7: "FFC000",
          8: "5B9BD5",
          9: "70AD47",
        }
        color = themeColors[cell.s.fill.fgColor.theme] || "FFFFFF"
      } else if (cell.s.fill.fgColor.indexed !== undefined) {
        const indexedColors = {
          0: "000000",
          1: "FFFFFF",
          2: "FF0000",
          3: "00FF00",
          4: "0000FF",
          5: "FFFF00",
          6: "FF00FF",
          7: "00FFFF",
          8: "000000",
          9: "FFFFFF",
        }
        color = indexedColors[cell.s.fill.fgColor.indexed] || "FFFFFF"
      }
    }

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
          5: "ED7D31",
          6: "A5A5A5",
          7: "FFC000",
          8: "5B9BD5",
          9: "70AD47",
        }
        color = themeColors[cell.s.fill.bgColor.theme] || "FFFFFF"
      } else if (cell.s.fill.bgColor.indexed !== undefined) {
        const indexedColors = {
          0: "000000",
          1: "FFFFFF",
          2: "FF0000",
          3: "00FF00",
          4: "0000FF",
          5: "FFFF00",
          6: "FF00FF",
          7: "00FFFF",
          8: "000000",
          9: "FFFFFF",
        }
        color = indexedColors[cell.s.fill.bgColor.indexed] || "FFFFFF"
      }
    }

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
          5: "ED7D31",
          6: "A5A5A5",
          7: "FFC000",
          8: "5B9BD5",
          9: "70AD47",
        }
        color = themeColors[cell.s.fill.color.theme] || "FFFFFF"
      } else if (cell.s.fill.color && cell.s.fill.color.indexed !== undefined) {
        const indexedColors = {
          0: "000000",
          1: "FFFFFF",
          2: "FF0000",
          3: "00FF00",
          4: "0000FF",
          5: "FFFF00",
          6: "FF00FF",
          7: "00FFFF",
          8: "000000",
          9: "FFFFFF",
        }
        color = indexedColors[cell.s.fill.color.indexed] || "FFFFFF"
      }
    }

    if (!color && cell.s.fill.start && cell.s.fill.end) {
      if (cell.s.fill.start.rgb) {
        color = cleanColor(cell.s.fill.start.rgb)
      } else if (cell.s.fill.end.rgb) {
        color = cleanColor(cell.s.fill.end.rgb)
      }
    }

    if (!color || color === "auto") {
      return { color: "#FFFFFF", originalColor: "FFFFFF" }
    }

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
  const [selectionStart, setSelectionStart] = useState(null)
  const [selectionEnd, setSelectionEnd] = useState(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState({ show: false, message: "", type: "success" })
  const tableContainerRef = useRef(null)

  // Estados para los selectores
  const [servicios, setServicios] = useState([])
  const [sedes, setSedes] = useState([])
  const [dispositivos, setDispositivos] = useState([])

  // Función para cargar los datos de los selectores
  const fetchSelectorData = async () => {
    try {
      const [serviciosResponse, sedesResponse, dispositivosResponse] = await Promise.all([
        axios.get(`${API_URL}api/servicios/`),
        axios.get(`${API_URL}api/sedes/`),
        axios.get(`${API_URL}api/dispositivos/`),
      ])

      setServicios(serviciosResponse.data)
      setSedes(sedesResponse.data)
      setDispositivos(dispositivosResponse.data)
    } catch (error) {
      console.error("Error al cargar datos para selectores:", error)
      showNotification("Error al cargar datos para selectores", "error")
    }
  }

  // Cargar datos iniciales
  useEffect(() => {
    fetchSelectorData()
    fetchPositions()
  }, [selectedPiso]) // Solo depende de selectedPiso

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

  // Reemplazar la función fetchPositions para manejar mejor los datos recibidos
  const fetchPositions = async () => {
    try {
      setLoading(true)
      const url = `${API_URL}api/posiciones/`
      const response = await axios.get(url)

      let positionsData = []
      if (response.data && Array.isArray(response.data)) {
        positionsData = response.data
      } else if (response.data && Array.isArray(response.data.results)) {
        positionsData = response.data.results
      } else {
        positionsData = []
      }

      // Convertir el array a un objeto con id como clave
      const positionsObj = positionsData.reduce((acc, pos) => {
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

            // Asegurar que dispositivos sea un array
            dispositivos: Array.isArray(pos.dispositivos)
              ? pos.dispositivos
              : pos.dispositivos
                ? [pos.dispositivos]
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

      setPositions(positionsObj)
      console.log("Posiciones cargadas:", positionsObj)
    } catch (error) {
      console.error("Error al obtener posiciones:", error)
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

  // Función para guardar posición
  const savePosition = async () => {
    try {
      // Convertir explícitamente los tipos de datos para asegurar compatibilidad
      const fila = Number.parseInt(newPosition.fila, 10)

      // Crear un objeto básico con solo los campos esenciales primero
      // Omitir el ID para nuevas posiciones para que el backend lo asigne
      const isEdit = newPosition.id && !newPosition.id.toString().startsWith("pos_")

      const basicData = {
        // Solo incluir ID si es una edición y el ID es numérico
        ...(isEdit ? { id: newPosition.id } : {}),
        nombre: newPosition.nombre || "",
        tipo: newPosition.tipo || "",
        estado: newPosition.estado || "disponible",
        detalles: newPosition.detalles || "",
        fila: fila,
        columna: newPosition.columna,
        // El color ahora se determina por el servicio, pero mantenemos el campo por compatibilidad
        color: newPosition.servicio ? getServiceColor(newPosition.servicio) : COLOR_DEFAULT,
        colorFuente: newPosition.colorFuente || "#000000",
        piso: newPosition.piso || "PISO1",
      }

      // Agregar campos adicionales con cuidado
      const dataToSend = {
        ...basicData,
        // Campos opcionales con valores por defecto seguros
        colorOriginal: newPosition.colorOriginal || "",
        borde: Boolean(newPosition.borde),
        bordeDoble: Boolean(newPosition.bordeDoble),

        // Manejar campos de relación con cuidado
        sede: newPosition.sede || null,
        servicio: newPosition.servicio || null,

        // Asegurar que dispositivos sea un array simple de IDs
        dispositivos: Array.isArray(newPosition.dispositivos)
          ? newPosition.dispositivos.filter((d) => d).map((d) => (typeof d === "object" ? d.id : d))
          : [],

        // Asegurar que bordeDetalle sea un objeto simple
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

        // Asegurar que mergedCells sea un array simple con estructura correcta
        mergedCells:
          Array.isArray(newPosition.mergedCells) && newPosition.mergedCells.length > 0
            ? newPosition.mergedCells.map((cell) => ({
                row: Number.parseInt(cell.row, 10),
                col: cell.col,
              }))
            : [{ row: fila, col: newPosition.columna }],
      }

      const method = isEdit ? "put" : "post"
      const url = isEdit ? `${API_URL}api/posiciones/${newPosition.id}/` : `${API_URL}api/posiciones/`

      console.log("Enviando datos:", JSON.stringify(dataToSend, null, 2)) // Logging detallado

      // Intentar primero con JSON
      try {
        const response = await axios[method](url, dataToSend, {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        })

        console.log("Respuesta del servidor:", response.data)
        showNotification("Posición guardada correctamente")
        fetchPositions()
        setIsModalOpen(false)
        clearSelection()
      } catch (jsonError) {
        console.error("Error al enviar como JSON:", jsonError)

        // Si falla con JSON, intentar con FormData como alternativa
        const formData = new FormData()
        Object.entries(dataToSend).forEach(([key, value]) => {
          if (key === "mergedCells" || key === "bordeDetalle" || key === "dispositivos") {
            formData.append(key, JSON.stringify(value))
          } else {
            formData.append(key, value)
          }
        })

        const formResponse = await axios[method](url, formData)
        console.log("Respuesta del servidor (FormData):", formResponse.data)
        showNotification("Posición guardada correctamente")
        fetchPositions()
        setIsModalOpen(false)
        clearSelection()
      }
    } catch (error) {
      console.error("Error al guardar posición:", error)
      console.error("Detalles del error:", error.response?.data)

      let errorMessage = "Error al guardar la posición"
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
    const startCol = Math.min(columns.indexOf(selectionStart.col), columns.indexOf(selectionEnd.col))
    const endCol = Math.max(columns.indexOf(selectionStart.col), columns.indexOf(selectionEnd.col))

    const cells = []
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        cells.push({ row: r, col: columns[c] })
      }
    }
    return cells
  }

  const isCellSelected = (row, col) => {
    if (!selectionStart || !selectionEnd) return false

    const startRow = Math.min(selectionStart.row, selectionEnd.row)
    const endRow = Math.max(selectionStart.row, selectionEnd.row)
    const startCol = Math.min(columns.indexOf(selectionStart.col), columns.indexOf(selectionEnd.col))
    const endCol = Math.max(columns.indexOf(selectionStart.col), columns.indexOf(selectionEnd.col))

    return row >= startRow && row <= endRow && columns.indexOf(col) >= startCol && columns.indexOf(col) <= endCol
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

  const exportToExcel = () => {
    try {
      const positionsArray = Object.values(positions).filter((pos) => pos.piso === selectedPiso)
      const worksheet = XLSX.utils.json_to_sheet(positionsArray)
      const range = XLSX.utils.decode_range(worksheet["!ref"])

      for (let R = range.s.r + 1; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
          const cell = worksheet[cellAddress]

          if (!cell) continue

          const position = positionsArray[R - 1]
          if (position) {
            if (!cell.s) cell.s = {}
            if (!cell.s.fill) cell.s.fill = {}

            // Usar el color del servicio si existe
            const colorHex = position.servicio
              ? getServiceColor(position.servicio).replace("#", "")
              : position.colorOriginal || position.color.replace("#", "")

            const fgColor = { rgb: colorHex } // Declare fgColor here
            cell.s.fill = {
              patternType: "solid",
              fgColor: fgColor,
              bgColor: fgColor,
            }

            if (!cell.s.font) cell.s.font = {}
            cell.s.font.color = { rgb: position.colorFuente.replace("#", "") }
          }
        }
      }

      const merges = []
      positionsArray.forEach((pos) => {
        if (pos.mergedCells && pos.mergedCells.length > 1) {
          const cells = pos.mergedCells
          const rows = cells.map((c) => c.row)
          const cols = cells.map((c) => {
            try {
              return XLSX.utils.decode_col(c.col)
            } catch (error) {
              console.error(`Error decodificando columna ${c.col}:`, error)
              return 0
            }
          })

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
        }
      })

      if (merges.length > 0) {
        worksheet["!merges"] = merges
      }

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Posiciones")
      XLSX.writeFile(workbook, `Posiciones_${selectedPiso}_${new Date().toISOString().split("T")[0]}.xlsx`)

      showNotification("Exportación completada correctamente")
    } catch (error) {
      console.error("Error al exportar:", error)
      showNotification("Error al exportar las posiciones", "error")
    }
  }

  const importFromExcel = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setLoading(true)

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const currentPositions = Object.values(positions).filter((p) => p.piso === selectedPiso)
        for (const pos of currentPositions) {
          try {
            await axios.delete(`${API_URL}api/posiciones/${pos.id}/`)
          } catch (error) {
            console.error(`Error al eliminar posición existente: ${pos.id}`, error)
          }
        }

        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, {
          type: "array",
          cellStyles: true,
        })

        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const range = XLSX.utils.decode_range(worksheet["!ref"])

        const mergedCellsInfo = worksheet["!merges"] || []
        const cellToPositionMap = {}
        const newPositions = {}

        for (let i = 0; i < mergedCellsInfo.length; i++) {
          const mergeInfo = mergedCellsInfo[i]
          const startRow = mergeInfo.s.r
          const startCol = mergeInfo.s.c
          const endRow = mergeInfo.e.r
          const endCol = mergeInfo.e.c

          const mainCellAddress = XLSX.utils.encode_cell({ r: startRow, c: startCol })
          const mainCell = worksheet[mainCellAddress]

          let cellValue = ""
          if (mainCell) {
            cellValue = mainCell.v || ""
            if (typeof cellValue === "object" && cellValue !== null) {
              cellValue = String(cellValue)
            } else {
              cellValue = String(cellValue).trim()
            }
          }

          let cellColor = "#FFFFFF"
          let originalColor = "FFFFFF"

          if (mainCell) {
            const colorInfo = extractColor(mainCell)
            cellColor = colorInfo.color
            originalColor = colorInfo.originalColor
          }

          cellColor = cleanHexColor(cellColor)

          const mergedCells = []
          for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
              const actualRow = r + 1
              const colLetter = XLSX.utils.encode_col(c)
              mergedCells.push({ row: actualRow, col: colLetter })
              cellToPositionMap[`${actualRow}-${colLetter}`] = true
            }
          }

          const actualStartRow = startRow + 1
          const startColLetter = XLSX.utils.encode_col(startCol)
          const id = null // Cambiado a null para que el backend asigne un ID numérico

          const position = {
            id,
            nombre: cellValue,
            fila: actualStartRow,
            columna: startColLetter,
            color: COLOR_DEFAULT, // Usamos el color por defecto, el servicio determinará el color real
            colorFuente: getContrastColor(COLOR_DEFAULT),
            colorOriginal: originalColor,
            piso: selectedPiso,
            estado: "disponible",
            detalles: "",
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
            sede: "",
            servicio: "",
            dispositivos: [],
            mergedCells: mergedCells,
          }

          try {
            const response = await axios.post(`${API_URL}api/posiciones/`, position)
            if (response.status === 201) {
              newPositions[response.data.id] = response.data
            } else {
              console.error(`Error al importar posición combinada: ${id}`, response.data)
            }
          } catch (error) {
            console.error(`Error al guardar posición combinada:`, error)
          }
        }

        for (let row = range.s.r; row <= range.e.r; row++) {
          for (let col = range.s.c; col <= range.e.c; col++) {
            const actualRow = row + 1
            const colLetter = XLSX.utils.encode_col(col)

            if (cellToPositionMap[`${actualRow}-${colLetter}`]) {
              continue
            }

            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
            const cell = worksheet[cellAddress]

            let cellValue = ""
            if (cell) {
              cellValue = cell.v || ""
              if (typeof cellValue === "object" && cellValue !== null) {
                cellValue = String(cellValue)
              } else {
                cellValue = String(cellValue).trim()
              }
            }

            let cellColor = "#FFFFFF"
            let originalColor = "FFFFFF"

            if (cell) {
              const colorInfo = extractColor(cell)
              cellColor = colorInfo.color
              originalColor = colorInfo.originalColor
            }

            cellColor = cleanHexColor(cellColor)

            const isCellOccupied = Object.values(positions).some(
              (pos) =>
                pos.piso === selectedPiso && pos.mergedCells.some((c) => c.row === actualRow && c.col === colLetter),
            )

            if (isCellOccupied) {
              continue
            }

            const id = null // Cambiado a null para que el backend asigne un ID numérico
            const position = {
              id,
              nombre: cellValue,
              fila: actualRow,
              columna: colLetter,
              color: COLOR_DEFAULT, // Usamos el color por defecto, el servicio determinará el color real
              colorFuente: getContrastColor(COLOR_DEFAULT),
              colorOriginal: originalColor,
              piso: selectedPiso,
              estado: "disponible",
              detalles: "",
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
              sede: "",
              servicio: "",
              dispositivos: [],
              mergedCells: [{ row: actualRow, col: colLetter }],
            }

            try {
              const response = await axios.post(`${API_URL}api/posiciones/`, position)
              if (response.status === 201) {
                newPositions[response.data.id] = response.data
              } else {
                console.error(`Error al importar posición: ${id}`, response.data)
              }
            } catch (error) {
              console.error(`Error al guardar posición:`, error)
            }
          }
        }

        setPositions((prev) => ({
          ...prev,
          ...newPositions,
        }))

        showNotification("Importación completada correctamente")
      } catch (error) {
        console.error("Error al importar:", error)
        showNotification("Error al importar las posiciones", "error")
      } finally {
        setLoading(false)
      }
    }

    reader.onerror = () => {
      setLoading(false)
      showNotification("Error al leer el archivo", "error")
    }

    reader.readAsArrayBuffer(file)
  }

  const filteredPositions = Object.values(positions).filter(
    (pos) =>
      pos.piso === selectedPiso &&
      (searchTerm === "" ||
        (pos.nombre && pos.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (pos.servicio &&
          typeof pos.servicio === "object" &&
          pos.servicio.nombre &&
          pos.servicio.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (pos.servicio &&
          typeof pos.servicio === "string" &&
          getServiceName(pos.servicio).toLowerCase().includes(searchTerm.toLowerCase()))),
  )

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
          ? positionCopy.dispositivos
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
      .some(([key, value]) => (key !== borderKey ? value : updates[borderKey]))

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
              : "1px solid var(--border)",
          borderBottom: position?.bordeDetalle?.bottomDouble
            ? "4px double black"
            : position?.bordeDetalle?.bottom
              ? "2px solid black"
              : "1px solid var(--border)",
          borderLeft: position?.bordeDetalle?.leftDouble
            ? "4px double black"
            : position?.bordeDetalle?.left
              ? "2px solid black"
              : "1px solid var(--border)",
          borderRight: position?.bordeDetalle?.rightDouble
            ? "4px double black"
            : position?.bordeDetalle?.right
              ? "2px solid black"
              : "1px solid var(--border)",
          position: "relative",
          fontWeight: position?.fontWeight || "normal",
          fontSize: "0.8rem",
        }}
        className={`table-cell ${isSelected ? "selected" : ""} ${isMainCell ? "main-cell" : ""}`}
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
            }}
          />
        )}
      </td>
    )
  }

  return (
    <div className="dashboard-container">
      <h1>Sistema de Gestión de Planos de Piso</h1>

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

          <button className="action-button" onClick={handleAddNewPosition}>
            <FaPlus /> Nueva Posición
          </button>

          <button className="action-button" onClick={exportToExcel}>
            <FaUpload /> Exportar
          </button>

          <div className="import-container">
            <button className="action-button" onClick={() => document.getElementById("import-excel").click()}>
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
        </div>
      </div>

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
                  // Buscar posición exacta primero
                  const exactPosition = filteredPositions.find(
                    (p) => Number(p.fila) === Number(row) && p.columna === col,
                  )

                  // Si no hay posición exacta, buscar en áreas combinadas
                  const mergedPosition = !exactPosition
                    ? filteredPositions.find((p) => isCellInMergedArea(row, col, p))
                    : null

                  // Usar la posición exacta si existe, de lo contrario usar la combinada
                  const position = exactPosition || mergedPosition

                  const isMainCellPosition =
                    position && Number(position.fila) === Number(row) && position.columna === col
                  const isMerged = position && !isMainCellPosition && isCellInMergedArea(row, col, position)

                  const isSelected = isCellSelected(row, col)

                  if (isMerged && !isMainCellPosition) {
                    return null
                  }

                  let colSpan = 1
                  let rowSpan = 1

                  if (isMainCellPosition && position.mergedCells?.length > 0) {
                    const cells = position.mergedCells
                    const maxCol = Math.max(...cells.map((c) => columns.indexOf(c.col)))
                    const minCol = Math.min(...cells.map((c) => columns.indexOf(c.col)))
                    const maxRow = Math.max(...cells.map((c) => c.row))
                    const minRow = Math.min(...cells.map((c) => c.row))
                    colSpan = maxCol - minCol + 1
                    rowSpan = maxRow - minRow + 1
                  }

                  return renderTableCell(position, row, col, isSelected, isMainCellPosition, colSpan, rowSpan)
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="loader"></div>
            <h2>Cargando posiciones...</h2>
            <p>Por favor, espera mientras se procesan los datos.</p>
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
            <h2>{newPosition.id ? "Editar Posición" : "Agregar Posición"}</h2>

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

              <div className="form-group full-width">
                <label>Dispositivo:</label>
                <select
                  value={newPosition.dispositivos?.[0] || ""}
                  onChange={(e) => {
                    const value = e.target.value
                    setNewPosition({
                      ...newPosition,
                      dispositivos: value === "" ? [] : [value],
                    })
                  }}
                >
                  <option value="">Seleccione un dispositivo</option>
                  {dispositivos.map((dispositivo) => (
                    <option key={dispositivo.id} value={dispositivo.id}>
                      {dispositivo.nombre || dispositivo.serial}
                    </option>
                  ))}
                </select>
                <div className="selected-devices">
                  {Array.isArray(newPosition.dispositivos) && newPosition.dispositivos.length > 0 && (
                    <div className="selected-items">
                      <p>Dispositivos seleccionados:</p>
                      <ul>
                        {newPosition.dispositivos.map((id) => {
                          const device = dispositivos.find((d) => d.id.toString() === id.toString())
                          return (
                            <li key={id}>
                              {device ? device.nombre || device.serial : id}
                              <button
                                type="button"
                                className="remove-item"
                                onClick={() => {
                                  setNewPosition({
                                    ...newPosition,
                                    dispositivos: newPosition.dispositivos.filter((d) => d !== id),
                                  })
                                }}
                              >
                                ×
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
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

