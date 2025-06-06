"use client"

import { useState, useRef } from "react"
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
import "../styles/Plans.css"

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

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title)

const API_URL = "http://127.0.0.1:8000/"

const PISOS = [
  { value: "PISO1", label: "Piso 1" },
  { value: "PISO2", label: "Piso 2" },
  { value: "PISO3", label: "Piso 3" },
  { value: "PISO4", label: "Piso 4" },
  { value: "TORRE1", label: "Torre 1" },
]

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

const cleanHexColor = (hexColor) => {
  if (!hexColor) return "#FFFFFF"
  try {
    if (/^#[0-9A-F]{6}$/i.test(hexColor)) {
      return hexColor
    }

    if (/^[0-9A-F]{6}$/i.test(hexColor)) {
      return `#${hexColor}`
    }

    let cleanedColor = hexColor
    if (/^[0-9A-F]{8}$/i.test(hexColor)) {
      cleanedColor = hexColor.substring(2)
      return `#${cleanedColor}`
    }

    if (hexColor.startsWith("#")) {
      cleanedColor = hexColor.substring(1)

      if (/^[0-9A-F]{3}$/i.test(cleanedColor)) {
        return `#${cleanedColor[0]}${cleanedColor[0]}${cleanedColor[1]}${cleanedColor[1]}${cleanedColor[2]}${cleanedColor[2]}`
      }

      if (/^[0-9A-F]{8}$/i.test(cleanedColor)) {
        return `#${cleanedColor.substring(2)}`
      }
    }

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
          10: "FF0000",
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
          10: "FF0000",
          11: "00FF00",
          12: "0000FF",
          13: "FFFF00",
          14: "FF00FF",
          15: "00FFFF",
          16: "800000",
          17: "008000",
          18: "000080",
          19: "808000",
          20: "800080",
          21: "008080",
          22: "C0C0C0",
          23: "808080",
          24: "9999FF",
          25: "993366",
          26: "FFFFCC",
          27: "CCFFFF",
          28: "660066",
          29: "FF8080",
          30: "0066CC",
          31: "CCCCFF",
          32: "000080",
          33: "FF00FF",
          34: "FFFF00",
          35: "00FFFF",
          36: "800080",
          37: "800000",
          38: "008080",
          39: "0000FF",
          40: "00CCFF",
          41: "CCFFFF",
          42: "CCFFCC",
          43: "FFFF99",
          44: "99CCFF",
          45: "FF99CC",
          46: "CC99FF",
          47: "FFCC99",
          48: "3366FF",
          49: "33CCCC",
          50: "99CC00",
          51: "FFCC00",
          52: "FF9900",
          53: "FF6600",
          54: "666699",
          55: "969696",
          56: "003366",
          57: "339966",
          58: "003300",
          59: "333300",
          60: "993300",
          61: "993366",
          62: "333399",
          63: "333333",
          64: "FF0000",
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
          10: "FF0000",
        }
        color = themeColors[cell.s.fill.bgColor.theme] || "FFFFFF"
      } else if (cell.s.fill.bgColor.indexed !== undefined) {
        const indexedColors = {
          0: "000000",
          1: "FFFFFF",
          2: "FF0000",
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
          10: "FF0000",
        }
        color = themeColors[cell.s.fill.color.theme] || "FFFFFF"
      } else if (cell.s.fill.color && cell.s.fill.color.indexed !== undefined) {
        const indexedColors = {
          0: "000000",
          1: "FFFFFF",
          2: "FF0000",
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
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
    "AA", "AB", "AC", "AD", "AE", "AF", "AG", "AH", "AI", "AJ", "AK", "AL", "AM", "AN", "AO", "AP", "AQ", "AR", "AS", "AT", "AU", "AV", "AW", "AX", "AY", "AZ",
    "BA", "BB", "BC", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BK", "BL", "BM", "BN", "BO", "BP", "BQ", "BR", "BS", "BT", "BU", "BV", "BW"
  ])
  const [newPosition, setNewPosition] = useState({
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
  const [defaultDeviceId, setDefaultDeviceId] = useState(null)
  const [showAllPositions, setShowAllPositions] = useState(false)
  const [viewMode, setViewMode] = useState("plano")
  const [servicios, setServicios] = useState([])
  const [sedes, setSedes] = useState([])
  const [dispositivos, setDispositivos] = useState([])
  const [selectedService, setSelectedService] = useState("")

  const fetchSelectorData = async () => {
    try {
      const [serviciosResponse, sedesResponse, dispositivosResponse] = await Promise.all([
        axios.get(`${API_URL}api/servicios/`),
        axios.get(`${API_URL}api/sedes/`),
        axios.get(`${API_URL}api/dispositivos/`),
      ])

      setServicios(Array.isArray(serviciosResponse.data) ? serviciosResponse.data : [])
      setSedes(Array.isArray(sedesResponse.data) ? sedesResponse.data : [])
      
      const dispositivosData = Array.isArray(dispositivosResponse.data) ? dispositivosResponse.data : []
      setDispositivos(dispositivosData)

      if (dispositivosData.length > 0) {
        setDefaultDeviceId(dispositivosData[0].id)
      }
    } catch (error) {
      console.error("Error al cargar datos para selectores:", error)
      showNotification("Error al cargar datos para selectores", "error")
      setDispositivos([])
    }
  }

  const getServiceColor = (serviceId) => {
    if (!serviceId) return COLOR_DEFAULT
    const service = Array.isArray(servicios) ? servicios.find((s) => s.id === Number(serviceId) || s.id === serviceId) : null
    return service ? service.color : COLOR_DEFAULT
  }

  const getServiceName = (serviceId) => {
    if (!serviceId) return ""
    const service = Array.isArray(servicios) ? servicios.find((s) => s.id === Number(serviceId) || s.id === serviceId) : null
    return service ? service.nombre : ""
  }

  const getSedeName = (sedeId) => {
    if (!sedeId) return ""
    const sede = Array.isArray(sedes) ? sedes.find((s) => s.id === Number(sedeId) || s.id === sedeId) : null
    return sede ? sede.nombre : ""
  }

  const getPisoName = (pisoValue) => {
    const piso = PISOS.find((p) => p.value === pisoValue)
    return piso ? piso.label : pisoValue
  }

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
          nextUrl = response.data.next
        } else {
          console.warn("Formato de respuesta inesperado:", response.data)
          positionsData = []
          nextUrl = null
        }

        console.log("Datos de posiciones recibidos:", positionsData.length)
        allPositions = allPositions.concat(positionsData)
      }

      console.log("Total de posiciones recibidas:", allPositions.length)

      const positionsObj = allPositions.reduce((acc, pos) => {
        try {
          const normalizedPos = {
            ...pos,
            fila: Number.parseInt(pos.fila, 10) || 1,
            mergedCells: Array.isArray(pos.mergedCells)
              ? pos.mergedCells
              : [{ row: Number.parseInt(pos.fila, 10) || 1, col: pos.columna || "A" }],
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
            dispositivos: Array.isArray(pos.dispositivos)
              ? pos.dispositivos
              : pos.dispositivos
                ? [pos.dispositivos]
                : [],
            nombre: pos.nombre || "",
            tipo: pos.tipo || "",
            estado: pos.estado || "disponible",
            detalles: pos.detalles || "",
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

  const importFromExcel = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setLoading(true)
    showNotification("Procesando archivo Excel...", "success")

    try {
      if (!Array.isArray(dispositivos) || dispositivos.length === 0) {
        showNotification(
          "Error: No hay dispositivos disponibles en el sistema. Debe crear al menos un dispositivo antes de importar.",
          "error",
        )
        setLoading(false)
        return
      }

      const defaultDevice = dispositivos[0]?.id || null
      console.log("Dispositivo por defecto para importación:", defaultDevice)

      const confirmDelete = window.confirm(
        "¿Desea eliminar las posiciones existentes en este piso antes de importar? Seleccione 'Cancelar' para agregar las nuevas posiciones sin eliminar las existentes.",
      )

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

      const reader = new FileReader()

      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target.result)
          const workbook = XLSX.read(data, {
            type: "array",
            cellStyles: true,
            cellDates: true,
          })

          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const range = XLSX.utils.decode_range(worksheet["!ref"])
          console.log("Rango de celdas:", range)

          const mergedCellsInfo = worksheet["!merges"] || []
          console.log("Celdas combinadas detectadas:", mergedCellsInfo.length)

          const processedCells = {}
          const newPositions = {}
          let savedCount = 0
          let errorCount = 0

          for (const mergeInfo of mergedCellsInfo) {
            const startRow = mergeInfo.s.r
            const startCol = mergeInfo.s.c
            const endRow = mergeInfo.e.r
            const endCol = mergeInfo.e.c

            const mainCellAddress = XLSX.utils.encode_cell({ r: startRow, c: startCol })
            const mainCell = worksheet[mainCellAddress]

            const cellValue =
              mainCell && mainCell.v !== undefined && mainCell.v !== null ? String(mainCell.v).trim() : ""
            const colorInfo = mainCell ? extractColor(mainCell) : { color: "#FFFFFF", originalColor: "FFFFFF" }
            const cellColor = cleanHexColor(colorInfo.color)

            const mergedCells = []
            for (let r = startRow; r <= endRow; r++) {
              for (let c = startCol; c <= endCol; c++) {
                const actualRow = r + 1
                const colLetter = XLSX.utils.encode_col(c)
                mergedCells.push({ row: actualRow, col: colLetter })
                processedCells[`${actualRow}-${colLetter}`] = true
              }
            }

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
              dispositivos: defaultDevice ? [defaultDevice] : [],
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

            if (Array.isArray(servicios) && servicios.length > 0) {
              const matchingService = servicios.find((s) => {
                const serviceColor = cleanHexColor(s.color)
                const positionColor = cleanHexColor(cellColor)
                return serviceColor.toLowerCase() === positionColor.toLowerCase()
              })

              if (matchingService) {
                position.servicio = matchingService.id
              }
            }

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

          for (let row = range.s.r; row <= range.e.r; row++) {
            for (let col = range.s.c; col <= range.e.c; col++) {
              const actualRow = row + 1
              const colLetter = XLSX.utils.encode_col(col)

              if (processedCells[`${actualRow}-${colLetter}`]) {
                continue
              }

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

              const cellValue = cell && cell.v !== undefined && cell.v !== null ? String(cell.v).trim() : ""
              const colorInfo = cell ? extractColor(cell) : { color: "#FFFFFF", originalColor: "FFFFFF" }
              const cellColor = cleanHexColor(colorInfo.color)

              if (cellColor === "#FFFFFF" && cellValue === "") {
                continue
              }

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
                dispositivos: defaultDevice ? [defaultDevice] : [],
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

              if (Array.isArray(servicios) && servicios.length > 0) {
                const matchingService = servicios.find((s) => {
                  const serviceColor = cleanHexColor(s.color)
                  const positionColor = cleanHexColor(cellColor)
                  return serviceColor.toLowerCase() === positionColor.toLowerCase()
                })

                if (matchingService) {
                  position.servicio = matchingService.id
                }
              }

              try {
                const response = await axios.post(`${API_URL}api/posiciones/`, position)
                if (response.status === 201) {
                  newPositions[response.data.id] = response.data
                  savedCount++

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

          setPositions((prev) => ({
            ...prev,
            ...newPositions,
          }))

          const resultMessage = `Importación completada: ${savedCount} posiciones guardadas${
            errorCount > 0 ? `, ${errorCount} errores` : ""
          }`
          showNotification(resultMessage, errorCount > 0 ? "error" : "success")

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

  const exportToExcel = () => {
    try {
      setLoading(true)
      showNotification("Preparando exportación...", "success")

      const positionsArray = showAllPositions
        ? Object.values(positions)
        : Object.values(positions).filter((pos) => pos.piso === selectedPiso)

      if (positionsArray.length === 0) {
        showNotification("No hay posiciones para exportar", "error")
        setLoading(false)
        return
      }

      const exportData = positionsArray.map((pos) => {
        return {
          ...pos,
          dispositivos: Array.isArray(pos.dispositivos)
            ? pos.dispositivos.map((d) => (typeof d === "object" ? d.id : d)).join(", ")
            : pos.dispositivos,
          servicio: pos.servicio ? (typeof pos.servicio === "object" ? pos.servicio.id : pos.servicio) : "",
          sede: pos.sede ? (typeof pos.sede === "object" ? pos.sede.id : pos.sede) : "",
          mergedCellsText: JSON.stringify(pos.mergedCells),
          bordeDetalleText: JSON.stringify(pos.bordeDetalle),
        }
      })

      const worksheet = XLSX.utils.json_to_sheet(exportData)
      const range = XLSX.utils.decode_range(worksheet["!ref"])

      for (let R = range.s.r + 1; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
          const cell = worksheet[cellAddress]

          if (!cell) continue

          const position = exportData[R - 1]
          if (position) {
            if (!cell.s) cell.s = {}
            if (!cell.s.fill) cell.s.fill = {}
            if (!cell.s.font) cell.s.font = {}

            const colorHex = position.servicio
              ? getServiceColor(position.servicio).replace("#", "")
              : position.colorOriginal || position.color.replace("#", "")

            cell.s.fill = {
              patternType: "solid",
              fgColor: { rgb: colorHex },
              bgColor: { rgb: colorHex },
            }

            cell.s.font.color = { rgb: position.colorFuente.replace("#", "") }
          }
        }
      }

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

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Posiciones")

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19)
      const fileName = showAllPositions
        ? `Todas_Posiciones_${timestamp}.xlsx`
        : `Posiciones_${selectedPiso}_${timestamp}.xlsx`

      const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
      const blob = new Blob([wbout], { type: "application/octet-stream" })
      const url = URL.createObjectURL(blob)

      const a = document.createElement("a")
      a.href = url
      a.download = fileName

      document.body.appendChild(a)
      a.click()

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

  const savePosition = async () => {
    try {
      if ((!newPosition.dispositivos || newPosition.dispositivos.length === 0) && 
          !defaultDeviceId && 
          (!Array.isArray(dispositivos) || dispositivos.length === 0)) {
        showNotification("No hay dispositivos disponibles para asignar a la posición", "error")
        return
      }

      const fila = Number.parseInt(newPosition.fila, 10)

      const normalizedDispositivos = Array.isArray(newPosition.dispositivos)
        ? newPosition.dispositivos.map(d => typeof d === 'object' ? d.id : d)
        : newPosition.dispositivos
          ? [newPosition.dispositivos]
          : defaultDeviceId
            ? [defaultDeviceId]
            : []

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
        mergedCells: Array.isArray(newPosition.mergedCells) && newPosition.mergedCells.length > 0
          ? newPosition.mergedCells.map(cell => ({
              row: Number(cell.row),
              col: cell.col,
            }))
          : [{ row: fila, col: newPosition.columna }],
      }

      if (newPosition.id && !isNaN(newPosition.id)) {
        dataToSend.id = newPosition.id
      }

      console.log("Datos a enviar:", JSON.stringify(dataToSend, null, 2))

      const method = newPosition.id ? "put" : "post"
      const url = newPosition.id 
        ? `${API_URL}api/posiciones/${newPosition.id}/` 
        : `${API_URL}api/posiciones/`

      const response = await axios[method](url, dataToSend, {
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("Respuesta del servidor:", response.data)
      showNotification("Posición guardada correctamente")

      await fetchPositions()
      setIsModalOpen(false)
      clearSelection()
    } catch (error) {
      console.error("Error al guardar posición:", error)
      console.error("Detalles del error:", error.response?.data)

      let errorMessage = "Error al guardar la posición"
      if (error.response?.data) {
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
      dispositivos: defaultDeviceId ? [defaultDeviceId] : [],
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
      dispositivos: defaultDeviceId ? [defaultDeviceId] : [],
      mergedCells: [],
    })
    setIsModalOpen(true)
  }

  const getServiceStatistics = () => {
    const positionsToAnalyze = showAllPositions
      ? Object.values(positions)
      : Object.values(positions).filter((pos) => pos.piso === selectedPiso)

    const serviceGroups = {}
    const serviceColors = {}
    const serviceAvailability = {}

    serviceGroups["Sin servicio"] = 0
    serviceColors["Sin servicio"] = "#CCCCCC"
    serviceAvailability["Sin servicio"] = { disponible: 0, ocupado: 0, reservado: 0, inactivo: 0 }

    positionsToAnalyze.forEach((pos) => {
      const serviceName = pos.servicio
        ? typeof pos.servicio === "object"
          ? pos.servicio.nombre
          : getServiceName(pos.servicio)
        : "Sin servicio"

      if (!serviceGroups[serviceName]) {
        serviceGroups[serviceName] = 0
        serviceAvailability[serviceName] = { disponible: 0, ocupado: 0, reservado: 0, inactivo: 0 }
      }
      serviceGroups[serviceName]++

      if (!serviceColors[serviceName] && pos.servicio) {
        serviceColors[serviceName] = getServiceColor(pos.servicio)
      }

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

  const filteredPositions = filterPositionsByService(
    Object.values(positions).filter((pos) => {
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
    })
  )

  const renderStatisticsPanel = () => {
    const { serviceGroups, serviceAvailability } = getServiceStatistics()
    const chartData = prepareChartData()

    let totalPositions, totalDisponible, totalOcupado, totalReservado, totalInactivo

    if (selectedService) {
      totalPositions = serviceGroups[selectedService] || 0
      totalDisponible = serviceAvailability[selectedService]?.disponible || 0
      totalOcupado = serviceAvailability[selectedService]?.ocupado || 0
      totalReservado = serviceAvailability[selectedService]?.reservado || 0
      totalInactivo = serviceAvailability[selectedService]?.inactivo || 0
    } else {
      totalPositions = Object.values(serviceGroups).reduce((sum, count) => sum + count, 0)
      totalDisponible = Object.values(serviceAvailability).reduce((sum, status) => sum + status.disponible, 0)
      totalOcupado = Object.values(serviceAvailability).reduce((sum, status) => sum + status.ocupado, 0)
      totalReservado = Object.values(serviceAvailability).reduce((sum, status) => sum + status.reservado, 0)
      totalInactivo = Object.values(serviceAvailability).reduce((sum, status) => sum + status.inactivo, 0)
    }

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

  const handleEditPosition = (position) => {
    try {
      const positionCopy = { ...position }

      const normalizedPosition = {
        ...positionCopy,
        fila: Number.parseInt(positionCopy.fila, 10) || 1,
        dispositivos: Array.isArray(positionCopy.dispositivos)
          ? positionCopy.dispositivos
          : positionCopy.dispositivos
            ? [positionCopy.dispositivos]
            : defaultDeviceId
              ? [defaultDeviceId]
              : [],
        servicio:
          Array.isArray(positionCopy.servicio) && positionCopy.servicio.length > 0
            ? positionCopy.servicio[0]
            : positionCopy.servicio || "",
        sede: positionCopy.sede || "",
        colorFuente: positionCopy.colorFuente || positionCopy.fontColor || "#000000",
        colorOriginal: positionCopy.colorOriginal || "",
        color: positionCopy.color || COLOR_DEFAULT,
        borde: Boolean(positionCopy.borde),
        bordeDoble: Boolean(positionCopy.bordeDoble),
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

  const renderTableCell = (position, row, col, isSelected, isMainCell, colSpan, rowSpan) => {
    let backgroundColor

    if (isSelected) {
      backgroundColor = "rgba(108, 99, 255, 0.2)"
    } else if (position && position.servicio) {
      backgroundColor = getServiceColor(position.servicio)
    } else {
      backgroundColor = position?.color || COLOR_DEFAULT
    }

    const textColor = position?.colorFuente || position?.fontColor || getContrastColor(backgroundColor)
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
              width: "12px",
              height: "12px",
            }}
          />
        )}
      </td>
    )
  }

  const renderAllPositionsTable = () => {
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
            <button
              className={`action-buttonn ${viewMode === "estadisticas" ? "active" : ""}`}
              onClick={() => setViewMode("estadisticas")}
              title="Estadísticas"
            >
              <FaChartPie /> Estadísticas
            </button>

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

                      const mergedAreaPosition = filteredPositions.find(
                        (pos) => pos.piso === selectedPiso && isCellInMergedArea(row, col, pos),
                      )

                      if (mergedAreaPosition) {
                        const isMainCell = mergedAreaPosition.mergedCells.some(
                          (cell) =>
                            cell.row === row &&
                            cell.col === col &&
                            mergedAreaPosition.fila === row &&
                            mergedAreaPosition.columna === col,
                        )

                        if (!isMainCell) {
                          return null
                        }

                        const rows = mergedAreaPosition.mergedCells.map((c) => Number(c.row))
                        const cols = mergedAreaPosition.mergedCells.map((c) => columns.indexOf(c.col))

                        const startRow = Math.min(...rows)
                        const endRow = Math.max(...rows)
                        const startCol = Math.min(...cols)
                        const endCol = Math.max(...cols)

                        const colSpan = endCol - startCol + 1
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

              <div className="form-group full-width">
                <label>Dispositivos:</label>
                <select
                  value=""
                  onChange={(e) => {
                    const deviceId = e.target.value;
                    if (deviceId && Array.isArray(newPosition.dispositivos) && 
                        !newPosition.dispositivos.includes(deviceId)) {
                      setNewPosition({
                        ...newPosition,
                        dispositivos: [...newPosition.dispositivos, deviceId]
                      });
                    }
                  }}
                >
                  <option value="">Seleccione un dispositivo</option>
                  {Array.isArray(dispositivos) && dispositivos.map((dispositivo) => (
                    <option key={dispositivo.id} value={dispositivo.id}>
                      {dispositivo.nombre || dispositivo.serial || `Dispositivo ${dispositivo.id}`}
                    </option>
                  ))}
                </select>
                
                <div className="selected-devices">
                  {Array.isArray(newPosition.dispositivos) && newPosition.dispositivos.length > 0 && (
                    <div className="selected-items">
                      <p>Dispositivos seleccionados:</p>
                      <ul>
                        {newPosition.dispositivos.map((id) => {
                          const device = Array.isArray(dispositivos) ? 
                            dispositivos.find(d => d.id.toString() === id.toString()) : 
                            null;
                          return (
                            <li key={id}>
                              {device ? device.nombre || device.serial : id}
                              <button
                                type="button"
                                onClick={() => {
                                  setNewPosition({
                                    ...newPosition,
                                    dispositivos: newPosition.dispositivos.filter(d => d !== id)
                                  });
                                }}
                              >
                                ×
                              </button>
                            </li>
                          );
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