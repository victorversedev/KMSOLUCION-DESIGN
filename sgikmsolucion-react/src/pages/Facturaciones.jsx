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

const BASE_URL = "https://kmsolucion.com/KMBD/public/api";
const API_URL = `${BASE_URL}/facturas`;

export default function Facturaciones() {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedClients, setExpandedClients] = useState({});
  const csvInputRef = useRef(null); 

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formEntry, setFormEntry] = useState({
    cliente: "", 
    folio: "", 
    categoria: "", 
    fecha: "",       
    fecha_pago: "",  
    monto: "", 
    estado: ""
  });

  // --- UTILIDADES ---

  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return { 
      headers: { 
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      } 
    };
  };

  const cleanDate = (dateStr) => {
    if (!dateStr || dateStr === "null" || dateStr === undefined) return "";
    return dateStr.split("T")[0];
  };

  const normalizeText = (text) => {
    if (!text) return "GENERAL";
    return text
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  const formatExcelDate = (dateString) => {
    if (!dateString) return null;
    const str = String(dateString).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const mxDateMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mxDateMatch) {
      return `${mxDateMatch[3]}-${mxDateMatch[2].padStart(2, '0')}-${mxDateMatch[1].padStart(2, '0')}`;
    }
    const d = new Date(str);
    return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : null;
  };

  // --- ACCIONES API ---

  const fetchRecords = async () => {
    try {
      const response = await axios.get(API_URL, getAuthHeader());
      const records = Array.isArray(response.data) ? response.data : [];
      
      const grouped = records.reduce((acc, curr) => {
        const clientName = normalizeText(curr.client_name || "SIN CLIENTE");
        if (!acc[clientName]) acc[clientName] = { cliente: clientName, items: [] };
        
        acc[clientName].items.push({
          id: curr.id,
          folio: curr.folio || "S/N",
          category: normalizeText(curr.category),
          fecha: cleanDate(curr.billing_date),
          fecha_pago: cleanDate(curr.payment_date), 
          monto: parseFloat(curr.amount || 0),
          estado: curr.status || "Pendiente"
        });
        return acc;
      }, {});
      setData(Object.values(grouped));
    } catch (error) {
      console.error("Error cargando datos:", error);
      setData([]);
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
          const today = new Date();
          const allRequests = [];

          validRows.forEach(row => {
            const cleanMonto = row.monto ? String(row.monto).replace(/[^0-9.-]+/g, "") : 0;
            const amount = parseFloat(cleanMonto);
            const rawStatus = (row.estado || "Pendiente").trim().toLowerCase();
            const clientName = normalizeText(row.cliente || "SIN CLIENTE");
            const folio = (row.folio || "S/N").trim();
            const category = normalizeText(row.categoria || "GENERAL");
            const billingDate = formatExcelDate(row.fecha);

            // 1. Datos para el Registro General (FACTURAS)
            let payloadFactura = {
              client_name: clientName,
              folio: folio,
              category: category,
              amount: amount,
              billing_date: billingDate
            };

            // 2. Lógica para el Reparto (INGRESOS o CXC)
            let targetRepartoEndpoint = "";
            let payloadReparto = {
              client_name: clientName,
              folio: folio,
              category: category,
              amount: amount
            };

            if (["pagada", "pagado", "aprobado", "ingreso"].includes(rawStatus)) {
              // --- VA A INGRESOS ---
              targetRepartoEndpoint = `${BASE_URL}/ingresos`;
              const paymentDate = formatExcelDate(row.fechapag || row.fecha);
              
              payloadFactura.status = "Pagada";
              payloadFactura.payment_date = paymentDate;

              payloadReparto.status = "Ingreso";
              payloadReparto.payment_date = paymentDate;
            } else {
              // --- VA A CXC ---
              targetRepartoEndpoint = `${BASE_URL}/cxc`;
              const dueDate = formatExcelDate(row.fecha || row.fechaven);
              
              // Cálculo de Cartera Vencida
              const invoiceDate = new Date(dueDate);
              const diffDays = Math.ceil(Math.abs(today - invoiceDate) / (1000 * 60 * 60 * 24));
              const finalStatus = diffDays >= 31 ? "Cartera Vencida" : "Pendiente";

              payloadFactura.status = finalStatus;

              payloadReparto.status = finalStatus;
              payloadReparto.due_date = dueDate;
            }

            // Agregamos ambas peticiones al array de promesas
            allRequests.push(axios.post(API_URL, payloadFactura, getAuthHeader()));
            allRequests.push(axios.post(targetRepartoEndpoint, payloadReparto, getAuthHeader()));
          });

          await Promise.all(allRequests);
          alert("¡Carga exitosa! Datos guardados en Facturas y repartidos correctamente.");
          fetchRecords(); 
        } catch (error) {
          console.error("Error en el reparto:", error.response?.data || error.message);
          alert("Error al procesar los datos. Revisa la consola.");
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
      categoria: item.category,
      fecha: item.fecha,
      fecha_pago: item.fecha_pago || "", 
      monto: item.monto,
      estado: item.estado
    });
    setIsModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        client_name: normalizeText(formEntry.cliente),
        folio: formEntry.folio,
        category: normalizeText(formEntry.categoria),
        billing_date: formEntry.fecha,
        amount: formEntry.monto,
        status: formEntry.estado
      };

      if (formEntry.fecha_pago && formEntry.fecha_pago.trim() !== "") {
        payload.payment_date = formEntry.fecha_pago;
      }

      await axios.put(`${API_URL}/${editingId}`, payload, getAuthHeader());
      setIsModalOpen(false);
      fetchRecords();
    } catch (error) {
      alert("Error al actualizar.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Eliminar esta factura?")) {
      try {
        await axios.delete(`${API_URL}/${id}`, getAuthHeader());
        fetchRecords(); 
      } catch (error) {
        alert("No se pudo eliminar.");
      }
    }
  };

  const toggleClient = (cliente) => {
    setExpandedClients((prev) => ({ ...prev, [cliente]: !prev[cliente] }));
  };

  const filteredData = data.filter((group) => {
    const term = searchTerm.toLowerCase();
    return group.cliente.toLowerCase().includes(term) || 
           group.items.some(item => item.folio.toString().toLowerCase().includes(term));
  });

  return (
    <div className="layout-container">
      <SideMenu />
      <div className="main-content">
        <TopBar />
        <main className="content-area">
          <div className="table-container">
            <div className="table-header">
              <h2>Registro de Facturaciones</h2>
              <div className="header-actions">
                <div className="search-box">
                  <FiSearch className="search-icon" />
                  <input type="text" placeholder="Buscar cliente o folio..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                    <th>Fechas (Emisión / Pago)</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th style={{ width: "120px" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length === 0 ? (
                    <tr><td colSpan="7" style={{textAlign: 'center', padding: '20px'}}>No se encontraron registros</td></tr>
                  ) : filteredData.map((group) => (
                    <React.Fragment key={group.cliente}>
                      <tr className="row-client" onClick={() => toggleClient(group.cliente)}>
                        <td>{expandedClients[group.cliente] ? <FiChevronDown /> : <FiChevronRight />}</td>
                        <td colSpan="5">
                          <span className="badge-cliente">{group.cliente}</span>
                          <small style={{ marginLeft: '10px' }}>({group.items.length} facturas)</small>
                        </td>
                        <td></td>
                      </tr>
                      {expandedClients[group.cliente] && group.items.map((item) => (
                        <tr key={item.id} className="row-detail">
                          <td></td>
                          <td className="enlace-name">{item.folio}</td>
                          <td style={{ color: "#666", fontSize: "0.9rem" }}>{item.category}</td>
                          <td>
                            <div title="Fecha Emisión" style={{ fontWeight: "500" }}>{item.fecha || 'Sin fecha'}</div>
                            {item.fecha_pago ? (
                                <div style={{ fontSize: "0.75rem", color: "#2e7d32", borderTop: "1px solid #eee", marginTop: "2px" }}>
                                  Pagado: {item.fecha_pago}
                                </div>
                            ) : (
                                <div style={{ fontSize: "0.75rem", color: "#999" }}>Pago: Pendiente</div>
                            )}
                          </td>
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
                <input type="text" value={formEntry.folio} onChange={(e) => setFormEntry({...formEntry, folio: e.target.value})} />
              </div>
              <div className="form-row" style={{ display: "flex", gap: "15px" }}>
                <div className="form-group" style={{ flex: 1 }}>
                    <label>Fecha Emisión</label>
                    <input type="date" value={formEntry.fecha} onChange={(e) => setFormEntry({...formEntry, fecha: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                    <label>Fecha Pago (Opcional)</label>
                    <input type="date" value={formEntry.fecha_pago} onChange={(e) => setFormEntry({...formEntry, fecha_pago: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Monto</label>
                <input type="number" step="0.01" value={formEntry.monto} onChange={(e) => setFormEntry({...formEntry, monto: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select value={formEntry.estado} onChange={(e) => setFormEntry({...formEntry, estado: e.target.value})}>
                  <option value="Pagada">Pagada</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Cartera Vencida">Cartera Vencida</option>
                  <option value="Cancelado">Cancelado</option>
                  <option value="Borrador">Borrador</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-save">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}