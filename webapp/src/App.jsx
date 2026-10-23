import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
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
  GitBranch,
  Route
} from 'lucide-react';
import {
  INITIAL_HUBS,
  INITIAL_ZONES,
  INITIAL_ROADS,
  INITIAL_DRIVERS,
  INITIAL_ORDERS,
  solveMultiHubCVRP,
  aStarSearch,
  dijkstraWithSteps,
  buildAdjacencyList
} from './cvrpEngine';

// Pin icons for Google Maps
function createMarkerIcon(title, color, isHub) {
  const iconHtml = `
    <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
      <div style="
        background: ${color};
        color: #ffffff;
        font-weight: 700;
        font-size: ${isHub ? '11px' : '10px'};
        padding: ${isHub ? '3px 8px' : '2px 6px'};
        border-radius: 12px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        border: 2px solid #ffffff;
        white-space: nowrap;
      ">
        ${isHub ? '🏢 ' : ''}${title}
      </div>
      <div style="
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 6px solid ${color};
        margin-top: -1px;
      "></div>
    </div>
  `;
  return L.divIcon({
    html: iconHtml,
    className: 'custom-map-pin',
    iconSize: [80, 30],
    iconAnchor: [40, 28]
  });
}

// Center map to bounds helper
function MapController({ selectedLoc, routeLatLngs }) {
  const map = useMap();
  useEffect(() => {
    if (routeLatLngs && routeLatLngs.length > 1) {
      const bounds = L.latLngBounds(routeLatLngs);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    } else if (selectedLoc) {
      map.setView([selectedLoc.lat, selectedLoc.lng], 13);
    }
  }, [selectedLoc, routeLatLngs, map]);
  return null;
}

export default function App() {
  // Seamless View Mode:
  // 'path' = Single Order Direct A* Shortest Vector
  // 'fleet' = Full Multi-Stop Fleet CVRP Tour (All vehicle loops)
  const [viewMode, setViewMode] = useState('path'); 
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'fleet' | 'add'
  const [hubs] = useState(INITIAL_HUBS);
  const [zones] = useState(INITIAL_ZONES);
  const [roads] = useState(INITIAL_ROADS);
  const [drivers] = useState(INITIAL_DRIVERS);
  const [orders, setOrders] = useState(INITIAL_ORDERS);

  // Selected order to inspect on the map
  const [selectedOrderId, setSelectedOrderId] = useState('ORD-904'); // default to Whitefield order
  const [selectedDriverId, setSelectedDriverId] = useState('VAN-101');
  const [isDriving, setIsDriving] = useState(false);
  const [driveProgress, setDriveProgress] = useState(0);

  // New order form inputs
  const [newCustName, setNewCustName] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newDestId, setNewDestId] = useState('ZONE-D');

  const allLocations = [...hubs, ...zones];
  const adj = buildAdjacencyList(allLocations, roads);

  // Multi-hub CVRP dispatch solution
  const dispatchResult = solveMultiHubCVRP(hubs, zones, roads, orders, drivers);

  // Find active selected order and its closest hub
  const activeOrder = orders.find(o => o.id === selectedOrderId) || orders[0];
  const assignedPkg = dispatchResult.ordersWithAssignedHub.find(o => o.id === activeOrder?.id);
  const assignedHub = hubs.find(h => h.id === assignedPkg?.assignedHubId) || hubs[0];
  const destinationZone = zones.find(z => z.id === activeOrder?.destinationId);

  // Compute exact A* shortest path from assigned hub to customer
  const aStarPathResult = aStarSearch(assignedHub.id, activeOrder?.destinationId, adj, allLocations);
  const optimalPathNodes = aStarPathResult.path || [];
  const singlePathLatLngs = optimalPathNodes.map(id => {
    const loc = allLocations.find(l => l.id === id);
    return loc ? [loc.lat, loc.lng] : null;
  }).filter(Boolean);

  // Colors for fleet routes
  const FLEET_COLORS = ['#1a73e8', '#9333ea', '#059669', '#d97706', '#dc2626'];

  // All active routes from dispatch
  const allFleetRoutes = dispatchResult.hubPlans.flatMap(hp => hp.routes);
  const activeFleetRoute = allFleetRoutes.find(r => r.driver.id === selectedDriverId) || allFleetRoutes[0];

  // Route latlngs for active fleet route
  const fleetRouteLatLngs = activeFleetRoute
    ? activeFleetRoute.waypoints.map(id => {
        const loc = allLocations.find(l => l.id === id);
        return loc ? [loc.lat, loc.lng] : null;
      }).filter(Boolean)
    : [];

  // Determine which latlngs to drive on
  const activeTourLatLngs = viewMode === 'path' ? singlePathLatLngs : fleetRouteLatLngs;

  // Interpolate vehicle GPS position during drive simulation
  const getVehiclePos = () => {
    if (activeTourLatLngs.length < 2) return activeTourLatLngs[0] || [12.9716, 77.5946];
    const totalSegments = activeTourLatLngs.length - 1;
    const scaled = driveProgress * totalSegments;
    const segIdx = Math.min(Math.floor(scaled), totalSegments - 1);
    const segT = scaled - segIdx;
    const p1 = activeTourLatLngs[segIdx];
    const p2 = activeTourLatLngs[segIdx + 1];
    return [
      p1[0] + (p2[0] - p1[0]) * segT,
      p1[1] + (p2[1] - p1[1]) * segT
    ];
  };

  // Drive animation timer
  useEffect(() => {
    if (!isDriving) return;
    const interval = setInterval(() => {
      setDriveProgress(prev => {
        if (prev >= 1) {
          setIsDriving(false);
          return 1;
        }
        return prev + 0.015;
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
      dimensions: '30x20x15 cm',
      customerName: newCustName
    };
    setOrders([...orders, newOrder]);
    setSelectedOrderId(newId);
    setNewCustName('');
    setNewWeight('');
    setActiveTab('orders');
    setViewMode('path');
  };

  const handleReset = () => {
    setOrders(INITIAL_ORDERS);
    setSelectedOrderId('ORD-904');
    setDriveProgress(0);
    setIsDriving(false);
    setViewMode('path');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      
      {/* Top Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon">
            <Building2 size={22} />
          </div>
          <div>
            <h1 className="brand-title">Bangalore Logistics Dispatch Console</h1>
            <div className="brand-subtitle">Automated Multi-Hub CVRP Routing Engine</div>
          </div>
        </div>

        {/* View Mode Switcher: Point-to-Point A* vs Multi-Stop Fleet CVRP Tour */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', padding: 3, borderRadius: 8 }}>
          <button
            onClick={() => { setViewMode('path'); setDriveProgress(0); setIsDriving(false); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: viewMode === 'path' ? '#ffffff' : 'transparent',
              color: viewMode === 'path' ? '#1a73e8' : '#64748b',
              border: 'none',
              borderRadius: 6,
              padding: '0.45rem 0.95rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: viewMode === 'path' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            <Compass size={15} /> Single Order Shortest Path (A*)
          </button>

          <button
            onClick={() => { setViewMode('fleet'); setDriveProgress(0); setIsDriving(false); setActiveTab('fleet'); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: viewMode === 'fleet' ? '#ffffff' : 'transparent',
              color: viewMode === 'fleet' ? '#1a73e8' : '#64748b',
              border: 'none',
              borderRadius: 6,
              padding: '0.45rem 0.95rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: viewMode === 'fleet' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            <Route size={15} /> Multi-Stop Fleet Tour (CVRP)
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn-secondary" onClick={handleReset}>
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </header>

      {/* Main Seamless Workspace */}
      <div className="app-dashboard">
        
        {/* Left Side Dispatch Panel */}
        <div className="dashboard-sidebar">
          
          {/* Navigation Bar */}
          <div className="sidebar-tabs">
            <button
              className={`sidebar-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => { setActiveTab('orders'); setViewMode('path'); }}
            >
              <PackageIcon size={16} /> Orders ({orders.length})
            </button>
            <button
              className={`sidebar-tab-btn ${activeTab === 'fleet' ? 'active' : ''}`}
              onClick={() => { setActiveTab('fleet'); setViewMode('fleet'); }}
            >
              <Truck size={16} /> Fleet Routes ({allFleetRoutes.length})
            </button>
            <button
              className={`sidebar-tab-btn ${activeTab === 'add' ? 'active' : ''}`}
              onClick={() => setActiveTab('add')}
            >
              <Plus size={16} /> New Order
            </button>
          </div>

          {/* Active Highlight Card depending on Mode */}
          {viewMode === 'path' ? (
            /* MODE 1: Single Order A* Inspection */
            <div style={{
              background: '#f8fbff',
              borderBottom: '1px solid #cbd5e1',
              padding: '1rem 1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#1a73e8', fontWeight: 800 }}>
                  A* Shortest Vector
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  background: '#1a73e8',
                  color: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontWeight: 700
                }}>
                  {aStarPathResult.time.toFixed(0)} mins
                </span>
              </div>

              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                {activeOrder.customerName}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                Nearest Hub: <strong>{assignedHub.name}</strong> ➔ <strong>{destinationZone?.name}</strong>
              </div>

              {/* Waypoints sequence */}
              <div style={{ marginTop: 8, fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: '#1a73e8', fontWeight: 700, background: '#ffffff', padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                {optimalPathNodes.join(' ➔ ')}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 10 }}>
                <button
                  onClick={() => {
                    if (driveProgress >= 1) setDriveProgress(0);
                    setIsDriving(!isDriving);
                  }}
                  className="btn-primary"
                  style={{ flex: 1, padding: '0.45rem', fontSize: '0.82rem' }}
                >
                  <Truck size={14} /> {isDriving ? 'Pause Drive' : (driveProgress >= 1 ? 'Replay Drive' : 'Simulate Single Delivery')}
                </button>
              </div>
            </div>
          ) : (
            /* MODE 2: Full Vehicle CVRP Multi-Stop Inspection */
            <div style={{
              background: '#faf5ff',
              borderBottom: '1px solid #d8b4fe',
              padding: '1rem 1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#9333ea', fontWeight: 800 }}>
                  Multi-Stop CVRP Loop
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  background: '#9333ea',
                  color: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontWeight: 700
                }}>
                  {activeFleetRoute?.totalDurationMins.toFixed(0)} mins Total Tour
                </span>
              </div>

              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                Driver: {activeFleetRoute?.driver.name} ({activeFleetRoute?.driver.vehicle})
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                Stationed Hub: <strong>{activeFleetRoute?.hub.name}</strong>
              </div>

              <div style={{ marginTop: 8, fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: '#9333ea', fontWeight: 700, background: '#ffffff', padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                {activeFleetRoute?.waypoints.join(' ➔ ')}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 10 }}>
                <button
                  onClick={() => {
                    if (driveProgress >= 1) setDriveProgress(0);
                    setIsDriving(!isDriving);
                  }}
                  className="btn-primary"
                  style={{ flex: 1, padding: '0.45rem', fontSize: '0.82rem', background: '#9333ea', borderColor: '#9333ea' }}
                >
                  <Truck size={14} /> {isDriving ? 'Pause Tour' : (driveProgress >= 1 ? 'Replay Tour' : 'Simulate Complete Van Tour')}
                </button>
              </div>
            </div>
          )}

          {/* Scrollable Tab Content */}
          <div className="sidebar-scroll-body">
            
            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Click an order to view its individual direct path:
                </div>
                {orders.map(ord => {
                  const dest = zones.find(z => z.id === ord.destinationId);
                  const pkg = dispatchResult.ordersWithAssignedHub.find(p => p.id === ord.id);
                  const hub = hubs.find(h => h.id === pkg?.assignedHubId);
                  const isSelected = ord.id === selectedOrderId;

                  return (
                    <div
                      key={ord.id}
                      onClick={() => {
                        setSelectedOrderId(ord.id);
                        setDriveProgress(0);
                        setViewMode('path');
                      }}
                      style={{
                        background: isSelected ? '#f0f7ff' : '#ffffff',
                        border: isSelected ? '1.5px solid #1a73e8' : '1px solid #e2e8f0',
                        borderRadius: 8,
                        padding: '0.8rem 1rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 2px 8px rgba(26,115,232,0.1)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{ord.customerName}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                            Destination: <strong>{dest?.name}</strong>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1a73e8' }}>
                            {pkg?.distanceToHubMins.toFixed(0)} mins
                          </span>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{ord.weight} kg</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTop: '1px solid #f1f5f9', fontSize: '0.74rem' }}>
                        <span style={{ color: '#475569' }}>
                          Closest Warehouse: <strong>{hub?.name.split(' ')[0]}</strong>
                        </span>
                        <ChevronRight size={14} color="#94a3b8" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* FLEET ROUTES TAB */}
            {activeTab === 'fleet' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Click a vehicle to inspect its full multi-stop delivery loop:
                </div>
                {allFleetRoutes.map((r, rIdx) => {
                  const driver = r.driver;
                  const isSelectedDriver = driver.id === selectedDriverId;
                  const percentUsed = ((driver.currentLoad / driver.maxCapacity) * 100).toFixed(0);
                  const color = FLEET_COLORS[rIdx % FLEET_COLORS.length];

                  return (
                    <div
                      key={driver.id}
                      onClick={() => {
                        setSelectedDriverId(driver.id);
                        setViewMode('fleet');
                        setDriveProgress(0);
                      }}
                      style={{
                        background: isSelectedDriver ? '#faf5ff' : '#ffffff',
                        border: isSelectedDriver ? `2px solid ${color}` : '1px solid #e2e8f0',
                        borderRadius: 8,
                        padding: '0.85rem 1rem',
                        cursor: 'pointer',
                        boxShadow: isSelectedDriver ? '0 2px 8px rgba(147, 51, 234, 0.15)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{driver.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {driver.vehicle} • ID: {driver.id}
                          </div>
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: color }}>
                          ⏱️ {r.totalDurationMins.toFixed(0)} mins
                        </span>
                      </div>

                      {/* Capacity progress */}
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: 3 }}>
                          <span>Payload Loaded:</span>
                          <strong>{driver.currentLoad.toFixed(1)} / {driver.maxCapacity} kg ({percentUsed}%)</strong>
                        </div>
                        <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${percentUsed}%`, height: '100%', background: color }} />
                        </div>
                      </div>

                      <div style={{ marginTop: 8, fontSize: '0.74rem', color: '#334155' }}>
                        <strong>Stops ({r.stopSequence.length}):</strong> {r.stopSequence.map(p => zones.find(z => z.id === p.destinationId)?.name.split(' ')[0]).join(' ➔ ')} ➔ Return to Hub
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* NEW ORDER FORM TAB */}
            {activeTab === 'add' && (
              <form onSubmit={handleAddOrder} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '0.5rem 0' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Customer Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #cbd5e1', borderRadius: 6, fontSize: '0.86rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Package Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    placeholder="e.g. 12"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #cbd5e1', borderRadius: 6, fontSize: '0.86rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Bangalore Delivery Zone
                  </label>
                  <select
                    value={newDestId}
                    onChange={(e) => setNewDestId(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #cbd5e1', borderRadius: 6, fontSize: '0.86rem', background: '#fff' }}
                  >
                    {zones.map(z => (
                      <option key={z.id} value={z.id}>{z.name} ({z.pincode})</option>
                    ))}
                  </select>
                </div>

                <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>
                  <Plus size={16} /> Dispatch Package
                </button>
              </form>
            )}

          </div>
        </div>

        {/* Right Interactive Real Google Maps Canvas */}
        <div className="dashboard-map-viewport">
          <MapContainer
            center={[12.9716, 77.6408]}
            zoom={12}
            scrollWheelZoom={true}
            style={{ width: '100%', height: '100%' }}
          >
            {/* Crisp OpenStreetMap / Carto Voyager Light Tile Layer */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            <MapController
              selectedLoc={assignedHub}
              routeLatLngs={activeTourLatLngs}
            />

            {/* Base Bangalore Roads */}
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

            {/* IF IN FLEET MODE: Display All Fleet CVRP Loops simultaneously in distinct colors */}
            {viewMode === 'fleet' && allFleetRoutes.map((route, idx) => {
              const pts = route.waypoints.map(id => {
                const loc = allLocations.find(l => l.id === id);
                return loc ? [loc.lat, loc.lng] : null;
              }).filter(Boolean);

              const color = FLEET_COLORS[idx % FLEET_COLORS.length];
              const isSelected = route.driver.id === selectedDriverId;

              return (
                <Polyline
                  key={`fleet-route-${route.driver.id}`}
                  positions={pts}
                  pathOptions={{
                    color: color,
                    weight: isSelected ? 6 : 3.5,
                    opacity: isSelected ? 1 : 0.45,
                    dashArray: isSelected ? 'none' : '6, 6'
                  }}
                >
                  <Tooltip sticky>
                    <span>{route.driver.name} ({route.driver.vehicle}) — {route.totalDurationMins.toFixed(0)}m Tour</span>
                  </Tooltip>
                </Polyline>
              );
            })}

            {/* IF IN PATH MODE: Show the single direct A* route in Google Blue */}
            {viewMode === 'path' && singlePathLatLngs.length > 1 && (
              <Polyline
                positions={singlePathLatLngs}
                pathOptions={{
                  color: '#1a73e8',
                  weight: 6,
                  opacity: 0.95
                }}
              />
            )}

            {/* Animated Delivery Van Moving along the active tour */}
            {activeTourLatLngs.length > 1 && (
              <Marker
                position={getVehiclePos()}
                icon={createMarkerIcon('🚚 Electric Van', viewMode === 'path' ? '#0f172a' : '#9333ea', false)}
              />
            )}

            {/* Fulfillment Hub Pins */}
            {hubs.map((hub) => (
              <Marker
                key={hub.id}
                position={[hub.lat, hub.lng]}
                icon={createMarkerIcon(hub.name.split(' ')[0], '#1a73e8', true)}
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

            {/* Drop-off Zone Pins */}
            {zones.map((zone) => {
              const isSelectedDest = zone.id === activeOrder?.destinationId;
              return (
                <Marker
                  key={zone.id}
                  position={[zone.lat, zone.lng]}
                  icon={createMarkerIcon(zone.name, isSelectedDest ? '#ea4335' : '#475569', false)}
                >
                  <Popup>
                    <div style={{ padding: 4 }}>
                      <strong style={{ fontSize: '0.9rem' }}>📍 {zone.name}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                        Zone: {zone.id} • Pincode: {zone.pincode}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Real-time Map Legend (Top Right) */}
          <div style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '8px 14px',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: '0.8rem',
            color: '#334155'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#1a73e8' }} />
              <strong>Fulfillment Hubs</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ea4335' }} />
              <strong>Customer Drop-off</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 16, height: 3, background: viewMode === 'path' ? '#1a73e8' : '#9333ea' }} />
              <strong>{viewMode === 'path' ? 'A* Shortest Vector' : 'Full CVRP Fleet Loop'}</strong>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
