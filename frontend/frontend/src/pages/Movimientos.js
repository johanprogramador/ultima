/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useState, useEffect } from "react"
import "../styles/movimientos.css"
import axios from "axios"
import { format } from "date-fns"

const Movimientos = () => {
  // Estados principales
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [dialogoDetallesAbierto, setDialogoDetallesAbierto] = useState(false)
  const [itemSeleccionado, setItemSeleccionado] = useState(null)
  const [notificacion, setNotificacion] = useState({
    abierta: false,
    mensaje: "",
    tipo: "error",
  })

  // Estados para paginación y filtros
  const [paginacion, setPaginacion] = useState({
    pagina: 1,
    itemsPorPagina: 10,
    totalItems: 0,
  })
  const [filtros, setFiltros] = useState({
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
  const [busquedaPosicion, setBusquedaPosicion] = useState("")
  const [busquedaDispositivo, setBusquedaDispositivo] = useState("")
  const [detalle, setDetalle] = useState("")
  const [sedes, setSedes] = useState([])
  const [posiciones, setPosiciones] = useState([])
  const [dispositivos, setDispositivos] = useState([])
  const [cargandoPosiciones, setCargandoPosiciones] = useState(false)
  const [cargandoDispositivos, setCargandoDispositivos] = useState(false)

  // Configuración de axios
  const api = axios.create({
    baseURL: "http://localhost:8000/api",
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionStorage.getItem("token")}`,
    },
  })

  // Obtener datos iniciales
  useEffect(() => {
    obtenerSedes()
    obtenerMovimientos()
  }, [paginacion.pagina, filtros])

  // Obtener lista de sedes
  const obtenerSedes = async () => {
    try {
      const respuesta = await api.get("/sede/")
      if (respuesta.status === 200) {
        setSedes(respuesta.data.sedes || respuesta.data || [])
      } else {
        throw new Error(`Error ${respuesta.status}: ${respuesta.statusText}`)
      }
    } catch (error) {
      console.error("Error al obtener sedes:", error)
      mostrarNotificacion("No se pudieron cargar las sedes. Verifica tu conexión.", "error")
    }
  }

  // Modificar la función obtenerPosicionesPorSede para usar el endpoint correcto
  const obtenerPosicionesPorSede = async (sedeId) => {
    if (!sedeId) {
      setPosiciones([])
      return
    }

    setCargandoPosiciones(true)
    try {
      // Usar el endpoint específico para obtener posiciones por sede
      const response = await api.get(`/posiciones/`, {
        params: { sede: sedeId },
      })

      // Manejar diferentes formatos de respuesta
      let posicionesData = []
      if (Array.isArray(response.data)) {
        posicionesData = response.data
      } else if (response.data && Array.isArray(response.data.results)) {
        posicionesData = response.data.results
      } else if (response.data && Array.isArray(response.data.data)) {
        posicionesData = response.data.data
      }

      setPosiciones(posicionesData)
    } catch (error) {
      console.error("Error obteniendo posiciones:", error)
      mostrarNotificacion("Error al cargar las posiciones", "error")
      setPosiciones([])
    } finally {
      setCargandoPosiciones(false)
    }
  }

  // Modificar la función obtenerDispositivosPorPosicion para usar el endpoint correcto
  const obtenerDispositivosPorPosicion = async (posicionId) => {
    if (!posicionId) {
      setDispositivos([])
      return
    }

    setCargandoDispositivos(true)
    try {
      // Usar el endpoint específico para obtener dispositivos por posición
      const respuesta = await api.get("/dispositivos/", {
        params: {
          posicion: posicionId,
          estado_uso: "DISPONIBLE",
        },
      })

      // Manejar diferentes formatos de respuesta
      let dispositivosData = []
      if (Array.isArray(respuesta.data)) {
        dispositivosData = respuesta.data
      } else if (respuesta.data && Array.isArray(respuesta.data.results)) {
        dispositivosData = respuesta.data.results
      } else if (respuesta.data && Array.isArray(respuesta.data.data)) {
        dispositivosData = respuesta.data.data
      }

      setDispositivos(dispositivosData)
    } catch (error) {
      console.error("Error obteniendo dispositivos:", error)
      mostrarNotificacion("Error al cargar los dispositivos", "error")
      setDispositivos([])
    } finally {
      setCargandoDispositivos(false)
    }
  }

  // Obtener movimientos con filtros
  const obtenerMovimientos = async () => {
    setCargando(true)
    setError(null)

    try {
      const params = {
        page: paginacion.pagina,
        page_size: paginacion.itemsPorPagina,
        ...Object.fromEntries(Object.entries(filtros).filter(([_, v]) => v !== "")),
      }

      const response = await api.get("/movimientos/", { params })

      // Manejar diferentes formatos de respuesta
      let movimientosData = []
      if (Array.isArray(response.data)) {
        movimientosData = response.data
      } else if (response.data && Array.isArray(response.data.results)) {
        movimientosData = response.data.results
        if (response.data.count !== undefined) {
          setPaginacion((prev) => ({
            ...prev,
            totalItems: response.data.count,
          }))
        }
      } else if (response.data && Array.isArray(response.data.data)) {
        movimientosData = response.data.data
      }

      // Formatear movimientos
      const movimientosFormateados = movimientosData.map((mov) => ({
        id: mov.id || mov._id || "",
        fecha_movimiento: mov.fecha_movimiento || mov.fecha || mov.createdAt || null,
        dispositivo: {
          id: mov.dispositivo?.id || mov.deviceId || "",
          serial: mov.dispositivo?.serial || mov.deviceSerial || "",
          modelo: mov.dispositivo?.modelo || mov.deviceModel || "",
          marca: mov.dispositivo?.marca || mov.deviceBrand || "",
        },
        posicion_origen: {
          id: mov.posicion_origen?.id || mov.originPositionId || "",
          nombre: mov.posicion_origen?.nombre || mov.originPositionName || "",
          piso: mov.posicion_origen?.piso || mov.originFloor || "",
        },
        posicion_destino: {
          id: mov.posicion_destino?.id || mov.destinationPositionId || "",
          nombre: mov.posicion_destino?.nombre || mov.destinationPositionName || "",
          piso: mov.posicion_destino?.piso || mov.destinationFloor || "",
        },
        encargado: {
          id: mov.encargado?.id || mov.userId || "",
          nombre: mov.encargado?.nombre || mov.userName || "",
          email: mov.encargado?.email || mov.userEmail || "",
        },
        observacion: mov.observacion || mov.details || "",
        sede: {
          id: mov.sede?.id || mov.locationId || "",
          nombre: mov.sede?.nombre || mov.locationName || "",
        },
      }))

      setMovimientos(movimientosFormateados)
    } catch (error) {
      console.error("Error obteniendo movimientos:", error)

      let mensajeError = "Error al cargar los movimientos"

      if (error.response) {
        if (error.response.status === 401) {
          mensajeError = "No autorizado - Por favor inicie sesión nuevamente"
        } else if (error.response.status === 403) {
          mensajeError = "No tiene permisos para ver estos movimientos"
        } else if (error.response.data) {
          mensajeError = error.response.data.error || error.response.data.detail || JSON.stringify(error.response.data)
        }
      } else if (error.request) {
        mensajeError = "El servidor no respondió. Verifique su conexión."
      } else {
        mensajeError = error.message
      }

      setError(mensajeError)
      mostrarNotificacion(mensajeError, "error")
    } finally {
      setCargando(false)
    }
  }

  // Validar formulario de creación
  const validarFormulario = () => {
    const errores = {}

    if (!sedeSeleccionada) errores.sede = "Debe seleccionar una sede"
    if (!posicionActual) errores.posicionActual = "Debe seleccionar una posición actual"
    if (!dispositivoSeleccionado) errores.dispositivo = "Debe seleccionar un dispositivo"
    if (!posicionNueva) errores.posicionNueva = "Debe seleccionar una posición destino"

    if (Object.keys(errores).length > 0) {
      const mensajesError = Object.values(errores).join(", ")
      mostrarNotificacion(mensajesError, "error")
      return false
    }

    return true
  }

  // Modificar la función guardarMovimiento para usar el endpoint correcto
  const guardarMovimiento = async () => {
    if (!validarFormulario()) return

    try {
      const datosMovimiento = {
        dispositivo: dispositivoSeleccionado,
        posicion_origen: posicionActual,
        posicion_destino: posicionNueva,
        observacion: detalle,
        sede: sedeSeleccionada,
        encargado: JSON.parse(sessionStorage.getItem("user"))?.id,
      }

      // Usar el endpoint específico para crear movimientos
      const respuesta = await api.post("/movimientos/crear/", datosMovimiento)

      if (respuesta.status === 201) {
        mostrarNotificacion("Movimiento creado exitosamente", "success")

        // Actualizar la lista de movimientos y dispositivos
        await obtenerMovimientos()

        // Si aún estamos en la misma posición, actualizar la lista de dispositivos
        if (posicionActual) {
          await obtenerDispositivosPorPosicion(posicionActual)
        }

        cerrarDialogoCreacion()
      } else {
        throw new Error(`Error ${respuesta.status}: ${respuesta.statusText}`)
      }
    } catch (error) {
      console.error("Error al guardar movimiento:", error)

      let mensaje = "Error al crear el movimiento"
      if (error.response?.data?.detail) {
        mensaje = error.response.data.detail
      } else if (error.response?.data?.error) {
        mensaje = error.response.data.error
      } else if (error.message) {
        mensaje = error.message
      }

      mostrarNotificacion(mensaje, "error")
    }
  }

  // Manejar cambio de sede
  const cambiarSede = async (e) => {
    const sedeId = e.target.value

    try {
      setSedeSeleccionada(sedeId)
      setPosicionActual("")
      setDispositivoSeleccionado("")
      setPosicionNueva("")
      setBusquedaPosicion("")
      setDispositivos([])

      if (sedeId) {
        await obtenerPosicionesPorSede(sedeId)
      } else {
        setPosiciones([])
      }
    } catch (error) {
      console.error("Error al cambiar sede:", error)
      mostrarNotificacion("Error al cargar datos de la sede", "error")
    }
  }

  // Manejar cambio de posición actual
  const cambiarPosicionActual = async (e) => {
    const posicionId = e.target.value
    setPosicionActual(posicionId)
    setDispositivoSeleccionado("")
    setBusquedaDispositivo("")

    if (posicionId) {
      await obtenerDispositivosPorPosicion(posicionId)
    } else {
      setDispositivos([])
    }
  }

  // Manejar cambio de posición destino
  const cambiarPosicionNueva = (e) => {
    setPosicionNueva(e.target.value)
  }

  // Mostrar notificación
  const mostrarNotificacion = (mensaje, tipo = "success") => {
    setNotificacion({ abierta: true, mensaje, tipo })
    setTimeout(() => {
      setNotificacion((prev) => ({ ...prev, abierta: false }))
    }, 5000)
  }

  // Cerrar notificación
  const cerrarNotificacion = () => {
    setNotificacion({ ...notificacion, abierta: false })
  }

  // Cambiar filtros
  const cambiarFiltro = (nombre, valor) => {
    setFiltros({ ...filtros, [nombre]: valor })
  }

  // Aplicar filtros
  const aplicarFiltros = () => {
    setPaginacion((prev) => ({ ...prev, pagina: 1 }))
    obtenerMovimientos()
  }

  // Reiniciar filtros
  const reiniciarFiltros = () => {
    setFiltros({
      sede: "",
      posicion: "",
      fecha_inicio: "",
      fecha_fin: "",
      dispositivo: "",
    })
    setPaginacion((prev) => ({ ...prev, pagina: 1 }))
  }

  // Cambiar página
  const cambiarPagina = (pagina) => {
    setPaginacion({ ...paginacion, pagina })
  }

  // Abrir diálogo de creación
  const abrirDialogoCreacion = () => {
    setSedeSeleccionada("")
    setPosicionActual("")
    setPosicionNueva("")
    setDispositivoSeleccionado("")
    setBusquedaPosicion("")
    setBusquedaDispositivo("")
    setDetalle("")
    setPosiciones([])
    setDispositivos([])
    setDialogoAbierto(true)
  }

  // Cerrar diálogo de creación
  const cerrarDialogoCreacion = () => {
    setDialogoAbierto(false)
  }

  // Abrir detalles de movimiento
  const abrirDetalles = (item) => {
    setItemSeleccionado(item)
    setDialogoDetallesAbierto(true)
  }

  // Cerrar detalles de movimiento
  const cerrarDialogoDetalles = () => {
    setDialogoDetallesAbierto(false)
  }

  // Filtrar posiciones según búsqueda
  const posicionesFiltradas = posiciones.filter(
    (pos) =>
      pos.nombre?.toLowerCase().includes(busquedaPosicion.toLowerCase()) ||
      pos.piso?.toLowerCase().includes(busquedaPosicion.toLowerCase()),
  )

  // Filtrar dispositivos según búsqueda
  const dispositivosFiltrados = dispositivos.filter(
    (disp) =>
      disp.serial?.toLowerCase().includes(busquedaDispositivo.toLowerCase()) ||
      disp.modelo?.toLowerCase().includes(busquedaDispositivo.toLowerCase()) ||
      disp.marca?.toLowerCase().includes(busquedaDispositivo.toLowerCase()),
  )

  return (
    <div className="dashboard-container">
      <div className="registro-image-container">
        <img
          src={require("../assets/E-Inventory.png") || "/placeholder.svg"}
          alt="E-Inventory"
          className="registro-image"
        />
      </div>

      {/* Notificación */}
      {notificacion.abierta && (
        <div className={`notificacion ${notificacion.tipo}`}>
          <span>{notificacion.mensaje}</span>
          <button className="notificacion-cerrar" onClick={cerrarNotificacion}>
            ×
          </button>
        </div>
      )}

      <div className="header">
        <h1>Registro de Movimientos</h1>
        <div className="header-buttons">
          <button className="btn btn-primary" onClick={abrirDialogoCreacion}>
            <span className="icon">+</span> Crear Nuevo Movimiento
          </button>
        </div>
      </div>

      <div className="filter-card">
        <div className="filter-grid">
          <div className="filter-item">
            <label htmlFor="sede">Sede</label>
            <select id="sede" value={filtros.sede} onChange={(e) => cambiarFiltro("sede", e.target.value)}>
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
              value={filtros.posicion}
              onChange={(e) => cambiarFiltro("posicion", e.target.value)}
              disabled={!filtros.sede}
            >
              <option value="">Todas</option>
              {filtros.sede &&
                posiciones
                  .filter((pos) => {
                    const posSedeId = pos.sede?.id || pos.sede || pos.sede_id
                    return String(posSedeId) === String(filtros.sede)
                  })
                  .map((pos) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.nombre} (Piso {pos.piso})
                    </option>
                  ))}
            </select>
          </div>

          <div className="filter-item">
            <label htmlFor="fecha_inicio">Fecha inicio</label>
            <input
              type="date"
              id="fecha_inicio"
              value={filtros.fecha_inicio}
              onChange={(e) => cambiarFiltro("fecha_inicio", e.target.value)}
            />
          </div>

          <div className="filter-item">
            <label htmlFor="fecha_fin">Fecha fin</label>
            <input
              type="date"
              id="fecha_fin"
              value={filtros.fecha_fin}
              onChange={(e) => cambiarFiltro("fecha_fin", e.target.value)}
            />
          </div>

          <div className="filter-item">
            <label htmlFor="dispositivo">Dispositivo</label>
            <input
              type="text"
              id="dispositivo"
              value={filtros.dispositivo}
              onChange={(e) => cambiarFiltro("dispositivo", e.target.value)}
              placeholder="Buscar por serial"
            />
          </div>
        </div>

        <div className="filter-buttons">
          <button className="btn btn-primary" onClick={aplicarFiltros}>
            <span className="icon">⚙</span> Aplicar Filtros
          </button>
          <button className="btn btn-outline" onClick={reiniciarFiltros}>
            <span className="icon">×</span> Limpiar Filtros
          </button>
          <button className="btn btn-text" onClick={obtenerMovimientos}>
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
            {cargando ? (
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
                  <td>
                    {item.fecha_movimiento
                      ? format(new Date(item.fecha_movimiento), "dd/MM/yyyy HH:mm")
                      : "No registrado"}
                  </td>
                  <td>
                    <span className="badge">Movimiento</span>
                  </td>
                  <td>
                    <div className="user-info">
                      <div>{item.encargado?.nombre || "Sistema"}</div>
                      <div className="user-email">{item.encargado?.email || "sistema@emergiacc.com"}</div>
                    </div>
                  </td>
                  <td>
                    <div className="movement-details">
                      <div>
                        <strong>Dispositivo:</strong> {item.dispositivo?.serial} - {item.dispositivo?.modelo}
                      </div>
                      <div>
                        <strong>Origen:</strong> {item.posicion_origen?.nombre || "Desconocido"}
                      </div>
                      <div>
                        <strong>Destino:</strong> {item.posicion_destino?.nombre || "Desconocido"}
                      </div>
                    </div>
                  </td>
                  <td>
                    <button className="btn-icon" onClick={() => abrirDetalles(item)} title="Ver detalles">
                      <span className="icon">👁</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!cargando && !error && movimientos.length > 0 && (
          <div className="pagination">
            <button
              className="pagination-btn"
              onClick={() => cambiarPagina(paginacion.pagina - 1)}
              disabled={paginacion.pagina === 1}
            >
              &laquo;
            </button>
            {[...Array(Math.ceil(paginacion.totalItems / paginacion.itemsPorPagina))].map((_, i) => (
              <button
                key={i}
                className={`pagination-btn ${paginacion.pagina === i + 1 ? "active" : ""}`}
                onClick={() => cambiarPagina(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="pagination-btn"
              onClick={() => cambiarPagina(paginacion.pagina + 1)}
              disabled={paginacion.pagina === Math.ceil(paginacion.totalItems / paginacion.itemsPorPagina)}
            >
              &raquo;
            </button>
          </div>
        )}
      </div>

      {/* Modal para crear nuevo movimiento */}
      {dialogoAbierto && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Crear Nuevo Movimiento</h2>
              <button className="modal-close" onClick={cerrarDialogoCreacion}>
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="modal-grid">
                <div className="modal-column">
                  <div className="form-group">
                    <label htmlFor="sede-modal">Sede</label>
                    <select id="sede-modal" value={sedeSeleccionada} onChange={cambiarSede} required>
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
                            value={busquedaPosicion}
                            onChange={(e) => setBusquedaPosicion(e.target.value)}
                            placeholder="Buscar posición..."
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="posicion-actual">Posición Actual</label>
                        {cargandoPosiciones ? (
                          <div className="loading-indicator">Cargando posiciones...</div>
                        ) : (
                          <select id="posicion-actual" value={posicionActual} onChange={cambiarPosicionActual} required>
                            <option value="">Seleccionar posición</option>
                            {posicionesFiltradas
                              .filter((pos) => {
                                const posSedeId = pos.sede?.id || pos.sede || pos.sede_id
                                return String(posSedeId) === String(sedeSeleccionada)
                              })
                              .map((pos) => (
                                <option key={pos.id} value={pos.id}>
                                  {pos.nombre} (Piso {pos.piso})
                                </option>
                              ))}
                          </select>
                        )}
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
                            value={busquedaDispositivo}
                            onChange={(e) => setBusquedaDispositivo(e.target.value)}
                            placeholder="Buscar por serial o modelo..."
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="dispositivo-modal">Dispositivo</label>
                        {cargandoDispositivos ? (
                          <div className="loading-indicator">Cargando dispositivos...</div>
                        ) : dispositivosFiltrados.length === 0 ? (
                          <div className="empty-message">No hay dispositivos disponibles en esta posición</div>
                        ) : (
                          <select
                            id="dispositivo-modal"
                            value={dispositivoSeleccionado}
                            onChange={(e) => setDispositivoSeleccionado(e.target.value)}
                            required
                          >
                            <option value="">Seleccionar dispositivo</option>
                            {dispositivosFiltrados.map((disp) => (
                              <option key={disp.id} value={disp.id}>
                                {disp.marca} {disp.modelo} ({disp.serial})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="modal-column">
                  {sedeSeleccionada && (
                    <>
                      <div className="form-group">
                        <label htmlFor="search-posicion-destino">Buscar posición destino</label>
                        <div className="search-input">
                          <span className="search-icon">🔍</span>
                          <input
                            id="search-posicion-destino"
                            type="text"
                            value={busquedaPosicion}
                            onChange={(e) => setBusquedaPosicion(e.target.value)}
                            placeholder="Buscar posición..."
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="posicion-nueva">Posición Destino</label>
                        {cargandoPosiciones ? (
                          <div className="loading-indicator">Cargando posiciones...</div>
                        ) : (
                          <select id="posicion-nueva" value={posicionNueva} onChange={cambiarPosicionNueva} required>
                            <option value="">Seleccionar nueva posición</option>
                            {posicionesFiltradas
                              .filter((pos) => {
                                const posSedeId = pos.sede?.id || pos.sede || pos.sede_id
                                return String(posSedeId) === String(sedeSeleccionada) && pos.id !== posicionActual
                              })
                              .map((pos) => (
                                <option key={pos.id} value={pos.id}>
                                  {pos.nombre} (Piso {pos.piso})
                                </option>
                              ))}
                          </select>
                        )}
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
              <button className="btn btn-outline" onClick={cerrarDialogoCreacion}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={guardarMovimiento}
                disabled={!sedeSeleccionada || !posicionActual || !dispositivoSeleccionado || !posicionNueva}
              >
                Guardar Movimiento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver detalles */}
      {dialogoDetallesAbierto && itemSeleccionado && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Detalles del Movimiento</h2>
              <button className="modal-close" onClick={cerrarDialogoDetalles}>
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="details-grid">
                <div className="details-section">
                  <h3>Información General</h3>
                  <p>
                    <strong>Fecha:</strong>{" "}
                    {itemSeleccionado.fecha_movimiento
                      ? format(new Date(itemSeleccionado.fecha_movimiento), "dd/MM/yyyy HH:mm")
                      : "No registrado"}
                  </p>
                  <p>
                    <strong>Sede:</strong> {itemSeleccionado.sede?.nombre || "No especificada"}
                  </p>
                </div>

                <div className="details-section">
                  <h3>Dispositivo</h3>
                  <p>
                    <strong>Serial:</strong> {itemSeleccionado.dispositivo?.serial || "Desconocido"}
                  </p>
                  <p>
                    <strong>Modelo:</strong> {itemSeleccionado.dispositivo?.modelo || "Desconocido"}
                  </p>
                  <p>
                    <strong>Marca:</strong> {itemSeleccionado.dispositivo?.marca || "Desconocido"}
                  </p>
                </div>

                <div className="details-section">
                  <h3>Origen</h3>
                  {itemSeleccionado.posicion_origen ? (
                    <>
                      <p>
                        <strong>Posición:</strong> {itemSeleccionado.posicion_origen.nombre}
                      </p>
                      <p>
                        <strong>Piso:</strong> {itemSeleccionado.posicion_origen.piso}
                      </p>
                    </>
                  ) : (
                    <p>No especificado</p>
                  )}
                </div>

                <div className="details-section">
                  <h3>Destino</h3>
                  {itemSeleccionado.posicion_destino ? (
                    <>
                      <p>
                        <strong>Posición:</strong> {itemSeleccionado.posicion_destino.nombre}
                      </p>
                      <p>
                        <strong>Piso:</strong> {itemSeleccionado.posicion_destino.piso}
                      </p>
                    </>
                  ) : (
                    <p>No especificado</p>
                  )}
                </div>

                {itemSeleccionado.encargado && (
                  <div className="details-section">
                    <h3>Responsable</h3>
                    <p>
                      <strong>Nombre:</strong> {itemSeleccionado.encargado.nombre}
                    </p>
                    <p>
                      <strong>Email:</strong> {itemSeleccionado.encargado.email}
                    </p>
                  </div>
                )}

                {itemSeleccionado.observacion && (
                  <div className="details-section full-width">
                    <h3>Observaciones</h3>
                    <p>{itemSeleccionado.observacion}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={cerrarDialogoDetalles}>
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
