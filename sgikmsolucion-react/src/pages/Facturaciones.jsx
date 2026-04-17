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

const BASE_URL = "https://kmsolucion.com/KMBD/public/api/";
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
    if (!dateStr) return "";
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
      const grouped = response.data.reduce((acc, curr) => {
        const clientName = normalizeText(curr.client_name);
        if (!acc[clientName]) acc[clientName] = { cliente: clientName, items: [] };
        
        acc[clientName].items.push({
          id: curr.id,
          folio: curr.folio,
          category: normalizeText(curr.category),
          fecha: cleanDate(curr.billing_date),
          fecha_pago: cleanDate(curr.payment_date), // Viene de Laravel como null si no existe
          monto: parseFloat(curr.amount || 0),
          estado: curr.status
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

          const uploadPromises = validRows.flatMap(row => {
            const cleanMonto = row.monto ? String(row.monto).replace(/[^0-9.-]+/g, "") : 0;
            const formattedDate = formatExcelDate(row.fecha);
            const formattedPaymentDate = row.fechapago ? formatExcelDate(row.fechapago) : null;
            
            const cleanClient = normalizeText(row.cliente || "SIN CLIENTE");
            const cleanCategory = normalizeText(row.categoria || row.category || "GENERAL");

            let rawStatus = (row.estado || "").trim();
            const lowerStatus = rawStatus.toLowerCase();
            let finalStatus = rawStatus || "Pendiente";

            if (["enviada", "enviado"].includes(lowerStatus)) finalStatus = "Pendiente";
            else if (["pagada", "pagado", "aprobado"].includes(lowerStatus)) finalStatus = "Pagada";
            else if (rawStatus === "") finalStatus = "Borrador";

            const invoiceDate = new Date(formattedDate);
            const diffDays = Math.ceil(Math.abs(today - invoiceDate) / (1000 * 60 * 60 * 24));
            if (finalStatus === "Pendiente" && diffDays >= 31) finalStatus = "Cartera Vencida";

            const requests = [];

            // 1. Payload Factura (DINÁMICO)
            const factPayload = {
              client_name: cleanClient,
              folio: (row.folio || "S/N").trim(),
              category: cleanCategory,
              billing_date: formattedDate,
              amount: parseFloat(cleanMonto),
              status: finalStatus
            };
            if (formattedPaymentDate) factPayload.payment_date = formattedPaymentDate;

            requests.push(axios.post(API_URL, factPayload, getAuthHeader()));

            // 2. Cobros / CxC
            if (finalStatus === "Pagada") {
              const ingPayload = {
                client_name: cleanClient,
                folio: (row.folio || "S/N").trim(),
                category: cleanCategory,
                amount: parseFloat(cleanMonto),
                status: "Ingreso"
              };
              // Usar fecha de pago si existe, si no, la de factura
              ingPayload.payment_date = formattedPaymentDate || formattedDate;
              requests.push(axios.post(`${BASE_URL}/ingresos`, ingPayload, getAuthHeader()));
            } else {
              requests.push(axios.post(`${BASE_URL}/cxc`, {
                client_name: cleanClient,
                folio: (row.folio || "S/N").trim(),
                category: cleanCategory,
                due_date: formattedDate,
                amount: parseFloat(cleanMonto),
                status: finalStatus
              }, getAuthHeader()));
            }
            return requests;
          });

          await Promise.all(uploadPromises);
          alert("¡Importación exitosa!");
          fetchRecords(); 
        } catch (error) {
          console.error("Error:", error);
          alert("Error al procesar el archivo.");
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
      fecha_pago: item.fecha_pago || "", 
      monto: item.monto,
      estado: item.estado
    });
    setIsModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      // Objeto base sin fecha_pago
      const payload = {
        client_name: normalizeText(formEntry.cliente),
        folio: formEntry.folio,
        category: normalizeText(formEntry.categoria),
        billing_date: formEntry.fecha,
        amount: formEntry.monto,
        status: formEntry.estado
      };

      // Si hay fecha de pago escrita, se agrega al envío
      if (formEntry.fecha_pago && formEntry.fecha_pago !== "") {
        payload.payment_date = formEntry.fecha_pago;
      }

      await axios.put(`${API_URL}/${editingId}`, payload, getAuthHeader());
      setIsModalOpen(false);
      fetchRecords();
    } catch (error) {
      console.error(error);
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
    const matchesCliente = group.cliente.toLowerCase().includes(term);
    const matchesItems = group.items.some(item => 
      (item.folio && item.folio.toString().toLowerCase().includes(term)) ||
      (item.category && item.category.toLowerCase().includes(term))
    );
    return matchesCliente || matchesItems;
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
                    <th>Fechas (Emisión / Pago)</th>
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
                            <div title="Fecha Emisión" style={{ fontWeight: "500" }}>{item.fecha}</div>
                            {item.fecha_pago ? (
                                <div title="Fecha Pago" style={{ fontSize: "0.75rem", color: "#2e7d32", borderTop: "1px solid #eee", marginTop: "2px" }}>
                                  Pagado: {item.fecha_pago}
                                </div>
                            ) : (
                                <div style={{ fontSize: "0.75rem", color: "#d32f2f" }}>Pendiente</div>
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
                <input type="text" name="folio" value={formEntry.folio} onChange={(e) => setFormEntry({...formEntry, folio: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Categoría</label>
                <input type="text" name="categoria" value={formEntry.categoria} onChange={(e) => setFormEntry({...formEntry, categoria: e.target.value})} />
              </div>
              <div className="form-row" style={{ display: "flex", gap: "15px" }}>
                <div className="form-group" style={{ flex: 1 }}>
                    <label>Fecha de Factura</label>
                    <input type="date" name="fecha" value={formEntry.fecha} onChange={(e) => setFormEntry({...formEntry, fecha: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                    <label>Fecha de Pago (Opcional)</label>
                    <input type="date" name="fecha_pago" value={formEntry.fecha_pago} onChange={(e) => setFormEntry({...formEntry, fecha_pago: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Monto</label>
                <input type="number" step="0.01" name="monto" value={formEntry.monto} onChange={(e) => setFormEntry({...formEntry, monto: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select name="estado" value={formEntry.estado} onChange={(e) => setFormEntry({...formEntry, estado: e.target.value})}>
                  <option value="Pagada">Pagada</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Cartera Vencida">Cartera Vencida</option>
                  <option value="Cancelado">Cancelado</option>
                  <option value="Borrador">Borrador</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-save">Actualizar Datos</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}