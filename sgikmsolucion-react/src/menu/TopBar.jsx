import React, { useState } from "react";
import axios from "axios";
import "./TopBar.css";
import { FiBell, FiUser, FiSettings, FiX, FiUserPlus, FiMail, FiLock, FiTag } from "react-icons/fi";
import logo from "../assets/Logo.png";

export default function TopBar() {
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "visitante" });

  const userRole = localStorage.getItem("user_role"); 
  const isAdmin = userRole === "admin";

  const handleInputChange = (e) => {
    setNewUser({ ...newUser, [e.target.name]: e.target.value });
  };

  const handleSubmitUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post("https://kmsolucion.com/KMBD/public/api/register", newUser, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Usuario creado con éxito");
      setShowAdminModal(false);
      setNewUser({ name: "", email: "", password: "", role: "visitante" });
    } catch (error) {
      alert("Error: " + (error.response?.data?.message || "No se pudo crear"));
    }
  };

  return (
    <header className="topbar">
      <div className="logo">
        <img src={logo} alt="Logo" style={{ maxHeight: "40px" }} />
      </div>

      <div className="actions">
        <FiBell />
        <FiUser 
          onClick={() => isAdmin ? setShowAdminModal(true) : alert("Acceso restringido")} 
          style={{ cursor: isAdmin ? "pointer" : "not-allowed", color: isAdmin ? "#2d5a27" : "#ccc" }}
        />
        <FiSettings />
      </div>

      {showAdminModal && (
        <div className="modal-overlay">
          <div className="admin-modal-card">

            
            <div className="admin-modal-header">
              <div className="icon-circle">
                <FiUserPlus />
              </div>
              <h2>Registrar Usuario</h2>
              <p>Crea una nueva cuenta para el sistema SGI</p>
            </div>

            <form onSubmit={handleSubmitUser} className="admin-modal-form">
              <div className="input-group-modern">
                <label><FiUser /> Nombre Completo</label>
                <input type="text" name="name" required onChange={handleInputChange} placeholder="Nombre" />
              </div>

              <div className="input-group-modern">
                <label><FiMail /> Correo Electrónico</label>
                <input type="email" name="email" required onChange={handleInputChange} placeholder="Correo" />
              </div>

              <div className="input-group-modern">
                <label><FiLock /> Contraseña</label>
                <input type="password" name="password" required onChange={handleInputChange} placeholder="••••••••" />
              </div>

              <div className="input-group-modern">
                <label><FiTag /> Rol del Sistema</label>
                <select name="role" onChange={handleInputChange} value={newUser.role}>
                  <option value="visitante">Visitante</option>
                  <option value="empleado">Empleado</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="admin-modal-actions">
                <button type="button" className="btn-cancel-modern" onClick={() => setShowAdminModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save-modern">
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}