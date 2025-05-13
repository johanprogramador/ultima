    "use client"

    import { useState, useEffect } from "react"
    import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,  ResponsiveContainer, LabelList } from "recharts"

    // Paleta de colores para las sedes
    const COLORS = [
    "#61dafb",
    "#8884d8",
    "#83a6ed",
    "#8dd1e1",
    "#82ca9d",
    "#a4de6c",
    "#d0ed57",
    "#ffc658",
    "#ff8042",
    "#ff6b6b",
    "#a05195",
    "#d45087",
    "#f95d6a",
    "#ff7c43",
    "#ffa600",
    ]

    const GraficaDispositivos = () => {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchData = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch("http://localhost:8000/api/dispositivos-por-sede/", {
            method: "GET",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            })

            if (!response.ok) {
            throw new Error(`Error HTTP! Estado: ${response.status}`)
            }

            const result = await response.json()

            if (!result.success) {
            throw new Error(result.error || "Datos no disponibles")
            }

            // Procesar datos para asegurar formato correcto y asignar un color único a cada sede
            const processedData = result.data.map((item, index) => ({
            nombre: item.nombre,
            dispositivos: item.total_dispositivos || 0,
            fill: COLORS[index % COLORS.length], // Asignar color directamente al objeto de datos
            }))

            setData(processedData)
        } catch (err) {
            console.error("Error al obtener datos:", err)
            setError(err.message)
            setData([])
        } finally {
            setLoading(false)
        }
        }

        fetchData()
    }, [])

    if (loading) {
        return (
        <div className="chart-wrapper">
            <div className="barchart-container">
            <h3>Dispositivos por Sede</h3>
            <div className="loading-indicator">
                <div className="loading-spinner"></div>
            </div>
            </div>
        </div>
        )
    }

    if (error) {
        return (
        <div className="chart-wrapper">
            <div className="barchart-container">
            <h3>Dispositivos por Sede</h3>
            <div className="error-message">
                <h4>Error al cargar los datos</h4>
                <p>{error}</p>
                <button
                onClick={() => window.location.reload()}
                style={{
                    padding: "8px 16px",
                    background: "#61dafb",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    marginTop: "10px",
                }}
                >
                Reintentar
                </button>
            </div>
            </div>
        </div>
        )
    }

    return (
        <div className="chart-wrapper">
        <div className="barchart-container">
            <h3>Dispositivos por Sede</h3>
            <ResponsiveContainer width="100%" height={500}>
            <BarChart
                data={data}
                layout="horizontal" // Cambiado a horizontal como solicitado
                margin={{
                top: 20,
                right: 30, // Más espacio para las etiquetas de valores
                left: 20,
                bottom: 100, // Más espacio para nombres largos
                }}
                barCategoryGap="20%"
                barGap={4}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.315)" />
                <XAxis
                dataKey="nombre"
                type="category"
                tick={{ fill: "#b8c2d8", angle: -45, textAnchor: "end" }}
                height={80} // Altura para acomodar los nombres rotados
                interval={0} // Fuerza mostrar todos los labels
                />
                <YAxis type="number" tick={{ fill: "#b8c2d8" }} />
                <Tooltip
                contentStyle={{
                    background: "#222",
                    border: "1px solid #61dafb",
                    borderRadius: "4px",
                    color: "#fff",
                }}
                formatter={(value, name) => [`${value} dispositivos`, name === "dispositivos" ? "Total" : name]}
                labelFormatter={(label) => `Sede: ${label}`}
                />

                <Bar
                dataKey="dispositivos"
                name="Dispositivos"
                // Usar el color asignado a cada elemento de datos
                radius={[4, 4, 0, 0]} // Bordes redondeados en la parte superior
                label={{
                    position: "top",
                    fill: "#b8c2d8",
                    formatter: (value) => (value > 0 ? value : ""),
                }}
                >
                {data.map((entry, index) => (
                    <LabelList key={`label-${index}`} dataKey="dispositivos" position="top" fill={entry.fill} />
                ))}
                </Bar>
            </BarChart>
            </ResponsiveContainer>
        </div>
        <style jsx>{`
            /* Contenedor de la gráfica */
            .chart-wrapper {
            display: flex;
            justify-content: flex-start; /* Alinea la gráfica a la izquierda */
            width: 100%;
            padding: 20px; /* Añade padding alrededor del contenedor de la gráfica */
            }
            
            /* Estilos para el contenedor del gráfico de barras */
            .barchart-container {
            background-color: #353a50; /* Fondo oscuro para el contenedor */
            padding: 30px; /* Espaciado interno */
            border-radius: 10px; /* Bordes redondeados */
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Sombra para dar profundidad */
            color: #fff; /* Color del texto */
            width: 100%; /* Ocupa todo el ancho disponible */
             /* Ancho máximo para la gráfica */
            margin: 0; /* Elimina el margen negativo */
            }
            
            /* Título de la gráfica */
            .barchart-container h3 {
            text-align: center; /* Centra el título */
            color: #61dafb; /* Color del título */
            margin-bottom: 15px; /* Espacio debajo del título */
            }
            
            /* Estilos para la cuadrícula del gráfico */
            .recharts-cartesian-grid line {
            stroke: rgba(255, 255, 255, 0.315); /* Color de las líneas de la cuadrícula */
            }
            
            /* Estilos para el tooltip (información emergente) */
            .recharts-tooltip-wrapper {
            background-color: #222 !important; /* Fondo del tooltip */
            border: 1px solid #61dafb !important; /* Borde del tooltip */
            color: #fff !important; /* Color del texto del tooltip */
            }
            
            /* Estilos para la leyenda del gráfico */
            .recharts-legend-item text {
            fill: #61dafb !important; /* Color del texto de la leyenda */
            font-weight: bold; /* Texto en negrita */
            }
            
            /* Estilos para las barras del gráfico */
            .recharts-bar-rectangle {
            stroke-width: 2; /* Grosor del borde de las barras */
            }
            
            /* Estilos para los estados de carga y error */
            .error-message {
            color: #ff6b6b;
            text-align: center;
            margin-bottom: 15px;
            font-size: 14px;
            }
            
            /* Indicador de carga */
            .loading-indicator {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 200px;
            }
            
            .loading-spinner {
            border: 4px solid rgba(97, 218, 251, 0.3);
            border-radius: 50%;
            border-top: 4px solid #61dafb;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
            0% {
                transform: rotate(0deg);
            }
            100% {
                transform: rotate(360deg);
            }
            }
        `}</style>
        </div>
    )
    }

    export default GraficaDispositivos
