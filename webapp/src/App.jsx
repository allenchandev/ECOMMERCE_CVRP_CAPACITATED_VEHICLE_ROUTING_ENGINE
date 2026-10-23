import React, { useState } from 'react';
import {
  Package as PackageIcon,
  Truck,
  MapPin,
  Clock,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Building2,
  Plus,
  Play,
  CheckCircle2,
  Info,
  Zap,
  HelpCircle,
  ShieldCheck,
  Scale
} from 'lucide-react';
import InteractiveMap from './components/InteractiveMap';
import HubAllocationGame from './components/HubAllocationGame';
import {
  INITIAL_HUBS,
  INITIAL_ZONES,
  INITIAL_ROADS,
  INITIAL_DRIVERS,
  INITIAL_ORDERS,
  solveMultiHubCVRP
} from './cvrpEngine';

export default function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [hubs] = useState(INITIAL_HUBS);
  const [zones] = useState(INITIAL_ZONES);
  const [roads] = useState(INITIAL_ROADS);
  const [drivers] = useState(INITIAL_DRIVERS);
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [selectedHubId, setSelectedHubId] = useState(null);

  // New order form
  const [newCustName, setNewCustName] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newDestId, setNewDestId] = useState('ZONE-D');

  // Solution computation
  const [dispatchResult, setDispatchResult] = useState(() =>
    solveMultiHubCVRP(INITIAL_HUBS, INITIAL_ZONES, INITIAL_ROADS, INITIAL_ORDERS, INITIAL_DRIVERS)
  );

  const handleRecalculate = () => {
    const result = solveMultiHubCVRP(hubs, zones, roads, orders, drivers);
    setDispatchResult(result);
  };

  const handleAddOrder = (e) => {
    e.preventDefault();
    if (!newCustName || !newWeight) return;

    const newOrder = {
      id: `ORD-${Math.floor(100 + Math.random() * 900)}`,
      destinationId: newDestId,
      weight: parseFloat(newWeight),
      dimensions: '30x20x15 cm',
      customerName: newCustName
    };

    const updated = [...orders, newOrder];
    setOrders(updated);
    setDispatchResult(solveMultiHubCVRP(hubs, zones, roads, updated, drivers));
    setNewCustName('');
    setNewWeight('');
  };

  const handleReset = () => {
    setOrders(INITIAL_ORDERS);
    setSelectedHubId(null);
    setDispatchResult(solveMultiHubCVRP(INITIAL_HUBS, INITIAL_ZONES, INITIAL_ROADS, INITIAL_ORDERS, INITIAL_DRIVERS));
  };

  const totalOrdersWeight = orders.reduce((sum, o) => sum + o.weight, 0);

  const steps = [
    { num: 1, title: 'Step 1: Warehouses & Orders', desc: 'Where packages start and who needs them' },
    { num: 2, title: 'Step 2: Assign Closest Warehouse', desc: 'Orders matched to the nearest hub' },
    { num: 3, title: 'Step 3: Watch Vehicles Deliver', desc: 'Live animated routes & optimal paths' },
    { num: 4, title: 'Step 4: Driver Schedules', desc: 'Load limits & turn-by-turn itinerary' }
  ];

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="brand-title">E-Commerce Smart Delivery Dispatcher</h1>
            <div className="brand-subtitle">Bangalore Delivery Fleet • Finds the fastest, shortest routes automatically</div>
          </div>
        </div>

        <button className="btn-secondary" onClick={handleReset}>
          <RotateCcw size={15} /> Reset Demo Data
        </button>
      </header>

      {/* Visual Pipeline Bar: Explains the entire concept in 1 glance */}
      <div className="pipeline-overview-bar">
        <div className="pipeline-card">
          <div>
            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.05em' }}>
              How This Delivery Engine Solves Routes:
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', marginTop: 2 }}>
              4-Step Automated Logistics Flow
            </div>
          </div>

          <div className="pipeline-steps-flow">
            <div className={`pipeline-node ${currentStep === 1 ? 'active-pipe' : ''}`}>
              <span>📦 1. Collect Orders</span>
            </div>
            <span style={{ color: '#64748b' }}>➔</span>
            <div className={`pipeline-node ${currentStep === 2 ? 'active-pipe' : ''}`}>
              <span>🏢 2. Nearest Hub (Dijkstra)</span>
            </div>
            <span style={{ color: '#64748b' }}>➔</span>
            <div className={`pipeline-node ${currentStep === 3 ? 'active-pipe' : ''}`}>
              <span>🚚 3. Shortest Route Tour</span>
            </div>
            <span style={{ color: '#64748b' }}>➔</span>
            <div className={`pipeline-node ${currentStep === 4 ? 'active-pipe' : ''}`}>
              <span>📋 4. Driver Dispatch</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stepper Progress Tabs */}
      <div className="stepper-nav">
        {steps.map((s) => (
          <div
            key={s.num}
            className={`step-tab ${currentStep === s.num ? 'active' : ''}`}
            onClick={() => setCurrentStep(s.num)}
          >
            <div className="step-number">{s.num}</div>
            <div>
              <div className="step-title">{s.title}</div>
              <div className="step-desc">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Container */}
      <main className="step-container">
        <div className="step-content-card">

          {/* ================= STEP 1: MULTI-HUBS & ORDERS ================= */}
          {currentStep === 1 && (
            <div>
              <div className="step-header-banner">
                <div>
                  <h2 className="step-heading">Step 1: Delivery Hubs & Incoming Customer Orders</h2>
                  <p className="step-subheading">
                    We have <strong>3 fulfillment warehouses</strong> in Bangalore. Every morning, customers place orders across the city that need to be packaged and sent out.
                  </p>
                </div>
                <span className="badge badge-black" style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}>
                  {hubs.length} Hubs • {orders.length} Orders ({totalOrdersWeight.toFixed(1)} kg Total)
                </span>
              </div>

              {/* Explainer Banner */}
              <div className="explainer-banner">
                <Info size={20} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div className="explainer-banner-title">What happens here?</div>
                  <div className="explainer-banner-text">
                    Instead of driving across the whole city from one place, Bangalore is split between <strong>3 regional warehouses</strong> (Central, Whitefield, and Electronic City). You can add new customer packages below or proceed to Step 2 to see how the system picks the best hub.
                  </div>
                </div>
              </div>

              {/* 3 Hubs Showcase */}
              <div style={{ marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.8rem', textTransform: 'uppercase', color: '#475569' }}>
                  🏢 The 3 Regional Hubs (Where Drivers Start):
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
                  {hubs.map((hub, idx) => {
                    const assignedDrivers = drivers.filter(d => d.hubId === hub.id);
                    const colorStrip = idx === 0 ? '#6366f1' : (idx === 1 ? '#06b6d4' : '#ec4899');
                    return (
                      <div key={hub.id} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10, padding: '1.2rem', borderLeft: `6px solid ${colorStrip}` }}>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{hub.name}</div>
                        <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 3 }}>{hub.address} • Pincode: {hub.pincode}</div>
                        <div style={{ marginTop: '0.85rem', display: 'flex', gap: 8, fontSize: '0.8rem' }}>
                          <span className="badge badge-light">ID: {hub.id}</span>
                          <span className="badge badge-black">{assignedDrivers.length} Delivery Vehicles</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Orders Grid */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', color: '#475569' }}>
                  📦 Customer Packages Waiting to be Delivered ({orders.length} items):
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Click "Next Step" below to see where each package gets assigned!
                </span>
              </div>

              <div className="orders-table-grid">
                {orders.map((ord) => {
                  const dest = zones.find(z => z.id === ord.destinationId);
                  return (
                    <div key={ord.id} className="order-box">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{ord.customerName}</strong>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>Package ID: {ord.id}</div>
                        </div>
                        <span style={{ background: '#0f172a', color: '#fff', padding: '3px 9px', borderRadius: 6, fontWeight: 800, fontSize: '0.82rem' }}>
                          {ord.weight} kg
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', color: '#1e293b', background: '#ffffff', padding: '0.45rem 0.65rem', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                        <MapPin size={15} color="#2563eb" /> <span><strong>Destination:</strong> {dest?.name} ({dest?.id})</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Area Pincode: {dest?.pincode} • Box Size: {ord.dimensions}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Order form */}
              <div style={{ marginTop: '2.5rem', padding: '1.5rem', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.6rem' }}>
                  <Plus size={18} color="#2563eb" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Try adding a custom order:</h3>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                  Add a package for any area in Bangalore. The routing engine will instantly recalculate the optimal hub and vehicle route!
                </p>
                <form onSubmit={handleAddOrder} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Customer Name (e.g. Rahul Sharma)"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    style={{ flex: 2, minWidth: 220, padding: '0.7rem 0.9rem', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem' }}
                  />
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Weight in kg (e.g. 15)"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    style={{ flex: 1, minWidth: 140, padding: '0.7rem 0.9rem', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem' }}
                  />
                  <select
                    value={newDestId}
                    onChange={(e) => setNewDestId(e.target.value)}
                    style={{ flex: 2, minWidth: 230, padding: '0.7rem 0.9rem', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem', background: '#fff' }}
                  >
                    {zones.map(z => (
                      <option key={z.id} value={z.id}>{z.name} ({z.id})</option>
                    ))}
                  </select>
                  <button type="submit" className="btn-primary">
                    <Plus size={16} /> Add to Dispatch List
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ================= STEP 2: NEAREST HUB ALLOCATION (ARGON AI + GAME) ================= */}
          {currentStep === 2 && (
            <div>
              <div className="step-header-banner">
                <div>
                  <h2 className="step-heading">Step 2: Assigning Packages to Closest Warehouse (Argon AI)</h2>
                  <p className="step-subheading">
                    Run the <strong>Argon AI Neural Solver</strong> to auto-allocate packages using Dijkstra shortest paths, or play the <strong>Dispatcher Challenge</strong> game to test your instincts against the algorithm!
                  </p>
                </div>
                <button className="btn-primary" onClick={handleRecalculate}>
                  <Play size={14} fill="currentColor" /> Recalculate
                </button>
              </div>

              {/* Explainer Banner */}
              <div className="explainer-banner">
                <HelpCircle size={20} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div className="explainer-banner-title">Why Nearest-Hub Partitioning is Critical:</div>
                  <div className="explainer-banner-text">
                    Dispatching a Whitefield customer from an Electronic City hub would waste hours in traffic. By partitioning packages via <strong>Argon AI's Dijkstra graph matrix</strong>, our Bangalore fleet saves up to 45% in delivery duration.
                  </div>
                </div>
              </div>

              {/* Gamified & Argon AI Solver Component */}
              <HubAllocationGame
                hubs={hubs}
                zones={zones}
                roads={roads}
                orders={orders}
                onApplyAllocation={handleRecalculate}
              />
            </div>
          )}

          {/* ================= STEP 3: MULTI-HUB MAP ================= */}
          {currentStep === 3 && (
            <div>
              <div className="step-header-banner">
                <div>
                  <h2 className="step-heading">Step 3: Live Animated Delivery Route Visualizer</h2>
                  <p className="step-subheading">
                    Hit <strong>"Simulate Delivery"</strong> to see all vehicles leave their hubs and deliver along their optimal turn-by-turn routes! Click any vehicle or route to see its detailed sequence.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className={`btn-secondary ${selectedHubId === null ? 'active' : ''}`}
                    onClick={() => setSelectedHubId(null)}
                    style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
                  >
                    All Hubs
                  </button>
                  {hubs.map(h => (
                    <button
                      key={h.id}
                      className={`btn-secondary ${selectedHubId === h.id ? 'active' : ''}`}
                      onClick={() => setSelectedHubId(h.id)}
                      style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
                    >
                      {h.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Explainer Banner */}
              <div className="explainer-banner">
                <Zap size={20} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div className="explainer-banner-title">How the visualizer works:</div>
                  <div className="explainer-banner-text">
                    • <strong>Green Play Button:</strong> Animates the electric delivery vans and bikes along their real road routes.<br />
                    • <strong>Slider Bar:</strong> Scrub backwards and forwards in time to inspect any delivery.<br />
                    • <strong>Speed Buttons:</strong> 1x, 2x, or 4x fast-forward.<br />
                    • <strong>Algorithm Steps:</strong> Click "⚡ Algorithm Steps & Tour" in the top bar for a guided walkthrough of Dijkstra and TSP!
                  </div>
                </div>
              </div>

              {/* Map View */}
              <InteractiveMap
                hubs={hubs}
                zones={zones}
                roads={roads}
                hubPlans={dispatchResult.hubPlans}
                selectedHubId={selectedHubId}
              />
            </div>
          )}

          {/* ================= STEP 4: DRIVER SCHEDULES BY HUB ================= */}
          {currentStep === 4 && (
            <div>
              <div className="step-header-banner">
                <div>
                  <h2 className="step-heading">Step 4: Final Driver Dispatch Schedules & Itineraries</h2>
                  <p className="step-subheading">
                    Each driver has strict weight capacities (25kg - 60kg). The engine packs packages into vehicles without overloading them and gives every driver an exact sequence of stops.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button className="btn-secondary" onClick={() => setCurrentStep(3)}>
                    🗺️ Back to Live Animation
                  </button>
                  <span className="badge badge-black" style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}>
                    Total Fleet Driving Time: {dispatchResult.totalFleetDurationMins.toFixed(0)} mins
                  </span>
                </div>
              </div>

              {/* Explainer Banner */}
              <div className="explainer-banner">
                <Scale size={20} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div className="explainer-banner-title">Capacitated Vehicle Routing (CVRP):</div>
                  <div className="explainer-banner-text">
                    Notice how each driver's cargo capacity bar stays safely below 100%. Deliveries are ordered using a <strong>Nearest-Neighbor Traveling Salesman heuristic</strong> so drivers minimize backtrack time.
                  </div>
                </div>
              </div>

              {/* Driver schedules grouped by hub */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {dispatchResult.hubPlans.map((hp, idx) => {
                  const hub = hp.hub;
                  if (hp.routes.length === 0) return null;
                  const colorStrip = idx === 0 ? '#6366f1' : (idx === 1 ? '#06b6d4' : '#ec4899');

                  return (
                    <div key={hub.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.2rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.6rem' }}>
                        <Building2 size={22} color={colorStrip} />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{hub.name} ({hub.id})</h3>
                        <span className="badge badge-light" style={{ marginLeft: 'auto', fontWeight: 700 }}>
                          {hp.routes.length} Active Vehicles • {hp.hubDurationMins.toFixed(0)} mins driving
                        </span>
                      </div>

                      <div className="drivers-grid">
                        {hp.routes.map((route, rIdx) => {
                          const driver = route.driver;
                          const percentUsed = ((driver.currentLoad / driver.maxCapacity) * 100).toFixed(1);

                          return (
                            <div key={driver.id} className="driver-detail-card" style={{ borderLeft: `6px solid ${colorStrip}` }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                                    {driver.name}
                                  </div>
                                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>
                                    Vehicle: <strong>{driver.vehicle}</strong> (ID: {driver.id})
                                  </div>
                                </div>
                                <span className="badge badge-light" style={{ fontWeight: 800, color: '#0f172a' }}>
                                  ⏱️ {route.totalDurationMins.toFixed(0)} mins
                                </span>
                              </div>

                              {/* Capacity Bar */}
                              <div style={{ margin: '1rem 0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 5 }}>
                                  <span style={{ color: '#64748b', fontWeight: 600 }}>Cargo Load Capacity:</span>
                                  <strong style={{ color: driver.currentLoad > driver.maxCapacity ? '#ef4444' : '#0f172a' }}>
                                    {driver.currentLoad.toFixed(1)} / {driver.maxCapacity.toFixed(1)} kg ({percentUsed}%)
                                  </strong>
                                </div>
                                <div style={{ height: 10, background: '#e2e8f0', borderRadius: 5, overflow: 'hidden' }}>
                                  <div style={{ width: `${Math.min(100, percentUsed)}%`, height: '100%', background: colorStrip, borderRadius: 5 }} />
                                </div>
                              </div>

                              {/* Drop off sequence */}
                              <div style={{ marginTop: '1.1rem' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', marginBottom: '0.5rem' }}>
                                  Stop-by-Stop Order:
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                  {route.stopSequence.map((pkg, sIdx) => {
                                    const dest = zones.find(z => z.id === pkg.destinationId);
                                    return (
                                      <div
                                        key={pkg.id}
                                        style={{
                                          background: '#f8fafc',
                                          border: '1px solid #e2e8f0',
                                          padding: '0.55rem 0.8rem',
                                          borderRadius: 8,
                                          fontSize: '0.82rem'
                                        }}
                                      >
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <strong style={{ color: '#0f172a' }}>Stop {sIdx + 1}: {dest?.name}</strong>
                                          <span style={{ fontWeight: 800, color: '#475569' }}>{pkg.weight} kg</span>
                                        </div>
                                        <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 2 }}>
                                          Customer: {pkg.customerName} ({pkg.id})
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Waypoint Directions */}
                              <div style={{ marginTop: '1.1rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: 4, textTransform: 'uppercase' }}>
                                  GPS Road Turns:
                                </div>
                                <div style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0f172a', wordBreak: 'break-word', background: '#f1f5f9', padding: '0.5rem 0.75rem', borderRadius: 6 }}>
                                  {route.waypoints.join(' ➔ ')}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="step-nav-footer">
            <button
              className="btn-secondary"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              style={{ opacity: currentStep === 1 ? 0.4 : 1, cursor: currentStep === 1 ? 'not-allowed' : 'pointer' }}
            >
              <ArrowLeft size={16} /> Previous Step
            </button>

            <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#475569' }}>
              Step {currentStep} of 4
            </span>

            <button
              className="btn-primary"
              onClick={() => setCurrentStep(prev => Math.min(4, prev + 1))}
              disabled={currentStep === 4}
              style={{ opacity: currentStep === 4 ? 0.4 : 1, cursor: currentStep === 4 ? 'not-allowed' : 'pointer' }}
            >
              Next Step <ArrowRight size={16} />
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
