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

const DashboardContent = () => {
  const [cardsData, setCardsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [sedes, setSedes] = useState([])
  const [sedeSeleccionada, setSedeSeleccionada] = useState("")
  const [mostrarDropdown, setMostrarDropdown] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [errorSedes, setErrorSedes] = useState(null)
  const [errorDashboard, setErrorDashboard] = useState(null)

  const dropdownRef = React.useRef(null)

  // Mapeo de iconos y colores según el tipo de tarjeta
  const iconosPorTipo = {
    "Total dispositivos": <Smartphone size={20} />,
    "Dispositivos en uso": <RefreshCw size={20} />,
    "Buen estado": <CheckCircle size={20} />,
    "Dispositivos disponibles": <ThumbsUp size={20} />,
    "En reparación": <Tool size={20} />,
    "Perdidos/robados": <XCircle size={20} />,
    "Mal estado": <AlertTriangle size={20} />,
    "Inhabilitados": <Power size={20} />,
  }

  const coloresPorTipo = {
    "Total dispositivos": "#4361ee",
    "Dispositivos en uso": "#3a86ff",
    "Buen estado": "#2ec4b6",
    "Dispositivos disponibles": "#38b000",
    "En reparación": "#ff9f1c",
    "Perdidos/robados": "#e71d36",
    "Mal estado": "#ff6b6b",
    "Inhabilitados": "#6c757d",
  }

  // Manejar clics fuera del dropdown
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

  // Cargar sedes disponibles
  useEffect(() => {
    const cargarSedes = async () => {
      try {
        setLoading(true)
        setErrorSedes(null)

        const respuesta = await fetch("http://localhost:8000/api/sede/", {
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!respuesta.ok) {
          throw new Error(`Error al obtener las sedes: ${respuesta.status}`)
        }

        const datos = await respuesta.json()

        // Formatear datos de sedes
        const sedesFormateadas = Array.isArray(datos) 
          ? datos 
          : datos.sedes || []

        const opcionesSedes = sedesFormateadas.map((sede) => ({
          value: sede.id.toString(),
          label: sede.nombre,
        }))

        // Agregar opciones adicionales
        const opcionesAdicionales = [
          { value: "todas", label: "Todas las sedes" },
          { value: "sin_sede", label: "Sin sede asignada" },
        ]

        setSedes([...opcionesAdicionales, ...opcionesSedes])
        setSedeSeleccionada("todas")
      } catch (error) {
        console.error("Error al cargar sedes:", error)
        setErrorSedes(error.message)
        setSedes([])
      } finally {
        setLoading(false)
      }
    }

    cargarSedes()
  }, [])

  // Cargar datos del dashboard cuando cambia la sede seleccionada
  useEffect(() => {
    if (!sedeSeleccionada) return

    const cargarDatosDashboard = async () => {
      setLoading(true)
      setErrorDashboard(null)
      
      try {
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
          throw new Error(`Error al obtener datos: ${respuesta.status}`)
        }

        const datos = await respuesta.json()
        
        if (datos.cardsData) {
          setCardsData(datos.cardsData)
        } else {
          throw new Error("Formato de datos incorrecto")
        }
      } catch (error) {
        console.error("Error al cargar dashboard:", error)
        setErrorDashboard(error.message)
        setCardsData([])
      } finally {
        setLoading(false)
      }
    }

    cargarDatosDashboard()
  }, [sedeSeleccionada])

  // Filtrar sedes según búsqueda
  const sedesFiltradas = sedes.filter(sede => 
    sede.label.toLowerCase().includes(busqueda.toLowerCase())
  )

  // Obtener nombre de la sede seleccionada
  const nombreSedeSeleccionada = sedes.find(s => s.value === sedeSeleccionada)?.label || "Seleccionar sede..."

  return (
    <div className="dashboard-content">
      {/* Header con selector de sede */}
      <div className="dashboard-header">
        <div className="location-filter" ref={dropdownRef}>
          <div className="custom-select">
            <button
              className="select-button"
              onClick={() => setMostrarDropdown(!mostrarDropdown)}
              aria-expanded={mostrarDropdown}
              disabled={sedes.length === 0}
            >
              <span>{nombreSedeSeleccionada}</span>
              {mostrarDropdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {mostrarDropdown && (
              <div className="select-dropdown">
                <div className="select-search">
                  <Search size={14} />
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
                        {sedeSeleccionada === sede.value && <Check size={16} />}
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

      {/* Contenedor de tarjetas */}
      <div className="cards-container">
        {loading ? (
          // Mostrar skeletons durante la carga
          Array(8).fill().map((_, index) => <TarjetaSkeleton key={index} />)
        ) : errorDashboard ? (
          // Mostrar error si falla la carga
          <div className="error-container">
            <p className="error-message">Error: {errorDashboard}</p>
            <button
              className="retry-button"
              onClick={() => setSedeSeleccionada(prev => prev)}
            >
              Reintentar
            </button>
          </div>
        ) : cardsData.length > 0 ? (
          // Mostrar tarjetas con datos
          cardsData.map((tarjeta) => (
            <div
              className="card"
              key={tarjeta.title}
              style={{ borderTop: `3px solid ${coloresPorTipo[tarjeta.title]}` }}
            >
              <div className="card-content">
                <div className="card-header">
                  <h5>{tarjeta.title}</h5>
                  <div 
                    className="card-icon"
                    style={{ backgroundColor: coloresPorTipo[tarjeta.title] }}
                  >
                    {iconosPorTipo[tarjeta.title]}
                  </div>
                </div>
                <h1>{tarjeta.value}</h1>
                <p>{tarjeta.date}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="no-data-message">No hay datos disponibles</p>
        )}
      </div>
    </div>
  )
}

// Componente Skeleton para loading
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