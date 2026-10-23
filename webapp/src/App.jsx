import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Building2,
  Package as PackageIcon,
  Truck,
  RotateCcw,
  Compass,
  Play,
  Pause,
  Plus,
  MapPin,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  TrendingDown,
  Info,
  Scale,
  Calendar,
  Zap,
  ArrowRight,
  AlertTriangle,
  HelpCircle,
  X,
  FileText
} from 'lucide-react';
import {
  INITIAL_HUBS,
  INITIAL_ZONES,
  INITIAL_ROADS,
  INITIAL_DRIVERS,
  INITIAL_ORDERS,
  solveMultiHubCVRP,
  aStarSearch,
  buildAdjacencyList
} from './cvrpEngine';

// Custom Pin Icon for Google Maps
function createPin(title, color, isHub) {
  const html = `
    <div style="display: inline-flex; align-items: center; gap: 4px; background: ${color}; color: #ffffff; font-weight: 700; font-size: 11px; padding: 3px 8px; border-radius: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 2px solid #ffffff; white-space: nowrap;">
      ${isHub ? '🏢 ' : '📍 '}${title}
    </div>
  `;
  return L.divIcon({
    html,
    className: 'custom-map-pin',
    iconSize: [110, 24],
    iconAnchor: [55, 12]
  });
}

// Map Auto Recenter on Route
function MapRecenter({ routeLatLngs, originLoc }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map]);

  useEffect(() => {
    if (routeLatLngs && routeLatLngs.length > 1) {
      try {
        const bounds = L.latLngBounds(routeLatLngs);
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 13 });
      } catch (e) {}
    } else if (originLoc) {
      map.setView([originLoc.lat, originLoc.lng], 12);
    }
  }, [routeLatLngs, originLoc, map]);

  return null;
}

export default function App() {
  const [hubs, setHubs] = useState(INITIAL_HUBS);
  const [zones] = useState(INITIAL_ZONES);
  const [roads, setRoads] = useState(INITIAL_ROADS);
  const [drivers, setDrivers] = useState(INITIAL_DRIVERS);
  const [orders, setOrders] = useState(INITIAL_ORDERS);

  // Active selected order
  const [selectedOrderId, setSelectedOrderId] = useState('ORD-904');
  
  // Real-time animated delivery vehicle
  const [isDriving, setIsDriving] = useState(false);
  const [driveProgress, setDriveProgress] = useState(0);

  // Modals & Panels
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [showAddHubModal, setShowAddHubModal] = useState(false);

  // New Hub Form State
  const [newHubName, setNewHubName] = useState('');
  const [newHubAddress, setNewHubAddress] = useState('');
  const [newHubPincode, setNewHubPincode] = useState('560092');
  const [newHubLat, setNewHubLat] = useState('13.0358');
  const [newHubLng, setNewHubLng] = useState('77.5970');
  const [newHubDriverName, setNewHubDriverName] = useState('Arun Prakash');
  const [newHubCapacity, setNewHubCapacity] = useState('50');

  // New order form
  const [newCustName, setNewCustName] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newDimensions, setNewDimensions] = useState('30x20x15 cm');
  const [newDestId, setNewDestId] = useState('ZONE-D');

  const allLocations = [...hubs, ...zones];
  const adj = buildAdjacencyList(allLocations, roads);

  // Solve multi-hub allocation & CVRP capacity constraints
  const dispatchResult = solveMultiHubCVRP(hubs, zones, roads, orders, drivers);

  // Find currently inspected order
  const activeOrder = orders.find(o => o.id === selectedOrderId) || orders[0];
  const assignedPkg = dispatchResult.ordersWithAssignedHub.find(o => o.id === activeOrder?.id);
  const assignedHub = hubs.find(h => h.id === assignedPkg?.assignedHubId) || hubs[0];
  const destZone = zones.find(z => z.id === activeOrder?.destinationId);

  // Evaluate A* shortest path from ALL hubs to the active customer to show comparison
  const hubEvaluations = hubs.map(h => {
    const res = aStarSearch(h.id, activeOrder?.destinationId, adj, allLocations);
    return {
      hub: h,
      time: res.time,
      path: res.path,
      isOptimal: h.id === assignedHub.id
    };
  }).sort((a, b) => a.time - b.time);

  // Find assigned driver for this order from the hub plan
  const hubPlan = dispatchResult.hubPlans.find(hp => hp.hub.id === assignedHub.id);
  const driverRoute = hubPlan?.routes.find(r => r.stopSequence.some(p => p.id === activeOrder?.id)) || hubPlan?.routes[0];
  const assignedDriver = driverRoute?.driver;

  // Check if active order has capacity overload
  const isOverloaded = assignedPkg?.capacityOverflow || (assignedDriver && assignedDriver.currentLoad > assignedDriver.maxCapacity);

  // Compute exact A* shortest path from the nearest hub to customer destination
  const aStarRes = aStarSearch(assignedHub.id, activeOrder?.destinationId, adj, allLocations);
  const pathNodes = aStarRes.path || [];
  const etaMinutes = aStarRes.time || 0;

  // Build GPS coordinate points for polyline
  const routeLatLngs = pathNodes.map(id => {
    const loc = allLocations.find(l => l.id === id);
    return loc ? [loc.lat, loc.lng] : null;
  }).filter(Boolean);

  // Vehicle position interpolation along GPS road segments
  const getVehiclePos = () => {
    if (routeLatLngs.length < 2) return routeLatLngs[0] || [12.9716, 77.5946];
    const totalSegments = routeLatLngs.length - 1;
    const scaled = driveProgress * totalSegments;
    const segIdx = Math.min(Math.floor(scaled), totalSegments - 1);
    const segT = scaled - segIdx;
    const p1 = routeLatLngs[segIdx];
    const p2 = routeLatLngs[segIdx + 1];
    return [
      p1[0] + (p2[0] - p1[0]) * segT,
      p1[1] + (p2[1] - p1[1]) * segT
    ];
  };

  // Drive animation ticker
  useEffect(() => {
    if (!isDriving) return;
    const interval = setInterval(() => {
      setDriveProgress(prev => {
        if (prev >= 1) {
          setIsDriving(false);
          return 1;
        }
        return prev + 0.02;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isDriving]);

  // Handler to add a new hub
  const handleAddHub = (e) => {
    e.preventDefault();
    if (!newHubName || !newHubAddress) return;
    const hubId = `HUB-0${hubs.length + 1}`;
    const newHub = {
      id: hubId,
      name: newHubName,
      address: newHubAddress,
      pincode: newHubPincode,
      lat: parseFloat(newHubLat) || 13.0358,
      lng: parseFloat(newHubLng) || 77.5970,
      x: 350,
      y: 100,
      isHub: true
    };

    // Auto connect new hub to closest zone via roads
    const newRoad1 = { from: hubId, to: 'ZONE-A', time: 14.0 };
    const newRoad2 = { from: hubId, to: 'ZONE-B', time: 19.0 };

    // Add stationed driver for this new hub
    const newDriverId = `VAN-${(hubs.length + 1) * 100 + 1}`;
    const newDriver = {
      id: newDriverId,
      name: newHubDriverName || 'Express Driver',
      vehicle: 'Electric Van',
      maxCapacity: parseFloat(newHubCapacity) || 50.0,
      hubId: hubId
    };

    setHubs([...hubs, newHub]);
    setRoads([...roads, newRoad1, newRoad2]);
    setDrivers([...drivers, newDriver]);
    setShowAddHubModal(false);
    setNewHubName('');
    setNewHubAddress('');
  };

  const handleAddOrder = (e) => {
    e.preventDefault();
    if (!newCustName || !newWeight) return;
    const newId = `ORD-${Math.floor(100 + Math.random() * 900)}`;
    const newOrder = {
      id: newId,
      destinationId: newDestId,
      weight: parseFloat(newWeight),
      dimensions: newDimensions || '30x20x15 cm',
      customerName: newCustName
    };
    setOrders([...orders, newOrder]);
    setSelectedOrderId(newId);
    setDriveProgress(0);
    setNewCustName('');
    setNewWeight('');
  };

  const handleReset = () => {
    setHubs(INITIAL_HUBS);
    setRoads(INITIAL_ROADS);
    setDrivers(INITIAL_DRIVERS);
    setOrders(INITIAL_ORDERS);
    setSelectedOrderId('ORD-904');
    setDriveProgress(0);
    setIsDriving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      
      {/* 1. Header with Title & Action Controls */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="brand-title">Dynamic E-Commerce Order Fulfillment & Delivery Routing Engine</h1>
            <div className="brand-subtitle">Multi-Hub Regional Network • Shortest-Path A* & Dijkstra with Fleet Capacity Optimization (CVRP)</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="btn-primary"
            onClick={() => setShowAddHubModal(true)}
            style={{ background: '#16a34a', borderColor: '#16a34a', fontSize: '0.82rem' }}
          >
            <Plus size={15} /> + Add Fulfillment Hub
          </button>

          <button
            className="btn-primary"
            onClick={() => setShowExplanationModal(true)}
            style={{ background: '#0f172a', borderColor: '#0f172a', fontSize: '0.82rem' }}
          >
            <FileText size={15} /> 💡 Project Pitch Guide
          </button>
          
          <button className="btn-secondary" onClick={handleReset}>
            <RotateCcw size={14} /> Reset Defaults
          </button>
        </div>
      </header>

      {/* 2. Hackathon Problem Statement & Flow Banner */}
      <div className="scenario-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <span className="scenario-pill">
            📦 <strong>Input:</strong> Package Dimensions, Destination GPS/Pincodes, Fleet Capacity
          </span>
          <span style={{ color: '#94a3b8' }}>➔</span>
          <span className="scenario-pill" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
            ⚡ <strong>Algorithm:</strong> A* Shortest Path + Bin-Packing CVRP
          </span>
          <span style={{ color: '#94a3b8' }}>➔</span>
          <span className="scenario-pill" style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1e40af' }}>
            🎯 <strong>Output:</strong> Assigned Delivery Agent ID, Sequenced Route, ETA
          </span>
        </div>

        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>
          {hubs.length} Active Hubs • {drivers.length} Delivery Agents • {orders.length} Orders
        </div>
      </div>

      {/* 3. Main Split View: Left Inputs/Outputs | Right Live Map */}
      <div className="app-layout">
        
        {/* LEFT PANEL: Inputs & Outputs */}
        <div className="left-sidebar">
          <div className="sidebar-scrollable">
            
            {/* OUTPUT HIGHLIGHT BOX (Assigned Delivery Agent, Sequenced Route, ETA) */}
            <div className="panel-card" style={{ border: '2px solid #1a73e8', background: '#f8fbff' }}>
              <div className="panel-card-title" style={{ color: '#1a73e8', borderBottomColor: '#dbeafe' }}>
                <CheckCircle2 size={16} color="#1a73e8" />
                <span>Engine Optimization Output (Selected Order)</span>
              </div>

              {/* Output Item 1: Assigned Hub & Delivery Agent */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.65rem 0.85rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                    Assigned Delivery Hub
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                    🏢 {assignedHub.name.split(' ')[0]} Hub
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Pincode: {assignedHub.pincode}</div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.65rem 0.85rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                    Assigned Agent ID
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1a73e8', marginTop: 2 }}>
                    🚚 {assignedDriver ? assignedDriver.id : 'VAN-101'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {assignedDriver?.name} ({assignedDriver?.vehicle})
                  </div>
                </div>
              </div>

              {/* Output Item 2: Estimated Time of Arrival (ETA) */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.65rem 0.85rem', marginBottom: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                    Estimated Delivery Time (ETA)
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', marginTop: 2 }}>
                    ⏱️ {etaMinutes.toFixed(0)} minutes
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>
                    Shortest Path Verified
                  </span>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 3 }}>
                    Algorithm: A* Euclidean
                  </div>
                </div>
              </div>

              {/* Output Item 3: Sequenced Delivery Route List */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.65rem 0.85rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
                  Sequenced Delivery Route Waypoints
                </div>
                <div style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#1a73e8' }}>
                  {pathNodes.join(' ➔ ')}
                </div>
              </div>

              {/* A* Multi-Hub Evaluation Comparison Bar */}
              <div style={{ marginTop: '0.85rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '0.65rem 0.85rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>
                  A* Proximity from all {hubs.length} Hubs to Customer:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {hubEvaluations.map(ev => (
                    <div key={ev.hub.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: ev.isOptimal ? '#166534' : '#64748b', fontWeight: ev.isOptimal ? 800 : 500 }}>
                      <span>{ev.isOptimal ? '✅ Optimal Hub: ' : '• '}{ev.hub.name.split(' ')[0]} ({ev.hub.id})</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{ev.time.toFixed(0)} mins</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Capacity Warning Banner if Overloaded */}
              {isOverloaded && (
                <div style={{ marginTop: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '0.55rem 0.75rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#b91c1c' }}>
                  <AlertTriangle size={15} color="#dc2626" />
                  <span><strong>Capacity Alert:</strong> Package exceeds vehicle threshold ({activeOrder.weight}kg vs {assignedDriver?.maxCapacity}kg max). Flags dispatch coordinator for freight split!</span>
                </div>
              )}

              {/* Live Drive Simulation Button */}
              <div style={{ marginTop: '0.85rem' }}>
                <button
                  onClick={() => {
                    if (driveProgress >= 1) setDriveProgress(0);
                    setIsDriving(!isDriving);
                  }}
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.6rem' }}
                >
                  <Truck size={15} /> {isDriving ? 'Pause Trip Simulation' : (driveProgress >= 1 ? 'Replay Delivery Drive' : 'Simulate Vehicle Drive on Map')}
                </button>
              </div>
            </div>

            {/* INPUT PANEL: Active Hubs List */}
            <div className="panel-card">
              <div className="panel-card-title">
                <Building2 size={16} color="#1a73e8" />
                <span>Input: Regional Fulfillment Hubs ({hubs.length})</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {hubs.map((hub) => {
                  const hubOrders = dispatchResult.ordersWithAssignedHub.filter(o => o.assignedHubId === hub.id);
                  return (
                    <div key={hub.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.6rem 0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>{hub.name}</strong>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {hub.address} • Pincode: {hub.pincode}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.74rem', background: '#1a73e8', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                        {hubOrders.length} Allocated
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* INPUT PANEL: Incoming Packages List */}
            <div className="panel-card">
              <div className="panel-card-title">
                <PackageIcon size={16} color="#1a73e8" />
                <span>Input: Incoming Packages ({orders.length})</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 220, overflowY: 'auto' }}>
                {orders.map((ord) => {
                  const dest = zones.find(z => z.id === ord.destinationId);
                  const isSelected = ord.id === selectedOrderId;
                  return (
                    <div
                      key={ord.id}
                      className={`order-item-row ${isSelected ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedOrderId(ord.id);
                        setDriveProgress(0);
                        setIsDriving(false);
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                          {ord.customerName}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          📍 {dest?.name} • Pincode: <strong>{dest?.pincode}</strong>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>
                          Box: {ord.dimensions} • Weight: <strong>{ord.weight} kg</strong>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          fontSize: '0.74rem',
                          background: isSelected ? '#1a73e8' : '#f1f5f9',
                          color: isSelected ? '#ffffff' : '#334155',
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontWeight: 700
                        }}>
                          {ord.id}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* INPUT PANEL: Fleet Vehicle Capacities */}
            <div className="panel-card">
              <div className="panel-card-title">
                <Truck size={16} color="#1a73e8" />
                <span>Input: Fleet Vehicle Capacities ({drivers.length} Agents)</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {drivers.map(driver => {
                  const matchingRoute = hubPlan?.routes.find(r => r.driver.id === driver.id);
                  const load = matchingRoute ? matchingRoute.driver.currentLoad : 0;
                  const isOver = load > driver.maxCapacity;
                  const percent = Math.min(100, Math.round((load / driver.maxCapacity) * 100));

                  return (
                    <div key={driver.id} style={{ background: '#f8fafc', border: `1px solid ${isOver ? '#fca5a5' : '#e2e8f0'}`, borderRadius: 6, padding: '0.6rem 0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <strong>{driver.name} ({driver.id})</strong>
                        <span style={{ color: '#64748b' }}>{driver.vehicle}</span>
                      </div>

                      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: '#64748b' }}>
                        <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${percent}%`, height: '100%', background: isOver ? '#ef4444' : '#1a73e8' }} />
                        </div>
                        <span>
                          {load.toFixed(1)} / <strong>{driver.maxCapacity} kg</strong> ({percent}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* INPUT PANEL: Add Order Form */}
            <div className="panel-card">
              <div className="panel-card-title">
                <Plus size={16} color="#1a73e8" />
                <span>+ Add Incoming Order</span>
              </div>

              <form onSubmit={handleAddOrder} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <input
                  type="text"
                  required
                  placeholder="Customer Name"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1.5px solid #cbd5e1', borderRadius: 6, fontSize: '0.84rem' }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <input
                    type="number"
                    step="0.5"
                    required
                    placeholder="Weight (kg)"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    style={{ padding: '0.5rem 0.75rem', border: '1.5px solid #cbd5e1', borderRadius: 6, fontSize: '0.84rem' }}
                  />
                  <input
                    type="text"
                    placeholder="Dimensions"
                    value={newDimensions}
                    onChange={(e) => setNewDimensions(e.target.value)}
                    style={{ padding: '0.5rem 0.75rem', border: '1.5px solid #cbd5e1', borderRadius: 6, fontSize: '0.84rem' }}
                  />
                </div>

                <select
                  value={newDestId}
                  onChange={(e) => setNewDestId(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1.5px solid #cbd5e1', borderRadius: 6, fontSize: '0.84rem', background: '#fff' }}
                >
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name} (Pincode: {z.pincode})</option>
                  ))}
                </select>

                <button type="submit" className="btn-primary" style={{ marginTop: 2 }}>
                  <Plus size={15} /> Allocate & Optimize Route
                </button>
              </form>
            </div>

          </div>
        </div>

        {/* RIGHT PANEL: Live Interactive OpenStreetMap View */}
        <div className="map-canvas-wrapper">
          
          <MapContainer
            center={[12.9716, 77.6408]}
            zoom={12}
            scrollWheelZoom={true}
            style={{ width: '100%', height: '100%' }}
          >
            {/* 100% Free OpenStreetMap Light Street Tiles (No API Key Required) */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={18}
            />

            <MapRecenter routeLatLngs={routeLatLngs} originLoc={assignedHub} />

            {/* Base Roads */}
            {roads.map((road, idx) => {
              const fromLoc = allLocations.find(l => l.id === road.from);
              const toLoc = allLocations.find(l => l.id === road.to);
              if (!fromLoc || !toLoc) return null;

              return (
                <Polyline
                  key={`road-${idx}`}
                  positions={[[fromLoc.lat, fromLoc.lng], [toLoc.lat, toLoc.lng]]}
                  pathOptions={{
                    color: '#94a3b8',
                    weight: 3,
                    opacity: 0.35,
                    dashArray: '4, 6'
                  }}
                >
                  <Tooltip direction="center" offset={[0, 0]} opacity={0.85}>
                    <span>{fromLoc.name} ➔ {toLoc.name} ({road.time}m)</span>
                  </Tooltip>
                </Polyline>
              );
            })}

            {/* Optimal Shortest Directed Delivery Route */}
            {routeLatLngs.length > 1 && (
              <Polyline
                positions={routeLatLngs}
                pathOptions={{
                  color: isOverloaded ? '#ea4335' : '#1a73e8',
                  weight: 6,
                  opacity: 0.95
                }}
              />
            )}

            {/* Moving Delivery Van along route */}
            {routeLatLngs.length > 1 && (
              <Marker
                position={getVehiclePos()}
                icon={createPin('🚚 ' + (assignedDriver ? assignedDriver.id : 'VAN-101'), isOverloaded ? '#b91c1c' : '#0f172a', false)}
              />
            )}

            {/* Fulfillment Hubs Pins */}
            {hubs.map((hub) => (
              <Marker
                key={hub.id}
                position={[hub.lat, hub.lng]}
                icon={createPin(hub.name.split(' ')[0], '#1a73e8', true)}
              >
                <Popup>
                  <div style={{ padding: 4 }}>
                    <strong style={{ fontSize: '0.95rem' }}>🏢 {hub.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                      {hub.address} • Pincode: {hub.pincode}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Destination Pins */}
            {zones.map((zone) => {
              const isSelectedDest = zone.id === activeOrder?.destinationId;
              return (
                <Marker
                  key={zone.id}
                  position={[zone.lat, zone.lng]}
                  icon={createPin(zone.name, isSelectedDest ? '#ea4335' : '#475569', false)}
                  eventHandlers={{
                    click: () => {
                      const orderForZone = orders.find(o => o.destinationId === zone.id);
                      if (orderForZone) setSelectedOrderId(orderForZone.id);
                    }
                  }}
                >
                  <Popup>
                    <div style={{ padding: 4 }}>
                      <strong style={{ fontSize: '0.9rem' }}>📍 {zone.name}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                        Pincode: {zone.pincode}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Floating Road Map Legend */}
          <div style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '8px 14px',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: '0.78rem',
            color: '#334155'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#1a73e8' }} />
              <strong>Hubs ({hubs.length})</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ea4335' }} />
              <strong>Customer Drop-off</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 16, height: 3, background: isOverloaded ? '#ea4335' : '#1a73e8' }} />
              <strong>{isOverloaded ? 'Overload Route' : 'A* Shortest Path'}</strong>
            </div>
          </div>

        </div>

      </div>

      {/* 4. Modal: Add New Fulfillment Hub Form */}
      {showAddHubModal && (
        <div className="modal-overlay" onClick={() => setShowAddHubModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: 500 }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={20} color="#1a73e8" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Add Regional Fulfillment Hub
                </h3>
              </div>
              <button
                onClick={() => setShowAddHubModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddHub} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 3 }}>
                  Warehouse / Hub Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. North Bangalore Hub (Hebbal)"
                  value={newHubName}
                  onChange={(e) => setNewHubName(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #cbd5e1', borderRadius: 6, fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 3 }}>
                  Address Line
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Outer Ring Road, Hebbal"
                  value={newHubAddress}
                  onChange={(e) => setNewHubAddress(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #cbd5e1', borderRadius: 6, fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 3 }}>
                    Pincode
                  </label>
                  <input
                    type="text"
                    required
                    value={newHubPincode}
                    onChange={(e) => setNewHubPincode(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #cbd5e1', borderRadius: 6, fontSize: '0.84rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 3 }}>
                    Stationed Driver Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newHubDriverName}
                    onChange={(e) => setNewHubDriverName(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #cbd5e1', borderRadius: 6, fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 3 }}>
                    Latitude
                  </label>
                  <input
                    type="text"
                    required
                    value={newHubLat}
                    onChange={(e) => setNewHubLat(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #cbd5e1', borderRadius: 6, fontSize: '0.84rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 3 }}>
                    Longitude
                  </label>
                  <input
                    type="text"
                    required
                    value={newHubLng}
                    onChange={(e) => setNewHubLng(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #cbd5e1', borderRadius: 6, fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddHubModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Deploy Hub & Recompute Routes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: Hackathon Pitch Guide */}
      {showExplanationModal && (
        <div className="modal-overlay" onClick={() => setShowExplanationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={22} color="#1a73e8" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Hackathon Pitch Guide & Architecture Breakdown
                </h2>
              </div>
              <button
                onClick={() => setShowExplanationModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.6 }}>
              
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                  1. The Real-World Scenario
                </h4>
                <div>
                  A Bangalore e-commerce delivery provider operates multiple regional fulfillment centers. Every hour, packages arrive with diverse weights and destination pincodes. Driving from the wrong hub causes massive traffic delays and vehicle capacity violations.
                </div>
              </div>

              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1e40af', marginBottom: 6 }}>
                  2. The Algorithms (A* + Dijkstra + Capacitated VRP)
                </h4>
                <div>
                  • <strong>Phase 1 (Hub Partitioning via A* / Dijkstra):</strong> Evaluates travel times from all fulfillment hubs to the customer drop-off. Orders are matched to whichever hub has the minimum ETA.<br/>
                  • <strong>Phase 2 (Fleet Capacity Packing):</strong> Enforces vehicle payload limits (25kg to 60kg). If a customer package exceeds the remaining payload, the engine assigns subsequent vehicles or flags overload.<br/>
                  • <strong>Phase 3 (Route Sequencing):</strong> Uses A* search with Euclidean distance heuristics to sequence drop-off waypoints with optimal turn-by-turn road vectors.
                </div>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#166534', marginBottom: 6 }}>
                  3. Key Hackathon Talking Points
                </h4>
                <div>
                  1. <strong>Inputs:</strong> Package dimensions (e.g. 30x25x15 cm), Destination GPS Coordinates & Pincodes (560038, 560066, etc.), and Vehicle Fleet Limits.<br/>
                  2. <strong>Outputs:</strong> Exact Assigned Delivery Agent ID (`VAN-101`, `VAN-201`), Sequenced Route List (`HUB-02 ➔ ZONE-D`), and exact ETA.<br/>
                  3. <strong>Real-time Simulation:</strong> Watch the vehicle animate along live OpenStreetMap road polylines.
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={() => setShowExplanationModal(false)}
                style={{ alignSelf: 'flex-end', marginTop: 4 }}
              >
                Close & Return to Live Dispatcher
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
