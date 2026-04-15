import "./TopBar.css";
import { FiBell, FiUser, FiSettings } from "react-icons/fi";
import logo from "../assets/Logo.png";
// OPCIÓN 1 (Recomendada): Si tu imagen está dentro de la carpeta 'src' (ej. src/assets/logo.png)
// Descomenta la siguiente línea y ajusta la ruta a donde tengas guardada tu imagen:
// import logoEmpresa from '../assets/logo.png';

export default function TopBar() {
  return (
    <header className="topbar">
      <div className="logo">
        
        {/* Reemplazamos el texto por una etiqueta de imagen */}
        <img 
          // Si usaste la Opción 1 de arriba, cambia el src por: src={logoEmpresa}
          // Si tu imagen está en la carpeta 'public', puedes poner la ruta directa ej: src="/logo.png"
          src={logo} 
          alt="Logo de la empresa" 
          style={{ 
            maxHeight: "40px", // Limita el alto para que no deforme tu TopBar
            width: "auto", 
            objectFit: "contain",
            cursor: "pointer" // Opcional: hace que parezca un botón clickeable
          }} 
        />

      </div>

      <div className="actions">
        <FiBell />
        <FiUser />
        <FiSettings />
      </div>
    </header>
  );
}