import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { 
  FiSearch, FiX, FiFileText, 
  FiChevronDown, FiChevronRight, FiTrash2, FiUploadCloud, FiEye 
} from "react-icons/fi";
import "./Actividades.css";

import SideMenu from "../menu/SideMenu";
import TopBar from "../menu/TopBar";

// URL de la API de Laravel
const API_URL = "https://kmsolucion.com/KMBD/public/api/actividades";
// URL base del servidor para previsualizar archivos del storage
const STORAGE_BASE = "https://kmsolucion.com/KMBD/public/storage";

export default function Actividades() {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroups, setExpandedGroups] = useState({});
  const [viewPdf, setViewPdf] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Helper para obtener el token y configurar cabeceras
  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return { 
      headers: { 
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      } 
    };
  };

  const fetchActividades = async () => {
    try {
      const response = await axios.get(API_URL, getAuthHeader());
      // Agrupamos por periodo (año) extraído de la base de datos
      const grouped = response.data.reduce((acc, curr) => {
        const year = curr.period.toString();
        if (!acc[year]) acc[year] = { periodo: year, items: [] };
        acc[year].items.push(curr);
        return acc;
      }, {});

      // Ordenar años descendente
      const sortedData = Object.values(grouped).sort((a, b) => b.periodo.localeCompare(a.periodo));
      setData(sortedData);
    } catch (error) {
      console.error("Error cargando actividades:", error);
      if (error.response?.status === 401) alert("Sesión expirada. Por favor inicia sesión.");
    }
  };

  useEffect(() => {
    fetchActividades();
  }, []);

  const toggleGroup = (periodo) => {
    setExpandedGroups((prev) => ({ ...prev, [periodo]: !prev[periodo] }));
  };

  const handleMultipleFiles = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setLoading(true);
    const uploadPromises = files.map(async (file) => {
      if (file.type !== "application/pdf") {
        console.warn(`El archivo ${file.name} no es un PDF.`);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      try {
        const config = getAuthHeader();
        config.headers["Content-Type"] = "multipart/form-data";

        return await axios.post(API_URL, formData, config);
      } catch (err) {
        console.error(`Error subiendo ${file.name}:`, err);
      }
    });

    await Promise.all(uploadPromises);
    setLoading(false);
    
    if (fileInputRef.current) fileInputRef.current.value = "";
    alert("Carga de actividades completada.");
    fetchActividades(); // Refrescar lista de la DB
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este registro permanentemente?")) {
      try {
        await axios.delete(`${API_URL}/${id}`, getAuthHeader());
        fetchActividades();
      } catch (error) {
        console.error("Error al eliminar:", error);
        alert("No se pudo eliminar el registro. Verifica tus permisos.");
      }
    }
  };

  const openViewer = (item) => {
    // Construimos la URL completa para el iframe
    const fullUrl = item.file_path.startsWith('http') 
                    ? item.file_path 
                    : `${STORAGE_BASE}${item.file_path}`;
    setViewPdf(fullUrl);
  };

  const filteredData = data.map(group => ({
    ...group,
    items: group.items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.file_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(group => group.items.length > 0);

  return (
    <div className="layout-container">
      <SideMenu />
      <div className="main-content">
        <TopBar />
        <main className="content-area">
          <div className="table-container">
            <div className="table-header">
              <h2>Registro de Actividades y Desperdicios</h2>
              <div className="header-actions">
                <div className="search-box">
                  <FiSearch className="search-icon" />
                  <input 
                    type="text" 
                    placeholder="Buscar actividad..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
                </div>
                
                <input 
                  type="file" 
                  multiple 
                  accept="application/pdf" 
                  style={{ display: "none" }} 
                  ref={fileInputRef} 
                  onChange={handleMultipleFiles} 
                />
                
                <button 
                  className="btn-insert" 
                  style={{ backgroundColor: "#004d40", opacity: loading ? 0.7 : 1 }}
                  onClick={() => !loading && fileInputRef.current.click()}
                  disabled={loading}
                >
                  <FiUploadCloud /> {loading ? "Cargando..." : "Subir Actividades (PDF)"}
                </button>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: "50px" }}></th>
                    <th>Nombre de la Actividad</th>
                    <th>Fecha Registro</th>
                    <th>Archivo</th>
                    <th style={{ width: "120px" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((group) => (
                    <React.Fragment key={group.periodo}>
                      <tr className="row-client" onClick={() => toggleGroup(group.periodo)}>
                        <td>{expandedGroups[group.periodo] ? <FiChevronDown /> : <FiChevronRight />}</td>
                        <td colSpan="3">
                          <span className="badge-periodo">Año {group.periodo}</span>
                          <small className="enlaces-count">({group.items.length} archivos)</small>
                        </td>
                        <td></td>
                      </tr>
                      {expandedGroups[group.periodo] && group.items.map((item) => (
                        <tr key={item.id} className="row-detail">
                          <td></td>
                          <td className="enlace-name" style={{ fontWeight: "600" }}>{item.name}</td>
                          <td>{item.registration_date}</td>
                          <td>
                            <div className="link-viewer" onClick={() => openViewer(item)}>
                              <FiFileText /> {item.file_name}
                            </div>
                          </td>
                          <td className="actions">
                            <button className="btn-icon view" title="Ver" onClick={() => openViewer(item)}><FiEye /></button>
                            <button className="btn-icon delete" title="Borrar" onClick={() => handleDelete(item.id)}><FiTrash2 /></button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              {filteredData.length === 0 && !loading && (
                <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>
                  No se encontraron actividades registradas.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {}
      {viewPdf && (
        <div className="modal-overlay">
          <div className="modal-content viewer-modal">
            <div className="modal-header">
              <h3>Previsualización de Reporte</h3>
              <button className="close-modal" onClick={() => setViewPdf(null)}><FiX /></button>
            </div>
            <div className="pdf-container">
              <iframe src={viewPdf} title="PDF Viewer" width="100%" height="600px"></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}