import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend, LineChart, Line 
} from 'recharts';
import { FaFileInvoiceDollar, FaMoneyBillWave, FaHandHoldingUsd, FaExclamationTriangle } from 'react-icons/fa';
import { FiChevronLeft, FiChevronRight, FiMove } from 'react-icons/fi';

import SideMenu from "../menu/SideMenu";
import TopBar from "../menu/TopBar";

const ZOHO_BLUE = '#0062ff';
const ZOHO_RED = '#ff3333';
const ZOHO_GREEN = '#10b981';
const ZOHO_GREY = '#666666';
const ZOHO_GRID = '#e5e7eb';
const PIE_COLORS = ['#0062ff', '#ff3333', '#10b981', '#ff9900', '#9900cc', '#00cccc'];

const fetchDashboardData = async () => {
  const token = localStorage.getItem("token");
  const config = {
    headers: { 
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  };

  const [resFacturas, resCotiz, resCxc, resIngresos] = await Promise.all([
    axios.get("https://kmsolucion.com/KMBD/public/api/facturas", config),
    axios.get("https://kmsolucion.com/KMBD/public/api/cotizaciones", config),
    axios.get("https://kmsolucion.com/KMBD/public/api/cxc", config),
    axios.get("https://kmsolucion.com/KMBD/public/api/ingresos", config)
  ]);

  const facturas = resFacturas.data;
  const cxc = resCxc.data;
  const ingresos = resIngresos.data;

  const totalFacturado = facturas.reduce((acc, item) => acc + parseFloat(item.amount || 0), 0);
  const totalCobrado = ingresos.reduce((acc, item) => acc + parseFloat(item.amount || 0), 0);
  const totalPorCobrar = cxc.reduce((acc, item) => acc + parseFloat(item.amount || 0), 0);
  const totalVencido = cxc.filter(item => String(item.status).toLowerCase().trim() === 'vencido').reduce((acc, item) => acc + parseFloat(item.amount || 0), 0);

  const mesesArr = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  const processDate = (dateStr) => {
    if (!dateStr) return { mes: 'N/A', quincena: 'N/A', semana: 'N/A', timestamp: 0 };
    const d = new Date(dateStr + "T00:00:00");
    const dia = d.getDate();
    const mesIdx = d.getMonth();
    const anio = d.getFullYear();
    return {
      mes: `${mesesArr[mesIdx]} ${anio}`,
      quincena: `${dia <= 15 ? '1Q' : '2Q'} ${mesesArr[mesIdx]} ${anio}`,
      semana: `Sem ${Math.ceil(dia / 7)} ${mesesArr[mesIdx]} ${anio.toString().slice(-2)}`,
      timestamp: d.getTime()
    };
  };

  return {
    kpis: { facturado: totalFacturado, cobrado: totalCobrado, porCobrar: totalPorCobrar, carteraVencida: totalVencido },
    facturasRaw: facturas.map(item => ({ cliente: item.client_name.toUpperCase(), categoria: item.category || 'General', monto: parseFloat(item.amount), ...processDate(item.billing_date) })),
    cobrarRaw: cxc.map(item => ({ cliente: item.client_name.toUpperCase(), categoria: item.category || 'General', monto: parseFloat(item.amount), ...processDate(item.due_date) })),
    ingresosRaw: ingresos.map(item => ({ cliente: item.client_name.toUpperCase(), categoria: item.category || 'General', monto: parseFloat(item.amount), ...processDate(item.payment_date) }))
  };
};

// ... (ZohoGraphic y calcularLineaTendenciaMejorada se mantienen igual)

const calcularLineaTendenciaMejorada = (data, keyY) => {
  if (!data || data.length < 2) return data;
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  data.forEach((item, index) => {
    sumX += index; sumY += item[keyY]; sumXY += index * item[keyY]; sumXX += index * index;
  });
  const pendiente = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const interseccion = (sumY - pendiente * sumX) / n;
  return data.map((item, index) => ({ ...item, tendenciaRojaValue: pendiente * index + interseccion }));
};

const ZohoGraphic = ({ dataset, tipoGrafica, mostrarTendencia, nombreValor, colorPrincipal = ZOHO_BLUE }) => {
  const MAX_ITEMS = 12; 
  const [offset, setOffset] = useState(0);
  useEffect(() => { setOffset(Math.max(0, dataset.length - MAX_ITEMS)); }, [dataset]);
  const fullDataList = mostrarTendencia ? calcularLineaTendenciaMejorada(dataset, 'total') : dataset;
  const visibleData = fullDataList.slice(offset, offset + MAX_ITEMS);
  const canPrev = offset > 0;
  const canNext = offset + MAX_ITEMS < fullDataList.length;

  if (dataset.length === 0) return <div style={styles.noData}>No hay registros para este filtro.</div>;

  const renderContent = () => {
    const commonXAxis = (
      <XAxis dataKey="ejeX" tick={{ fill: ZOHO_GREY, fontSize: 10 }} axisLine={{ stroke: '#ccc' }} tickLine={false} interval={0} angle={-45} textAnchor="end" height={60} />
    );
    switch (tipoGrafica) {
      case 'line':
        return (
          <LineChart data={visibleData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={ZOHO_GRID} />
            {commonXAxis}
            <YAxis tickFormatter={(val) => `$${val.toLocaleString()}`} tick={{ fill: ZOHO_GREY, fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
            <RechartsTooltip />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Line type="monotone" dataKey="total" stroke={colorPrincipal} strokeWidth={3} dot={{ stroke: colorPrincipal, strokeWidth: 2, r: 4, fill: '#fff' }} activeDot={{ r: 6, fill: colorPrincipal, stroke: '#fff' }} name={nombreValor} />
            {mostrarTendencia && <Line type="linear" dataKey="tendenciaRojaValue" stroke={ZOHO_RED} strokeWidth={2} dot={false} activeDot={false} name="Tendencia Lineal" />}
          </LineChart>
        );
      case 'bar':
        return (
          <BarChart data={visibleData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={ZOHO_GRID} />
            {commonXAxis}
            <YAxis tickFormatter={(val) => `$${val.toLocaleString()}`} tick={{ fill: ZOHO_GREY, fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
            <RechartsTooltip />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar dataKey="total" fill={colorPrincipal} radius={[4, 4, 0, 0]} name={nombreValor} barSize={25} />
          </BarChart>
        );
      case 'area':
        return (
          <AreaChart data={visibleData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={ZOHO_GRID} />
            {commonXAxis}
            <YAxis tickFormatter={(val) => `$${val.toLocaleString()}`} tick={{ fill: ZOHO_GREY, fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
            <RechartsTooltip />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Area type="monotone" dataKey="total" stroke={colorPrincipal} strokeWidth={2} fill={colorPrincipal} fillOpacity={0.15} name={nombreValor} />
          </AreaChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie data={visibleData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={2} dataKey="total" nameKey="ejeX" label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
              {visibleData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
            </Pie>
            <RechartsTooltip formatter={(value) => `$${value.toLocaleString()}`} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
          </PieChart>
        );
      default: return null;
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
      {visibleData.length < fullDataList.length && <div onClick={() => offset > 0 && setOffset(offset - 1)} style={{ ...styles.arrowBtn, left: -10, opacity: canPrev ? 1 : 0.2 }}><FiChevronLeft size={25} /></div>}
      <div style={{ flex: 1, height: '100%', padding: '0 10px', minWidth: 0 }}><ResponsiveContainer width="100%" height="100%">{renderContent()}</ResponsiveContainer></div>
      {visibleData.length < fullDataList.length && <div onClick={() => offset + MAX_ITEMS < fullDataList.length && setOffset(offset + 1)} style={{ ...styles.arrowBtn, right: -10, opacity: canNext ? 1 : 0.2 }}><FiChevronRight size={25} /></div>}
    </div>
  );
};

export default function DashboardKMS() {
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboardStats'], queryFn: fetchDashboardData, retry: 1 });

  const [filtros, setFiltros] = useState({
    facturas: { cliente: 'Todos', categoria: 'Todas', agrupar: 'mes', tipo: 'line' },
    ingresos: { cliente: 'Todos', categoria: 'Todas', agrupar: 'mes', tipo: 'line' },
    cartera: { cliente: 'Todos', categoria: 'Todas', agrupar: 'mes', tipo: 'line' }
  });

  const [layoutOrder, setLayoutOrder] = useState(['facturas', 'ingresos', 'cartera']);
  const dragItem = useRef();
  const dragOverItem = useRef();

  const handleFiltroChange = (panel, campo, valor) => {
    setFiltros(prev => ({ ...prev, [panel]: { ...prev[panel], [campo]: valor } }));
  };

  // Listado dinámico de Clientes y Categorías
  const listas = useMemo(() => ({
    clientes: {
      facturas: data ? ['Todos', ...new Set(data.facturasRaw.map(f => f.cliente))] : ['Todos'],
      ingresos: data ? ['Todos', ...new Set(data.ingresosRaw.map(i => i.cliente))] : ['Todos'],
      cartera: data ? ['Todos', ...new Set(data.cobrarRaw.map(c => c.cliente))] : ['Todos']
    },
    categorias: {
      facturas: data ? ['Todas', ...new Set(data.facturasRaw.map(f => f.categoria))] : ['Todas'],
      ingresos: data ? ['Todas', ...new Set(data.ingresosRaw.map(i => i.categoria))] : ['Todas'],
      cartera: data ? ['Todas', ...new Set(data.cobrarRaw.map(c => c.categoria))] : ['Todas']
    }
  }), [data]);

  const procesarGrafica = (rawKey, panelKey) => {
    if (!data) return [];
    const config = filtros[panelKey];
    let filtered = data[rawKey];
    
    if (config.cliente !== 'Todos') filtered = filtered.filter(item => item.cliente === config.cliente);
    if (config.categoria !== 'Todas') filtered = filtered.filter(item => item.categoria === config.categoria);

    const groupedMap = filtered.reduce((acc, curr) => {
      const key = curr[config.agrupar === 'categoria' ? 'categoria' : config.agrupar];
      if (!acc[key]) acc[key] = { label: key, total: 0, sortKey: curr.timestamp };
      acc[key].total += curr.monto;
      return acc;
    }, {});

    return Object.values(groupedMap).sort((a, b) => a.sortKey - b.sortKey).map(item => ({ ejeX: item.label, total: item.total }));
  };

  const dragStart = (e, position) => { dragItem.current = position; e.target.style.opacity = '0.5'; };
  const dragEnter = (e, position) => { dragOverItem.current = position; };
  const drop = (e) => {
    e.target.style.opacity = '1';
    const copyListItems = [...layoutOrder];
    const dragItemContent = copyListItems[dragItem.current];
    copyListItems.splice(dragItem.current, 1);
    copyListItems.splice(dragOverItem.current, 0, dragItemContent);
    dragItem.current = null; dragOverItem.current = null;
    setLayoutOrder(copyListItems);
  };

  if (isLoading) return <div className="layout-container"><SideMenu /><div className="main-content"><TopBar /><div style={styles.center}><h3>Cargando métricas de PERMIL...</h3></div></div></div>;
  if (error) return <div className="layout-container"><SideMenu /><div className="main-content"><TopBar /><div style={styles.center}><h3>Sesión expirada o error de conexión.</h3></div></div></div>;

  const renderPanel = (panel) => {
    const titulos = { facturas: 'Facturación Real', ingresos: 'Ingresos Cobrados', cartera: 'Cuentas por Cobrar' };
    const rawKeys = { facturas: 'facturasRaw', ingresos: 'ingresosRaw', cartera: 'cobrarRaw' };
    const colores = { facturas: ZOHO_BLUE, ingresos: ZOHO_GREEN, cartera: '#f59e0b' };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={styles.cardHeaderControls}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiMove size={18} color="#9ca3af" style={{ cursor: 'grab' }} />
            <h3 style={styles.panelTitle}>{titulos[panel]}</h3>
          </div>
          <div style={styles.controlsRow}>
            {/* Filtro Cliente */}
            <select style={styles.select} value={filtros[panel].cliente} onChange={(e) => handleFiltroChange(panel, 'cliente', e.target.value)}>
              {listas.clientes[panel].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {/* Filtro Categoría */}
            <select style={styles.select} value={filtros[panel].categoria} onChange={(e) => handleFiltroChange(panel, 'categoria', e.target.value)}>
              {listas.categorias[panel].map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            {/* Agrupar */}
            <select style={styles.select} value={filtros[panel].agrupar} onChange={(e) => handleFiltroChange(panel, 'agrupar', e.target.value)}>
              <option value="mes">Por Mes</option>
              <option value="quincena">Por Quincena</option>
              <option value="semana">Por Semana</option>
              <option value="cliente">Por Cliente</option>
              <option value="categoria">Por Categoría</option>
            </select>
            <select style={styles.select} value={filtros[panel].tipo} onChange={(e) => handleFiltroChange(panel, 'tipo', e.target.value)}>
              <option value="line">Línea</option>
              <option value="bar">Barras</option>
              <option value="area">Área</option>
              <option value="pie">Circular</option>
            </select>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: '300px' }}>
          <ZohoGraphic dataset={procesarGrafica(rawKeys[panel], panel)} tipoGrafica={filtros[panel].tipo} colorPrincipal={colores[panel]} mostrarTendencia={filtros[panel].tipo === 'line' && filtros[panel].agrupar !== 'cliente'} nombreValor={titulos[panel]} />
        </div>
      </div>
    );
  };

  return (
    <div className="layout-container">
      <SideMenu />
      <div className="main-content">
        <TopBar />
        <main className="content-area" style={{ backgroundColor: '#f4f5f7', padding: '24px' }}>
          <div style={styles.header}>
            <h2 style={{ margin: 0, color: '#111827', fontSize: '1.5rem' }}>Análisis Integral KM Solución</h2>
            <p style={{ color: '#6b7280', margin: '5px 0 0 0' }}>Estadísticas reales protegidas por Sanctum</p>
          </div>
          <div style={styles.kpiGrid}>
            <KpiCard title="Facturación" value={`$${data.kpis.facturado.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} icon={<FaFileInvoiceDollar />} color={ZOHO_BLUE} />
            <KpiCard title="Ingresos" value={`$${data.kpis.cobrado.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} icon={<FaHandHoldingUsd />} color={ZOHO_GREEN} />
            <KpiCard title="CxC" value={`$${data.kpis.porCobrar.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} icon={<FaMoneyBillWave />} color="#f59e0b" />
            <KpiCard title="Cartera Vencida" value={`$${data.kpis.carteraVencida.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} icon={<FaExclamationTriangle />} color={ZOHO_RED} />
          </div>
          <div style={styles.chartsGridContainer}>
            {layoutOrder.map((panel, index) => (
              <div key={panel} draggable onDragStart={(e)=>dragStart(e,index)} onDragEnter={(e)=>dragEnter(e,index)} onDragEnd={drop} onDragOver={(e)=>e.preventDefault()} style={styles.card}>
                {renderPanel(panel)}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

const KpiCard = ({ title, value, icon, color }) => (
  <div style={styles.cardKpi}>
    <div><p style={styles.kpiTitle}>{title}</p><h3 style={styles.kpiValue}>{value}</h3></div>
    <div style={{ ...styles.kpiIcon, color, backgroundColor: `${color}15` }}>{icon}</div>
  </div>
);

const styles = {
  header: { marginBottom: '24px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' },
  chartsGridContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' },
  card: { background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'opacity 0.2s ease' },
  cardHeaderControls: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '10px' },
  controlsRow: { display: 'flex', gap: '10px' },
  panelTitle: { margin: 0, color: '#111827', fontSize: '1.1rem' },
  cardKpi: { background: 'white', padding: '20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e5e7eb' },
  kpiTitle: { margin: 0, color: '#6b7280', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' },
  kpiValue: { margin: '8px 0 0 0', color: '#111827', fontSize: '1.4rem', fontWeight: '700' },
  kpiIcon: { padding: '16px', borderRadius: '8px', fontSize: '1.6rem', display: 'flex' },
  select: { padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', backgroundColor: '#fff', cursor: 'pointer' },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' },
  noData: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#999' },
  arrowBtn: { position: 'absolute', zIndex: 10, cursor: 'pointer', color: '#bbb' }
};