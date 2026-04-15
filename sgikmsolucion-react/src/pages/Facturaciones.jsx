import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Papa from "papaparse"; 
import { 
  FiSearch, 
  FiChevronDown, FiChevronRight, FiEdit, FiTrash2, FiDownload, FiX 
} from "react-icons/fi";
import "./Facturaciones.css";

import SideMenu from "../menu/SideMenu";
import TopBar from "../menu/TopBar";

const API_URL = "https://kmsolucion.com/KMBD/public/api/facturas";

export default function Facturaciones() {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedClients, setExpandedClients] = useState({});

  const csvInputRef = useRef(null); 

  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return { 
      headers: { 
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      } 
    };
  };

  // Estados para el Modal de Edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formEntry, setFormEntry] = useState({
    cliente: "",
    folio: "", 
    categoria: "",
    fecha: "",
    monto: "",
    estado: ""
  });

  const fetchRecords = async () => {
    try {
      const response = await axios.get(API_URL, getAuthHeader());
      const grouped = response.data.reduce((acc, curr) => {
        const clientName = curr.client_name.toUpperCase();
        if (!acc[clientName]) acc[clientName] = { cliente: clientName, items: [] };
        
        acc[clientName].items.push({
          id: curr.id,
          folio: curr.folio,
          category: curr.category,
          fecha: curr.billing_date,
          monto: parseFloat(curr.amount),
          estado: curr.status
        });
        return acc;
      }, {});
      setData(Object.values(grouped));
    } catch (error) {
      console.error("Error cargando datos:", error);
      if (error.response?.status === 401) alert("Sesión expirada. Por favor inicia sesión de nuevo.");
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/[^a-z0-9]/g, ''), 
      complete: async (results) => {
        try {
          const validRows = results.data.filter(row => row.cliente || row.folio);

          const formatExcelDate = (dateString) => {
            if (!dateString) return new Date().toISOString().split('T')[0];
            const str = dateString.trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
            const mxDateMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (mxDateMatch) return `${mxDateMatch[3]}-${mxDateMatch[2].padStart(2, '0')}-${mxDateMatch[1].padStart(2, '0')}`;
            const d = new Date(str);
            return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : str;
          };

          const uploadPromises = validRows.map(row => {
            const cleanMonto = row.monto ? String(row.monto).replace(/[^0-9.-]+/g, "") : 0;
            return axios.post(API_URL, {
              client_name: (row.cliente || "SIN CLIENTE").trim(),
              folio: (row.folio || "S/N").trim(),
              category: (row.categoria || row.category || "General").trim(),
              billing_date: formatExcelDate(row.fecha),
              amount: parseFloat(cleanMonto || 0),
              status: (row.estado || "Pendiente").trim()
            }, getAuthHeader());
          });

          await Promise.all(uploadPromises);
          alert("¡Facturas importadas con éxito!");
          fetchRecords(); 
          
        } catch (error) {
          console.error("Error al guardar:", error);
          alert("No tienes permisos o la sesión caducó.");
        } finally {
          if(csvInputRef.current) csvInputRef.current.value = ""; 
        }
      }
    });
  };

  const handleEditClick = (e, item, clienteName) => {
    e.stopPropagation();
    setEditingId(item.id);
    setFormEntry({
      cliente: clienteName,
      folio: item.folio,
      categoria: item.category || "",
      fecha: item.fecha,
      monto: item.monto,
      estado: item.estado
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormEntry({ ...formEntry, [name]: value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/${editingId}`, {
        client_name: formEntry.cliente,
        folio: formEntry.folio,
        category: formEntry.categoria,
        billing_date: formEntry.fecha,
        amount: formEntry.monto,
        status: formEntry.estado
      }, getAuthHeader());
      setIsModalOpen(false);
      fetchRecords();
    } catch (error) {
      alert("Error al actualizar: Sesión inválida o falta de permisos.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Eliminar esta factura?")) {
      try {
        await axios.delete(`${API_URL}/${id}`, getAuthHeader());
        fetchRecords(); 
      } catch (error) {
        console.error("Error al eliminar");
        alert("No se pudo eliminar. Verifica tus permisos.");
      }
    }
  };

  const toggleClient = (cliente) => {
    setExpandedClients((prev) => ({ ...prev, [cliente]: !prev[cliente] }));
  };

  const filteredData = data.filter((group) => {
    const matchesCliente = group.cliente.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesItems = group.items.some(item => 
      (item.folio && item.folio.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    return matchesCliente || matchesItems;
  });

  return (
    <div className="layout-container">
      <SideMenu />
      <div className="main-content">
        <TopBar />
        <main className="content-area">
          {/* TABLA DE FACTURACIONES */}
          <div className="table-container">
            <div className="table-header">
              <h2>Registro de Facturaciones</h2>
              <div className="header-actions">
                <div className="search-box">
                  <FiSearch className="search-icon" />
                  <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <input type="file" accept=".csv" style={{ display: "none" }} ref={csvInputRef} onChange={handleCSVUpload} />
                <button className="btn-insert" style={{ backgroundColor: "#1b5e20" }} onClick={() => csvInputRef.current.click()}>
                  <FiDownload /> Importar CSV
                </button>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: "50px" }}></th>
                    <th>Folio / Cliente</th> 
                    <th>Categoría</th>
                    <th>Fecha</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th style={{ width: "120px" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((group) => (
                    <React.Fragment key={group.cliente}>
                      <tr className="row-client" onClick={() => toggleClient(group.cliente)}>
                        <td>{expandedClients[group.cliente] ? <FiChevronDown /> : <FiChevronRight />}</td>
                        <td colSpan="5">
                          <span className="badge-cliente">{group.cliente}</span>
                          <small>({group.items.length})</small>
                        </td>
                        <td></td>
                      </tr>
                      {expandedClients[group.cliente] && group.items.map((item) => (
                        <tr key={item.id} className="row-detail">
                          <td></td>
                          <td className="enlace-name">{item.folio}</td>
                          <td style={{ color: "#666", fontSize: "0.9rem" }}>{item.category}</td>
                          <td>{item.fecha}</td>
                          <td style={{ fontWeight: "600" }}>${item.monto.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                          <td><span className={`status-pill ${item.estado.toLowerCase().replace(/\s+/g, '-')}`}>{item.estado}</span></td>
                          <td className="actions">
                            <button className="btn-icon edit" onClick={(e) => handleEditClick(e, item, group.cliente)}><FiEdit /></button>
                            <button className="btn-icon delete" onClick={() => handleDelete(item.id)}><FiTrash2 /></button>
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
              <h3>Editar Facturación</h3>
              <button className="close-modal" onClick={() => setIsModalOpen(false)}><FiX /></button>
            </div>
            <form onSubmit={handleUpdate} className="insert-form">
              <div className="form-group">
                <label>Folio</label>
                <input type="text" name="folio" value={formEntry.folio} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Categoría</label>
                <input type="text" name="categoria" value={formEntry.categoria} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Fecha</label>
                <input type="date" name="fecha" value={formEntry.fecha} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Monto</label>
                <input type="number" step="0.01" name="monto" value={formEntry.monto} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select name="estado" value={formEntry.estado} onChange={handleInputChange}>
                  <option value="Aprobado">Aprobado</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Cancelado">Cancelado</option>
                  <option value="Pagado">Pagado</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-save">Actualizar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}