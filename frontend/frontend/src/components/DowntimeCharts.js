/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useState, useEffect } from "react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from "recharts"
import { FaShare, FaSync } from "react-icons/fa"
import "../styles/DowntimeCharts.css"

const MovimientosPorSede = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [totalMovimientos, setTotalMovimientos] = useState(0)
  const [totalSedes, setTotalSedes] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)

  // Colores para las secciones de la gráfica de torta
  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#00C49F", "#FFBB28"]

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Hacemos una solicitud a la API
        const response = await fetch("http://localhost:8000/api/movimientos-por-sede/", {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `Error HTTP! Estado: ${response.status}`)
        }

        const result = await response.json()

        // Verificar que la respuesta tenga la estructura esperada
        console.log("Datos recibidos:", result)

        if (!result || !Array.isArray(result.data)) {
          throw new Error("Estructura de datos inesperada")
        }

        // Procesamos los datos
        const processedData = result.data.map((item, index) => ({
          name: item.name || `Sede ${index + 1}`,
          value: item.value || 0,
          fill: COLORS[index % COLORS.length], // Asignar colores únicos a las sedes
        }))

        console.log("Datos procesados:", processedData)

        // Filtrar para mostrar solo sedes con movimientos
        const filteredData = processedData.filter((item) => item.value > 0)

        // Si no hay datos con valores mayores que 0, usar datos de ejemplo solo si es necesario
        if (filteredData.length === 0 && processedData.every((item) => item.value === 0)) {
          console.log("No hay sedes con movimientos, usando datos de ejemplo")

          // Si hay al menos una sede con nombre, usarla para el ejemplo
          if (processedData.length > 0) {
            const exampleData = [
              {
                name: processedData[0].name,
                value: 0,
                fill: COLORS[0],
              },
            ]
            setData(exampleData)
          } else {
            setData([{ name: "nevado 2", value: 0, fill: COLORS[0] }])
          }
          setTotalMovimientos(0)
        } else {
          setData(filteredData.length > 0 ? filteredData : processedData)
          setTotalMovimientos(result.total_movimientos || processedData.reduce((sum, item) => sum + item.value, 0))
        }

        setTotalSedes(result.total_sedes || processedData.length)
      } catch (err) {
        console.error("Error en fetchData:", err)
        setError(err.message || "Error al cargar los datos")

        // En caso de error, mostrar datos de ejemplo
        const exampleData = [
          { name: "Sede 1", value: 3, fill: COLORS[0] },
          { name: "Sede 2", value: 1, fill: COLORS[1] },
        ]
        setData(exampleData)
        setTotalMovimientos(0)
        setTotalSedes(2)
        setLoading(false)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Función para manejar el hover en la gráfica
  const onPieEnter = (_, index) => {
    setActiveIndex(index)
  }

  // Renderizador personalizado para el sector activo
  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value, percent } = props

    const percentValue = (percent * 100).toFixed(1)

    return (
      <g>
        {/* Sector principal */}
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        {/* Borde exterior */}
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
        {/* Texto central con nombre de sede */}
        <text x={cx} y={cy - 20} dy={8} textAnchor="middle" fill="#fff" fontSize={16}>
          {payload.name}
        </text>
        {/* Texto central con valor */}
        <text x={cx} y={cy + 5} dy={8} textAnchor="middle" fill="#fff" fontSize={20} fontWeight="bold">
          {value}
        </text>
        {/* Texto central con porcentaje */}
        <text x={cx} y={cy + 30} dy={8} textAnchor="middle" fill="#fff" fontSize={14}>
          {`(${percentValue}%)`}
        </text>
      </g>
    )
  }

  // Renderizador personalizado para las etiquetas de porcentaje
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    const RADIAN = Math.PI / 180
    const radius = outerRadius * 1.35
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    const percentValue = (percent * 100).toFixed(0)

    return (
      <text
        x={x}
        y={y}
        fill="#61dafb"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontWeight="bold"
        fontSize={16}
      >
        {`${percentValue}%`}
      </text>
    )
  }

  // Componente personalizado para el tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const percentage = ((data.value / totalMovimientos) * 100).toFixed(1)

      return (
        <div className="custom-tooltip">
          <p className="tooltip-title">{data.name}</p>
          <p className="tooltip-value">{`Total: ${data.value}`}</p>
          <p className="tooltip-percent">{`${percentage}%`}</p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="downtime-charts-container">
        <h3>Movimientos por Sede</h3>
        <div className="loading-indicator">
          <div className="loading-spinner"></div>
          <p>Cargando datos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="downtime-charts-container">
        <h3>Movimientos por Sede</h3>
        <div className="error-message">
          <h4>Error al cargar los datos</h4>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="refresh-button">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="downtime-charts-container">
        <h3>Movimientos por Sede</h3>
        <div className="no-data-message">
          <p>No hay datos disponibles para mostrar</p>
          <button onClick={() => window.location.reload()} className="refresh-button">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="downtime-charts-container">
      <h3>Movimientos por Sede</h3>
      <div className="charts-wrapper">
        {/* Gráfica de pastel */}
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                onMouseEnter={onPieEnter}
                labelLine={true}
                label={renderCustomizedLabel}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Lista de sedes con puntos */}
        <div className="causes-list">
          {data.map((item, index) => (
            <div
              className={`cause-item ${index === activeIndex ? "active" : ""}`}
              key={index}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="dot" style={{ backgroundColor: item.fill || COLORS[index % COLORS.length] }}></span>
              <span className="cause-value">{item.value}</span>
              <span className="cause-label">{item.name}</span>
            </div>
          ))}
        </div>

        {/* Información adicional */}
        <div className="percentage-container">
          <div className="percentage-item">
            <FaShare className="percentage-icon" />
            <span className="percentage-value">{totalMovimientos} movimientos totales</span>
          </div>
          <div className="percentage-item">
            <FaSync className="percentage-icon" />
            <span className="percentage-value">{totalSedes} sedes</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MovimientosPorSede
