import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logo from "../assets/Logo.png";
import "./Login.css";

const LOGIN_URL = "https://kmsolucion.com/KMBD/public/api/login";

export default function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await axios.post(LOGIN_URL, {
        name: username,
        password: password,
      });

      const { user, token } = response.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user_role", user.role);
      localStorage.setItem("user_name", user.name);

      navigate("/dashboard");
    } catch (err) {
      console.error("Error en login:", err);
      setError(err.response?.data?.message || "Usuario o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <img src={logo} alt="KM Solución" className="login-logo" />

        <h1>Iniciar Sesión</h1>

        <form onSubmit={handleLogin}>
          {error && <div className="login-error-message">{error}</div>}

          <div className="form-group">
            <label>Usuario:</label>
            <input 
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Nombre de usuario"
            />
          </div>

          <div className="form-group">
            <label>Contraseña:</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Verificando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}