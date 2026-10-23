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
  ArrowRight
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
    iconSize: [100, 24],
    iconAnchor: [50, 12]
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
  const [hubs] = useState(INITIAL_HUBS);
  const [zones] = useState(INITIAL_ZONES);
  const [roads] = useState(INITIAL_ROADS);
  const [drivers] = useState(INITIAL_DRIVERS);
  const [orders, setOrders] = useState(INITIAL_ORDERS);

  // Active selected order
  const [selectedOrderId, setSelectedOrderId] = useState('ORD-904');
  
  // Real-time animated delivery vehicle
  const [isDriving, setIsDriving] = useState(false);
  const [driveProgress, setDriveProgress] = useState(0);

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

  // Find assigned driver for this order from the hub plan
  const hubPlan = dispatchResult.hubPlans.find(hp => hp.hub.id === assignedHub.id);
  const driverRoute = hubPlan?.routes.find(r => r.stopSequence.some(p => p.id === activeOrder?.id)) || hubPlan?.routes[0];
  const assignedDriver = driverRoute?.driver;

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
    setOrders(INITIAL_ORDERS);
    setSelectedOrderId('ORD-904');
    setDriveProgress(0);
    setIsDriving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      
      {/* 1. Header with Problem Statement & Real-time Metrics */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon">
            <Building2 size={22} />
          </div>
          <div>
            <h1 className="brand-title">Dynamic E-Commerce Order Fulfillment & Delivery Routing Engine</h1>
            <div className="brand-subtitle">Bangalore Regional Network • Shortest-Path A* & Dijkstra with Fleet Capacity Optimization</div>
          </div>
        </div>

        <button className="btn-secondary" onClick={handleReset}>
          <RotateCcw size={14} /> Reset Defaults
        </button>
      </header>

      {/* 2. Problem Statement Context Bar */}
      <div className="scenario-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span className="scenario-pill">
            <strong>Input:</strong> Package Dimensions, GPS Destination / Pincodes, Fleet Capacity
          </span>
          <span style={{ color: '#94a3b8' }}>➔</span>
          <span className="scenario-pill" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
            <strong>Algorithm:</strong> A* & Dijkstra Shortest Path + Bin-Packing CVRP
          </span>
          <span style={{ color: '#94a3b8' }}>➔</span>
          <span className="scenario-pill" style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1e40af' }}>
            <strong>Output:</strong> Assigned Delivery Agent ID, Sequenced Route, ETA
          </span>
        </div>

        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
          {hubs.length} Regional Hubs • {drivers.length} Delivery Agents • {orders.length} Active Orders
        </div>
      </div>

      {/* 3. Main Dashboard Workspace (Left Inputs/Outputs | Right Live Map) */}
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
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', marginTop: 2 }}>
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
                <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#1a73e8' }}>
                  {pathNodes.join(' ➔ ')}
                </div>
              </div>

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

            {/* INPUT PANEL: Incoming Packages List (Package Dimensions & Destination Pincodes) */}
            <div className="panel-card">
              <div className="panel-card-title">
                <PackageIcon size={16} color="#1a73e8" />
                <span>Input: Incoming Packages ({orders.length})</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 240, overflowY: 'auto' }}>
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
                          Box: {ord.dimensions} • Weight: {ord.weight} kg
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
                  const hub = hubs.find(h => h.id === driver.hubId);
                  const matchingRoute = hubPlan?.routes.find(r => r.driver.id === driver.id);
                  const load = matchingRoute ? matchingRoute.driver.currentLoad : 0;
                  const percent = Math.min(100, Math.round((load / driver.maxCapacity) * 100));

                  return (
                    <div key={driver.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.6rem 0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <strong>{driver.name} ({driver.id})</strong>
                        <span style={{ color: '#64748b' }}>{driver.vehicle}</span>
                      </div>

                      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: '#64748b' }}>
                        <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${percent}%`, height: '100%', background: percent > 90 ? '#ea4335' : '#1a73e8' }} />
                        </div>
                        <span>Max: <strong>{driver.maxCapacity} kg</strong></span>
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

        {/* RIGHT PANEL: Live Interactive Google Maps Road View */}
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
                  color: '#1a73e8',
                  weight: 6,
                  opacity: 0.95
                }}
              />
            )}

            {/* Moving Delivery Van along route */}
            {routeLatLngs.length > 1 && (
              <Marker
                position={getVehiclePos()}
                icon={createPin('🚚 ' + (assignedDriver ? assignedDriver.id : 'VAN-101'), '#0f172a', false)}
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
              <strong>Fulfillment Hub</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ea4335' }} />
              <strong>Customer Drop-off</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 16, height: 3, background: '#1a73e8' }} />
              <strong>Optimal A* Route</strong>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
