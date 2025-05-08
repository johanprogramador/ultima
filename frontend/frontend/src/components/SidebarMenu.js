"use client"
import { FaHome, FaPowerOff } from "react-icons/fa"
import { MdInventory, MdHistory } from "react-icons/md"
import { BsDiagram3 } from "react-icons/bs"
import { AiOutlineFileText } from "react-icons/ai"
import { IoIosDesktop } from "react-icons/io"
import { Link, useLocation, useNavigate } from "react-router-dom"
import "../styles/SidebarMenu.css"

const SidebarMenu = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path) => (location.pathname.startsWith(path) ? "menu-item active" : "menu-item")

  const handleLogout = () => {
    sessionStorage.clear()
    navigate("/")
    window.location.reload()
  }

  const menuItems = [
    { path: "/dashboard", icon: <FaHome size={20} />, label: "Inicio" },
    { path: "/inventory", icon: <MdInventory size={20} />, label: "Inventario" },
    { path: "/planos", icon: <BsDiagram3 size={20} />, label: "Planos" },
    { path: "/Devices", icon: <IoIosDesktop size={20} />, label: "Dispositivos" },
    { path: "/Records", icon: <AiOutlineFileText size={20} />, label: "Usuarios" },
    { path: "/services", icon: <IoIosDesktop size={20} />, label: "Servicios" },
    { path: "/sedes", icon: <IoIosDesktop size={20} />, label: "Sedes" },
    { path: "/History", icon: <MdHistory size={20} />, label: "Historial" },
    { path: "/Movimiento", icon: <MdHistory size={20} />, label: "Movimiento" },
  ]

  return (
    <div className="sidebar">
      <div className="menu-items-container">
        {menuItems.map((item) => (
          <Link key={item.path} to={item.path} className={isActive(item.path)}>
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
      <div className="sidebar-footer">
        <div className="divider" />
        <button className="menu-item logout-button" onClick={handleLogout}>
          <FaPowerOff size={20} />
          <span>Salir</span>
        </button>
      </div>
    </div>
  )
}

export default SidebarMenu

