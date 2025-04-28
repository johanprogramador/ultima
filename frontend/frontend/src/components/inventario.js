"use client"

import { useEffect, useState, useCallback } from "react"
import axios from "axios"
import { useAuth } from "./auth"
import { Search, Trash2, FileText, ChevronLeft, ChevronRight } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import * as XLSX from "xlsx"
import "../styles/Inventario.css"

const Inventario = () => {
  const { isAdmin, sedeId, user, token } = useAuth()

  const [dispositivos, setDispositivos] = useState([])
  const [sedes, setSedes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState({ tipo: "", estado: "", sede: "" })
  const [currentPage, setCurrentPage] = useState(1)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const itemsPerPage = 7

  const fetchSedes = useCallback(async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/sedes/", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })
      // Eliminado el console.log de sedes
      setSedes(response.data)
      return response.data
    } catch (error) {
      console.error("Error al obtener sedes:", error)
      setError("Error al cargar las sedes")
      return []
    }
  }, [token])

  const fetchDispositivos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let url = "http://127.0.0.1:8000/api/dispositivos/"
      if (!isAdmin && sedeId) url += `?sede_id=${sedeId}`

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        validateStatus: (status) => status >= 200 && status < 300,
      })

      let dispositivosData = []

      if (Array.isArray(response.data)) {
        dispositivosData = response.data
      } else if (response.data && Array.isArray(response.data.data)) {
        dispositivosData = response.data.data
      } else if (response.data && Array.isArray(response.data.results)) {
        dispositivosData = response.data.results
      } else {
        console.error("Formato de respuesta inesperado:", response.data)
        throw new Error("Formato de datos inválido recibido del servidor")
      }

      // Eliminado el console.log del primer dispositivo
      setDispositivos(dispositivosData)
    } catch (error) {
      console.error("Error al obtener dispositivos:", error)

      let errorMessage = "Error al cargar dispositivos"
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = "Sesión expirada o no autorizada. Inicia sesión nuevamente."
        } else if (error.response.status === 500) {
          errorMessage = "Error interno del servidor."
        }
      } else if (error.request) {
        errorMessage = "No se recibió respuesta del servidor."
      } else {
        errorMessage = error.message
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [token, isAdmin, sedeId])

  useEffect(() => {
    const cargarDatos = async () => {
      const sedesData = await fetchSedes()
      await fetchDispositivos()
    }

    cargarDatos()
  }, [fetchDispositivos, fetchSedes])

  // Función para obtener el nombre de la sede de un dispositivo
  const getNombreSede = (dispositivo) => {
    // Caso especial: Si sede es un número (ID de sede), buscar en el array de sedes
    if (
      typeof dispositivo.sede === "number" ||
      (typeof dispositivo.sede === "string" && !isNaN(Number.parseInt(dispositivo.sede)))
    ) {
      const sedeId = typeof dispositivo.sede === "number" ? dispositivo.sede : Number.parseInt(dispositivo.sede)
      const sedeEncontrada = sedes.find((s) => s.id === sedeId)
      if (sedeEncontrada) {
        return sedeEncontrada.nombre
      }
      return `Sede ID: ${sedeId}`
    }

    // Caso 1: El dispositivo tiene un objeto sede con nombre
    if (dispositivo.sede && typeof dispositivo.sede === "object" && dispositivo.sede.nombre) {
      return dispositivo.sede.nombre
    }

    // Caso 2: El dispositivo tiene sede_nombre
    if (dispositivo.sede_nombre) {
      return dispositivo.sede_nombre
    }

    // Caso 3: El dispositivo tiene un string como sede (que no es un número)
    if (typeof dispositivo.sede === "string" && dispositivo.sede !== "") {
      return dispositivo.sede
    }

    // Caso 4: El dispositivo tiene sede_id
    if (dispositivo.sede_id) {
      const sedeEncontrada = sedes.find((sede) => sede.id === dispositivo.sede_id)
      if (sedeEncontrada) {
        return sedeEncontrada.nombre
      }
      return `Sede ID: ${dispositivo.sede_id}`
    }

    // Caso 5: No hay información de sede
    return "No asignada"
  }

  const handleDelete = async (deviceId) => {
    if (!window.confirm("¿Está seguro que desea eliminar este dispositivo?")) return

    try {
      setLoading(true)
      setError(null)

      await axios.delete(`http://127.0.0.1:8000/api/dispositivos/${deviceId}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        validateStatus: (status) => status === 204 || (status >= 200 && status < 300),
      })

      setSuccess("Dispositivo eliminado correctamente")
      setTimeout(() => setSuccess(null), 5000)
      await fetchDispositivos()
    } catch (error) {
      console.error("Error al eliminar el dispositivo", error)

      let errorMessage = "Error al eliminar dispositivo"
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = "Dispositivo no encontrado"
        } else if (error.response.data && error.response.data.detail) {
          errorMessage = error.response.data.detail
        }
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = () => {
    try {
      if (dispositivos.length === 0) {
        throw new Error("No hay datos para exportar")
      }

      const ws = XLSX.utils.json_to_sheet(
        dispositivos.map((dispositivo) => ({
          ...dispositivo,
          sede: getNombreSede(dispositivo),
        })),
      )

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Inventario")
      XLSX.writeFile(wb, `Inventario_${new Date().toISOString().split("T")[0]}.xlsx`)

      setSuccess("Archivo exportado correctamente")
      setTimeout(() => setSuccess(null), 5000)
    } catch (error) {
      console.error("Error al exportar a Excel", error)
      setError(`Error al exportar: ${error.message}`)
    }
  }

  const handleImportExcel = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setError("Por favor, suba un archivo Excel (.xlsx o .xls)")
      return
    }

    const formData = new FormData()
    formData.append("file", file)

    try {
      setLoading(true)
      setError(null)

      await axios.post("http://127.0.0.1:8000/api/importar-dispositivos/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
        validateStatus: (status) => status >= 200 && status < 300,
      })

      setSuccess("Datos importados correctamente")
      setTimeout(() => setSuccess(null), 5000)
      fetchDispositivos()
    } catch (error) {
      console.error("Error al importar datos:", error)

      let errorMessage = "Error al importar datos"
      if (error.response) {
        if (error.response.data) {
          if (error.response.data.detail) {
            errorMessage = error.response.data.detail
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message
          } else if (typeof error.response.data === "string") {
            errorMessage = error.response.data
          }
        }
      } else if (error.message) {
        errorMessage = error.message
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
      event.target.value = ""
    }
  }

  const filteredDispositivos = Array.isArray(dispositivos)
    ? dispositivos
        .filter(
          (dispositivo) =>
            dispositivo.modelo?.toLowerCase().includes(search.toLowerCase()) ||
            dispositivo.marca?.toLowerCase().includes(search.toLowerCase()) ||
            dispositivo.serial?.toLowerCase().includes(search.toLowerCase()),
        )
        .filter(
          (dispositivo) =>
            (filtros.tipo ? dispositivo.tipo === filtros.tipo : true) &&
            (filtros.estado ? dispositivo.estado === filtros.estado : true) &&
            (filtros.sede ? getNombreSede(dispositivo) === filtros.sede : true),
        )
    : []

  const pageCount = Math.ceil(filteredDispositivos.length / itemsPerPage)
  const currentItems = filteredDispositivos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const dispositivosPorTipo = Array.isArray(dispositivos)
    ? dispositivos.reduce((acc, dispositivo) => {
        acc[dispositivo.tipo] = (acc[dispositivo.tipo] || 0) + 1
        return acc
      }, {})
    : {}

  const dispositivosPorProveedor = Array.isArray(dispositivos)
    ? dispositivos.reduce((acc, dispositivo) => {
        acc[dispositivo.marca] = (acc[dispositivo.marca] || 0) + 1
        return acc
      }, {})
    : {}

  const tipoChartData = Object.entries(dispositivosPorTipo).map(([tipo, cantidad]) => ({
    name: tipo,
    value: cantidad,
  }))

  const proveedorChartData = Object.entries(dispositivosPorProveedor).map(([marca, cantidad]) => ({
    name: marca,
    value: cantidad,
  }))

  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#0088FE"]

  return (
    <div className="inventory-containert">
      <div className="main-content">
        {error && (
          <div
            className="error-banner"
            style={{
              padding: "1rem",
              backgroundColor: "#ffebee",
              color: "#c62828",
              borderRadius: "4px",
              marginBottom: "1rem",
              border: "1px solid #ef9a9a",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              style={{
                background: "none",
                border: "none",
                color: "#c62828",
                cursor: "pointer",
                fontSize: "1.2rem",
              }}
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div
            className="success-banner"
            style={{
              padding: "1rem",
              backgroundColor: "#e8f5e9",
              color: "#2e7d32",
              borderRadius: "4px",
              marginBottom: "1rem",
              border: "1px solid #a5d6a7",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{success}</span>
            <button
              onClick={() => setSuccess(null)}
              style={{
                background: "none",
                border: "none",
                color: "#2e7d32",
                cursor: "pointer",
                fontSize: "1.2rem",
              }}
            >
              ×
            </button>
          </div>
        )}

        {!isAdmin && (
          <div className="info-banner">
            Mostrando solo los dispositivos de tu sede asignada: {user?.sedeNombre || "Sede no asignada"}
          </div>
        )}

        <div className="filters-containert">
          <div className="search-containert">
            <Search className="search-icont" />
            <input
              type="text"
              placeholder="Buscar por modelo, marca o serial..."
              className="search-inputt"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>

          {isAdmin && (
            <div className="action-buttonst">
              <label className="action-buttont">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportExcel}
                  style={{ display: "none" }}
                  disabled={loading}
                />
                {loading ? "Cargando..." : "Importar Excel"}
              </label>
              <button
                onClick={handleExportExcel}
                className="action-buttont"
                disabled={loading || dispositivos.length === 0}
              >
                <FileText size={16} />
                Exportar Excel
              </button>
            </div>
          )}

          <select
            value={filtros.tipo}
            onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
            className="filter-select"
            disabled={loading}
          >
            <option value="">Todos los tipos</option>
            <option value="COMPUTADOR">Computador</option>
            <option value="MONITOR">Monitor</option>
            <option value="IMPRESORA">Impresora</option>
            <option value="TELEFONO">Teléfono</option>
          </select>

          {isAdmin && (
            <select
              value={filtros.sede}
              onChange={(e) => setFiltros({ ...filtros, sede: e.target.value })}
              className="filter-select"
              disabled={loading}
            >
              <option value="">Todas las sedes</option>
              {sedes.map((sede) => (
                <option key={sede.id} value={sede.nombre}>
                  {sede.nombre}
                </option>
              ))}
            </select>
          )}

          <select
            value={filtros.estado}
            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
            className="filter-select"
            disabled={loading}
          >
            <option value="">Todos los estados</option>
            <option value="BUENO">Bueno</option>
            <option value="MALO">Malo</option>
            <option value="EN_REPARACION">En reparación</option>
            <option value="DADO_DE_BAJA">Dado de baja</option>
          </select>
        </div>

        <div className="table-containert">
          <table className="inventory-tablet">
            <thead>
              <tr>
                {["Tipo", "Fabricante", "Modelo", "Serial", "Estado", "Sede", "Acciones"].map((head) => (
                  <th key={head}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <div className="loader"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredDispositivos.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
                    {search || Object.values(filtros).some(Boolean)
                      ? "No se encontraron dispositivos con los filtros aplicados"
                      : "No hay dispositivos registrados"}
                  </td>
                </tr>
              ) : (
                currentItems.map((dispositivo) => {
                  // Eliminado todo el código de depuración
                  const nombreSede = getNombreSede(dispositivo)

                  return (
                    <tr key={dispositivo.id}>
                      <td>{dispositivo.tipo || "-"}</td>
                      <td>{dispositivo.marca || "-"}</td>
                      <td>{dispositivo.modelo || "-"}</td>
                      <td>{dispositivo.serial || "-"}</td>
                      <td>
                        <span className={`estado-badge estado-${dispositivo.estado?.toLowerCase() || "desconocido"}`}>
                          {dispositivo.estado || "-"}
                        </span>
                      </td>
                      <td>
                        <span className="sede-badge">{nombreSede}</span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(dispositivo.id)}
                          className="delete-buttont"
                          disabled={loading}
                          title="Eliminar dispositivo"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>

          {filteredDispositivos.length > 0 && (
            <div className="paginationt">
              <div className="pagination-infot">
                Mostrando {(currentPage - 1) * itemsPerPage + 1} a{" "}
                {Math.min(currentPage * itemsPerPage, filteredDispositivos.length)} de {filteredDispositivos.length}{" "}
                dispositivos
              </div>
              <div className="pagination-buttonst">
                <button
                  onClick={() => setCurrentPage((old) => Math.max(old - 1, 1))}
                  disabled={currentPage === 1 || loading}
                  className="pagination-buttont"
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ margin: "0 0.5rem" }}>
                  Página {currentPage} de {pageCount}
                </span>
                <button
                  onClick={() => setCurrentPage((old) => Math.min(old + 1, pageCount))}
                  disabled={currentPage === pageCount || loading}
                  className="pagination-buttont"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {dispositivos.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "2rem",
              marginTop: "2rem",
            }}
          >
            <div className="chart-containert">
              <h2 className="chart-titlet">Dispositivos por Tipo</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={tipoChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {tipoChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} dispositivos`, "Cantidad"]}
                    labelFormatter={(label) => `Tipo: ${label}`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-containert">
              <h2 className="chart-titlet">Dispositivos por Proveedor</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={proveedorChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => [`${value} dispositivos`, "Cantidad"]}
                    labelFormatter={(label) => `Proveedor: ${label}`}
                  />
                  <Bar dataKey="value" name="Cantidad" fill="#8884d8" animationDuration={1500} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .sede-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          background-color: #e3f2fd;
          color: #1565c0;
          font-weight: 500;
        }
      `}</style>
    </div>
  )
}

export default Inventario
