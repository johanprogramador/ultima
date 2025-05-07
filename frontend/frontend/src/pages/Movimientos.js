/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
    "use client"

    import { useState, useEffect } from "react"
    import "../styles/movimientos.css"

    const Movimientos = () => {
    // Estados
    const [movimientos, setMovimientos] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [openDialog, setOpenDialog] = useState(false)
    const [openDetailsDialog, setOpenDetailsDialog] = useState(false)
    const [selectedItem, setSelectedItem] = useState(null)
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
        sede: "",
        posicion: "",
        fecha_inicio: "",
        fecha_fin: "",
        dispositivo: "",
    })

    // Estados para el modal de creación
    const [sedeSeleccionada, setSedeSeleccionada] = useState("")
    const [posicionActual, setPosicionActual] = useState("")
    const [posicionNueva, setPosicionNueva] = useState("")
    const [dispositivoSeleccionado, setDispositivoSeleccionado] = useState("")
    const [searchPosicion, setSearchPosicion] = useState("")
    const [searchDispositivo, setSearchDispositivo] = useState("")
    const [detalle, setDetalle] = useState("")

    // Datos de ejemplo
    const sedes = [
        { id: 1, nombre: "Centro Alhambra - Manizales" },
        { id: 2, nombre: "Centro Alta Suiza - Manizales" },
        { id: 3, nombre: "Centro Comercial Aves" },
    ]

    const posiciones = {
        1: [
        { id: 1, nombre: "Posición A1" },
        { id: 2, nombre: "Posición A2" },
        { id: 3, nombre: "Posición A3" },
        ],
        2: [
        { id: 4, nombre: "Posición B1" },
        { id: 5, nombre: "Posición B2" },
        ],
        3: [
        { id: 6, nombre: "Posición C1" },
        { id: 7, nombre: "Posición C2" },
        { id: 8, nombre: "Posición C3" },
        { id: 9, nombre: "Posición C4" },
        ],
    }

    const dispositivos = {
        1: [
        { id: 1, nombre: "Laptop HP", serial: "SN12345" },
        { id: 2, nombre: "Monitor Dell", serial: "SN67890" },
        ],
        2: [
        { id: 3, nombre: "Teclado Logitech", serial: "SN24680" },
        { id: 4, nombre: "Mouse Microsoft", serial: "SN13579" },
        ],
        3: [{ id: 5, nombre: "Impresora HP", serial: "SN97531" }],
        4: [
        { id: 6, nombre: "Scanner Epson", serial: "SN86420" },
        { id: 7, nombre: "Proyector Epson", serial: "SN75319" },
        ],
        5: [{ id: 8, nombre: "Tablet Samsung", serial: "SN95175" }],
        6: [{ id: 9, nombre: "Teléfono Cisco", serial: "SN15937" }],
        7: [{ id: 10, nombre: "Router Cisco", serial: "SN35791" }],
        8: [{ id: 11, nombre: "Switch HP", serial: "SN75391" }],
        9: [{ id: 12, nombre: "UPS APC", serial: "SN13597" }],
    }

    // Datos de ejemplo para la tabla
    const movimientosData = [
        {
        id: 1,
        fecha: null,
        tipo: "Movimiento",
        sede: "Centro Alhambra - Manizales",
        posicionOrigen: "Posición A1",
        posicionDestino: "Posición B2",
        usuario: {
            nombre: "majo",
            email: "majomenezd@emergiacc.com",
        },
        },
        {
        id: 2,
        fecha: null,
        tipo: "Movimiento",
        sede: "Centro Alta Suiza - Manizales",
        posicionOrigen: "Posición C3",
        posicionDestino: "Posición A2",
        usuario: {
            nombre: "majo",
            email: "majomenezd@emergiacc.com",
        },
        },
        {
        id: 3,
        fecha: null,
        tipo: "Movimiento",
        sede: "Centro Comercial Aves",
        posicionOrigen: "Posición B1",
        posicionDestino: "Posición C4",
        usuario: {
            nombre: "majo",
            email: "majomenezd@emergiacc.com",
        },
        },
        {
        id: 4,
        fecha: null,
        tipo: "Movimiento",
        sede: "Centro Alhambra - Manizales",
        posicionOrigen: "Posición A3",
        posicionDestino: "Posición B1",
        usuario: {
            nombre: "majo",
            email: "majomenezd@emergiacc.com",
        },
        },
        {
        id: 5,
        fecha: null,
        tipo: "Movimiento",
        sede: "Centro Alta Suiza - Manizales",
        posicionOrigen: "Posición C2",
        posicionDestino: "Posición A1",
        usuario: {
            nombre: "majo",
            email: "majomenezd@emergiacc.com",
        },
        },
    ]

    // Cargar datos de ejemplo al iniciar
    useEffect(() => {
        setMovimientos(movimientosData)
        setPagination({
        ...pagination,
        totalItems: movimientosData.length,
        })
    }, [])

    // Funciones
    const handleOpenDetails = (item) => {
        setSelectedItem(item)
        setOpenDetailsDialog(true)
    }

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false })
    }

    const handleFilterChange = (name, value) => {
        setFilters({ ...filters, [name]: value })
    }

    const handleApplyFilters = () => {
        console.log("Aplicando filtros:", filters)
        // Aquí iría la lógica para aplicar los filtros
    }

    const handleResetFilters = () => {
        setFilters({
        sede: "",
        posicion: "",
        fecha_inicio: "",
        fecha_fin: "",
        dispositivo: "",
        })
    }

    const handlePageChange = (page) => {
        setPagination({ ...pagination, page })
    }

    const handleOpenCreateDialog = () => {
        setSedeSeleccionada("")
        setPosicionActual("")
        setPosicionNueva("")
        setDispositivoSeleccionado("")
        setSearchPosicion("")
        setSearchDispositivo("")
        setDetalle("")
        setOpenDialog(true)
    }

    const handleCloseCreateDialog = () => {
        setOpenDialog(false)
    }

    const handleCloseDetailsDialog = () => {
        setOpenDetailsDialog(false)
    }

    const handleSedeChange = (e) => {
        setSedeSeleccionada(e.target.value)
        setPosicionActual("")
        setDispositivoSeleccionado("")
        setPosicionNueva("")
    }

    const handlePosicionActualChange = (e) => {
        setPosicionActual(e.target.value)
        setDispositivoSeleccionado("")
    }

    const handleSaveMovimiento = () => {
        // Aquí iría la lógica para guardar el movimiento
        console.log("Guardando movimiento:", {
        sede: sedeSeleccionada,
        posicionActual,
        posicionNueva,
        dispositivo: dispositivoSeleccionado,
        detalle,
        })

        setSnackbar({
        open: true,
        message: "Movimiento guardado correctamente",
        severity: "success",
        })

        handleCloseCreateDialog()
    }

    // Filtrar posiciones según la búsqueda
    const filteredPosiciones = sedeSeleccionada
        ? posiciones[sedeSeleccionada].filter((pos) => pos.nombre.toLowerCase().includes(searchPosicion.toLowerCase()))
        : []

    // Filtrar dispositivos según la posición actual
    const filteredDispositivos = posicionActual
        ? dispositivos[posicionActual].filter(
            (disp) =>
            disp.nombre.toLowerCase().includes(searchDispositivo.toLowerCase()) ||
            disp.serial.toLowerCase().includes(searchDispositivo.toLowerCase()),
        )
        : []

    return (
        <div className="dashboard-container">
        <div className="registro-image-container">
            <img
            src={require("../assets/E-Inventory.png") || "/placeholder.svg"}
            alt="E-Inventory"
            className="registro-image"
            />
        </div>

        {/* Snackbar para notificaciones */}
        {snackbar.open && (
            <div className={`snackbar ${snackbar.severity}`}>
            <span>{snackbar.message}</span>
            <button className="snackbar-close" onClick={handleCloseSnackbar}>
                ×
            </button>
            </div>
        )}

        <div className="header">
            <h1>Registro de Movimientos</h1>
            <div className="header-buttons">
            <button className="btn btn-primary" onClick={handleOpenCreateDialog}>
                <span className="icon">+</span> Crear Nuevo Movimiento
            </button>
            </div>
        </div>

        <div className="filter-card">
            <div className="filter-grid">
            <div className="filter-item">
                <label htmlFor="sede">Sede</label>
                <select id="sede" value={filters.sede} onChange={(e) => handleFilterChange("sede", e.target.value)}>
                <option value="">Todas</option>
                {sedes.map((sede) => (
                    <option key={sede.id} value={sede.id}>
                    {sede.nombre}
                    </option>
                ))}
                </select>
            </div>

            <div className="filter-item">
                <label htmlFor="posicion">Posición</label>
                <select
                id="posicion"
                value={filters.posicion}
                onChange={(e) => handleFilterChange("posicion", e.target.value)}
                disabled={!filters.sede}
                >
                <option value="">Todas</option>
                {filters.sede &&
                    posiciones[filters.sede] &&
                    posiciones[filters.sede].map((pos) => (
                    <option key={pos.id} value={pos.id}>
                        {pos.nombre}
                    </option>
                    ))}
                </select>
            </div>

            <div className="filter-item">
                <label htmlFor="fecha_inicio">Fecha inicio</label>
                <input
                type="date"
                id="fecha_inicio"
                value={filters.fecha_inicio}
                onChange={(e) => handleFilterChange("fecha_inicio", e.target.value)}
                />
            </div>

            <div className="filter-item">
                <label htmlFor="fecha_fin">Fecha fin</label>
                <input
                type="date"
                id="fecha_fin"
                value={filters.fecha_fin}
                onChange={(e) => handleFilterChange("fecha_fin", e.target.value)}
                />
            </div>

            <div className="filter-item">
                <label htmlFor="dispositivo">Dispositivo</label>
                <select
                id="dispositivo"
                value={filters.dispositivo}
                onChange={(e) => handleFilterChange("dispositivo", e.target.value)}
                disabled={!filters.posicion}
                >
                <option value="">Todos</option>
                {filters.posicion &&
                    dispositivos[filters.posicion] &&
                    dispositivos[filters.posicion].map((disp) => (
                    <option key={disp.id} value={disp.id}>
                        {disp.nombre} ({disp.serial})
                    </option>
                    ))}
                </select>
            </div>
            </div>

            <div className="filter-buttons">
            <button className="btn btn-primary" onClick={handleApplyFilters}>
                <span className="icon">⚙</span> Aplicar Filtros
            </button>
            <button className="btn btn-outline" onClick={handleResetFilters}>
                <span className="icon">×</span> Limpiar Filtros
            </button>
            <button className="btn btn-text">
                <span className="icon">↻</span> Actualizar
            </button>
            </div>
        </div>

        <div className="table-card">
            <table className="data-table">
            <thead>
                <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Usuario</th>
                <th>Detalles</th>
                <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                {loading ? (
                <tr>
                    <td colSpan={5} className="loading-cell">
                    <div className="loading-spinner"></div>
                    </td>
                </tr>
                ) : error ? (
                <tr>
                    <td colSpan={5} className="error-cell">
                    <div className="error-message">{error}</div>
                    </td>
                </tr>
                ) : movimientos.length === 0 ? (
                <tr>
                    <td colSpan={5} className="empty-cell">
                    No se encontraron movimientos
                    </td>
                </tr>
                ) : (
                movimientos.map((item) => (
                    <tr key={item.id}>
                    <td>{item.fecha ? new Date(item.fecha).toLocaleDateString() : "No registrado"}</td>
                    <td>
                        <span className="badge">{item.tipo}</span>
                    </td>
                    <td>
                        <div className="user-info">
                        <div>{item.usuario.nombre}</div>
                        <div className="user-email">{item.usuario.email}</div>
                        </div>
                    </td>
                    <td>
                        <div className="movement-details">
                        De: <span className="position">{item.posicionOrigen}</span> a{" "}
                        <span className="position">{item.posicionDestino}</span>
                        </div>
                    </td>
                    <td>
                        <button className="btn-icon" onClick={() => handleOpenDetails(item)} title="Ver detalles">
                        <span className="icon">👁</span>
                        </button>
                    </td>
                    </tr>
                ))
                )}
            </tbody>
            </table>

            {!loading && !error && movimientos.length > 0 && (
            <div className="pagination">
                <button
                className="pagination-btn"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                >
                &laquo;
                </button>
                {[...Array(Math.ceil(pagination.totalItems / pagination.pageSize))].map((_, i) => (
                <button
                    key={i}
                    className={`pagination-btn ${pagination.page === i + 1 ? "active" : ""}`}
                    onClick={() => handlePageChange(i + 1)}
                >
                    {i + 1}
                </button>
                ))}
                <button
                className="pagination-btn"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === Math.ceil(pagination.totalItems / pagination.pageSize)}
                >
                &raquo;
                </button>
            </div>
            )}
        </div>

        {/* Modal para crear nuevo movimiento */}
        {openDialog && (
            <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                <h2>Crear Nuevo Movimiento</h2>
                <button className="modal-close" onClick={handleCloseCreateDialog}>
                    ×
                </button>
                </div>
                <div className="modal-content">
                <div className="modal-grid">
                    <div className="modal-column">
                    <div className="form-group">
                        <label htmlFor="sede-modal">Sede</label>
                        <select id="sede-modal" value={sedeSeleccionada} onChange={handleSedeChange}>
                        <option value="">Seleccionar sede</option>
                        {sedes.map((sede) => (
                            <option key={sede.id} value={sede.id}>
                            {sede.nombre}
                            </option>
                        ))}
                        </select>
                    </div>

                    {sedeSeleccionada && (
                        <>
                        <div className="form-group">
                            <label htmlFor="search-posicion">Buscar posición actual</label>
                            <div className="search-input">
                            <span className="search-icon">🔍</span>
                            <input
                                id="search-posicion"
                                type="text"
                                value={searchPosicion}
                                onChange={(e) => setSearchPosicion(e.target.value)}
                                placeholder="Buscar posición..."
                            />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="posicion-actual">Posición Actual</label>
                            <select id="posicion-actual" value={posicionActual} onChange={handlePosicionActualChange}>
                            <option value="">Seleccionar posición</option>
                            {filteredPosiciones.map((pos) => (
                                <option key={pos.id} value={pos.id}>
                                {pos.nombre}
                                </option>
                            ))}
                            </select>
                        </div>
                        </>
                    )}

                    {posicionActual && (
                        <>
                        <div className="form-group">
                            <label htmlFor="search-dispositivo">Buscar dispositivo</label>
                            <div className="search-input">
                            <span className="search-icon">🔍</span>
                            <input
                                id="search-dispositivo"
                                type="text"
                                value={searchDispositivo}
                                onChange={(e) => setSearchDispositivo(e.target.value)}
                                placeholder="Buscar por nombre o serial..."
                            />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="dispositivo-modal">Dispositivo</label>
                            <select
                            id="dispositivo-modal"
                            value={dispositivoSeleccionado}
                            onChange={(e) => setDispositivoSeleccionado(e.target.value)}
                            >
                            <option value="">Seleccionar dispositivo</option>
                            {filteredDispositivos.map((disp) => (
                                <option key={disp.id} value={disp.id}>
                                {disp.nombre} ({disp.serial})
                                </option>
                            ))}
                            </select>
                        </div>
                        </>
                    )}
                    </div>

                    <div className="modal-column">
                    {posicionActual && (
                        <>
                        <div className="form-group">
                            <label htmlFor="posicion-nueva">Nueva Posición</label>
                            <select
                            id="posicion-nueva"
                            value={posicionNueva}
                            onChange={(e) => setPosicionNueva(e.target.value)}
                            >
                            <option value="">Seleccionar nueva posición</option>
                            {sedeSeleccionada &&
                                posiciones[sedeSeleccionada].map((pos) => (
                                <option key={pos.id} value={pos.id}>
                                    {pos.nombre}
                                </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="usuario">Usuario</label>
                            <input id="usuario" type="text" value="Usuario Actual" disabled />
                        </div>

                        <div className="form-group">
                            <label htmlFor="detalle">Detalle del Movimiento</label>
                            <textarea
                            id="detalle"
                            rows={4}
                            value={detalle}
                            onChange={(e) => setDetalle(e.target.value)}
                            placeholder="Describa el motivo del movimiento"
                            ></textarea>
                        </div>
                        </>
                    )}
                    </div>
                </div>
                </div>
                <div className="modal-footer">
                <button className="btn btn-outline" onClick={handleCloseCreateDialog}>
                    Cancelar
                </button>
                <button
                    className="btn btn-primary"
                    onClick={handleSaveMovimiento}
                    disabled={!sedeSeleccionada || !posicionActual || !dispositivoSeleccionado || !posicionNueva}
                >
                    Guardar Movimiento
                </button>
                </div>
            </div>
            </div>
        )}

        {/* Modal para ver detalles */}
        {openDetailsDialog && selectedItem && (
            <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                <h2>Detalles del Movimiento</h2>
                <button className="modal-close" onClick={handleCloseDetailsDialog}>
                    ×
                </button>
                </div>
                <div className="modal-content">
                <div className="details-grid">
                    <div className="details-section">
                    <h3>Información General</h3>
                    <p>
                        <strong>Fecha:</strong>{" "}
                        {selectedItem.fecha ? new Date(selectedItem.fecha).toLocaleString() : "No registrado"}
                    </p>
                    <p>
                        <strong>Tipo:</strong> {selectedItem.tipo}
                    </p>
                    <p>
                        <strong>Sede:</strong> {selectedItem.sede || "Centro Alhambra - Manizales"}
                    </p>
                    </div>

                    <div className="details-section">
                    <h3>Movimiento</h3>
                    <p>
                        <strong>Posición Origen:</strong> {selectedItem.posicionOrigen}
                    </p>
                    <p>
                        <strong>Posición Destino:</strong> {selectedItem.posicionDestino}
                    </p>
                    </div>

                    <div className="details-section full-width">
                    <h3>Usuario</h3>
                    <p>
                        <strong>Nombre:</strong> {selectedItem.usuario.nombre}
                    </p>
                    <p>
                        <strong>Email:</strong> {selectedItem.usuario.email}
                    </p>
                    </div>
                </div>
                </div>
                <div className="modal-footer">
                <button className="btn btn-primary" onClick={handleCloseDetailsDialog}>
                    Cerrar
                </button>
                </div>
            </div>
            </div>
        )}
        </div>
    )
    }

    export default Movimientos
