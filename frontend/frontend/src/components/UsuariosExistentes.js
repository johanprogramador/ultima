"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { FaUser, FaEdit, FaPlus, FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa"
import "../styles/UsuariosExistentes.css"

const UsuariosExistentes = () => {
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newUser, setNewUser] = useState({
    username: "",
    nombre: "",
    email: "",
    documento: "",
    celular: "",
    rol: "coordinador", // Valor predeterminado según el modelo de Django
    password: "",
    confirm_password: "",
  })
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "error", // Puede ser "error" o "success"
  })

  // Estados para búsqueda y paginación
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(6)
  const [totalPages, setTotalPages] = useState(1)

  const showAlert = (message, type = "error") => {
    setAlert({ show: true, message, type })
    setTimeout(() => setAlert({ show: false, message: "", type: "error" }), 3000)
  }

  // Efecto para ocultar la alerta después de 3 segundos
  useEffect(() => {
    if (alert.show) {
      const timer = setTimeout(() => {
        setAlert({ ...alert, show: false })
      }, 1000) // 1000 ms = 1 segundo
      return () => clearTimeout(timer) // Limpiar el timer si el componente se desmonta
    }
  }, [alert])

  // Aplicar filtros a los usuarios
  const applyFilters = (usersData = users) => {
    let filtered = [...usersData]

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          (user.nombre && user.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (user.documento && user.documento.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (user.celular && user.celular.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (user.rol && user.rol.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    setFilteredUsers(filtered)
    setTotalPages(Math.ceil(filtered.length / itemsPerPage))
  }

  // Obtener los usuarios para la página actual
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredUsers.slice(startIndex, endIndex)
  }

  // Calcular el rango de elementos mostrados
  const getItemRange = () => {
    const startItem = (currentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(startItem + itemsPerPage - 1, filteredUsers.length)
    return `Mostrando ${startItem} a ${endItem} de ${filteredUsers.length} resultados`
  }

  // Fetch the list of users
  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/usuarios/")
      const usersData = Array.isArray(response.data) ? response.data : []
      setUsers(usersData)
      applyFilters(usersData)
    } catch (error) {
      console.error("Error al obtener usuarios:", error)
      setUsers([])
      setFilteredUsers([])
    }
  }, [])

  // Fetch user details
  const fetchUserDetails = async (userId) => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/dusuarios/${userId}/`)
      setSelectedUser(response.data)
      setShowDetailModal(true)
    } catch (error) {
      console.error("Error al obtener los detalles del usuario:", error)
    }
  }

  // Edit user
  const editUser = async (userId, updatedUserData) => {
    if (!updatedUserData.nombre || !updatedUserData.email || !updatedUserData.username) {
      setAlert({
        show: true,
        message: "Por favor, complete todos los campos obligatorios.",
        type: "error",
      })
      return
    }

    try {
      await axios.put(`http://127.0.0.1:8000/api/editusuarios/${userId}/`, updatedUserData)
      setAlert({
        show: true,
        message: "Usuario editado exitosamente.",
        type: "success",
      })
      fetchUsers()
      setShowDetailModal(false)
    } catch (error) {
      if (error.response && error.response.data) {
        const errorMessages = Object.values(error.response.data).flat().join(" \n")
        showAlert(errorMessages)
      } else {
        showAlert("Error al editar el usuario.")
      }
    }
  }

  // Toggle user status (activate/deactivate)
  const toggleUserStatus = async (userId, isActive) => {
    try {
      const endpoint = isActive
        ? `http://127.0.0.1:8000/api/deusuarios/${userId}/`
        : `http://127.0.0.1:8000/api/activarusuarios/${userId}/`

      await axios.put(endpoint)
      setAlert({
        show: true,
        message: `Usuario ${isActive ? "desactivado" : "activado"} exitosamente.`,
        type: "success",
      })
      fetchUsers() // Refrescar la lista de usuarios después del cambio
    } catch (error) {
      setAlert({
        show: true,
        message: "Error al cambiar el estado del usuario.",
        type: "error",
      })
      const errorMessage = error.response?.data?.error || "Error al desactivar el usuario."
      showAlert(errorMessage)
    }
  }

  // Add new user
  const addUser = async () => {
    if (!newUser.nombre || !newUser.email || !newUser.password || !newUser.username) {
      setAlert({
        show: true,
        message: "Por favor, complete todos los campos obligatorios.",
        type: "error",
      })
      return
    }

    if (newUser.password !== newUser.confirm_password) {
      setAlert({
        show: true,
        message: "Las contraseñas no coinciden.",
        type: "error",
      })
      return
    }

    try {
      const usuarioData = {
        username: newUser.username,
        nombre: newUser.nombre,
        email: newUser.email,
        documento: newUser.documento,
        celular: newUser.celular,
        rol: newUser.rol,
        password: newUser.password,
        confirm_password: newUser.confirm_password,
      }

      await axios.post("http://127.0.0.1:8000/api/register/", usuarioData)
      setAlert({
        show: true,
        message: "Usuario agregado exitosamente.",
        type: "success",
      })
      setShowForm(false)
      fetchUsers()
    } catch (error) {
      setAlert({
        show: true,
        message: "Error al agregar el usuario.",
        type: "error",
      })
      const errorMessage = error.response?.data?.error || "Error al agregar el usuario."
      showAlert(errorMessage)
    }
  }

  // Load users when component mounts
  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Efecto para aplicar filtros cuando cambia el término de búsqueda
  useEffect(() => {
    applyFilters()
    setCurrentPage(1) // Resetear a la primera página cuando cambia la búsqueda
  }, [searchTerm])

  // Componente de alerta
  const AlertModal = ({ message, type, onClose }) => {
    return (
      <div className="modal-overlay">
        <div className="modal-container alert-container">
          <div className={`alert-modal ${type}`}>
            <p>{message}</p>
            <button className="close-button" onClick={onClose}>
              &times;
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Manejador para cerrar el modal cuando se hace clic fuera de él
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowDetailModal(false)
      setShowForm(false)
    }
  }

  return (
    <div className="records-container">
      <div className="user-card">
        <div className="card-header">
          <h2>Usuarios existentes</h2>
          <button className="add-user-btn" onClick={() => setShowForm(true)}>
            <FaPlus />
          </button>
        </div>

        {/* Buscador */}
        <div className="search-container">
          <div className="search-input-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="user-list">
          {getCurrentPageItems().length > 0 ? (
            getCurrentPageItems().map((user) => (
              <div key={user.id} className="user-item">
                <div className="user-avatar">
                  <FaUser />
                </div>
                <div className="user-info" onClick={() => fetchUserDetails(user.id)}>
                  <div className="user-name">{user.nombre}</div>
                  <div className="user-access">{user.rol === "admin" ? "Administrador" : "Coordinador"}</div>
                </div>
                <div className="user-actions">
                  <button className="action-button-modern edit" onClick={() => fetchUserDetails(user.id)}>
                    <FaEdit />
                  </button>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={user.is_active}
                      onChange={() => toggleUserStatus(user.id, user.is_active)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>
            ))
          ) : (
            <p>No hay usuarios disponibles.</p>
          )}
        </div>

        {/* Paginación */}
        {filteredUsers.length > 0 && (
          <div className="pagination-container">
            <div className="pagination-info">{getItemRange()}</div>
            <div className="pagination-controls">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="pagination-arrow"
                aria-label="Página anterior"
              >
                <FaChevronLeft />
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="pagination-arrow"
                aria-label="Página siguiente"
              >
                <FaChevronRight />
              </button>
            </div>
            <div className="pagination-progress-bar">
              <div className="pagination-progress" style={{ width: `${(currentPage / totalPages) * 100}%` }}></div>
            </div>
          </div>
        )}

        {/* Modal para ver y editar detalles del usuario */}
        {showDetailModal && selectedUser && (
          <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-container modern-modal" onClick={(e) => e.stopPropagation()}>
              <button className="close-button" onClick={() => setShowDetailModal(false)}>
                &times;
              </button>
              <div className="modal-content">
                <h1 className="modal-title">Editar Usuario</h1>
                <div className="input-group">
                  <label>Nombre completo *</label>
                  <input
                    type="text"
                    value={selectedUser.nombre || ""}
                    onChange={(e) => setSelectedUser({ ...selectedUser, nombre: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Nombre de usuario *</label>
                  <input
                    type="text"
                    value={selectedUser.username || ""}
                    onChange={(e) => setSelectedUser({ ...selectedUser, username: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Correo electrónico *</label>
                  <input
                    type="email"
                    value={selectedUser.email || ""}
                    onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Documento de identidad</label>
                  <input
                    type="text"
                    value={selectedUser.documento || ""}
                    onChange={(e) => setSelectedUser({ ...selectedUser, documento: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Número de celular</label>
                  <input
                    type="text"
                    value={selectedUser.celular || ""}
                    onChange={(e) => setSelectedUser({ ...selectedUser, celular: e.target.value })}
                  />
                </div>
                <div className="input-group select-wrapper">
                  <label>Rol *</label>
                  <select
                    value={selectedUser.rol || ""}
                    onChange={(e) => setSelectedUser({ ...selectedUser, rol: e.target.value })}
                  >
                    <option value="" disabled>
                      Seleccione un rol
                    </option>
                    <option value="coordinador">Coordinador</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <button className="create-button" onClick={() => editUser(selectedUser.id, selectedUser)}>
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para agregar nuevo usuario */}
        {showForm && (
          <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-container modern-modal" onClick={(e) => e.stopPropagation()}>
              <button className="close-button" onClick={() => setShowForm(false)}>
                &times;
              </button>
              <div className="modal-content">
                <h1 className="modal-title">Agregar Usuario</h1>
                <div className="input-group">
                  <label>Nombre de usuario</label>
                  <input
                    type="text"
                    placeholder="Nombre de usuario"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Nombre completo</label>
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    value={newUser.nombre}
                    onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Correo electrónico</label>
                  <input
                    type="email"
                    placeholder="Correo electrónico"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Documento de identidad</label>
                  <input
                    type="text"
                    placeholder="Documento de identidad"
                    value={newUser.documento}
                    onChange={(e) => setNewUser({ ...newUser, documento: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Número de celular</label>
                  <input
                    type="text"
                    placeholder="Número de celular"
                    value={newUser.celular}
                    onChange={(e) => setNewUser({ ...newUser, celular: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Contraseña</label>
                  <input
                    type="password"
                    placeholder="Contraseña"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Confirmar contraseña</label>
                  <input
                    type="password"
                    placeholder="Confirmar contraseña"
                    value={newUser.confirm_password}
                    onChange={(e) => setNewUser({ ...newUser, confirm_password: e.target.value })}
                  />
                </div>
                <div className="input-group select-wrapper">
                  <label>Rol</label>
                  <select value={newUser.rol} onChange={(e) => setNewUser({ ...newUser, rol: e.target.value })}>
                    <option value="coordinador">Coordinador</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <button className="create-button" onClick={addUser}>
                  Agregar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mostrar alerta */}
        {alert.show && (
          <AlertModal message={alert.message} type={alert.type} onClose={() => setAlert({ ...alert, show: false })} />
        )}
      </div>
    </div>
  )
}

export default UsuariosExistentes

