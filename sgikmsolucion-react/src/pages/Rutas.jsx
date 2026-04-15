import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  FiSearch, FiExternalLink, FiEdit, FiTrash2, 
  FiChevronDown, FiChevronRight, FiPlus, FiX 
} from "react-icons/fi";
import "./Rutas.css";

import SideMenu from "../menu/SideMenu";
import TopBar from "../menu/TopBar";

const API_URL = "https://kmsolucion.com/KMBD/public/api/route-registers";

export default function EnlacesTable() {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedClients, setExpandedClients] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [editingId, setEditingId] = useState(null);

  const [formEntry, setFormEntry] = useState({
    cliente: "",
    nombre: "",
    url: "",
    descripcion: ""
  });

  const fetchRecords = async () => {
    try {
      const response = await axios.get(API_URL);
      const grouped = response.data.reduce((acc, curr) => {
        const clientName = curr.customer_name.toUpperCase();
        if (!acc[clientName]) acc[clientName] = { cliente: clientName, enlaces: [] };
        acc[clientName].enlaces.push({
          id: curr.id,
          nombre: curr.link_name,
          url: curr.url_route,
          descripcion: curr.description
        });
        return acc;
      }, {});
      setData(Object.values(grouped));
    } catch (error) {
      console.error("Error cargando datos:", error);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormEntry({ ...formEntry, [name]: value });
  };

  const handleInsertClick = () => {
    setEditingId(null);
    setFormEntry({ cliente: "", nombre: "", url: "", descripcion: "" });
    setIsModalOpen(true);
  };

  const handleEditClick = (e, enlace, clienteName) => {
    e.stopPropagation();
    setEditingId(enlace.id);
    setFormEntry({
      cliente: clienteName, 
      nombre: enlace.nombre,
      url: enlace.url,
      descripcion: enlace.descripcion || ""
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API_URL}/${editingId}`, {
          customer_name: formEntry.cliente,
          link_name: formEntry.nombre,
          url_route: formEntry.url,
          description: formEntry.descripcion
        });
      } else {
        await axios.post(API_URL, {
          customer_name: formEntry.cliente,
          link_name: formEntry.nombre,
          url_route: formEntry.url,
          description: formEntry.descripcion
        });
      }
      setIsModalOpen(false);
      fetchRecords();
    } catch (error) {
      alert("Error: " + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este enlace?")) {
      try {
        await axios.delete(`${API_URL}/${id}`);
        fetchRecords();
      } catch (error) {
        console.error("Error al eliminar:", error);
      }
    }
  };

  const toggleClient = (cliente) => {
    setExpandedClients((prev) => ({ ...prev, [cliente]: !prev[cliente] }));
  };

  const filteredData = data.filter((group) => {
    const matchesCliente = group.cliente.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEnlaces = group.enlaces.some(e => 
      e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return matchesCliente || matchesEnlaces;
  });

  return (
    <div className="layout-container">
      <SideMenu />
      <div className="main-content">
        <TopBar />
        <main className="content-area">
          <div className="table-container">
            <div className="table-header">
              <h2>Directorio de Rutas por Cliente</h2>
              <div className="header-actions">
                <div className="search-box">
                  <FiSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Buscar cliente o enlace..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button className="btn-insert" onClick={handleInsertClick}>
                  <FiPlus /> Insertar
                </button>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: "50px" }}></th>
                    <th>Cliente / Enlace</th>
                    <th>URL / Ruta</th>
                    <th>Descripción</th>
                    <th style={{ width: "120px" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((group) => (
                    <React.Fragment key={group.cliente}>
                      <tr className="row-client" onClick={() => toggleClient(group.cliente)}>
                        <td className="arrow-cell">
                          {expandedClients[group.cliente] ? <FiChevronDown /> : <FiChevronRight />}
                        </td>
                        <td colSpan="3">
                          <span className="badge-cliente">{group.cliente}</span>
                          <small className="enlaces-count">({group.enlaces.length} enlaces)</small>
                        </td>
                        <td className="actions">
                          <button 
                            className="btn-icon edit" 
                            title="Editar primer enlace"
                            onClick={(e) => handleEditClick(e, group.enlaces[0], group.cliente)} 
                          >
                            <FiEdit />
                          </button>
                        </td>
                      </tr>
                      {expandedClients[group.cliente] && group.enlaces.map((enlace) => (
                        <tr key={enlace.id} className="row-detail">
                          <td></td>
                          <td className="enlace-name">{enlace.nombre}</td>
                          <td>
                            <a href={enlace.url} target="_blank" rel="noreferrer" className="link">
                              {enlace.url} <FiExternalLink />
                            </a>
                          </td>
                          <td className="enlace-desc">{enlace.descripcion}</td>
                          <td className="actions">
                            <button 
                                className="btn-icon edit" 
                                title="Editar enlace"
                                onClick={(e) => handleEditClick(e, enlace, group.cliente)}
                            >
                                <FiEdit />
                            </button>
                            <button 
                                className="btn-icon delete" 
                                title="Eliminar"
                                onClick={() => handleDelete(enlace.id)}
                            >
                                <FiTrash2 />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingId ? "Editar Registro" : "Nuevo Registro de Ruta"}</h3>
              <button className="close-modal" onClick={() => setIsModalOpen(false)}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} className="insert-form">
              
              {}
              <div className="form-group">
                <label>Nombre del Cliente</label>
                <input 
                  list="clientes-existentes"
                  type="text" 
                  name="cliente" 
                  required 
                  value={formEntry.cliente} 
                  onChange={handleInputChange}
                  placeholder="Escribe o selecciona un cliente"
                  autoComplete="off"
                />
                <datalist id="clientes-existentes">
                  {}
                  {data.map((group, index) => (
                    <option key={index} value={group.cliente} />
                  ))}
                </datalist>
              </div>
              {/* ==================================== */}

              <div className="form-group">
                <label>Nombre del Enlace</label>
                <input 
                  type="text" name="nombre" required 
                  value={formEntry.nombre} onChange={handleInputChange}
                  placeholder="Nombre descriptivo del enlace"
                />
              </div>
              <div className="form-group">
                <label>URL / Ruta</label>
                <input 
                  type="url" name="url" required 
                  value={formEntry.url} onChange={handleInputChange}
                  placeholder="https://..."
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea 
                  name="descripcion" rows="3"
                  value={formEntry.descripcion} onChange={handleInputChange}
                  placeholder="Breve explicación del acceso..."
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-save">
                  {editingId ? "Actualizar" : "Guardar Registro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}