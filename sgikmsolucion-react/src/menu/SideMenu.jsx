import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./SideMenu.css";
import {
  FiGrid,
  FiUsers,
  FiFileText,
  FiCreditCard,
  FiDollarSign,    // <-- Nuevo
  FiTrendingUp,    // <-- Nuevo
  FiCalendar,      // <-- Nuevo
  FiCheckSquare,   // <-- Nuevo
  FiLogOut,
} from "react-icons/fi";

export default function SideMenu() {
  const navigate = useNavigate();
  const location = useLocation();

  const goTo = (path) => {
    navigate(path);
  };

  return (
    <aside className="side-menu">
      <div className="menu-header">
        <span>SGI KM Solución</span>
      </div>

      <nav className="menu-nav">
        <MenuItem
          icon={<FiGrid />}
          text="Dashboard"
          active={location.pathname === "/dashboard"} 
          onClick={() => goTo("/dashboard")}
        />

        <MenuItem
          icon={<FiUsers />}
          text="Rutas"
          active={location.pathname === "/rutas"}
          onClick={() => goTo("/rutas")} 
        />

        <MenuItem 
          icon={<FiFileText />} 
          text="Cotizaciones" 
          active={location.pathname === "/cotizaciones"}
          onClick={() => goTo("/cotizaciones")}
        />
        
        <MenuItem 
          icon={<FiCreditCard />} 
          text="Facturación" 
          active={location.pathname === "/facturacion"}
          onClick={() => goTo("/facturacion")}
        />
        
        <MenuItem 
          icon={<FiDollarSign />} 
          text="CxC" 
          active={location.pathname === "/cxc"}
          onClick={() => goTo("/cxc")}
        />

        <MenuItem 
          icon={<FiTrendingUp />} 
          text="Ingresos" 
          active={location.pathname === "/ingresos"}
          onClick={() => goTo("/ingresos")}
        />

        <MenuItem 
          icon={<FiCalendar />} 
          text="Juntas" 
          active={location.pathname === "/juntas"}
          onClick={() => goTo("/juntas")}
        />

        <MenuItem 
          icon={<FiCheckSquare />} 
          text="Actividades y Desperdicios" 
          active={location.pathname === "/actividades"}
          onClick={() => goTo("/actividades")}
        />
      </nav>

      <div className="menu-footer">
        <MenuItem
          icon={<FiLogOut />}
          text="Cerrar Sesión"
          logout
          onClick={() => {
            alert("Cerrar sesión");
            navigate("/login");
          }}
        />
      </div>
    </aside>
  );
}

function MenuItem({ icon, text, active, logout, onClick }) {
  return (
    <div
      className={`menu-item ${active ? "active" : ""} ${logout ? "logout" : ""}`}
      onClick={onClick}
    >
      <span className="icon">{icon}</span>
      <span className="text">{text}</span>
    </div>
  );
}