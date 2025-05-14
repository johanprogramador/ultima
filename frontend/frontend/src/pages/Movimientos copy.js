/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useState, useEffect } from "react"
import "../styles/movimientos.css"
import axios from "axios"
import { format } from 'date-fns'

const Movimientos = () => {
  // Estados principales
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [dialogoDetallesAbierto, setDialogoDetallesAbierto] = useState(false)
  const [itemSeleccionado, setItemSeleccionado] = useState(null)
  const [busquedaPosicionOrigen, setBusquedaPosicionOrigen] = useState("")
  const [busquedaPosicionDestino, setBusquedaPosicionDestino] = useState("")
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
  const [posicionesDestino, setPosicionesDestino] = useState([])

  // Obtener datos iniciales
  useEffect(() => {
    obtenerSedes()
    obtenerMovimientos()
  }, [paginacion.pagina, filtros])

  // Obtener lista de sedes
  const obtenerSedes = async () => {
    try {
      const token = sessionStorage.getItem('token')
      const respuesta = await axios.get("http://localhost:8000/api/sede/", {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      if (respuesta.status === 200) {
        setSedes(respuesta.data.sedes || [])
      } else {
        throw new Error(`Error ${respuesta.status}: ${respuesta.statusText}`)
      }
    } catch (error) {
      console.error("Error al obtener sedes:", error)
      mostrarNotificacion("No se pudieron cargar las sedes. Verifica tu conexión.", "error")
    }
  }

  // Obtener posiciones por sede - Versión corregida
  const obtenerPosicionesPorSede = async (sedeId) => {
    try {
      if (!sedeId) {
        setPosiciones([]);
        setPosicionesDestino([]);
        return;
      }
  
      const token = sessionStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:8000/api/posiciones/?sede=${sedeId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
  
      // Procesar la respuesta según diferentes formatos posibles
      let posicionesData = [];
      
      if (Array.isArray(response.data)) {
        posicionesData = response.data;
      } else if (response.data?.results) {
        posicionesData = response.data.results;
      } else if (response.data?.data) {
        posicionesData = response.data.data;
      } else {
        posicionesData = [];
      }
  
      // Formatear posiciones para asegurar estructura consistente
      const posicionesFormateadas = posicionesData.map(pos => ({
        id: pos.id || pos._id || '',
        nombre: pos.nombre || pos.name || '',
        piso: pos.piso || pos.floor || '',
        sede: pos.sede || pos.sede_id || null
      }));
  
      // Filtrar solo las posiciones que pertenecen a la sede seleccionada
      const posicionesFiltradas = posicionesFormateadas.filter(
        // eslint-disable-next-line eqeqeq
        pos => pos.sede == sedeId
      );
  
      setPosiciones(posicionesFiltradas);
      setPosicionesDestino(posicionesFiltradas);
      
      // Resetear posición seleccionada al cambiar de sede
      setFiltros(prev => ({
        ...prev,
        posicion: ""
      }));
  
    } catch (error) {
      console.error("Error obteniendo posiciones:", error);
      
      let mensajeError = "Error al cargar las posiciones";
      
      if (error.response) {
        if (error.response.status === 401) {
          mensajeError = "No autorizado - Por favor inicie sesión nuevamente";
        } else if (error.response.status === 404) {
          mensajeError = "Sede no encontrada";
        } else if (error.response.data) {
          mensajeError = error.response.data.error || 
                         error.response.data.detail || 
                         JSON.stringify(error.response.data);
        }
      } else if (error.request) {
        mensajeError = "El servidor no respondió. Verifique su conexión.";
      } else {
        mensajeError = error.message;
      }
      
      mostrarNotificacion(mensajeError, "error");
      setPosiciones([]);
      setPosicionesDestino([]);
    }
  }

  // Obtener dispositivos por posición
  const obtenerDispositivosPorPosicion = async (posicionId) => {
    try {
      const token = sessionStorage.getItem('token')
      const respuesta = await axios.get(
        'http://localhost:8000/api/dispositivos/',
        {
          params: { posicion_id: posicionId },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      
      const dispositivosData = Array.isArray(respuesta.data) 
        ? respuesta.data 
        : Array.isArray(respuesta.data?.data) 
          ? respuesta.data.data 
          : []
      
      const dispositivosFormateados = dispositivosData.map(disp => ({
        id: disp.id || disp._id || '',
        serial: disp.serial || '',
        modelo: disp.modelo || disp.model || '',
        marca: disp.marca || disp.brand || ''
      }))

      setDispositivos(dispositivosFormateados)
    } catch (error) {
      console.error("Error obteniendo dispositivos:", error)
      mostrarNotificacion("Error al cargar los dispositivos", "error")
      setDispositivos([])
    }
  }

  // Obtener movimientos con filtros
  const obtenerMovimientos = async () => {
    setCargando(true)
    setError(null)
    
    try {
      const token = sessionStorage.getItem('token')
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }
  
      // Limpiar filtros vacíos
      const params = {
        page: paginacion.pagina,
        page_size: paginacion.itemsPorPagina,
        ...Object.fromEntries(
          Object.entries(filtros).filter(([_, v]) => v !== '')
        )
      }
  
      const config = {
        params,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000
      }
  
      const response = await axios.get(
        'http://localhost:8000/api/movimientos/', 
        config
      )
  
      let movimientosData = []
      if (Array.isArray(response.data)) {
        movimientosData = response.data
      } else if (response.data && Array.isArray(response.data.results)) {
        movimientosData = response.data.results
        if (response.data.count !== undefined) {
          setPaginacion(prev => ({
            ...prev,
            totalItems: response.data.count
          }))
        }
      } else if (response.data && Array.isArray(response.data.data)) {
        movimientosData = response.data.data
      }
      
      const movimientosFormateados = movimientosData.map(mov => ({
        id: mov.id || mov._id || '',
        fecha_movimiento: mov.fecha_movimiento || mov.fecha || mov.createdAt || null,
        dispositivo: {
          id: mov.dispositivo?.id || mov.deviceId || '',
          serial: mov.dispositivo?.serial || mov.deviceSerial || '',
          modelo: mov.dispositivo?.modelo || mov.deviceModel || '',
          marca: mov.dispositivo?.marca || mov.deviceBrand || ''
        },
        posicion_origen: {
          id: mov.posicion_origen?.id || mov.originPositionId || '',
          nombre: mov.posicion_origen?.nombre || mov.originPositionName || '',
          piso: mov.posicion_origen?.piso || mov.originFloor || ''
        },
        posicion_destino: {
          id: mov.posicion_destino?.id || mov.destinationPositionId || '',
          nombre: mov.posicion_destino?.nombre || mov.destinationPositionName || '',
          piso: mov.posicion_destino?.piso || mov.destinationFloor || ''
        },
        encargado: {
          id: mov.encargado?.id || mov.userId || '',
          nombre: mov.encargado?.nombre || mov.userName || '',
          email: mov.encargado?.email || mov.userEmail || ''
        },
        observacion: mov.observacion || mov.details || '',
        sede: {
          id: mov.sede?.id || mov.locationId || '',
          nombre: mov.sede?.nombre || mov.locationName || ''
        }
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
          mensajeError = error.response.data.error || 
                         error.response.data.detail || 
                         JSON.stringify(error.response.data)
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

  // Guardar movimiento
  const guardarMovimiento = async () => {
    const camposRequeridos = {
      sede: sedeSeleccionada,
      posicion_actual: posicionActual,
      dispositivo: dispositivoSeleccionado,
      posicion_nueva: posicionNueva,
    };
  
    const camposFaltantes = Object.entries(camposRequeridos)
      .filter(([_, valor]) => !valor)
      .map(([nombre]) => nombre);
  
    if (camposFaltantes.length > 0) {
      mostrarNotificacion(
        `Campos obligatorios faltantes: ${camposFaltantes.join(", ")}`,
        "error"
      );
      return;
    }
  
    try {
      const token = sessionStorage.getItem("token");
      if (!token) {
        mostrarNotificacion("La sesión ha expirado. Por favor, inicie sesión nuevamente.", "error");
        return;
      }
  
      const datosMovimiento = {
        dispositivo: dispositivoSeleccionado,
        posicion_origen: posicionActual,
        posicion_destino: posicionNueva,
        observacion: detalle,
        sede: sedeSeleccionada,
        encargado: JSON.parse(sessionStorage.getItem("user"))?.id,
      };
  
      const respuesta = await axios.post(
        "http://localhost:8000/api/movimientos/crear/",
        datosMovimiento,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      if (respuesta.status === 201) {
        mostrarNotificacion("Movimiento creado exitosamente", "success");
        await Promise.all([
          obtenerMovimientos(),
          obtenerDispositivosPorPosicion(posicionActual),
        ]);
        cerrarDialogoCreacion();
      } else {
        throw new Error(`Error ${respuesta.status}: ${respuesta.statusText}`);
      }
    } catch (error) {
      console.error("Error al guardar movimiento:", error);
      
      let mensaje = "Error al crear el movimiento";
      if (error.response?.data?.detail) {
        mensaje = error.response.data.detail;
      } else if (error.message) {
        mensaje = error.message;
      }
      
      mostrarNotificacion(mensaje, "error");
    }
  };

  // Manejar cambio de sede
  const cambiarSede = async (e) => {
    const sedeId = e.target.value;
    
    try {
      setSedeSeleccionada(sedeId);
      setPosicionActual("");
      setDispositivoSeleccionado("");
      setPosicionNueva("");
      setBusquedaPosicion("");
      
      // Limpiar filtros relacionados con la sede
      setFiltros(prev => ({
        ...prev,
        posicion: "",
        dispositivo: ""
      }));
      
      if (sedeId) {
        await obtenerPosicionesPorSede(sedeId);
      } else {
        setPosiciones([]);
        setPosicionesDestino([]);
      }
    } catch (error) {
      console.error("Error al cambiar sede:", error);
      mostrarNotificacion("Error al cargar datos de la sede", "error");
    }
  }

  // Manejar cambio de posición actual
  const cambiarPosicionActual = async (e) => {
    const posicionId = e.target.value
    setPosicionActual(posicionId)
    setDispositivoSeleccionado("")
    
    if (posicionId) {
      await obtenerDispositivosPorPosicion(posicionId)
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
      setNotificacion(prev => ({ ...prev, abierta: false }))
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
    setPaginacion(prev => ({ 
      ...prev, 
      pagina: 1,
      totalItems: 0
    }))
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
    setPaginacion(prev => ({ ...prev, pagina: 1 }))
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

// Filtrar posiciones origen según búsqueda
const posicionesFiltradas = Array.isArray(posiciones) 
  ? posiciones.filter(pos => 
      (pos?.nombre?.toLowerCase() || '').includes(busquedaPosicionOrigen.toLowerCase()) ||
      (pos?.piso?.toLowerCase() || '').includes(busquedaPosicionOrigen.toLowerCase())
    )
  : []

  // Filtrar dispositivos según búsqueda
  const dispositivosFiltrados = Array.isArray(dispositivos) 
    ? dispositivos.filter(disp =>
        (disp?.serial?.toLowerCase() || '').includes(busquedaDispositivo.toLowerCase()) ||
        (disp?.modelo?.toLowerCase() || '').includes(busquedaDispositivo.toLowerCase()) ||
        (disp?.marca?.toLowerCase() || '').includes(busquedaDispositivo.toLowerCase())
      )
    : []

  // Filtrar posiciones destino (excluyendo la actual)
  const posicionesDestinoFiltradas = Array.isArray(posicionesDestino) 
  ? posicionesDestino
      .filter(pos => pos?.id !== posicionActual)
      .filter(pos => 
        (pos?.nombre?.toLowerCase() || '').includes(busquedaPosicion.toLowerCase()) ||
        (pos?.piso?.toLowerCase() || '').includes(busquedaPosicion.toLowerCase())
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
            <select 
              id="sede" 
              value={filtros.sede} 
              onChange={(e) => cambiarFiltro("sede", e.target.value)}
            >
              <option value="">Todas</option>
              {Array.isArray(sedes) && sedes.map((sede) => (
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
              {filtros.sede && Array.isArray(posiciones) && posiciones.map((pos) => (
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
            ) : !Array.isArray(movimientos) || movimientos.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-cell">
                  No se encontraron movimientos
                </td>
              </tr>
            ) : (
              movimientos.map((item) => (
                <tr key={item.id}>
                  <td>{item.fecha_movimiento ? format(new Date(item.fecha_movimiento), 'dd/MM/yyyy HH:mm') : "No registrado"}</td>
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
                        <strong>Origen:</strong> {item.posicion_origen?.nombre || item.ubicacion_origen || "Desconocido"}
                      </div>
                      <div>
                        <strong>Destino:</strong> {item.posicion_destino?.nombre || item.ubicacion_destino || "Desconocido"}
                      </div>
                    </div>
                  </td>
                  <td>
                    <button 
                      className="btn-icon" 
                      onClick={() => abrirDetalles(item)} 
                      title="Ver detalles"
                    >
                      <span className="icon">👁</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!cargando && !error && Array.isArray(movimientos) && movimientos.length > 0 && (
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
                    <select 
                      id="sede-modal" 
                      value={sedeSeleccionada} 
                      onChange={cambiarSede}
                      required
                    >
                      <option value="">Seleccionar sede</option>
                      {Array.isArray(sedes) && sedes.map((sede) => (
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
      value={busquedaPosicionOrigen}
      onChange={(e) => setBusquedaPosicionOrigen(e.target.value)}
      placeholder="Buscar posición..."
    />
  </div>
</div>
                      <div className="form-group">
                        <label htmlFor="posicion-actual">Posición Actual</label>
                        <select 
                          id="posicion-actual" 
                          value={posicionActual} 
                          onChange={cambiarPosicionActual}
                          required
                        >
                          <option value="">Seleccionar posición</option>
                          {posicionesFiltradas.map((pos) => (
                            <option key={pos.id} value={pos.id}>
                              {pos.nombre} (Piso {pos.piso})
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
                            value={busquedaDispositivo}
                            onChange={(e) => setBusquedaDispositivo(e.target.value)}
                            placeholder="Buscar por serial o modelo..."
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="dispositivo-modal">Dispositivo</label>
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
      value={busquedaPosicionDestino}
      onChange={(e) => setBusquedaPosicionDestino(e.target.value)}
      placeholder="Buscar posición..."
    />
  </div>
</div>

                      <div className="form-group">
                        <label htmlFor="posicion-nueva">Posición Destino</label>
                        <select
                          id="posicion-nueva"
                          value={posicionNueva}
                          onChange={cambiarPosicionNueva}
                          required
                        >
                          <option value="">Seleccionar nueva posición</option>
                          {posicionesDestinoFiltradas.map((pos) => (
                            <option key={pos.id} value={pos.id}>
                              {pos.nombre} (Piso {pos.piso})
                            </option>
                          ))}
                        </select>
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
                    {itemSeleccionado.fecha_movimiento ? 
                      format(new Date(itemSeleccionado.fecha_movimiento), 'dd/MM/yyyy HH:mm') : 
                      "No registrado"}
                  </p>
                  <p>
                    <strong>Tipo:</strong> Movimiento
                  </p>
                  <p>
                    <strong>Sede:</strong> {itemSeleccionado.sede?.nombre || "No especificada"}
                  </p>
                </div>

                <div className="details-section">
                  <h3>Dispositivo</h3>
                  <p>
                    <strong>Modelo:</strong> {itemSeleccionado.dispositivo?.modelo || "Desconocido"}
                  </p>
                  <p>
                    <strong>Serial:</strong> {itemSeleccionado.dispositivo?.serial || "Desconocido"}
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
                    <p>
                      <strong>Ubicación:</strong> {itemSeleccionado.ubicacion_origen || "Desconocido"}
                    </p>
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
                    <p>
                      <strong>Ubicación:</strong> {itemSeleccionado.ubicacion_destino || "Desconocido"}
                    </p>
                  )}
                </div>

                {itemSeleccionado.encargado && (
                  <div className="details-section">
                    <h3>Usuario Responsable</h3>
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