import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
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
} from "react-icons/fa";
import * as XLSX from "xlsx";
import "../styles/Plans.css";

const API_URL = "http://127.0.0.1:8000/";

const PISOS = [
  { value: "PISO1", label: "Piso 1" },
  { value: "PISO2", label: "Piso 2" },
  { value: "PISO3", label: "Piso 3" },
  { value: "PISO4", label: "Piso 4" },
  { value: "TORRE1", label: "Torre 1" },
];

const COLORES = [
  { value: "#FF4500", label: "Naranja Principal" },
  { value: "#FF0000", label: "Rojo Principal" },
  { value: "#FFFFFF", label: "Blanco" },
  { value: "#F0F0F0", label: "Gris Claro" },
  { value: "#222270", label: "SIMYO" },
  { value: "#00FF00", label: "Simyo Televenta" },
  { value: "#FF66B2", label: "Simyo Cancelación Portabilidad" },
  { value: "#FFD700", label: "amarillo claro" },
  { value: "#808000", label: "Credivalores" },
  { value: "#864fbd", label: "Segur Caixa Cuadro Medico" },
  { value: "#b47f30", label: "Caixa Citas Medicas" },
  { value: "#df91b8", label: "Eurona" },
  { value: "#f42ff2", label: "JELPIT" },
  { value: "#00a3ff", label: "Seguros Bolivar Desborde SOAT Cotizaciones" },
  { value: "#7fcb51", label: "Endesa Competitivas" },
  { value: "#4cb7f4", label: "Credifinanciera" },
  { value: "#8B0000", label: "Finetwork" },
  { value: "#22229f", label: "TELEPIZZA ESPAÑA (CONTRAJORNADA CON SIMYO)" },
  { value: "#449214", label: "Endesa Agencia Digital" },
  { value: "#df6363", label: "Linea Soporte" },
  { value: "#B0BEC5", label: "Practicantes Desarrollo" },
  { value: "#ff8900", label: "naranja" },
  { value: "#ffffff", label: "default" },
];

const ESTADOS = [
  { value: "disponible", label: "Disponible", color: "green" },
  { value: "ocupado", label: "Ocupado", color: "red" },
  { value: "reservado", label: "Reservado", color: "orange" },
  { value: "inactivo", label: "Inactivo", color: "gray" },
];

const getContrastColor = (hexcolor) => {
  if (!hexcolor) return "#000000";
  try {
    const hex = hexcolor.replace("#", "");
    const r = Number.parseInt(hex.substr(0, 2), 16);
    const g = Number.parseInt(hex.substr(2, 2), 16);
    const b = Number.parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "#000000" : "#ffffff";
  } catch (error) {
    console.error("Error en getContrastColor:", error);
    return "#000000";
  }
};

const findClosestColor = (hexColor, colorOptions) => {
  try {
    const hex = hexColor.replace("#", "");
    const r = Number.parseInt(hex.substr(0, 2), 16) || 0;
    const g = Number.parseInt(hex.substr(2, 2), 16) || 0;
    const b = Number.parseInt(hex.substr(4, 2), 16) || 0;

    let closestColor = colorOptions[0];
    let minDistance = Number.MAX_VALUE;

    for (const color of colorOptions) {
      const colorHex = color.value.replace("#", "");
      const cr = Number.parseInt(colorHex.substr(0, 2), 16) || 0;
      const cg = Number.parseInt(colorHex.substr(2, 2), 16) || 0;
      const cb = Number.parseInt(colorHex.substr(4, 2), 16) || 0;

      const distance = Math.sqrt(Math.pow(r - cr, 2) + Math.pow(g - cg, 2) + Math.pow(b - cb, 2));
      if (distance < minDistance) {
        minDistance = distance;
        closestColor = color;
      }
    }

    return closestColor;
  } catch (error) {
    console.error("Error en findClosestColor:", error);
    return colorOptions[0];
  }
};

const cleanHexColor = (hexColor) => {
  if (!hexColor) return "#FFFFFF";
  try {
    let cleanedColor = hexColor.startsWith("#") ? hexColor : `#${hexColor}`;
    if (cleanedColor.length === 9 && cleanedColor.startsWith("#FF")) {
      cleanedColor = `#${cleanedColor.substring(3)}`;
    }
    if (!/^#[0-9A-F]{6}$/i.test(cleanedColor)) {
      return "#FFFFFF";
    }
    return cleanedColor;
  } catch (error) {
    console.error("Error en cleanHexColor:", error);
    return "#FFFFFF";
  }
};

const extractColor = (cell) => {
  try {
    if (!cell || !cell.s || !cell.s.fill) return { color: "#FFFFFF", originalColor: "FFFFFF" };

    // Función para limpiar el color
    const cleanColor = (colorStr) => {
      if (!colorStr) return null;
      // Remover 'FF' del inicio si existe (canal alfa)
      if (colorStr.length === 8 && colorStr.startsWith("FF")) {
        return colorStr.substring(2);
      }
      return colorStr;
    };

    // Intentar obtener el color de diferentes propiedades
    let color = null;

    // 1. Intentar con fgColor
    if (cell.s.fill.fgColor) {
      if (cell.s.fill.fgColor.rgb) {
        color = cleanColor(cell.s.fill.fgColor.rgb);
      } else if (cell.s.fill.fgColor.theme !== undefined) {
        // Manejar colores basados en temas
        const themeColors = {
          0: "FFFFFF", // Light 1
          1: "000000", // Dark 1
          2: "E7E6E6", // Light 2
          3: "44546A", // Dark 2
          4: "4472C4", // Accent 1
          5: "ED7D31", // Accent 2
          6: "A5A5A5", // Accent 3
          7: "FFC000", // Accent 4
          8: "5B9BD5", // Accent 5
          9: "70AD47", // Accent 6
        };
        color = themeColors[cell.s.fill.fgColor.theme] || "FFFFFF";
      } else if (cell.s.fill.fgColor.indexed !== undefined) {
        // Manejar colores indexados
        const indexedColors = {
          0: "000000", // Black
          1: "FFFFFF", // White
          2: "FF0000", // Red
          3: "00FF00", // Green
          4: "0000FF", // Blue
          5: "FFFF00", // Yellow
          6: "FF00FF", // Magenta
          7: "00FFFF", // Cyan
          8: "000000", // Black
          9: "FFFFFF", // White
          // Añadir más colores indexados según sea necesario
        };
        color = indexedColors[cell.s.fill.fgColor.indexed] || "FFFFFF";
      }
    }

    // 2. Si no hay fgColor, intentar con bgColor
    if (!color && cell.s.fill.bgColor) {
      if (cell.s.fill.bgColor.rgb) {
        color = cleanColor(cell.s.fill.bgColor.rgb);
      } else if (cell.s.fill.bgColor.theme !== undefined) {
        const themeColors = {
          0: "FFFFFF", // Light 1
          1: "000000", // Dark 1
          2: "E7E6E6", // Light 2
          3: "44546A", // Dark 2
          4: "4472C4", // Accent 1
          5: "ED7D31", // Accent 2
          6: "A5A5A5", // Accent 3
          7: "FFC000", // Accent 4
          8: "5B9BD5", // Accent 5
          9: "70AD47", // Accent 6
        };
        color = themeColors[cell.s.fill.bgColor.theme] || "FFFFFF";
      } else if (cell.s.fill.bgColor.indexed !== undefined) {
        const indexedColors = {
          0: "000000", // Black
          1: "FFFFFF", // White
          2: "FF0000", // Red
          3: "00FF00", // Green
          4: "0000FF", // Blue
          5: "FFFF00", // Yellow
          6: "FF00FF", // Magenta
          7: "00FFFF", // Cyan
          8: "000000", // Black
          9: "FFFFFF", // White
          // Añadir más colores indexados según sea necesario
        };
        color = indexedColors[cell.s.fill.bgColor.indexed] || "FFFFFF";
      }
    }

    // 3. Si aún no hay color, intentar con patternType
    if (!color && cell.s.fill.patternType === "solid") {
      // Buscar en otras propiedades del estilo
      if (cell.s.fill.color && cell.s.fill.color.rgb) {
        color = cleanColor(cell.s.fill.color.rgb);
      } else if (cell.s.fill.color && cell.s.fill.color.theme !== undefined) {
        const themeColors = {
          0: "FFFFFF", // Light 1
          1: "000000", // Dark 1
          2: "E7E6E6", // Light 2
          3: "44546A", // Dark 2
          4: "4472C4", // Accent 1
          5: "ED7D31", // Accent 2
          6: "A5A5A5", // Accent 3
          7: "FFC000", // Accent 4
          8: "5B9BD5", // Accent 5
          9: "70AD47", // Accent 6
        };
        color = themeColors[cell.s.fill.color.theme] || "FFFFFF";
      } else if (cell.s.fill.color && cell.s.fill.color.indexed !== undefined) {
        const indexedColors = {
          0: "000000", // Black
          1: "FFFFFF", // White
          2: "FF0000", // Red
          3: "00FF00", // Green
          4: "0000FF", // Blue
          5: "FFFF00", // Yellow
          6: "FF00FF", // Magenta
          7: "00FFFF", // Cyan
          8: "000000", // Black
          9: "FFFFFF", // White
          // Añadir más colores indexados según sea necesario
        };
        color = indexedColors[cell.s.fill.color.indexed] || "FFFFFF";
      }
    }

    // 4. Intentar con el estilo directo de la celda si existe
    if (!color && cell.s.fill.start && cell.s.fill.end) {
      // Algunos formatos de Excel usan start/end para gradientes
      if (cell.s.fill.start.rgb) {
        color = cleanColor(cell.s.fill.start.rgb);
      } else if (cell.s.fill.end.rgb) {
        color = cleanColor(cell.s.fill.end.rgb);
      }
    }

    // Guardar el color original antes de cualquier procesamiento

    // Si no se encontró ningún color, usar blanco
    if (!color || color === "auto") {
      return { color: "#FFFFFF", originalColor: "FFFFFF" };
    }

    // Asegurarse de que el color tenga el formato correcto
    color = color.replace(/^#/, "");
    if (!/^[0-9A-F]{6}$/i.test(color)) {
      return { color: "#FFFFFF", originalColor: "FFFFFF" };
    }

    return {
      color: `#${color}`,
      originalColor: color,
    };
  } catch (error) {
    console.error("Error extracting color:", error);
    return { color: "#FFFFFF", originalColor: "FFFFFF" };
  }
};

const FloorPlan = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [positions, setPositions] = useState({});
  const [rows, setRows] = useState(51);
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
  ]);
  const [newPosition, setNewPosition] = useState({
    id: "",
    nombre: "",
    tipo: "",
    estado: "disponible",
    detalles: "",
    fila: 1,
    columna: "A",
    color: "#B0BEC5",
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
    dispositivos: "",
    mergedCells: [],
  });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedPiso, setSelectedPiso] = useState("PISO1");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "", type: "success" });
  const tableContainerRef = useRef(null);

  useEffect(() => {
    fetchPositions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPositions = async () => {
    try {
      setLoading(true);
     

      const response = await axios.get(`${API_URL}/api/posiciones`);
      console.log("Response Data:", response.data);
      setPositions(response.data.results.reduce((acc, pos) => ({ ...acc, [pos.id]: pos }), {}));
    } catch (error) {
      console.error("Error al obtener posiciones:", error);
      showNotification("Error al cargar las posiciones", "error");
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "success" });
    }, 3000);
  };

  const savePosition = async () => {
    try {
      // Crear una copia del objeto para no modificar el estado directamente
      const dataToSend = { ...newPosition };

      // Asegurarse de que no haya valores null en los campos de texto
      dataToSend.tipo = dataToSend.tipo || "";
      dataToSend.nombre = dataToSend.nombre || "";
      dataToSend.detalles = dataToSend.detalles || "";
      dataToSend.sede = dataToSend.sede || "";
      dataToSend.servicio = dataToSend.servicio || "";
      dataToSend.dispositivos = dataToSend.dispositivos || "";
      dataToSend.colorOriginal = dataToSend.colorOriginal || "";

      // Calcular el valor de bordeDoble basado en los valores de bordeDetalle
      dataToSend.bordeDoble =
        dataToSend.bordeDetalle.topDouble ||
        dataToSend.bordeDetalle.rightDouble ||
        dataToSend.bordeDetalle.bottomDouble ||
        dataToSend.bordeDetalle.leftDouble;

      // Asegurarse de que mergedCells sea un array
      if (!Array.isArray(dataToSend.mergedCells)) {
        dataToSend.mergedCells = [];
      }

      // Si no hay celdas combinadas, agregar al menos la celda principal
      if (dataToSend.mergedCells.length === 0) {
        dataToSend.mergedCells = [{ row: dataToSend.fila, col: dataToSend.columna }];
      }

      const isEdit = positions[newPosition.id] !== undefined;
      const method = isEdit ? "put" : "post";
      const url = isEdit ? `${API_URL}posiciones/${newPosition.id}/` : `${API_URL}posiciones/`;

      console.log("Datos a enviar:", dataToSend);

      await axios[method](url, dataToSend);

      showNotification("Posición guardada correctamente");
      fetchPositions();
      setIsModalOpen(false);
      clearSelection();
    } catch (error) {
      console.error("Error al guardar posición:", error);
      showNotification("Error al guardar la posición", "error");
    }
  };

  const deletePosition = async (id) => {
    try {
      if (!id) {
        console.error("Error: No se puede eliminar una posición sin ID.");
        showNotification("Error: No se puede eliminar una posición sin ID", "error");
        return;
      }

      await axios.delete(`${API_URL}posiciones/${id}/`);

      showNotification("Posición eliminada correctamente");
      fetchPositions();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error al eliminar posición:", error);
      showNotification("Error al eliminar la posición", "error");
    }
  };

  const handleCellMouseDown = (row, col) => {
    setIsSelecting(true);
    setSelectionStart({ row, col });
    setSelectionEnd({ row, col });
  };

  const handleCellMouseEnter = (row, col) => {
    if (isSelecting) {
      setSelectionEnd({ row, col });
    }
  };

  const handleCellMouseUp = () => {
    if (isSelecting) {
      handleCreatePosition();
    }
    setIsSelecting(false);
  };

  const clearSelection = () => {
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelecting(false);
  };

  const getSelectedCells = () => {
    if (!selectionStart || !selectionEnd) return [];

    const startRow = Math.min(selectionStart.row, selectionEnd.row);
    const endRow = Math.max(selectionStart.row, selectionEnd.row);
    const startCol = Math.min(columns.indexOf(selectionStart.col), columns.indexOf(selectionEnd.col));
    const endCol = Math.max(columns.indexOf(selectionStart.col), columns.indexOf(selectionEnd.col));

    const cells = [];
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        cells.push({ row: r, col: columns[c] });
      }
    }
    return cells;
  };

  const isCellSelected = (row, col) => {
    if (!selectionStart || !selectionEnd) return false;

    const startRow = Math.min(selectionStart.row, selectionEnd.row);
    const endRow = Math.max(selectionStart.row, selectionEnd.row);
    const startCol = Math.min(columns.indexOf(selectionStart.col), columns.indexOf(selectionEnd.col));
    const endCol = Math.max(columns.indexOf(selectionStart.col), columns.indexOf(selectionEnd.col));

    return row >= startRow && row <= endRow && columns.indexOf(col) >= startCol && columns.indexOf(col) <= endCol;
  };

  const isCellInMergedArea = (row, col, position) => {
    if (!position?.mergedCells?.length) return false;
    return position.mergedCells.some((cell) => cell.row === row && cell.col === col);
  };

  const handleCreatePosition = () => {
    const selectedCells = getSelectedCells();
    if (selectedCells.length === 0) return;

    const startCell = selectedCells[0];
    setNewPosition({
      id: `pos_${Date.now()}`,
      nombre: "",
      tipo: "",
      estado: "disponible",
      detalles: "",
      fila: startCell.row,
      columna: startCell.col,
      color: "#B0BEC5",
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
      dispositivos: "",
      mergedCells: selectedCells,
    });
    setIsModalOpen(true);
  };

  const getNextColumn = (currentColumns) => {
    const lastColumn = currentColumns[currentColumns.length - 1];
    if (lastColumn.length === 1) {
      return lastColumn === "Z" ? "AA" : String.fromCharCode(lastColumn.charCodeAt(0) + 1);
    } else {
      const firstChar = lastColumn[0];
      const secondChar = lastColumn[1];
      return secondChar === "Z"
        ? String.fromCharCode(firstChar.charCodeAt(0) + 1) + "A"
        : firstChar + String.fromCharCode(secondChar.charCodeAt(0) + 1);
    }
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  const handleAddNewPosition = () => {
    setNewPosition({
      id: `pos_${Date.now()}`,
      nombre: "",
      tipo: "",
      estado: "disponible",
      detalles: "",
      fila: 1,
      columna: "A",
      color: "#B0BEC5",
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
      dispositivos: "",
      mergedCells: [],
    });
    setIsModalOpen(true);
  };

  const exportToExcel = () => {
    try {
      const positionsArray = Object.values(positions).filter((pos) => pos.piso === selectedPiso);

      // Crear una hoja de cálculo con los datos
      const worksheet = XLSX.utils.json_to_sheet(positionsArray);

      // Configurar estilos para las celdas
      const range = XLSX.utils.decode_range(worksheet["!ref"]);

      // Aplicar estilos a cada celda
      for (let R = range.s.r + 1; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cellAddress];

          if (!cell) continue;

          // Obtener la posición correspondiente a esta fila
          const position = positionsArray[R - 1];

          if (position) {
            // Configurar el estilo de la celda
            if (!cell.s) cell.s = {};
            if (!cell.s.fill) cell.s.fill = {};

            // Usar el color original si está disponible, de lo contrario usar el color procesado
            const colorHex = position.colorOriginal || position.color.replace("#", "");

            cell.s.fill = {
              patternType: "solid",
              fgColor: { rgb: colorHex },
              bgColor: { rgb: colorHex },
            };

            // Configurar el color de fuente
            if (!cell.s.font) cell.s.font = {};
            cell.s.font.color = { rgb: position.colorFuente.replace("#", "") };
          }
        }
      }

      // Configurar las celdas combinadas
      const merges = [];
      positionsArray.forEach((pos) => {
        if (pos.mergedCells && pos.mergedCells.length > 1) {
          const cells = pos.mergedCells;
          const rows = cells.map((c) => c.row);
          const cols = cells.map((c) => {
            // Asegurarse de que la columna se convierta correctamente a índice
            try {
              return XLSX.utils.decode_col(c.col);
            } catch (error) {
              console.error(`Error decodificando columna ${c.col}:`, error);
              return 0;
            }
          });

          const startRow = Math.min(...rows) - 1; // Ajustar a índice base 0 para XLSX
          const endRow = Math.max(...rows) - 1;
          const startCol = Math.min(...cols);
          const endCol = Math.max(...cols);

          // Verificar que los valores sean válidos antes de agregar
          if (startRow >= 0 && startCol >= 0 && endRow >= startRow && endCol >= startCol) {
            merges.push({
              s: { r: startRow, c: startCol },
              e: { r: endRow, c: endCol },
            });
          }
        }
      });

      if (merges.length > 0) {
        worksheet["!merges"] = merges;
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Posiciones");
      XLSX.writeFile(workbook, `Posiciones_${selectedPiso}_${new Date().toISOString().split("T")[0]}.xlsx`);

      showNotification("Exportación completada correctamente");
    } catch (error) {
      console.error("Error al exportar:", error);
      showNotification("Error al exportar las posiciones", "error");
    }
  };

  const importFromExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        // Limpiar posiciones existentes para el piso seleccionado
        const currentPositions = Object.values(positions).filter((p) => p.piso === selectedPiso);
        for (const pos of currentPositions) {
          try {
            await axios.delete(`${API_URL}posiciones/${pos.id}/`);
          } catch (error) {
            console.error(`Error al eliminar posición existente: ${pos.id}`, error);
          }
        }

        // Leer el archivo Excel
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {
          type: "array",
          cellStyles: true, // Habilitar cellStyles para acceder a los estilos
        });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(worksheet["!ref"]);

        // Detectar celdas combinadas
        const mergedCellsInfo = worksheet["!merges"] || [];
        console.log("Celdas combinadas detectadas:", mergedCellsInfo);

        // Mapeo para rastrear qué celdas pertenecen a qué posición
        const cellToPositionMap = {};
        const newPositions = {};

        // Función para extraer el color de una celda

        // Primero, procesar las celdas combinadas
        for (let i = 0; i < mergedCellsInfo.length; i++) {
          const mergeInfo = mergedCellsInfo[i];
          const startRow = mergeInfo.s.r;
          const startCol = mergeInfo.s.c;
          const endRow = mergeInfo.e.r;
          const endCol = mergeInfo.e.c;

          // Obtener la celda principal (esquina superior izquierda)
          const mainCellAddress = XLSX.utils.encode_cell({ r: startRow, c: startCol });
          const mainCell = worksheet[mainCellAddress];

          // Extraer el valor de la celda (incluso si está vacía)
          let cellValue = "";
          if (mainCell) {
            cellValue = mainCell.v || "";
            if (typeof cellValue === "object" && cellValue !== null) {
              cellValue = String(cellValue);
            } else {
              cellValue = String(cellValue).trim();
            }
          }

          // Extraer color (incluso si la celda está vacía)
          let cellColor = "#FFFFFF";
          let originalColor = "FFFFFF";

          if (mainCell) {
            const colorInfo = extractColor(mainCell);
            cellColor = colorInfo.color;
            originalColor = colorInfo.originalColor;
          }

          // Limpiar y encontrar el color más cercano
          cellColor = cleanHexColor(cellColor);
          let closestColorMatch = null;
          try {
            closestColorMatch = findClosestColor(cellColor, COLORES);
            cellColor = closestColorMatch.value;
          } catch (error) {
            console.error("Error al encontrar color cercano:", error);
            cellColor = "#FFFFFF";
          }

          // Crear lista de celdas combinadas
          const mergedCells = [];
          for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
              const actualRow = r + 1; // Convertir a índice base 1
              const colLetter = XLSX.utils.encode_col(c);
              mergedCells.push({ row: actualRow, col: colLetter });

              // Marcar esta celda como parte de una posición combinada
              cellToPositionMap[`${actualRow}-${colLetter}`] = true;
            }
          }

          // Crear la posición
          const actualStartRow = startRow + 1;
          const startColLetter = XLSX.utils.encode_col(startCol);
          const id = `pos_${actualStartRow}_${startColLetter}_${Date.now()}${Math.floor(Math.random() * 1000)}`;

          const position = {
            id,
            nombre: cellValue,
            fila: actualStartRow,
            columna: startColLetter,
            color: cellColor,
            colorFuente: getContrastColor(cellColor),
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
            dispositivos: "",
            mergedCells: mergedCells,
          };

          // Guardar la posición
          newPositions[id] = position;

          // Enviar al backend
          try {
            const response = await axios.post(`${API_URL}posiciones/`, position);

            if (response.status !== 201) {
              console.error(`Error al importar posición combinada: ${id}`, response.data);
            }
          } catch (error) {
            console.error(`Error al guardar posición combinada: ${id}`, error);
          }
        }

        // Ahora procesar las celdas individuales que no son parte de celdas combinadas
        for (let row = range.s.r; row <= range.e.r; row++) {
          for (let col = range.s.c; col <= range.e.c; col++) {
            const actualRow = row + 1;
            const colLetter = XLSX.utils.encode_col(col);

            // Verificar si esta celda ya es parte de una celda combinada
            if (cellToPositionMap[`${actualRow}-${colLetter}`]) {
              continue;
            }

            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = worksheet[cellAddress];

            // Extraer el valor de la celda (incluso si está vacía)
            let cellValue = "";
            if (cell) {
              cellValue = cell.v || "";
              if (typeof cellValue === "object" && cellValue !== null) {
                cellValue = String(cellValue);
              } else {
                cellValue = String(cellValue).trim();
              }
            }

            // Extraer color (incluso si la celda está vacía)
            let cellColor = "#FFFFFF";
            let originalColor = "FFFFFF";

            if (cell) {
              const colorInfo = extractColor(cell);
              cellColor = colorInfo.color;
              originalColor = colorInfo.originalColor;
            }

            // Limpiar y encontrar el color más cercano
            cellColor = cleanHexColor(cellColor);
            let closestColorMatch = null;
            try {
              closestColorMatch = findClosestColor(cellColor, COLORES);
              cellColor = closestColorMatch.value;
            } catch (error) {
              console.error("Error al encontrar color cercano:", error);
              cellColor = "#FFFFFF";
            }

            // Verificar si la celda ya está ocupada
            const isCellOccupied = Object.values(positions).some(
              (pos) =>
                pos.piso === selectedPiso && pos.mergedCells.some((c) => c.row === actualRow && c.col === colLetter),
            );

            if (isCellOccupied) {
              continue; // Saltar esta celda si ya está ocupada
            }

            // Crear la posición (incluso para celdas vacías)
            const id = `pos_${actualRow}_${colLetter}_${Date.now()}${Math.floor(Math.random() * 1000)}`;
            const position = {
              id,
              nombre: cellValue,
              fila: actualRow,
              columna: colLetter,
              color: cellColor,
              colorFuente: getContrastColor(cellColor),
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
              dispositivos: "",
              mergedCells: [{ row: actualRow, col: colLetter }],
            };

            // Guardar la posición
            newPositions[id] = position;

            // Enviar al backend
            try {
              const response = await axios.post(`${API_URL}posiciones/`, position);

              if (response.status !== 201) {
                console.error(`Error al importar posición: ${id}`, response.data);
              }
            } catch (error) {
              console.error(`Error al guardar posición: ${id}`, error);
            }
          }
        }

        // Actualizar el estado de las posiciones
        setPositions((prev) => ({
          ...prev,
          ...newPositions,
        }));

        showNotification("Importación completada correctamente");
      } catch (error) {
        console.error("Error al importar:", error);
        showNotification("Error al importar las posiciones", "error");
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setLoading(false);
      showNotification("Error al leer el archivo", "error");
    };

    reader.readAsArrayBuffer(file);
  };

  const filteredPositions = Object.values(positions).filter(
    (pos) =>
      pos.piso === selectedPiso &&
      (searchTerm === "" ||
        (pos.nombre && pos.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (pos.servicio && pos.servicio.toLowerCase().includes(searchTerm.toLowerCase()))),
  );

  const handleEditPosition = (position) => {
    const updatedPosition = {
      ...position,
      colorFuente: position.colorFuente || position.fontColor || "#000000",
      colorOriginal: position.colorOriginal || "",
      bordeDoble: position.bordeDoble || false,
      bordeDetalle: {
        top: position.bordeDetalle?.top || false,
        right: position.bordeDetalle?.right || false,
        bottom: position.bordeDetalle?.bottom || false,
        left: position.bordeDetalle?.left || false,
        topDouble: position.bordeDetalle?.topDouble || false,
        rightDouble: position.bordeDetalle?.rightDouble || false,
        bottomDouble: position.bordeDetalle?.bottomDouble || false,
        leftDouble: position.bordeDetalle?.leftDouble || false,
      },
    };
    setNewPosition(updatedPosition);
    setIsModalOpen(true);
  };

  const handleBorderChange = (side, isDouble = false) => {
    const borderKey = isDouble ? `${side}Double` : side;
    const updates = {
      [borderKey]: !newPosition.bordeDetalle[borderKey],
    };

    if (isDouble && updates[borderKey] === true) {
      updates[side] = true;
    }

    if (!isDouble && updates[borderKey] === false) {
      updates[`${side}Double`] = false;
    }

    const hasDoubleBorder = Object.entries(newPosition.bordeDetalle)
      .filter(([key]) => key.includes("Double"))
      .some(([key, value]) => (key !== borderKey ? value : updates[borderKey]));

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
    });
  };

  const renderTableCell = (position, row, col, isSelected, isMainCell, colSpan, rowSpan) => {
    const backgroundColor = isSelected ? "rgba(108, 99, 255, 0.2)" : position?.color || "#ffffff";
    const textColor = position?.colorFuente || position?.fontColor || getContrastColor(backgroundColor);

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
    );
  };

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
                  const position = filteredPositions.find(
                    (p) => (p.fila === row && p.columna === col) || isCellInMergedArea(row, col, p),
                  );

                  const isMainCellPosition = position?.fila === row && position?.columna === col;
                  const isMerged = position && isCellInMergedArea(row, col, position);
                  const isSelected = isCellSelected(row, col);

                  if (isMerged && !isMainCellPosition) {
                    return null;
                  }

                  let colSpan = 1;
                  let rowSpan = 1;

                  if (isMainCellPosition && position.mergedCells?.length > 0) {
                    const cells = position.mergedCells;
                    const maxCol = Math.max(...cells.map((c) => columns.indexOf(c.col)));
                    const minCol = Math.min(...cells.map((c) => columns.indexOf(c.col)));
                    const maxRow = Math.max(...cells.map((c) => c.row));
                    const minRow = Math.min(...cells.map((c) => c.row));
                    colSpan = maxCol - minCol + 1;
                    rowSpan = maxRow - minRow + 1;
                  }

                  return renderTableCell(position, row, col, isSelected, isMainCellPosition, colSpan, rowSpan);
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && (
        <div className="modal-overlay">
          <div className="modal">
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
                setIsModalOpen(false);
                clearSelection();
              }}
            >
              <FaTimes />
            </button>
            <h2>{newPosition.id && positions[newPosition.id] ? "Editar Posición" : "Agregar Posición"}</h2>

            <div className="form-grid">
              <div className="form-group">
                <label>Id:</label>
                <input
                  value={newPosition.id}
                  onChange={(e) => setNewPosition({ ...newPosition, id: e.target.value })}
                  disabled={!!positions[newPosition.id]}
                />
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
                <label>Color de Fondo:</label>
                <div className="select-with-preview">
                  <select
                    value={newPosition.color}
                    onChange={(e) => setNewPosition({ ...newPosition, color: e.target.value })}
                  >
                    {COLORES.map((color) => (
                      <option
                        key={color.value}
                        value={color.value}
                        style={{
                          backgroundColor: color.value,
                          color: getContrastColor(color.value),
                        }}
                      >
                        {color.label}
                      </option>
                    ))}
                  </select>
                  <div className="color-preview" style={{ backgroundColor: newPosition.color }} />
                </div>
              </div>

              <div className="form-group">
                <label>Color Original:</label>
                <input
                  type="text"
                  value={newPosition.colorOriginal || ""}
                  onChange={(e) => setNewPosition({ ...newPosition, colorOriginal: e.target.value })}
                  placeholder="Color original del Excel"
                  disabled={true}
                />
                {newPosition.colorOriginal && (
                  <div
                    className="color-preview"
                    style={{
                      backgroundColor: newPosition.colorOriginal.startsWith("#")
                        ? newPosition.colorOriginal
                        : `#${newPosition.colorOriginal}`,
                    }}
                  />
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
                </div>
              </div>

              <div className="form-group full-width">
                <label>Sede:</label>
                <input
                  value={newPosition.sede || ""}
                  onChange={(e) => setNewPosition({ ...newPosition, sede: e.target.value })}
                />
              </div>

              <div className="form-group full-width">
                <label>Servicio:</label>
                <input
                  value={newPosition.servicio || ""}
                  onChange={(e) => setNewPosition({ ...newPosition, servicio: e.target.value })}
                />
              </div>

              <div className="form-group full-width">
                <label>Dispositivos:</label>
                <input
                  value={newPosition.dispositivos || ""}
                  onChange={(e) => setNewPosition({ ...newPosition, dispositivos: e.target.value })}
                />
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
              {newPosition.id && positions[newPosition.id] && (
                <button className="delete-button" onClick={() => deletePosition(newPosition.id)}>
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorPlan;