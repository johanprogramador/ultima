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
    dispositivo_id: "",
  })

  // Estados para el modal de creación
  const [sedeSeleccionada, setSedeSeleccionada] = useState("")
  const [posicionActual, setPosicionActual] = useState("")
  const [posicionNueva, setPosicionNueva] = useState("")
  const [dispositivoSeleccionado, setDispositivoSeleccionado] = useState("")
  const [busquedaDispositivo, setBusquedaDispositivo] = useState("")
  const [detalle, setDetalle] = useState("")
  const [sedes, setSedes] = useState([])
  const [posiciones, setPosiciones] = useState([])
  const [dispositivos, setDispositivos] = useState([])
  const [todosDispositivos, setTodosDispositivos] = useState([])
  const [posicionesDestino, setPosicionesDestino] = useState([])
  const [todasLasPosiciones, setTodasLasPosiciones] = useState([])
  const [cargandoPosiciones, setCargandoPosiciones] = useState(false)
  const [errorPosiciones, setErrorPosiciones] = useState(null)

  // Nuevos estados para la selección jerárquica
  const [pisosOrigen, setPisosOrigen] = useState([])
  const [pisosDestino, setPisosDestino] = useState([])
  const [pisoOrigenSeleccionado, setPisoOrigenSeleccionado] = useState("")
  const [pisoDestinoSeleccionado, setPisoDestinoSeleccionado] = useState("")
  const [posicionesPorPisoOrigen, setPosicionesPorPisoOrigen] = useState([])
  const [posicionesPorPisoDestino, setPosicionesPorPisoDestino] = useState([])

  // Obtener datos iniciales
  useEffect(() => {
    obtenerSedes()
    obtenerTodosDispositivos()
    obtenerMovimientos()
  }, [paginacion.pagina])

  // Obtener lista de sedes
  const obtenerSedes = async () => {
    try {
      const token = sessionStorage.getItem("token")
      const respuesta = await axios.get("http://localhost:8000/api/sede/", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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

  // Obtener todos los dispositivos
  const obtenerTodosDispositivos = async () => {
    try {
      const token = sessionStorage.getItem("token")
      if (!token) {
        throw new Error("No se encontró token de autenticación")
      }

      const response = await axios.get("http://localhost:8000/api/dispositivos/", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      let dispositivosData = []
      if (Array.isArray(response.data)) {
        dispositivosData = response.data
      } else if (response.data?.results && Array.isArray(response.data.results)) {
        dispositivosData = response.data.results
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        dispositivosData = response.data.data
      } else if (response.data?.dispositivos && Array.isArray(response.data.dispositivos)) {
        dispositivosData = response.data.dispositivos
      } else {
        console.warn("Formato de respuesta no reconocido para dispositivos:", response.data)
        dispositivosData = []
      }

      const dispositivosFormateados = dispositivosData.map((disp) => ({
        id: disp.id || disp._id || "",
        serial: disp.serial || "",
        modelo: disp.modelo || disp.model || "",
        marca: disp.marca || disp.brand || "",
      }))

      setTodosDispositivos(dispositivosFormateados)
    } catch (error) {
      console.error("Error obteniendo todos los dispositivos:", error)
      mostrarNotificacion("Error al cargar los dispositivos", "error")
      setTodosDispositivos([])
    }
  }

  // Obtener todas las posiciones de una sede (con paginación)
  const obtenerTodasLasPosicionesDeSede = async (sedeId) => {
    if (!sedeId) {
      setPosiciones([])
      setPosicionesDestino([])
      setPisosOrigen([])
      setPisosDestino([])
      setTodasLasPosiciones([])
      return
    }

    setCargandoPosiciones(true)
    setErrorPosiciones(null)

    try {
      const token = sessionStorage.getItem("token")
      let allPositions = []
      let nextPage = 1
      let hasMore = true

      while (hasMore) {
        const response = await axios.get("http://localhost:8000/api/posiciones/", {
          params: {
            sede: sedeId,
            page: nextPage,
            page_size: 100,
          },
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        let posicionesData = []

        // Manejar diferentes formatos de respuesta
        if (Array.isArray(response.data)) {
          posicionesData = response.data
        } else if (response.data?.results) {
          posicionesData = response.data.results
        } else if (response.data?.data) {
          posicionesData = response.data.data
        } else if (response.data?.posiciones) {
          posicionesData = response.data.posiciones
        }

        allPositions = [...allPositions, ...posicionesData]

        // Verificar si hay más páginas
        if (response.data?.next) {
          nextPage++
        } else {
          hasMore = false
        }
      }

      // Formatear posiciones
      const posicionesFormateadas = allPositions.map((pos) => ({
        id: pos.id || pos._id || "",
        nombre: pos.nombre || pos.name || "",
        piso: pos.piso || pos.floor || "",
        sede: pos.sede || pos.sede_id || null,
      }))

      setTodasLasPosiciones(posicionesFormateadas)
      setPosiciones(posicionesFormateadas)
      setPosicionesDestino(posicionesFormateadas)

      // Extraer pisos únicos y ordenarlos
      const pisosUnicos = [...new Set(posicionesFormateadas.map((pos) => pos.piso))]
        .filter(piso => piso !== undefined && piso !== null && piso !== "")
        .sort((a, b) => {
          // Ordenar numéricamente si son números, alfabéticamente si no
          if (!isNaN(a) && !isNaN(b)) return Number(a) - Number(b)
          return String(a).localeCompare(String(b))
        })

      setPisosOrigen(pisosUnicos)
      setPisosDestino(pisosUnicos)
    } catch (error) {
      console.error("Error obteniendo posiciones:", error)
      setErrorPosiciones("Error al cargar las posiciones")
      mostrarNotificacion("Error al cargar las posiciones", "error")
      setPosiciones([])
      setPosicionesDestino([])
      setPisosOrigen([])
      setPisosDestino([])
      setTodasLasPosiciones([])
    } finally {
      setCargandoPosiciones(false)
    }
  }

  // Obtener dispositivos por posición
  const obtenerDispositivosPorPosicion = async (posicionId) => {
    if (!posicionId) {
      setDispositivos([])
      return
    }

    try {
      const token = sessionStorage.getItem("token")
      const respuesta = await axios.get("http://localhost:8000/api/dispositivos/", {
        params: { posicion_id: posicionId },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      let dispositivosData = []
      if (Array.isArray(respuesta.data)) {
        dispositivosData = respuesta.data
      } else if (respuesta.data?.results && Array.isArray(respuesta.data.results)) {
        dispositivosData = respuesta.data.results
      } else if (respuesta.data?.data && Array.isArray(respuesta.data.data)) {
        dispositivosData = respuesta.data.data
      } else if (respuesta.data?.dispositivos && Array.isArray(respuesta.data.dispositivos)) {
        dispositivosData = respuesta.data.dispositivos
      } else {
        console.warn("Formato de respuesta no reconocido para dispositivos:", respuesta.data)
        dispositivosData = []
      }

      const dispositivosFormateados = dispositivosData.map((disp) => ({
        id: disp.id || disp._id || "",
        serial: disp.serial || "",
        modelo: disp.modelo || disp.model || "",
        marca: disp.marca || disp.brand || "",
      }))

      setDispositivos(dispositivosFormateados)
    } catch (error) {
      console.error("Error obteniendo dispositivos:", error)
      mostrarNotificacion("Error al cargar los dispositivos", "error")
      setDispositivos([])
    }
  }

  // Función optimizada para filtrar posiciones
  const filtrarPosiciones = (posiciones, busqueda) => {
    if (!busqueda) return posiciones

    const termino = busqueda.toLowerCase()
    return posiciones.filter(
      (pos) => pos.nombre?.toLowerCase().includes(termino) || pos.piso?.toString().toLowerCase().includes(termino),
    )
  }

  // Cambiar filtro
  const cambiarFiltro = (nombre, valor) => {
    setFiltros((prevFiltros) => ({ ...prevFiltros, [nombre]: valor }))

    if (nombre === "dispositivo_id") {
      setTimeout(() => {
        aplicarFiltros()
      }, 100)
    }
  }

  // Aplicar filtros
  const aplicarFiltros = async () => {
    setPaginacion((prev) => ({
      ...prev,
      pagina: 1,
      totalItems: 0,
    }))

    try {
      await obtenerMovimientosConFiltros(filtros)
    } catch (error) {
      console.error("Error al aplicar filtros:", error)
      mostrarNotificacion("Error al aplicar filtros. Intente con otros criterios.", "error")
    }
  }

  // Obtener movimientos con filtros
  const obtenerMovimientosConFiltros = async (filtrosAplicar) => {
    setCargando(true)
    setError(null)

    try {
      const token = sessionStorage.getItem("token")
      if (!token) {
        throw new Error("No se encontró token de autenticación")
      }

      const params = {
        page: paginacion.pagina,
        page_size: paginacion.itemsPorPagina,
      }

      Object.entries(filtrosAplicar).forEach(([key, value]) => {
        if (value !== "" && value !== undefined && value !== null) {
          if (key === "dispositivo_id") {
            params["dispositivo"] = value
          } else {
            params[key] = value
          }
        }
      })

      const response = await axios.get("http://localhost:8000/api/movimientos/", {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      let movimientosData = []
      let totalItems = 0

      if (Array.isArray(response.data)) {
        movimientosData = response.data
        totalItems = response.data.length
      } else if (response.data && Array.isArray(response.data.results)) {
        movimientosData = response.data.results
        totalItems = response.data.count
      } else if (response.data && Array.isArray(response.data.data)) {
        movimientosData = response.data.data
        totalItems = response.data.total || response.data.data.length
      } else {
        console.warn("Formato de respuesta no reconocido", response.data)
        const possibleData = response.data.items || response.data.movimientos || []
        if (Array.isArray(possibleData)) {
          movimientosData = possibleData
          totalItems = possibleData.length
        }
      }

      setPaginacion((prev) => ({
        ...prev,
        totalItems,
      }))

      const movimientosFormateados = movimientosData.map((mov) => {
        const dispositivo_info = mov.dispositivo_info || {}
        const posicion_origen_info = mov.posicion_origen_info || {}
        const posicion_destino_info = mov.posicion_destino_info || {}
        const encargado_info = mov.encargado_info || {}
        const sede_info = mov.sede_info || {}

        return {
          id: mov.id || mov._id || "",
          fecha_movimiento: mov.fecha_movimiento || mov.fecha || mov.createdAt || null,
          dispositivo: {
            id: mov.dispositivo || "",
            ...dispositivo_info,
          },
          posicion_origen: {
            id: mov.posicion_origen || "",
            ...posicion_origen_info,
          },
          posicion_destino: {
            id: mov.posicion_destino || "",
            ...posicion_destino_info,
          },
          encargado: {
            id: mov.encargado || "",
            ...encargado_info,
          },
          observacion: mov.observacion || mov.details || "",
          sede: {
            id: mov.sede || "",
            ...sede_info,
          },
        }
      })

      setMovimientos(movimientosFormateados)
    } catch (error) {
      console.error("Error obteniendo movimientos:", error)
      let mensajeError = "Error al cargar los movimientos"

      if (error.response) {
        mensajeError =
          error.response.data?.message || error.response.data?.detail || JSON.stringify(error.response.data)
      }

      setError(mensajeError)
      mostrarNotificacion(mensajeError, "error")
      setMovimientos([])
    } finally {
      setCargando(false)
    }
  }

  // Obtener movimientos
  const obtenerMovimientos = () => obtenerMovimientosConFiltros(filtros)

  // Guardar movimiento
  const guardarMovimiento = async () => {
    const camposRequeridos = {
      sede: sedeSeleccionada,
      posicion_actual: posicionActual,
      dispositivo: dispositivoSeleccionado,
      posicion_nueva: posicionNueva,
    }

    const camposFaltantes = Object.entries(camposRequeridos)
      .filter(([_, valor]) => !valor)
      .map(([nombre]) => nombre)

    if (camposFaltantes.length > 0) {
      mostrarNotificacion(`Campos obligatorios faltantes: ${camposFaltantes.join(", ")}`, "error")
      return
    }

    try {
      const token = sessionStorage.getItem("token")
      if (!token) {
        mostrarNotificacion("La sesión ha expirado. Por favor, inicie sesión nuevamente.", "error")
        return
      }

      const datosMovimiento = {
        dispositivo: dispositivoSeleccionado,
        posicion_origen: posicionActual,
        posicion_destino: posicionNueva,
        observacion: detalle,
        sede: sedeSeleccionada,
        encargado: JSON.parse(sessionStorage.getItem("user"))?.id,
      }

      const respuesta = await axios.post("http://localhost:8000/api/movimientos/crear/", datosMovimiento, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (respuesta.status === 201) {
        mostrarNotificacion("Movimiento creado exitosamente", "success")
        await Promise.all([obtenerMovimientos(), obtenerDispositivosPorPosicion(posicionActual)])
        cerrarDialogoCreacion()
      } else {
        throw new Error(`Error ${respuesta.status}: ${respuesta.statusText}`)
      }
    } catch (error) {
      console.error("Error al guardar movimiento:", error)

      let mensaje = "Error al crear el movimiento"
      if (error.response?.data?.detail) {
        mensaje = error.response.data.detail
      } else if (error.message) {
        mensaje = error.message
      }

      mostrarNotificacion(mensaje, "error")
    }
  }

  // Manejar cambio de sede
  const cambiarSede = async (e) => {
    const sedeId = e.target.value
    setSedeSeleccionada(sedeId)
    setPosicionActual("")
    setDispositivoSeleccionado("")
    setPosicionNueva("")
    setBusquedaDispositivo("")
    setPisoOrigenSeleccionado("")
    setPisoDestinoSeleccionado("")
    setPosicionesPorPisoOrigen([])
    setPosicionesPorPisoDestino([])

    setFiltros((prev) => ({
      ...prev,
      sede: sedeId,
      posicion: "",
      dispositivo_id: "",
    }))

    if (sedeId) {
      await obtenerTodasLasPosicionesDeSede(sedeId)
    } else {
      setPosiciones([])
      setPosicionesDestino([])
      setPisosOrigen([])
      setPisosDestino([])
      setTodasLasPosiciones([])
    }
  }

  // Manejar cambio de piso origen
  const cambiarPisoOrigen = (e) => {
    const piso = e.target.value
    setPisoOrigenSeleccionado(piso)
    setPosicionActual("")
    setDispositivoSeleccionado("")

    if (piso && todasLasPosiciones.length > 0) {
      const posicionesFiltradas = todasLasPosiciones.filter(
        (pos) => String(pos.piso) === String(piso)
      )
      setPosicionesPorPisoOrigen(posicionesFiltradas)
    } else {
      setPosicionesPorPisoOrigen([])
    }
  }

  // Manejar cambio de piso destino
  const cambiarPisoDestino = (e) => {
    const piso = e.target.value
    setPisoDestinoSeleccionado(piso)
    setPosicionNueva("")

    if (piso && todasLasPosiciones.length > 0) {
      const posicionesFiltradas = todasLasPosiciones.filter(
        (pos) => String(pos.piso) === String(piso)
      )
      setPosicionesPorPisoDestino(posicionesFiltradas)
    } else {
      setPosicionesPorPisoDestino([])
    }
  }

  // Manejar cambio de posición actual
  const cambiarPosicionActual = async (e) => {
    const posicionId = e.target.value
    setPosicionActual(posicionId)
    setDispositivoSeleccionado("")

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

  // Reiniciar filtros
  const reiniciarFiltros = () => {
    setFiltros({
      sede: "",
      posicion: "",
      fecha_inicio: "",
      fecha_fin: "",
      dispositivo_id: "",
    })

    setTimeout(() => {
      obtenerMovimientos()
    }, 100)
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
    setBusquedaDispositivo("")
    setBusquedaPosicionOrigen("")
    setBusquedaPosicionDestino("")
    setPisoOrigenSeleccionado("")
    setPisoDestinoSeleccionado("")
    setPosicionesPorPisoOrigen([])
    setPosicionesPorPisoDestino([])
    setDetalle("")
    setDialogoAbierto(true)
  }

  // Cerrar diálogo de creación
  const cerrarDialogoCreacion = () => {
    setDialogoAbierto(false)
  }

  // Abrir detalles de movimiento
  const abrirDetalles = (item) => {
    if (!item) {
      mostrarNotificacion("El movimiento seleccionado no contiene datos", "error")
      return
    }

    const itemFormateado = {
      id: item.id || item._id || "N/A",
      fecha_movimiento: item.fecha_movimiento || item.fecha || item.createdAt || null,
      dispositivo: {
        id: item.dispositivo?.id || item.dispositivo || "N/A",
        serial: item.dispositivo_info?.serial || item.dispositivo?.serial || "N/A",
        modelo: item.dispositivo_info?.modelo || item.dispositivo?.modelo || "N/A",
        tipo: item.dispositivo_info?.tipo || item.dispositivo?.tipo || "N/A",
        marca: item.dispositivo_info?.marca || item.dispositivo?.marca || "N/A",
      },
      posicion_origen: {
        id: item.posicion_origen?.id || item.posicion_origen || "N/A",
        nombre: item.posicion_origen_info?.nombre || item.posicion_origen?.nombre || "N/A",
        piso: item.posicion_origen_info?.piso || item.posicion_origen?.piso || "N/A",
        sede: item.posicion_origen_info?.sede || item.posicion_origen?.sede || "N/A",
      },
      posicion_destino: {
        id: item.posicion_destino?.id || item.posicion_destino || "N/A",
        nombre: item.posicion_destino_info?.nombre || item.posicion_destino?.nombre || "N/A",
        piso: item.posicion_destino_info?.piso || item.posicion_destino?.piso || "N/A",
        sede: item.posicion_destino_info?.sede || item.posicion_destino?.sede || "N/A",
      },
      encargado: {
        id: item.encargado?.id || item.encargado || "N/A",
        nombre: item.encargado_info?.nombre || item.encargado?.nombre || "Sistema",
        email: item.encargado_info?.email || item.encargado?.email || "sistema@emergiacc.com",
      },
      observacion: item.observacion || item.details || "Movimiento automático por cambio de posición",
      sede: {
        id: item.sede?.id || item.sede || "N/A",
        nombre: item.sede_info?.nombre || item.sede?.nombre || "No especificada",
      },
    }

    setItemSeleccionado(itemFormateado)
    setDialogoDetallesAbierto(true)
  }

  // Cerrar detalles de movimiento
  const cerrarDialogoDetalles = () => {
    setDialogoDetallesAbierto(false)
  }

  // Filtrar posiciones y dispositivos
  const posicionesFiltradas = filtrarPosiciones(posicionesPorPisoOrigen, busquedaPosicionOrigen)
  const posicionesDestinoFiltradas = filtrarPosiciones(
    posicionesPorPisoDestino.filter((pos) => pos.id !== posicionActual),
    busquedaPosicionDestino,
  )
  const dispositivosFiltrados = filtrarPosiciones(dispositivos, busquedaDispositivo)

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

      {/* Sección de filtros */}
      <div className="filter-card">
        <div className="filter-grid">
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
            <label htmlFor="dispositivo_id">Dispositivo</label>
            <select
              className="color-letra"
              id="dispositivo_id"
              value={filtros.dispositivo_id}
              onChange={(e) => cambiarFiltro("dispositivo_id", e.target.value)}
            >
              <option value="">Todos los dispositivos</option>
              {Array.isArray(todosDispositivos) && todosDispositivos.length > 0 ? (
                todosDispositivos.map((disp) => (
                  <option key={disp.id} value={disp.id}>
                    {disp.marca} {disp.modelo} ({disp.serial})
                  </option>
                ))
              ) : (
                <option value="" disabled>
                  Cargando dispositivos...
                </option>
              )}
            </select>
          </div>
        </div>

        {filtros.dispositivo_id && (
          <div className="filter-message">
            <p>
              Mostrando movimientos para el dispositivo:{" "}
              {todosDispositivos.find((d) => d.id === filtros.dispositivo_id)?.marca || ""}{" "}
              {todosDispositivos.find((d) => d.id === filtros.dispositivo_id)?.modelo || ""} (
              {todosDispositivos.find((d) => d.id === filtros.dispositivo_id)?.serial || ""})
            </p>
          </div>
        )}

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
                      <strong>Dispositivo:</strong>{" "}
                      {item.dispositivo_info?.serial || item.dispositivo?.serial || "No especificado"} -{" "}
                      {item.dispositivo_info?.modelo || item.dispositivo?.modelo || ""}
                    </div>
                    <div>
                      <strong>Origen:</strong>{" "}
                      {item.posicion_origen_info?.nombre || item.posicion_origen?.nombre || "No especificado"}
                    </div>
                    <div>
                      <strong>Destino:</strong>{" "}
                      {item.posicion_destino_info?.nombre || item.posicion_destino?.nombre || "No especificado"}
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
                  {/* Selección de Sede */}
                  <div className="form-group">
                    <label htmlFor="sede-modal">Sede</label>
                    <select
                      className="color-letra"
                      id="sede-modal"
                      value={sedeSeleccionada}
                      onChange={cambiarSede}
                      required
                    >
                      <option value="">Seleccionar sede</option>
                      {Array.isArray(sedes) &&
                        sedes.map((sede) => (
                          <option key={sede.id} value={sede.id}>
                            {sede.nombre}
                          </option>
                        ))}
                    </select>
                  </div>

                  {sedeSeleccionada && (
                    <>
                      {/* Selección de Piso Origen */}
                      <div className="form-group">
                        <label htmlFor="piso-origen">Piso (Origen)</label>
                        <select
                          className="color-letra"
                          id="piso-origen"
                          value={pisoOrigenSeleccionado}
                          onChange={cambiarPisoOrigen}
                          required
                        >
                          <option value="">Seleccionar piso</option>
                          {pisosOrigen.map((piso) => (
                            <option key={piso} value={piso}>
                              Piso {piso}
                            </option>
                          ))}
                        </select>
                      </div>

                      {pisoOrigenSeleccionado && (
                        <>
                          {/* Búsqueda de Posición Origen */}
                          <div className="form-group">
                            <label htmlFor="search-posicion-origen">Buscar posición origen</label>
                            <div className="search-input">
                              <span className="search-icon">🔍</span>
                              <input
                                id="search-posicion-origen"
                                type="text"
                                value={busquedaPosicionOrigen}
                                onChange={(e) => setBusquedaPosicionOrigen(e.target.value)}
                                placeholder="Buscar posición..."
                              />
                            </div>
                          </div>

                          {/* Selección de Posición Origen */}
                          <div className="form-group">
                            <label htmlFor="posicion-actual">Posición Origen</label>
                            {cargandoPosiciones ? (
                              <div className="loading-options">Cargando posiciones...</div>
                            ) : errorPosiciones ? (
                              <div className="error-options">{errorPosiciones}</div>
                            ) : (
                              <div className="select-with-scroll">
                                <select
                                  className="color-letra"
                                  id="posicion-actual"
                                  value={posicionActual}
                                  onChange={cambiarPosicionActual}
                                  required
                                  size={5}
                                >
                                  <option value="">Seleccionar posición</option>
                                  {posicionesFiltradas.map((pos) => (
                                    <option key={pos.id} value={pos.id}>
                                      {pos.nombre} (Piso {pos.piso})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {posicionActual && (
                        <>
                          {/* Búsqueda de Dispositivo */}
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

                          {/* Selección de Dispositivo */}
                          <div className="form-group">
                            <label htmlFor="dispositivo-modal">Dispositivo</label>
                            <div className="select-with-scroll">
                              <select
                                className="color-letra"
                                id="dispositivo-modal"
                                value={dispositivoSeleccionado}
                                onChange={(e) => setDispositivoSeleccionado(e.target.value)}
                                required
                                size={5}
                              >
                                <option value="">Seleccionar dispositivo</option>
                                {Array.isArray(dispositivos) && dispositivos.length > 0 ? (
                                  dispositivosFiltrados.map((disp) => (
                                    <option key={disp.id} value={disp.id}>
                                      {disp.marca} {disp.modelo} ({disp.serial})
                                    </option>
                                  ))
                                ) : (
                                  <option value="" disabled>
                                    No hay dispositivos disponibles
                                  </option>
                                )}
                              </select>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>

                <div className="modal-column">
                  {sedeSeleccionada && (
                    <>
                      {/* Selección de Piso Destino */}
                      <div className="form-group">
                        <label htmlFor="piso-destino">Piso (Destino)</label>
                        <select
                          className="color-letra"
                          id="piso-destino"
                          value={pisoDestinoSeleccionado}
                          onChange={cambiarPisoDestino}
                          required
                        >
                          <option value="">Seleccionar piso</option>
                          {pisosDestino.map((piso) => (
                            <option key={piso} value={piso}>
                              Piso {piso}
                            </option>
                          ))}
                        </select>
                      </div>

                      {pisoDestinoSeleccionado && (
                        <>
                          {/* Búsqueda de Posición Destino */}
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

                          {/* Selección de Posición Destino */}
                          <div className="form-group">
                            <label htmlFor="posicion-nueva">Posición Destino</label>
                            <div className="select-with-scroll">
                              <select
                                className="color-letra"
                                id="posicion-nueva"
                                value={posicionNueva}
                                onChange={cambiarPosicionNueva}
                                required
                                size={5}
                              >
                                <option value="">Seleccionar nueva posición</option>
                                {posicionesDestinoFiltradas.map((pos) => (
                                  <option key={pos.id} value={pos.id}>
                                    {pos.nombre} (Piso {pos.piso})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Detalles del Movimiento */}
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
                    <strong>Tipo:</strong> Movimiento
                  </p>
                  <p>
                    <strong>Sede:</strong> {itemSeleccionado.sede.nombre}
                  </p>
                </div>

                <div className="details-section">
                  <h3>Dispositivo</h3>
                  <p>
                    <strong>Modelo:</strong> {itemSeleccionado.dispositivo.modelo}
                  </p>
                  <p>
                    <strong>Serial:</strong> {itemSeleccionado.dispositivo.serial}
                  </p>
                  <p>
                    <strong>Marca:</strong> {itemSeleccionado.dispositivo.marca}
                  </p>
                </div>

                <div className="details-section">
                  <h3>Origen</h3>
                  <p>
                    <strong>Posición:</strong> {itemSeleccionado.posicion_origen.nombre}
                  </p>
                  <p>
                    <strong>Piso:</strong> {itemSeleccionado.posicion_origen.piso}
                  </p>
                </div>

                <div className="details-section">
                  <h3>Destino</h3>
                  <p>
                    <strong>Posición:</strong> {itemSeleccionado.posicion_destino.nombre}
                  </p>
                  <p>
                    <strong>Piso:</strong> {itemSeleccionado.posicion_destino.piso}
                  </p>
                </div>

                <div className="details-section">
                  <h3>Usuario Responsable</h3>
                  <p>
                    <strong>Nombre:</strong> {itemSeleccionado.encargado.nombre}
                  </p>
                  <p>
                    <strong>Email:</strong> {itemSeleccionado.encargado.email}
                  </p>
                </div>

                <div className="details-section full-width">
                  <h3>Observaciones</h3>
                  <p>{itemSeleccionado.observacion}</p>
                </div>
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