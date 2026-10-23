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
  FileText,
  Share2,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Navigation
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

  // Panel width expansion state ('520px', '720px', '900px')
  const [panelWidth, setPanelWidth] = useState('540px');

  // Guided Step State: 1 = Inputs, 2 = A* Optimal Hub, 3 = Capacity Optimization, 4 = Driver Waypoint Manifest & Share
  const [activeStep, setActiveStep] = useState(1);

  // Selected driver for full route visualization and sharing
  const [selectedDriverId, setSelectedDriverId] = useState('VAN-201');
  const [copiedManifest, setCopiedManifest] = useState(false);

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

  // Find route for the explicitly selected driver (for Step 4 Driver Dispatch Waypoint Manifest)
  let activeDriverRoute = null;
  let activeDriverHub = hubs[0];
  for (const hp of dispatchResult.hubPlans) {
    const found = hp.routes.find(r => r.driver.id === selectedDriverId);
    if (found) {
      activeDriverRoute = found;
      activeDriverHub = hp.hub;
      break;
    }
  }
  if (!activeDriverRoute && dispatchResult.hubPlans[0]?.routes[0]) {
    activeDriverRoute = dispatchResult.hubPlans[0].routes[0];
    activeDriverHub = dispatchResult.hubPlans[0].hub;
  }

  // Check if active order has capacity overload
  const isOverloaded = assignedPkg?.capacityOverflow || (assignedDriver && assignedDriver.currentLoad > assignedDriver.maxCapacity);

  // Compute exact A* shortest path from the nearest hub to customer destination
  const aStarRes = aStarSearch(assignedHub.id, activeOrder?.destinationId, adj, allLocations);
  const pathNodes = aStarRes.path || [];
  const etaMinutes = aStarRes.time || 0;

  // Order route waypoints
  const orderRouteLatLngs = pathNodes.map(id => {
    const loc = allLocations.find(l => l.id === id);
    return loc ? [loc.lat, loc.lng] : null;
  }).filter(Boolean);

  // Complete driver route waypoints (from Step 4)
  const driverWaypointsLatLngs = (activeDriverRoute?.waypoints || []).map(id => {
    const loc = allLocations.find(l => l.id === id);
    return loc ? [loc.lat, loc.lng] : null;
  }).filter(Boolean);

  // Determine which route to display on map: driver full circuit in Step 4, or order route in Steps 1-3
  const isShowingDriverManifest = activeStep === 4;
  const routeLatLngs = isShowingDriverManifest && driverWaypointsLatLngs.length > 1
    ? driverWaypointsLatLngs
    : orderRouteLatLngs;

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

  // Toast notification for seamless feedback
  const [recalcBanner, setRecalcBanner] = useState(null);

  // Quick preset hubs for effortless testing by judges/users
  const PRESET_HUBS = [
    {
      name: 'North Bangalore Hub (Hebbal)',
      address: 'Outer Ring Road, Hebbal Flyover',
      pincode: '560092',
      lat: 13.0358,
      lng: 77.5970,
      driverName: 'Arun Prakash (North Van)',
      capacity: 55,
      connections: [{ to: 'ZONE-A', time: 14.0 }, { to: 'ZONE-F', time: 18.0 }]
    },
    {
      name: 'West Logistics Park (Rajajinagar)',
      address: 'Industrial Suburb, Chord Road',
      pincode: '560010',
      lat: 12.9982,
      lng: 77.5530,
      driverName: 'Vikram Seth (West EV)',
      capacity: 50,
      connections: [{ to: 'HUB-01', time: 11.0 }, { to: 'ZONE-B', time: 16.0 }]
    },
    {
      name: 'South-West Hub (Banashankari)',
      address: '100ft Ring Road, Phase 3',
      pincode: '560085',
      lat: 12.9255,
      lng: 77.5468,
      driverName: 'Manoj Hegde (Cargo Bike)',
      capacity: 35,
      connections: [{ to: 'ZONE-B', time: 13.0 }, { to: 'ZONE-C', time: 14.0 }]
    }
  ];

  // Handler to apply a quick preset in the modal
  const applyPreset = (preset) => {
    setNewHubName(preset.name);
    setNewHubAddress(preset.address);
    setNewHubPincode(preset.pincode);
    setNewHubLat(preset.lat.toString());
    setNewHubLng(preset.lng.toString());
    setNewHubDriverName(preset.driverName);
    setNewHubCapacity(preset.capacity.toString());
  };

  // Handler to add a new hub
  const handleAddHub = (e) => {
    e.preventDefault();
    if (!newHubName || !newHubAddress) return;
    const hubId = `HUB-0${hubs.length + 1}`;
    const newHubLatNum = parseFloat(newHubLat) || 13.0358;
    const newHubLngNum = parseFloat(newHubLng) || 77.5970;

    const newHub = {
      id: hubId,
      name: newHubName,
      address: newHubAddress,
      pincode: newHubPincode,
      lat: newHubLatNum,
      lng: newHubLngNum,
      x: 350,
      y: 100,
      isHub: true
    };

    // Calculate intelligent road links: connect new hub to the 2 geographically nearest zones
    const sortedZones = [...zones].map(z => {
      const dLat = (z.lat - newHubLatNum) * 111; // ~111 km per deg lat
      const dLng = (z.lng - newHubLngNum) * 102; // ~102 km per deg lng at Bangalore lat
      const km = Math.hypot(dLat, dLng);
      // Rough Bangalore road speed: 25 km/h -> mins = (km / 25) * 60
      const driveTime = Math.max(6, Math.round((km / 25) * 60));
      return { zoneId: z.id, time: driveTime };
    }).sort((a, b) => a.time - b.time);

    const newRoad1 = { from: hubId, to: sortedZones[0].zoneId, time: sortedZones[0].time };
    const newRoad2 = { from: hubId, to: sortedZones[1].zoneId, time: sortedZones[1].time };

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

    // Trigger seamless visual recalculation banner
    setRecalcBanner(`⚡ Added "${newHub.name}"! A* and CVRP engine instantly re-evaluated all nearest hubs & assigned agents.`);
    setTimeout(() => {
      setRecalcBanner(null);
    }, 6000);
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

  // 1-Click: Generate incoming batch of dynamic orders
  const handleGenerateRandomOrders = (count = 1) => {
    const SAMPLE_NAMES = [
      'Vikram Malhotra', 'Pooja Hegde', 'Rohan Sengupta', 'Ananya Sharma',
      'Kabir Mehta', 'Deepika Rao', 'Siddharth Varma', 'Tanvi Deshmukh',
      'Arjun Reddy', 'Nisha Iyer', 'Farhan Akhtar', 'Shruti Haasan'
    ];
    const SAMPLE_DIMENSIONS = [
      '25x20x15 cm', '30x25x20 cm', '35x30x20 cm', '40x35x25 cm', '20x15x10 cm'
    ];

    const newOrdersList = [];
    for (let i = 0; i < count; i++) {
      const randomZone = zones[Math.floor(Math.random() * zones.length)];
      const randomName = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];
      const randomDim = SAMPLE_DIMENSIONS[Math.floor(Math.random() * SAMPLE_DIMENSIONS.length)];
      const randomWeight = parseFloat((Math.random() * 14 + 5).toFixed(1)); // 5.0kg to 19.0kg
      const newId = `ORD-${Math.floor(100 + Math.random() * 900)}`;

      newOrdersList.push({
        id: newId,
        destinationId: randomZone.id,
        weight: randomWeight,
        dimensions: randomDim,
        customerName: randomName
      });
    }

    const updatedOrders = [...orders, ...newOrdersList];
    setOrders(updatedOrders);
    setSelectedOrderId(newOrdersList[newOrdersList.length - 1].id);
    setDriveProgress(0);
    setIsDriving(false);

    // Provide immediate visual notification
    setRecalcBanner(`⚡ Generated ${count} new order(s)! A* identified nearest hubs & allocated to stationed drivers with updated CVRP payload.`);
    setTimeout(() => {
      setRecalcBanner(null);
    }, 6000);
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            className="btn-primary"
            onClick={() => handleGenerateRandomOrders(1)}
            style={{ background: '#2563eb', borderColor: '#2563eb', fontSize: '0.82rem' }}
            title="Simulate incoming real-time customer order"
          >
            <Zap size={15} /> + Generate New Order
          </button>

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
      <div className="app-layout" style={{ '--sidebar-width': panelWidth }}>
        
        {/* LEFT PANEL: Expandable, Step-by-Step Guided Navigation */}
        <div className="left-sidebar">

          {/* Panel Header: Stepper & Width Expansion Controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.65rem 1rem',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0'
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Navigation size={16} color="#1a73e8" />
              <span>Routing Pipeline Steps</span>
            </div>

            {/* Expansion Width Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', padding: '2px 4px', borderRadius: 6 }}>
              <button
                type="button"
                onClick={() => setPanelWidth('540px')}
                style={{
                  background: panelWidth === '540px' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: 4,
                  padding: '3px 7px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: panelWidth === '540px' ? '#1a73e8' : '#64748b',
                  boxShadow: panelWidth === '540px' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
                title="Standard Panel Width (540px)"
              >
                Standard
              </button>

              <button
                type="button"
                onClick={() => setPanelWidth('760px')}
                style={{
                  background: panelWidth === '760px' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: 4,
                  padding: '3px 7px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: panelWidth === '760px' ? '#1a73e8' : '#64748b',
                  boxShadow: panelWidth === '760px' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
                title="Expanded Wide View (760px)"
              >
                Wide
              </button>

              <button
                type="button"
                onClick={() => setPanelWidth('960px')}
                style={{
                  background: panelWidth === '960px' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: 4,
                  padding: '3px 7px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: panelWidth === '960px' ? '#1a73e8' : '#64748b',
                  boxShadow: panelWidth === '960px' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
                title="Full Width Manifest (960px)"
              >
                Full
              </button>
            </div>
          </div>

          {/* Stepper Tabs */}
          <div className="workflow-stepper">
            <button
              className={`step-btn ${activeStep === 1 ? 'active' : ''}`}
              onClick={() => setActiveStep(1)}
            >
              <span className="step-number">1</span>
              <span>Inputs & Orders</span>
            </button>

            <button
              className={`step-btn ${activeStep === 2 ? 'active' : ''}`}
              onClick={() => setActiveStep(2)}
            >
              <span className="step-number">2</span>
              <span>A* Closest Hub</span>
            </button>

            <button
              className={`step-btn ${activeStep === 3 ? 'active' : ''}`}
              onClick={() => setActiveStep(3)}
            >
              <span className="step-number">3</span>
              <span>Vehicle Capacity</span>
            </button>

            <button
              className={`step-btn ${activeStep === 4 ? 'active' : ''}`}
              onClick={() => setActiveStep(4)}
            >
              <span className="step-number">4</span>
              <span>Driver Route & Share</span>
            </button>
          </div>

          <div className="sidebar-scrollable">
            
            {/* Real-time A* Recalculation Toast Alert */}
            {recalcBanner && (
              <div style={{
                background: '#eff6ff',
                border: '1.5px solid #3b82f6',
                borderRadius: 8,
                padding: '0.75rem 1rem',
                color: '#1d4ed8',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
                animation: 'pulse 1.5s infinite'
              }}>
                <Zap size={18} color="#2563eb" />
                <div style={{ flex: 1 }}>{recalcBanner}</div>
                <button
                  onClick={() => setRecalcBanner(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* STEP 1: INPUTS (Hubs, Packages, Add Order) */}
            {activeStep === 1 && (
              <>
                {/* Active Hubs List */}
                <div className="panel-card">
                  <div className="panel-card-title">
                    <Building2 size={16} color="#1a73e8" />
                    <span>Input 1: Regional Fulfillment Hubs ({hubs.length})</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: panelWidth !== '540px' ? 'repeat(auto-fit, minmax(240px, 1fr))' : '1fr', gap: '0.5rem' }}>
                    {hubs.map((hub) => {
                      const hubOrders = dispatchResult.ordersWithAssignedHub.filter(o => o.assignedHubId === hub.id);
                      return (
                        <div key={hub.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.65rem 0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

                {/* Incoming Packages List */}
                <div className="panel-card">
                  <div className="panel-card-title" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <PackageIcon size={16} color="#1a73e8" />
                      <span>Input 2: Incoming Packages ({orders.length})</span>
                    </div>

                    {/* Quick Simulation Order Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => handleGenerateRandomOrders(1)}
                        style={{
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: 5,
                          padding: '3px 8px',
                          fontSize: '0.73rem',
                          fontWeight: 700,
                          color: '#1d4ed8',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <Zap size={13} color="#2563eb" /> + 1 New Order
                      </button>

                      <button
                        type="button"
                        onClick={() => handleGenerateRandomOrders(3)}
                        style={{
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: 5,
                          padding: '3px 8px',
                          fontSize: '0.73rem',
                          fontWeight: 700,
                          color: '#15803d',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <Plus size={13} color="#16a34a" /> + 3 Batch Orders
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: panelWidth !== '540px' ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr', gap: '0.55rem', maxHeight: 340, overflowY: 'auto' }}>
                    {orders.map((ord) => {
                      const dest = zones.find(z => z.id === ord.destinationId);
                      const isSelected = ord.id === selectedOrderId;
                      
                      const pkgAlloc = dispatchResult.ordersWithAssignedHub.find(o => o.id === ord.id);
                      const pkgHub = hubs.find(h => h.id === pkgAlloc?.assignedHubId);
                      const orderHubPlan = dispatchResult.hubPlans.find(hp => hp.hub.id === pkgAlloc?.assignedHubId);
                      const orderDriverRoute = orderHubPlan?.routes.find(r => r.stopSequence.some(p => p.id === ord.id)) || orderHubPlan?.routes[0];
                      const driverAlloc = orderDriverRoute?.driver;

                      return (
                        <div
                          key={ord.id}
                          className={`order-item-row ${isSelected ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedOrderId(ord.id);
                            setDriveProgress(0);
                            setIsDriving(false);
                          }}
                          style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                                {ord.customerName}
                              </div>
                              <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: 1 }}>
                                Box: {ord.dimensions} • Weight: <strong>{ord.weight} kg</strong>
                              </div>
                            </div>

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

                          <div style={{
                            marginTop: 4,
                            paddingTop: 6,
                            borderTop: '1px solid #e2e8f0',
                            display: 'grid',
                            gridTemplateColumns: '1.2fr 1fr',
                            gap: 8,
                            fontSize: '0.73rem'
                          }}>
                            <div style={{ background: '#ffffff', padding: '4px 8px', borderRadius: 5, border: '1px solid #e2e8f0' }}>
                              <span style={{ color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                                📍 Drop-off Point:
                              </span>
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>{dest?.name}</span>
                              <span style={{ color: '#64748b', marginLeft: 4 }}>({dest?.pincode})</span>
                            </div>

                            <div style={{ background: '#f0fdf4', padding: '4px 8px', borderRadius: 5, border: '1px solid #bbf7d0' }}>
                              <span style={{ color: '#166534', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                                🚚 Allocated Driver:
                              </span>
                              <span style={{ fontWeight: 800, color: '#15803d' }}>
                                {driverAlloc ? driverAlloc.id : 'Pending'}
                              </span>
                              <span style={{ color: '#166534', display: 'block', fontSize: '0.68rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {driverAlloc?.name?.split(' ')[0]} ({pkgHub?.name?.split(' ')[0]} Hub)
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Add Order Form */}
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
                      <Plus size={15} /> Add Order & Recompute
                    </button>
                  </form>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn-primary" onClick={() => setActiveStep(2)}>
                    Next: A* Closest Hub Allocation <ChevronRight size={16} />
                  </button>
                </div>
              </>
            )}

            {/* STEP 2: A* CLOSEST HUB ALLOCATION */}
            {activeStep === 2 && (
              <>
                <div className="panel-card" style={{ border: '2px solid #1a73e8', background: '#f8fbff' }}>
                  <div className="panel-card-title" style={{ color: '#1a73e8', borderBottomColor: '#dbeafe' }}>
                    <CheckCircle2 size={16} color="#1a73e8" />
                    <span>A* Shortest-Path Hub Assignment (Order: {activeOrder.id})</span>
                  </div>

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
                        Estimated Time (ETA)
                      </div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1a73e8', marginTop: 2 }}>
                        ⏱️ {etaMinutes.toFixed(0)} minutes
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>A* Heuristic: Euclidean</div>
                    </div>
                  </div>

                  {/* Sequenced Route Waypoints */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.65rem 0.85rem', marginBottom: '0.85rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
                      Shortest Path Waypoints from Nearest Hub:
                    </div>
                    <div style={{ fontSize: '0.84rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#1a73e8' }}>
                      {pathNodes.join(' ➔ ')}
                    </div>
                  </div>

                  {/* A* Proximity Matrix Across All Hubs */}
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '0.75rem 0.85rem' }}>
                    <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>
                      A* Distance Check from All {hubs.length} Hubs to {destZone?.name}:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {hubEvaluations.map(ev => (
                        <div key={ev.hub.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: ev.isOptimal ? '#166534' : '#64748b', fontWeight: ev.isOptimal ? 800 : 500, padding: '3px 6px', background: ev.isOptimal ? '#f0fdf4' : 'transparent', borderRadius: 4 }}>
                          <span>{ev.isOptimal ? '✅ Optimal Hub: ' : '• '}{ev.hub.name} ({ev.hub.id})</span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{ev.time.toFixed(0)} mins</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Trip Simulation Button */}
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

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button className="btn-secondary" onClick={() => setActiveStep(1)}>
                    Back to Inputs
                  </button>
                  <button className="btn-primary" onClick={() => setActiveStep(3)}>
                    Next: Fleet Vehicle Capacity <ChevronRight size={16} />
                  </button>
                </div>
              </>
            )}

            {/* STEP 3: FLEET VEHICLE CAPACITIES & BIN PACKING */}
            {activeStep === 3 && (
              <>
                <div className="panel-card">
                  <div className="panel-card-title">
                    <Truck size={16} color="#1a73e8" />
                    <span>Fleet Vehicle Capacities & Payload Limits</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: panelWidth !== '540px' ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr', gap: '0.65rem' }}>
                    {drivers.map(driver => {
                      let driverRoute = null;
                      for (const plan of dispatchResult.hubPlans) {
                        const found = plan.routes.find(r => r.driver.id === driver.id);
                        if (found) {
                          driverRoute = found;
                          break;
                        }
                      }

                      const load = driverRoute ? driverRoute.driver.currentLoad : 0;
                      const isOver = load > driver.maxCapacity;
                      const percent = Math.min(100, Math.round((load / driver.maxCapacity) * 100));
                      const parentHub = hubs.find(h => h.id === driver.hubId);

                      return (
                        <div
                          key={driver.id}
                          style={{
                            background: '#f8fafc',
                            border: `1.5px solid ${isOver ? '#fca5a5' : '#e2e8f0'}`,
                            borderRadius: 8,
                            padding: '0.75rem 0.85rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                            <div>
                              <strong>{driver.name}</strong>
                              <span style={{ fontSize: '0.74rem', background: '#e2e8f0', color: '#334155', padding: '2px 6px', borderRadius: 4, marginLeft: 6, fontWeight: 700 }}>
                                {driver.id}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                              🏢 {parentHub?.name?.split(' ')[0]} Hub
                            </span>
                          </div>

                          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: '#64748b' }}>
                            <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${percent}%`, height: '100%', background: isOver ? '#ef4444' : '#1a73e8' }} />
                            </div>
                            <span style={{ fontWeight: 600 }}>
                              {load.toFixed(1)} / <strong>{driver.maxCapacity} kg</strong> ({percent}%)
                            </span>
                          </div>

                          <div style={{ marginTop: 8, fontSize: '0.72rem', color: '#64748b' }}>
                            Vehicle Model: <strong>{driver.vehicle}</strong> • Status: {load > 0 ? '🟢 Active on Delivery Run' : '⚪ Standby at Depot'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button className="btn-secondary" onClick={() => setActiveStep(2)}>
                    Back to Closest Hub
                  </button>
                  <button className="btn-primary" onClick={() => setActiveStep(4)}>
                    Next: Driver Dispatch Path & Share <ChevronRight size={16} />
                  </button>
                </div>
              </>
            )}

            {/* STEP 4: DRIVER'S PATH TO GO & MANIFEST SHARE */}
            {activeStep === 4 && (
              <>
                <div className="panel-card" style={{ border: '2px solid #16a34a', background: '#fcfdfc' }}>
                  <div className="panel-card-title" style={{ color: '#16a34a', borderBottomColor: '#bbf7d0', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Truck size={18} color="#16a34a" />
                      <span>Driver Turn-by-Turn Path & Dispatch Manifest</span>
                    </div>

                    {/* Driver Selector Dropdown */}
                    <select
                      value={selectedDriverId}
                      onChange={(e) => setSelectedDriverId(e.target.value)}
                      style={{
                        padding: '4px 8px',
                        border: '1.5px solid #16a34a',
                        borderRadius: 6,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#166534',
                        background: '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Driver Route Header Info */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem', marginBottom: '0.85rem' }}>
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.6rem 0.8rem' }}>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Driver Name</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>{activeDriverRoute?.driver.name}</div>
                    </div>

                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.6rem 0.8rem' }}>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Vehicle / ID</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#16a34a' }}>{activeDriverRoute?.driver.id}</div>
                    </div>

                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.6rem 0.8rem' }}>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Starting Hub</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>{activeDriverHub?.name.split(' ')[0]} Hub</div>
                    </div>

                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.6rem 0.8rem' }}>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Total Trip Duration</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>⏱️ {activeDriverRoute?.totalDurationMins?.toFixed(0) || 0} mins</div>
                    </div>
                  </div>

                  {/* Complete Turn-by-Turn Waypoints Circuit */}
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '0.75rem 0.85rem', marginBottom: '0.85rem' }}>
                    <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>
                      Complete Highway & Zone Waypoint Circuit:
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      flexWrap: 'wrap',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      background: '#f8fafc',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid #e2e8f0'
                    }}>
                      {(activeDriverRoute?.waypoints || [activeDriverHub?.id]).map((node, i, arr) => (
                        <React.Fragment key={i}>
                          <span style={{
                            color: node.startsWith('HUB') ? '#1a73e8' : '#0f172a',
                            background: node.startsWith('HUB') ? '#eff6ff' : '#ffffff',
                            padding: '2px 6px',
                            borderRadius: 4,
                            border: '1px solid #cbd5e1'
                          }}>
                            {node}
                          </span>
                          {i < arr.length - 1 && <span style={{ color: '#94a3b8' }}>➔</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* Customer Drop-off Stop List */}
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '0.75rem 0.85rem', marginBottom: '0.85rem' }}>
                    <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>
                      Customer Drop-off Points ({activeDriverRoute?.stopSequence.length || 0} Orders):
                    </div>

                    {(!activeDriverRoute?.stopSequence || activeDriverRoute.stopSequence.length === 0) ? (
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', padding: 8 }}>
                        No drop-offs assigned for this driver currently.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {activeDriverRoute.stopSequence.map((pkg, idx) => {
                          const pZone = zones.find(z => z.id === pkg.destinationId);
                          return (
                            <div
                              key={pkg.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '6px 10px',
                                background: '#f8fafc',
                                borderRadius: 6,
                                border: '1px solid #e2e8f0',
                                fontSize: '0.78rem'
                              }}
                            >
                              <div>
                                <span style={{
                                  background: '#16a34a',
                                  color: '#fff',
                                  fontWeight: 800,
                                  fontSize: '0.7rem',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  marginRight: 8
                                }}>
                                  Stop #{idx + 1}
                                </span>
                                <strong>{pZone?.name}</strong>
                                <span style={{ color: '#64748b', marginLeft: 6 }}>
                                  • Customer: {pkg.customerName} (Pincode: {pZone?.pincode})
                                </span>
                              </div>
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#166534' }}>
                                {pkg.id} ({pkg.weight} kg)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Share Route Action Bar */}
                  <div style={{ display: 'flex', gap: '0.65rem' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        const manifestText = `🚚 Delivery Dispatch Manifest - Agent ${activeDriverRoute?.driver.id} (${activeDriverRoute?.driver.name})\nHub: ${activeDriverHub?.name} (${activeDriverHub?.pincode})\nVehicle: ${activeDriverRoute?.driver.vehicle} (Load: ${activeDriverRoute?.driver.currentLoad}kg / ${activeDriverRoute?.driver.maxCapacity}kg)\nEstimated Trip Time: ${activeDriverRoute?.totalDurationMins?.toFixed(0)} mins\n\nWaypoints Path: ${activeDriverRoute?.waypoints.join(' -> ')}\n\nDrop-off Deliveries:\n${activeDriverRoute?.stopSequence.map((p, i) => `${i + 1}. Order ${p.id} - ${p.customerName} @ ${zones.find(z => z.id === p.destinationId)?.name} (Weight: ${p.weight}kg, Box: ${p.dimensions})`).join('\n')}`;
                        navigator.clipboard.writeText(manifestText);
                        setCopiedManifest(true);
                        setTimeout(() => setCopiedManifest(false), 3000);
                      }}
                      style={{ flex: 1, background: '#16a34a', borderColor: '#16a34a' }}
                    >
                      {copiedManifest ? <Check size={16} /> : <Share2 size={16} />}
                      {copiedManifest ? 'Copied Driver Manifest to Clipboard!' : 'Share Path & Manifest to Driver (Copy)'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <button className="btn-secondary" onClick={() => setActiveStep(3)}>
                    Back to Fleet Capacities
                  </button>
                </div>
              </>
            )}

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
                  color: isShowingDriverManifest ? '#16a34a' : (isOverloaded ? '#ea4335' : '#1a73e8'),
                  weight: 6,
                  opacity: 0.95
                }}
              />
            )}

            {/* Moving Delivery Van along route */}
            {routeLatLngs.length > 1 && (
              <Marker
                position={getVehiclePos()}
                icon={createPin(
                  '🚚 ' + (isShowingDriverManifest ? (activeDriverRoute?.driver?.id || 'DRIVER') : (assignedDriver ? assignedDriver.id : 'VAN-101')),
                  isShowingDriverManifest ? '#15803d' : (isOverloaded ? '#b91c1c' : '#0f172a'),
                  false
                )}
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

            {/* Quick 1-Click Presets */}
            <div style={{ padding: '0.85rem 1.25rem 0.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>
                ⚡ Quick Presets (1-Click Fill & Test A*):
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {PRESET_HUBS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      padding: '4px 8px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: '#1a73e8',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span>+</span> {preset.name.split(' ')[0]} Hub
                  </button>
                ))}
              </div>
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
