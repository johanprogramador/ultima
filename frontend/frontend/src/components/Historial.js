/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "../components/auth"
import { useNavigate } from "react-router-dom"
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  Grid,
  Typography,
  Box,
  Pagination,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material"
import { FilterList, Clear, Visibility, ArrowBack, Refresh } from "@mui/icons-material"
import axios from "axios"
import dayjs from "dayjs"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import customParseFormat from "dayjs/plugin/customParseFormat"

// Configurar plugins de dayjs
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

// Configuración de axios
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api",
  timeout: 10000,
})

// Interceptor para manejo global de errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED") {
      return Promise.reject(new Error("La solicitud tardó demasiado. Por favor verifica tu conexión."))
    }
    if (error.response) {
      const { status, data } = error.response
      let errorMessage = "Error en la solicitud"

      if (status === 401) errorMessage = "No autorizado. Por favor inicia sesión nuevamente."
      else if (status === 403) errorMessage = "No tienes permiso para realizar esta acción."
      else if (status === 404) errorMessage = "Recurso no encontrado."
      else if (status === 500) errorMessage = "Error interno del servidor."
      else if (data?.message) errorMessage = data.message
      else errorMessage = `Error ${status}: ${error.message}`

      return Promise.reject(new Error(errorMessage))
    } else if (error.request) {
      return Promise.reject(new Error("No se recibió respuesta del servidor. Verifica tu conexión."))
    } else {
      return Promise.reject(new Error(`Error al configurar la solicitud: ${error.message}`))
    }
  },
)

const Historial = () => {
  const { token, sedeId } = useAuth()
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "error",
  })
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalItems: 0,
  })
  const [filters, setFilters] = useState({
    tipo_cambio: "",
    fecha_inicio: null,
    fecha_fin: null,
    dispositivo: "",
    search: "",
  })
  const [filterOptions, setFilterOptions] = useState({
    tipos_cambio: {
      MOVIMIENTO: "Movimiento",
      MODIFICACION: "Modificación",
      ASIGNACION: "Asignación",
      LOGIN: "Inicio de sesión",
      ELIMINACION: "Eliminación",
    },
    dispositivos: [],
  })
  const [selectedItem, setSelectedItem] = useState(null)
  const [openDialog, setOpenDialog] = useState(false)
  const navigate = useNavigate()

  // Función para debounce
  const debounce = useCallback((func, delay) => {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, args), delay);
    };
  }, []);

  // Función mejorada para manejar fechas undefined/null/vacías
  const formatDateUTC = useCallback((dateString, formattedDate) => {
    if (formattedDate) {
      return formattedDate
    }

    if (
      dateString === undefined ||
      dateString === null ||
      dateString === "" ||
      dateString === "null" ||
      dateString === "undefined" ||
      isNaN(new Date(dateString).getTime())
    ) {
      return "No registrado"
    }

    try {
      let date = dayjs(dateString, "YYYY-MM-DD HH:mm:ss.SSSZ", true)

      if (!date.isValid()) {
        date = dayjs(dateString)

        if (!date.isValid()) {
          console.warn("Fecha inválida recibida:", dateString)
          return "Fecha inválida"
        }
      }

      return date.local().format("DD/MM/YYYY HH:mm:ss")
    } catch (error) {
      console.error("Error al procesar fecha:", dateString, error)
      return "Formato inválido"
    }
  }, [])

  // Manejar errores
  const handleError = useCallback((error, context = "") => {
    console.error(`Error ${context}:`, error)
    setError(error.message)
    setSnackbar({
      open: true,
      message: `${context ? `${context}: ` : ""}${error.message}`,
      severity: "error",
    })
  }, [])

  // Cargar opciones de filtro
  const fetchFilterOptions = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get("/historial/opciones_filtro", {
        headers: { Authorization: `Bearer ${token}` },
        params: { sede_id: sedeId },
      })

      setFilterOptions((prev) => ({
        ...prev,
        tipos_cambio: response.data.tipos_cambio || prev.tipos_cambio,
        dispositivos: response.data.dispositivos || [],
      }))
    } catch (err) {
      handleError(err, "cargando opciones de filtro")
    } finally {
      setLoading(false)
    }
  }, [token, sedeId, handleError])

  // Función para obtener datos del historial
  const fetchHistorial = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = {
        page: pagination.page,
        page_size: pagination.pageSize,
        ...filters,
        fecha_inicio: filters.fecha_inicio
          ? dayjs(filters.fecha_inicio).startOf("day").format("YYYY-MM-DDTHH:mm:ss")
          : null,
        fecha_fin: filters.fecha_fin ? dayjs(filters.fecha_fin).endOf("day").format("YYYY-MM-DDTHH:mm:ss") : null,
      }

      // Limpiar parámetros vacíos
      Object.keys(params).forEach((key) => {
        if (params[key] === null || params[key] === "" || params[key] === undefined) {
          delete params[key]
        }
      })

      const response = await api.get("/historial", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      })

      const validatedData = response.data.results.map((item) => {
        const fechaValue = item.fecha !== undefined ? item.fecha : item.fechatam

        return {
          ...item,
          fecha: fechaValue,
          fecha_formateada: item.fecha_formateada,
          cambios: item.cambios || "No hay datos de cambios",
          tipo_cambio: item.tipo_cambio || "DESCONOCIDO",
        }
      })

      setHistorial(validatedData)
      setPagination((prev) => ({
        ...prev,
        totalItems: response.data.count,
      }))
    } catch (err) {
      handleError(err, "cargando historial")
      setHistorial([])
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.pageSize, filters, token, handleError, formatDateUTC])

  // Versión debounced de fetchHistorial
  const debouncedFetchHistorial = useCallback(
    debounce(() => {
      fetchHistorial();
    }, 300),
    [fetchHistorial]
  );

  useEffect(() => {
    fetchFilterOptions()
  }, [fetchFilterOptions])

  useEffect(() => {
    const abortController = new AbortController();
    
    const fetchData = async () => {
      try {
        setLoading(true);
        await fetchHistorial();
      } catch (error) {
        handleError(error);
      }
    };
    
    fetchData();
    
    return () => {
      abortController.abort();
    };
  }, [fetchHistorial])

  const handlePageChange = (event, newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }))
  }

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }))
    setPagination((prev) => ({ ...prev, page: 1 }))
    debouncedFetchHistorial();
  }

  const handleDispositivoChange = (e) => {
    const dispositivoId = e.target.value;
    handleFilterChange("dispositivo", dispositivoId);
  };

  const resetFilters = () => {
    setFilters({
      tipo_cambio: "",
      fecha_inicio: null,
      fecha_fin: null,
      dispositivo: "",
      search: "",
    })
  }

  const handleOpenDetails = (item) => {
    setSelectedItem(item)
    setOpenDialog(true)
  }

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }))
  }

  const getBadgeColor = (tipo) => {
    switch (tipo) {
      case "MOVIMIENTO":
        return "primary"
      case "MODIFICACION":
        return "warning"
      case "ASIGNACION":
        return "success"
      case "LOGIN":
        return "info"
      case "ELIMINACION":
        return "error"
      default:
        return "default"
    }
  }

  const formatChanges = (changes) => {
    if (!changes) return "No hay detalles de cambios disponibles"

    if (typeof changes === "string") {
      try {
        const parsed = JSON.parse(changes)
        return formatChanges(parsed)
      } catch {
        return changes
      }
    }

    try {
      if (typeof changes === "object") {
        if (changes.mensaje) {
          return (
            <div>
              <strong>Mensaje:</strong> {changes.mensaje}
              {changes.valores && (
                <div style={{ marginTop: 8 }}>
                  <strong>Valores:</strong> {changes.valores}
                </div>
              )}
            </div>
          )
        }

        return Object.entries(changes).map(([field, values]) => (
          <div key={field} style={{ marginBottom: 8 }}>
            <strong>{field.replace(/_/g, " ").toUpperCase()}:</strong>
            {typeof values === "object" ? (
              <div style={{ marginLeft: 16 }}>
                {Object.entries(values).map(([key, val]) => (
                  <div key={key}>
                    <span style={{ fontWeight: 500 }}>{key}:</span> {String(val)}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ marginLeft: 16 }}>{String(values)}</div>
            )}
          </div>
        ))
      }

      return JSON.stringify(changes, null, 2)
    } catch (e) {
      console.error("Error formateando cambios:", e)
      return "No se pudieron formatear los cambios"
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: 3 }}>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
            {snackbar.message}
          </Alert>
        </Snackbar>

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h4" component="h1">
            Historial del Sistema
          </Typography>
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ ml: 2 }}>
            Volver
          </Button>
        </Box>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel id="tipo-cambio-label">Tipo de Cambio</InputLabel>
                <Select
                  labelId="tipo-cambio-label"
                  value={filters.tipo_cambio}
                  onChange={(e) => handleFilterChange("tipo_cambio", e.target.value)}
                  label="Tipo de Cambio"
                  disabled={loading}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {Object.entries(filterOptions.tipos_cambio).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Fecha inicio"
                value={filters.fecha_inicio}
                onChange={(newValue) => handleFilterChange("fecha_inicio", newValue)}
                slotProps={{ textField: { fullWidth: true } }}
                maxDate={filters.fecha_fin || dayjs()}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Fecha fin"
                value={filters.fecha_fin}
                onChange={(newValue) => handleFilterChange("fecha_fin", newValue)}
                slotProps={{ textField: { fullWidth: true } }}
                minDate={filters.fecha_inicio}
                maxDate={dayjs()}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel id="dispositivo-label">Dispositivo</InputLabel>
                <Select
                  labelId="dispositivo-label"
                  value={filters.dispositivo}
                  onChange={handleDispositivoChange}
                  label="Dispositivo"
                  disabled={loading || filterOptions.dispositivos.length === 0}
                >
                  <MenuItem value="">Todos los dispositivos</MenuItem>
                  {filterOptions.dispositivos.map((dispositivo) => (
                    <MenuItem key={dispositivo.id} value={dispositivo.id}>
                      {dispositivo.marca} {dispositivo.modelo} ({dispositivo.serial})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: "flex", gap: 2 }}>
                <Button variant="contained" startIcon={<FilterList />} onClick={fetchHistorial} disabled={loading}>
                  {loading ? "Cargando..." : "Aplicar Filtros"}
                </Button>
                <Button variant="outlined" startIcon={<Clear />} onClick={resetFilters} disabled={loading}>
                  Limpiar Filtros
                </Button>
                <Button
                  variant="text"
                  startIcon={<Refresh />}
                  onClick={() => {
                    fetchFilterOptions()
                    fetchHistorial()
                  }}
                  disabled={loading}
                >
                  Actualizar
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Dispositivo</TableCell>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                        <CircularProgress />
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      <Alert
                        severity="error"
                        action={
                          <Button color="inherit" size="small" onClick={fetchHistorial} startIcon={<Refresh />}>
                            Reintentar
                          </Button>
                        }
                      >
                        {error}
                      </Alert>
                    </TableCell>
                  </TableRow>
                ) : historial.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      No se encontraron registros con los filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : (
                  historial.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Tooltip title={`Fecha original: ${item.fecha || "No disponible"}`}>
                          <span>{formatDateUTC(item.fecha, item.fecha_formateada)}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.tipo_cambio_display || item.tipo_cambio}
                          color={getBadgeColor(item.tipo_cambio)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {item.dispositivo ? (
                          <>
                            {item.dispositivo.marca} {item.dispositivo.modelo}
                            <br />
                            <small style={{ color: "#666" }}>{item.dispositivo.serial}</small>
                          </>
                        ) : (
                          "Dispositivo eliminado"
                        )}
                      </TableCell>
                      <TableCell>
                        {item.usuario ? (
                          <>
                            {item.usuario.nombre || item.usuario.username}
                            <br />
                            <small style={{ color: "#666" }}>{item.usuario.email}</small>
                          </>
                        ) : (
                          "Sistema"
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Ver detalles">
                          <IconButton
                            onClick={() => handleOpenDetails(item)}
                            disabled={!item.cambios || item.cambios === "No hay datos de cambios"}
                          >
                            <Visibility
                              color={
                                item.cambios && item.cambios !== "No hay datos de cambios" ? "primary" : "disabled"
                              }
                            />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {!loading && !error && historial.length > 0 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Pagination
                count={Math.ceil(pagination.totalItems / pagination.pageSize)}
                page={pagination.page}
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
                disabled={loading}
              />
            </Box>
          )}
        </Paper>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth scroll="paper">
          <DialogTitle>Detalles del Registro</DialogTitle>
          <DialogContent dividers>
            {selectedItem && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Información General
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography>
                      <strong>Fecha:</strong> {formatDateUTC(selectedItem.fecha, selectedItem.fecha_formateada)}
                    </Typography>
                    <Typography>
                      <strong>Fecha original:</strong> {selectedItem.fecha || "No disponible"}
                    </Typography>
                    <Typography sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                      <strong>Tipo:</strong>
                      <Chip
                        label={selectedItem.tipo_cambio_display || selectedItem.tipo_cambio}
                        color={getBadgeColor(selectedItem.tipo_cambio)}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Typography>
                  </Box>

                  <Typography variant="subtitle1" gutterBottom>
                    Dispositivo
                  </Typography>
                  {selectedItem.dispositivo ? (
                    <Box sx={{ pl: 2 }}>
                      <Typography>
                        <strong>Marca:</strong> {selectedItem.dispositivo.marca || "N/A"}
                      </Typography>
                      <Typography>
                        <strong>Modelo:</strong> {selectedItem.dispositivo.modelo || "N/A"}
                      </Typography>
                      <Typography>
                        <strong>Serial:</strong> {selectedItem.dispositivo.serial || "N/A"}
                      </Typography>
                      <Typography>
                        <strong>Placa CU:</strong> {selectedItem.dispositivo.placa_cu || "N/A"}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography>Dispositivo eliminado</Typography>
                  )}
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Usuario
                  </Typography>
                  {selectedItem.usuario ? (
                    <Box sx={{ pl: 2 }}>
                      <Typography>
                        <strong>Nombre:</strong> {selectedItem.usuario.nombre || "N/A"}
                      </Typography>
                      <Typography>
                        <strong>Usuario:</strong> {selectedItem.usuario.username}
                      </Typography>
                      <Typography>
                        <strong>Email:</strong> {selectedItem.usuario.email || "N/A"}
                      </Typography>
                      <Typography>
                        <strong>Rol:</strong> {selectedItem.usuario.rol || "N/A"}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography>Sistema</Typography>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Cambios Realizados
                  </Typography>
                  <Paper sx={{ p: 2, backgroundColor: "#f5f5f5" }}>{formatChanges(selectedItem.cambios)}</Paper>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)} variant="contained" color="primary">
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  )
}

export default Historial