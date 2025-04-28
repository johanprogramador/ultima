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

    const Movimientos = () => {
    const { token, sedeId } = useAuth()
    const [movimientos, setMovimientos] = useState([])
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
        ubicacion_origen: "",
        ubicacion_destino: "",
        fecha_inicio: null,
        fecha_fin: null,
        dispositivo: "",
        encargado: "",
        search: "",
    })
    const [filterOptions, setFilterOptions] = useState({
        ubicaciones: {},
        dispositivos: [],
        usuarios: [],
    })
    const [selectedItem, setSelectedItem] = useState(null)
    const [openDialog, setOpenDialog] = useState(false)
    const navigate = useNavigate()

    const formatDateUTC = useCallback((dateString) => {
        if (!dateString) return "No registrado"
        try {
        const date = dayjs(dateString)
        return date.isValid() ? date.format("DD/MM/YYYY HH:mm:ss") : "Fecha inválida"
        } catch (e) {
        console.error("Error formateando fecha:", e)
        return "Formato inválido"
        }
    }, [])

    const handleError = useCallback((error, context = "") => {
        console.error(`Error ${context}:`, error)
        setError(error.message)
        setSnackbar({
        open: true,
        message: `${context ? `${context}: ` : ""}${error.message}`,
        severity: "error",
        })
    }, [])

    const fetchFilterOptions = useCallback(async () => {
        try {
        setLoading(true)
        const response = await api.get("/movimientos/opciones_filtro", {
            headers: { Authorization: `Bearer ${token}` },
            params: { sede_id: sedeId },
        })

        setFilterOptions({
            ubicaciones: response.data.ubicaciones || {},
            dispositivos: response.data.dispositivos || [],
            usuarios: response.data.usuarios || [],
        })
        } catch (err) {
        handleError(err, "cargando opciones de filtro")
        } finally {
        setLoading(false)
        }
    }, [token, sedeId, handleError])

    const fetchMovimientos = useCallback(async () => {
        setLoading(true)
        setError(null)
        
        try {
        const params = {
            page: pagination.page,
            page_size: pagination.pageSize,
            ...filters,
            fecha_inicio: filters.fecha_inicio 
            ? dayjs(filters.fecha_inicio).startOf('day').format('YYYY-MM-DDTHH:mm:ss')
            : null,
            fecha_fin: filters.fecha_fin 
            ? dayjs(filters.fecha_fin).endOf('day').format('YYYY-MM-DDTHH:mm:ss')
            : null,
        }

        Object.keys(params).forEach(key => {
            if (params[key] === null || params[key] === "" || params[key] === undefined) {
            delete params[key]
            }
        })

        const response = await api.get("/movimientos", {
            headers: { Authorization: `Bearer ${token}` },
            params,
        })

        setMovimientos(response.data.results.map(item => ({
            ...item,
            fecha_movimiento: item.fecha_movimiento,
        })))
        
        setPagination(prev => ({
            ...prev,
            totalItems: response.data.count,
        }))

        } catch (err) {
        handleError(err, "cargando movimientos")
        setMovimientos([])
        } finally {
        setLoading(false)
        }
    }, [pagination.page, pagination.pageSize, filters, token, handleError])

    useEffect(() => {
        fetchFilterOptions()
    }, [fetchFilterOptions])

    useEffect(() => {
        fetchMovimientos()
    }, [fetchMovimientos])

    const handlePageChange = (event, newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }))
    }

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }))
        setPagination(prev => ({ ...prev, page: 1 }))
    }

    const resetFilters = () => {
        setFilters({
        ubicacion_origen: "",
        ubicacion_destino: "",
        fecha_inicio: null,
        fecha_fin: null,
        dispositivo: "",
        encargado: "",
        search: "",
        })
    }

    const handleOpenDetails = (item) => {
        setSelectedItem(item)
        setOpenDialog(true)
    }

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }))
    }

    const getBadgeColor = (ubicacion) => {
        switch (ubicacion) {
        case "SEDE": return "primary"
        case "CASA": return "secondary"
        case "CLIENTE": return "warning"
        default: return "default"
        }
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box sx={{ p: 3 }}>
            <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
            <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                {snackbar.message}
            </Alert>
            </Snackbar>

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Typography variant="h4" component="h1">
                Registro de Movimientos
            </Typography>
            <Button 
                variant="outlined" 
                startIcon={<ArrowBack />} 
                onClick={() => navigate(-1)} 
                sx={{ ml: 2 }}
            >
                Volver
            </Button>
            </Box>

            <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                    <InputLabel id="ubicacion-origen-label">Ubicación Origen</InputLabel>
                    <Select
                    labelId="ubicacion-origen-label"
                    value={filters.ubicacion_origen}
                    onChange={(e) => handleFilterChange("ubicacion_origen", e.target.value)}
                    label="Ubicación Origen"
                    disabled={loading}
                    >
                    <MenuItem value="">Todas</MenuItem>
                    {Object.entries(filterOptions.ubicaciones).map(([value, label]) => (
                        <MenuItem key={value} value={value}>
                        {label}
                        </MenuItem>
                    ))}
                    </Select>
                </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                    <InputLabel id="ubicacion-destino-label">Ubicación Destino</InputLabel>
                    <Select
                    labelId="ubicacion-destino-label"
                    value={filters.ubicacion_destino}
                    onChange={(e) => handleFilterChange("ubicacion_destino", e.target.value)}
                    label="Ubicación Destino"
                    disabled={loading}
                    >
                    <MenuItem value="">Todas</MenuItem>
                    {Object.entries(filterOptions.ubicaciones).map(([value, label]) => (
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
                    onChange={(e) => handleFilterChange("dispositivo", e.target.value)}
                    label="Dispositivo"
                    disabled={loading || filterOptions.dispositivos.length === 0}
                    >
                    <MenuItem value="">Todos</MenuItem>
                    {filterOptions.dispositivos.map((dispositivo) => (
                        <MenuItem key={dispositivo.id} value={dispositivo.id}>
                        {dispositivo.marca} {dispositivo.modelo} ({dispositivo.serial})
                        </MenuItem>
                    ))}
                    </Select>
                </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                    <InputLabel id="encargado-label">Encargado</InputLabel>
                    <Select
                    labelId="encargado-label"
                    value={filters.encargado}
                    onChange={(e) => handleFilterChange("encargado", e.target.value)}
                    label="Encargado"
                    disabled={loading || filterOptions.usuarios.length === 0}
                    >
                    <MenuItem value="">Todos</MenuItem>
                    {filterOptions.usuarios.map((usuario) => (
                        <MenuItem key={usuario.id} value={usuario.id}>
                        {usuario.nombre} ({usuario.rol})
                        </MenuItem>
                    ))}
                    </Select>
                </FormControl>
                </Grid>

                <Grid item xs={12}>
                <Box sx={{ display: "flex", gap: 2 }}>
                    <Button 
                    variant="contained" 
                    startIcon={<FilterList />} 
                    onClick={fetchMovimientos} 
                    disabled={loading}
                    >
                    {loading ? "Cargando..." : "Aplicar Filtros"}
                    </Button>
                    <Button 
                    variant="outlined" 
                    startIcon={<Clear />} 
                    onClick={resetFilters} 
                    disabled={loading}
                    >
                    Limpiar Filtros
                    </Button>
                    <Button 
                    variant="text" 
                    startIcon={<Refresh />} 
                    onClick={() => {
                        fetchFilterOptions()
                        fetchMovimientos()
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
                    <TableCell>Dispositivo</TableCell>
                    <TableCell>Origen</TableCell>
                    <TableCell>Destino</TableCell>
                    <TableCell>Encargado</TableCell>
                    <TableCell>Acciones</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {loading ? (
                    <TableRow>
                        <TableCell colSpan={6} align="center">
                        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                            <CircularProgress />
                        </Box>
                        </TableCell>
                    </TableRow>
                    ) : error ? (
                    <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                        <Alert
                            severity="error"
                            action={
                            <Button 
                                color="inherit" 
                                size="small" 
                                onClick={fetchMovimientos} 
                                startIcon={<Refresh />}
                            >
                                Reintentar
                            </Button>
                            }
                        >
                            {error}
                        </Alert>
                        </TableCell>
                    </TableRow>
                    ) : movimientos.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                        No se encontraron movimientos con los filtros aplicados
                        </TableCell>
                    </TableRow>
                    ) : (
                    movimientos.map((item) => (
                        <TableRow key={item.id} hover>
                        <TableCell>{formatDateUTC(item.fecha_movimiento)}</TableCell>
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
                            <Chip
                            label={filterOptions.ubicaciones[item.ubicacion_origen] || item.ubicacion_origen}
                            color={getBadgeColor(item.ubicacion_origen)}
                            size="small"
                            />
                        </TableCell>
                        <TableCell>
                            <Chip
                            label={filterOptions.ubicaciones[item.ubicacion_destino] || item.ubicacion_destino}
                            color={getBadgeColor(item.ubicacion_destino)}
                            size="small"
                            />
                        </TableCell>
                        <TableCell>
                            {item.encargado ? (
                            <>
                                {item.encargado.nombre || item.encargado.username}
                                <br />
                                <small style={{ color: "#666" }}>{item.encargado.email}</small>
                            </>
                            ) : (
                            "Sistema"
                            )}
                        </TableCell>
                        <TableCell>
                            <Tooltip title="Ver detalles">
                            <IconButton onClick={() => handleOpenDetails(item)}>
                                <Visibility color="primary" />
                            </IconButton>
                            </Tooltip>
                        </TableCell>
                        </TableRow>
                    ))
                    )}
                </TableBody>
                </Table>
            </TableContainer>

            {!loading && !error && movimientos.length > 0 && (
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

            <Dialog 
            open={openDialog} 
            onClose={() => setOpenDialog(false)} 
            maxWidth="md" 
            fullWidth 
            scroll="paper"
            >
            <DialogTitle>Detalles del Movimiento</DialogTitle>
            <DialogContent dividers>
                {selectedItem && (
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                        Información General
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                        <Typography>
                        <strong>Fecha:</strong> {formatDateUTC(selectedItem.fecha_movimiento)}
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
                        Ubicaciones
                    </Typography>
                    <Box sx={{ pl: 2 }}>
                        <Typography>
                        <strong>Origen:</strong> 
                        <Chip
                            label={filterOptions.ubicaciones[selectedItem.ubicacion_origen] || selectedItem.ubicacion_origen}
                            color={getBadgeColor(selectedItem.ubicacion_origen)}
                            size="small"
                            sx={{ ml: 1 }}
                        />
                        </Typography>
                        <Typography>
                        <strong>Destino:</strong> 
                        <Chip
                            label={filterOptions.ubicaciones[selectedItem.ubicacion_destino] || selectedItem.ubicacion_destino}
                            color={getBadgeColor(selectedItem.ubicacion_destino)}
                            size="small"
                            sx={{ ml: 1 }}
                        />
                        </Typography>
                    </Box>

                    <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                        Encargado
                    </Typography>
                    {selectedItem.encargado ? (
                        <Box sx={{ pl: 2 }}>
                        <Typography>
                            <strong>Nombre:</strong> {selectedItem.encargado.nombre || selectedItem.encargado.username}
                        </Typography>
                        <Typography>
                            <strong>Email:</strong> {selectedItem.encargado.email || "N/A"}
                        </Typography>
                        <Typography>
                            <strong>Rol:</strong> {selectedItem.encargado.rol || "N/A"}
                        </Typography>
                        </Box>
                    ) : (
                        <Typography>Sistema</Typography>
                    )}
                    </Grid>

                    <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                        Observaciones
                    </Typography>
                    <Paper sx={{ p: 2, backgroundColor: "#f5f5f5" }}>
                        {selectedItem.observacion || "No hay observaciones registradas"}
                    </Paper>
                    </Grid>
                </Grid>
                )}
            </DialogContent>
            <DialogActions>
                <Button 
                onClick={() => setOpenDialog(false)} 
                variant="contained"
                color="primary"
                >
                Cerrar
                </Button>
            </DialogActions>
            </Dialog>
        </Box>
        </LocalizationProvider>
    )
    }

    export default Movimientos