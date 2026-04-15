import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Rutas from "./pages/Rutas";
import Home from "./pages/Home";
import Cotizaciones from "./pages/Cotizaciones";
import Facturaciones from "./pages/Facturaciones";
import CxC from "./pages/CxC";
import Ingresos from "./pages/Ingresos";
import Juntas from "./pages/Juntas";
import Actividades from "./pages/Actividades";
import Dashboard from "./pages/Dashboard";

// --- COMPONENTE PARA PROTEGER RUTAS ---
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  // Si no hay token, lo mandamos al login
  return token ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta de Login */}
        <Route path="/login" element={<Login />} />

        {/* Ruta Raíz: Si está logueado va al Dashboard, si no, al Home o Login */}
        <Route path="/" element={<Login />} />

        {/* --- RUTAS PROTEGIDAS (Solo entran con Token) --- */}
        <Route path="/dashboard" element={
          <PrivateRoute> <Dashboard /> </PrivateRoute>
        } />
        
        <Route path="/rutas" element={
          <PrivateRoute> <Rutas /> </PrivateRoute>
        } />
        
        <Route path="/cotizaciones" element={
          <PrivateRoute> <Cotizaciones /> </PrivateRoute>
        } />

        <Route path="/facturacion" element={
          <PrivateRoute> <Facturaciones /> </PrivateRoute>
        } />

        <Route path="/cxc" element={
          <PrivateRoute> <CxC /> </PrivateRoute>
        } />

        <Route path="/ingresos" element={
          <PrivateRoute> <Ingresos /> </PrivateRoute>
        } />

        <Route path="/juntas" element={
          <PrivateRoute> <Juntas /> </PrivateRoute>
        } />

        <Route path="/actividades" element={
          <PrivateRoute> <Actividades /> </PrivateRoute>
        } />

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}