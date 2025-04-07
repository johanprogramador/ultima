"use client"

import React, { useState, useEffect } from "react"
import {
  Smartphone,
  RefreshCw,
  CheckCircle,
  PenToolIcon as Tool,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Check,
  Search,
  ThumbsUp,
  Power,
} from "lucide-react"
import "../styles/DashboardContent.css"

// Componente funcional que muestra el contenido del dashboard
const DashboardContent = () => {
  // Estados para manejar los datos y la UI
  const [cardsData, setCardsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [sedes, setSedes] = useState([])
  const [sedeSeleccionada, setSedeSeleccionada] = useState("")
  const [mostrarDropdown, setMostrarDropdown] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [errorSedes, setErrorSedes] = useState(null)

  // Referencia para cerrar el dropdown al hacer clic fuera
  const dropdownRef = React.useRef(null)

  // Mapeo de iconos según el tipo de tarjeta
  const iconosPorTipo = {
    "Total dispositivos": <Smartphone size={20} />,
    "Dispositivos en uso": <RefreshCw size={20} />,
    "Buen estado": <CheckCircle size={20} />,
    "En reparación": <Tool size={20} />,
    "Perdidos/robados": <XCircle size={20} />,
    "Mal estado": <AlertTriangle size={20} />,
    "Dispositivos disponibles": <ThumbsUp size={20} />,
    Inhabilitados: <Power size={20} />,
  }

  // Colores para cada tipo de tarjeta
  const coloresPorTipo = {
    "Total dispositivos": "#4361ee",
    "Dispositivos en uso": "#3a86ff",
    "Buen estado": "#2ec4b6",
    "En reparación": "#ff9f1c",
    "Perdidos/robados": "#e71d36",
    "Mal estado": "#ff6b6b",
    "Dispositivos disponibles": "#38b000",
    Inhabilitados: "#6c757d",
  }

  // Efecto para manejar clics fuera del dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMostrarDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Efecto para cargar las sedes disponibles al montar el componente
  useEffect(() => {
    const cargarSedes = async () => {
      try {
        console.log("Iniciando carga de sedes...")

        // Mostrar el estado de carga
        setLoading(true)
        setErrorSedes(null)

        const respuesta = await fetch("http://localhost:8000/api/sede/", {
          headers: {
            "Content-Type": "application/json",
          },
        })

        console.log("Respuesta recibida:", respuesta.status)

        if (!respuesta.ok) {
          const errorText = await respuesta.text()
          console.error("Error en respuesta:", errorText)
          throw new Error(`Error al obtener las sedes: ${respuesta.status}`)
        }

        const datos = await respuesta.json()
        console.log("Datos de sedes recibidos:", datos)

        // Verificar la estructura de los datos
        if (!Array.isArray(datos)) {
          console.log("Los datos no son un array, verificando si hay una propiedad 'sedes'")
          // Algunos endpoints devuelven {sedes: [...]}
          if (datos.sedes && Array.isArray(datos.sedes)) {
            console.log("Usando datos.sedes")
            const sedesFormateadas = datos.sedes.map((sede) => ({
              value: sede.id.toString(),
              label: sede.nombre,
            }))

            // Agregar opción para "Todas las sedes" y "Sin sede"
            const opcionesAdicionales = [
              { value: "todas", label: "Todas las sedes" },
              { value: "sin_sede", label: "Sin sede asignada" },
            ]

            setSedes([...opcionesAdicionales, ...sedesFormateadas])
            setSedeSeleccionada("todas")
            return
          } else {
            throw new Error("Formato de datos inesperado")
          }
        }

        // Transformar los datos para el formato del selector
        const sedesFormateadas = datos.map((sede) => ({
          value: sede.id.toString(),
          label: sede.nombre,
        }))

        // Agregar opción para "Todas las sedes" y "Sin sede"
        const opcionesAdicionales = [
          { value: "todas", label: "Todas las sedes" },
          { value: "sin_sede", label: "Sin sede asignada" },
        ]

        console.log("Sedes formateadas:", [...opcionesAdicionales, ...sedesFormateadas])
        setSedes([...opcionesAdicionales, ...sedesFormateadas])
        setSedeSeleccionada("todas")
      } catch (error) {
        console.error("Error al cargar sedes:", error)
        setErrorSedes(error.message)

        // Cargar datos de ejemplo para desarrollo
        const sedesEjemplo = [
          { value: "todas", label: "Todas las sedes" },
          { value: "sin_sede", label: "Sin sede asignada" },
          { value: "1", label: "Sede Principal" },
          { value: "2", label: "Sede Norte" },
          { value: "3", label: "Sede Sur" },
        ]
        console.log("Cargando sedes de ejemplo:", sedesEjemplo)
        setSedes(sedesEjemplo)
        setSedeSeleccionada("todas")
      } finally {
        setLoading(false)
      }
    }

    cargarSedes()
  }, [])

  // Efecto para cargar los datos del dashboard filtrados por sede
  useEffect(() => {
    // Si no hay sede seleccionada, no hacemos la petición
    if (!sedeSeleccionada) return

    const cargarDatosDashboard = async () => {
      setLoading(true)
      try {
        console.log("Cargando datos para sede:", sedeSeleccionada)

        // Construimos la URL con el parámetro de sede
        let url = "http://localhost:8000/api/dashboard/"

        if (sedeSeleccionada !== "todas") {
          url += `?sede=${sedeSeleccionada === "sin_sede" ? "null" : sedeSeleccionada}`
        }

        const respuesta = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!respuesta.ok) {
          const textoError = await respuesta.text()
          console.error("Estado de respuesta:", respuesta.status)
          console.error("Cuerpo de respuesta:", textoError)
          throw new Error("Error al obtener los datos del dashboard")
        }

        const datos = await respuesta.json()
        console.log("Datos del dashboard recibidos:", datos)
        setCardsData(datos.cardsData || [])
      } catch (error) {
        console.error("Error al cargar datos del dashboard:", error)

        // Cargar datos de ejemplo para desarrollo
        const datosEjemplo = [
          {
            title: "Total dispositivos",
            value: "120",
            date: "Actualizado hoy",
          },
          {
            title: "Dispositivos en uso",
            value: "85",
            date: "Actualizado hoy",
          },
          {
            title: "Buen estado",
            value: "30",
            date: "Actualizado hoy",
          },
          {
            title: "Dispositivos disponibles",
            value: "25",
            date: "Actualizado hoy",
          },
          {
            title: "En reparación",
            value: "5",
            date: "Actualizado hoy",
          },
          {
            title: "Perdidos/robados",
            value: "2",
            date: "Actualizado hoy",
          },
          {
            title: "Mal estado",
            value: "3",
            date: "Actualizado hoy",
          },
          {
            title: "Inhabilitados",
            value: "5",
            date: "Actualizado hoy",
          },
        ]
        setCardsData(datosEjemplo)
      } finally {
        setLoading(false)
      }
    }

    cargarDatosDashboard()
  }, [sedeSeleccionada]) // Dependencia: se ejecuta cuando cambia la sede seleccionada

  // Filtrar sedes según la búsqueda
  const sedesFiltradas = sedes.filter((sede) => sede.label.toLowerCase().includes(busqueda.toLowerCase()))

  // Obtener el nombre de la sede seleccionada
  const nombreSedeSeleccionada = sedes.find((sede) => sede.value === sedeSeleccionada)?.label || "Seleccionar sede..."

  return (
    <div className="dashboard-content">
      {/* Contenedor para la imagen principal y selector de sede */}
      <div className="dashboard-header">


        {/* Selector de sede personalizado */}
        <div className="location-filter" ref={dropdownRef}>
          <div className="custom-select">
            <button
              className="select-button"
              onClick={() => setMostrarDropdown(!mostrarDropdown)}
              aria-haspopup="listbox"
              aria-expanded={mostrarDropdown}
            >
              <span>{nombreSedeSeleccionada}</span>
              {mostrarDropdown ? (
                <ChevronUp className="select-arrow" size={16} />
              ) : (
                <ChevronDown className="select-arrow" size={16} />
              )}
            </button>

            {mostrarDropdown && (
              <div className="select-dropdown">
                <div className="select-search">
                  <Search size={14} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Buscar sede..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
                <ul className="select-options" role="listbox">
                  {sedesFiltradas.length > 0 ? (
                    sedesFiltradas.map((sede) => (
                      <li
                        key={sede.value}
                        role="option"
                        aria-selected={sedeSeleccionada === sede.value}
                        className={`select-option ${sedeSeleccionada === sede.value ? "selected" : ""}`}
                        onClick={() => {
                          setSedeSeleccionada(sede.value)
                          setMostrarDropdown(false)
                          setBusqueda("")
                        }}
                      >
                        {sede.label}
                        {sedeSeleccionada === sede.value && <Check className="check-mark" size={16} />}
                      </li>
                    ))
                  ) : (
                    <li className="select-option no-results">No se encontraron sedes</li>
                  )}
                </ul>
              </div>
            )}
          </div>
          {errorSedes && <div className="error-message">Error: {errorSedes}</div>}
        </div>
      </div>

      {/* Contenedor para las tarjetas que muestran los datos */}
      <div className="cards-container">
        {loading ? (
          // Mientras se cargan los datos, muestra skeletons para mejor UX
          <>
            <TarjetaSkeleton />
            <TarjetaSkeleton />
            <TarjetaSkeleton />
            <TarjetaSkeleton />
            <TarjetaSkeleton />
            <TarjetaSkeleton />
            <TarjetaSkeleton />
            <TarjetaSkeleton />
          </>
        ) : cardsData.length > 0 ? (
          // Una vez cargados los datos, se mapea el array cardsData y se renderiza cada tarjeta
          cardsData.map((tarjeta, index) => (
            <div
              className="card"
              key={index}
              style={{
                borderTop: `3px solid ${coloresPorTipo[tarjeta.title] || "#4361ee"}`,
              }}
            >
              <div className="card-content">
                <div className="card-header">
                  <h5>{tarjeta.title}</h5>
                  <div
                    className="card-icon"
                    style={{
                      backgroundColor: coloresPorTipo[tarjeta.title] || "#4361ee",
                    }}
                  >
                    {iconosPorTipo[tarjeta.title] || <Smartphone size={20} />}
                  </div>
                </div>
                <h1>{tarjeta.value}</h1>
                <p>{tarjeta.date}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="no-data-message">No hay datos disponibles para esta sede.</p>
        )}
      </div>
    </div>
  )
}

// Componente para mostrar un skeleton mientras se cargan los datos
const TarjetaSkeleton = () => (
  <div className="card skeleton-card">
    <div className="card-content">
      <div className="card-header">
        <div className="skeleton-title"></div>
        <div className="skeleton-icon"></div>
      </div>
      <div className="skeleton-value"></div>
      <div className="skeleton-date"></div>
    </div>
  </div>
)

export default DashboardContent