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
  Compass,
  Layers,
  Scale
} from 'lucide-react';
import InteractiveMap from './components/InteractiveMap';
import OptimalPathFinder from './components/OptimalPathFinder';
import {
  INITIAL_HUBS,
  INITIAL_ZONES,
  INITIAL_ROADS,
  INITIAL_DRIVERS,
  INITIAL_ORDERS,
  solveMultiHubCVRP
} from './cvrpEngine';

export default function App() {
  const [currentStep, setCurrentStep] = useState(2); // start on step 2 for user focus
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
    { num: 1, title: 'Fulfillment Hubs & Packages', desc: 'Warehouses, inventory & demand' },
    { num: 2, title: 'Directed Graph Routing (A* / Dijkstra)', desc: 'Weighted vector optimization' },
    { num: 3, title: 'Multi-Vehicle Delivery Fleet', desc: 'Turn-by-turn road simulation' },
    { num: 4, title: 'Vehicle Payload & Schedules', desc: 'Capacity limits & stop sequences' }
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
            <h1 className="brand-title">Bangalore E-Commerce Logistics Dispatcher</h1>
            <div className="brand-subtitle">Multi-Hub Capacitated Vehicle Routing System (CVRP)</div>
          </div>
        </div>

        <button className="btn-secondary" onClick={handleReset}>
          <RotateCcw size={15} /> Reset System
        </button>
      </header>

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
                  <h2 className="step-heading">Regional Fulfillment Hubs & Order Backlog</h2>
                  <p className="step-subheading">
                    Active fulfillment centers across Bangalore and pending package shipments waiting for vehicle dispatch.
                  </p>
                </div>
                <span className="badge badge-black" style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}>
                  {hubs.length} Hubs • {orders.length} Packages ({totalOrdersWeight.toFixed(1)} kg Total)
                </span>
              </div>

              {/* 3 Hubs Showcase */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.8rem', textTransform: 'uppercase', color: '#94a3b8' }}>
                  Fulfillment Warehouses:
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
                  {hubs.map((hub, idx) => {
                    const assignedDrivers = drivers.filter(d => d.hubId === hub.id);
                    const colorStrip = idx === 0 ? '#6366f1' : (idx === 1 ? '#06b6d4' : '#ec4899');
                    return (
                      <div key={hub.id} style={{ background: '#0d1527', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '1.2rem', borderLeft: `5px solid ${colorStrip}` }}>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#ffffff' }}>{hub.name}</div>
                        <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 3 }}>{hub.address} • {hub.pincode}</div>
                        <div style={{ marginTop: '0.85rem', display: 'flex', gap: 8, fontSize: '0.8rem' }}>
                          <span className="badge badge-light">ID: {hub.id}</span>
                          <span className="badge badge-black">{assignedDrivers.length} Stationed Vehicles</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Orders Grid */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8' }}>
                  Pending Orders ({orders.length}):
                </h3>
              </div>

              <div className="orders-table-grid">
                {orders.map((ord) => {
                  const dest = zones.find(z => z.id === ord.destinationId);
                  return (
                    <div key={ord.id} className="order-box">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '1rem', color: '#ffffff' }}>{ord.customerName}</strong>
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>{ord.id}</div>
                        </div>
                        <span style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', color: '#38bdf8', padding: '2px 8px', borderRadius: 4, fontWeight: 800, fontSize: '0.8rem' }}>
                          {ord.weight} kg
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.86rem', color: '#cbd5e1', background: 'rgba(255,255,255,0.03)', padding: '0.45rem 0.65rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
                        <MapPin size={15} color="#38bdf8" /> <span><strong>Destination:</strong> {dest?.name}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        Pincode: {dest?.pincode} • Dimensions: {ord.dimensions}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Order form */}
              <div style={{ marginTop: '2rem', padding: '1.25rem', background: '#0d1527', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.75rem', color: '#ffffff' }}>
                  + Add Package to Dispatch Queue
                </h3>
                <form onSubmit={handleAddOrder} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    style={{ flex: 2, minWidth: 200, padding: '0.65rem 0.85rem', background: '#070c18', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', borderRadius: 8, fontSize: '0.9rem' }}
                  />
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Weight (kg)"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    style={{ flex: 1, minWidth: 120, padding: '0.65rem 0.85rem', background: '#070c18', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', borderRadius: 8, fontSize: '0.9rem' }}
                  />
                  <select
                    value={newDestId}
                    onChange={(e) => setNewDestId(e.target.value)}
                    style={{ flex: 2, minWidth: 220, padding: '0.65rem 0.85rem', background: '#070c18', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', borderRadius: 8, fontSize: '0.9rem' }}
                  >
                    {zones.map(z => (
                      <option key={z.id} value={z.id}>{z.name} ({z.id})</option>
                    ))}
                  </select>
                  <button type="submit" className="btn-primary">
                    <Plus size={16} /> Add Package
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ================= STEP 2: DIRECTED GRAPH VECTOR ROUTING ================= */}
          {currentStep === 2 && (
            <div>
              <div className="step-header-banner">
                <div>
                  <h2 className="step-heading">Directed Weighted Graph Routing (A* & Dijkstra)</h2>
                  <p className="step-subheading">
                    The algorithm calculates the exact minimum-weight road path from fulfillment hubs to customer drop-off points.
                  </p>
                </div>
                <button className="btn-primary" onClick={handleRecalculate}>
                  <RotateCcw size={15} /> Recalculate Graph
                </button>
              </div>

              {/* Single dedicated, unified visualizer */}
              <OptimalPathFinder
                hubs={hubs}
                zones={zones}
                roads={roads}
                orders={orders}
              />
            </div>
          )}

          {/* ================= STEP 3: MULTI-HUB MAP ================= */}
          {currentStep === 3 && (
            <div>
              <div className="step-header-banner">
                <div>
                  <h2 className="step-heading">Multi-Vehicle Delivery Fleet Simulation</h2>
                  <p className="step-subheading">
                    Simulate Bangalore delivery vehicles executing optimized turn-by-turn routes departing and returning to regional hubs.
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
                  <h2 className="step-heading">Fleet Capacity Constraints & Dispatch Schedules</h2>
                  <p className="step-subheading">
                    Vehicle payload limits (25kg - 60kg) and turn-by-turn waypoint itineraries sequenced by Traveling Salesman (TSP).
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span className="badge badge-black" style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}>
                    Total Fleet Driving Time: {dispatchResult.totalFleetDurationMins.toFixed(0)} mins
                  </span>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.6rem' }}>
                        <Building2 size={22} color={colorStrip} />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>{hub.name} ({hub.id})</h3>
                        <span className="badge badge-light" style={{ marginLeft: 'auto', fontWeight: 700 }}>
                          {hp.routes.length} Active Vehicles • {hp.hubDurationMins.toFixed(0)} mins
                        </span>
                      </div>

                      <div className="drivers-grid">
                        {hp.routes.map((route) => {
                          const driver = route.driver;
                          const percentUsed = ((driver.currentLoad / driver.maxCapacity) * 100).toFixed(1);

                          return (
                            <div key={driver.id} className="driver-detail-card" style={{ borderLeft: `5px solid ${colorStrip}` }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                                    {driver.name}
                                  </div>
                                  <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 2 }}>
                                    Vehicle: <strong>{driver.vehicle}</strong> ({driver.id})
                                  </div>
                                </div>
                                <span className="badge badge-black" style={{ fontWeight: 800, color: '#38bdf8' }}>
                                  ⏱️ {route.totalDurationMins.toFixed(0)} mins
                                </span>
                              </div>

                              {/* Capacity Bar */}
                              <div style={{ margin: '1rem 0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 5 }}>
                                  <span style={{ color: '#94a3b8' }}>Capacity Utilized:</span>
                                  <strong style={{ color: '#ffffff' }}>
                                    {driver.currentLoad.toFixed(1)} / {driver.maxCapacity.toFixed(1)} kg ({percentUsed}%)
                                  </strong>
                                </div>
                                <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                                  <div style={{ width: `${Math.min(100, percentUsed)}%`, height: '100%', background: colorStrip, borderRadius: 4 }} />
                                </div>
                              </div>

                              {/* Drop off sequence */}
                              <div style={{ marginTop: '1rem' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '0.5rem' }}>
                                  Optimized Stop Order:
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                  {route.stopSequence.map((pkg, sIdx) => {
                                    const dest = zones.find(z => z.id === pkg.destinationId);
                                    return (
                                      <div
                                        key={pkg.id}
                                        style={{
                                          background: 'rgba(255,255,255,0.03)',
                                          border: '1px solid rgba(255,255,255,0.06)',
                                          padding: '0.55rem 0.8rem',
                                          borderRadius: 8,
                                          fontSize: '0.82rem'
                                        }}
                                      >
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <strong style={{ color: '#ffffff' }}>Stop {sIdx + 1}: {dest?.name}</strong>
                                          <span style={{ fontWeight: 800, color: '#38bdf8' }}>{pkg.weight} kg</span>
                                        </div>
                                        <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: 2 }}>
                                          Customer: {pkg.customerName} ({pkg.id})
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Waypoint Directions */}
                              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, marginBottom: 4, textTransform: 'uppercase' }}>
                                  Turn-by-Turn Waypoints:
                                </div>
                                <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8', wordBreak: 'break-word', background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.75rem', borderRadius: 6 }}>
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
              <ArrowLeft size={16} /> Previous
            </button>

            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#94a3b8' }}>
              Phase {currentStep} of 4
            </span>

            <button
              className="btn-primary"
              onClick={() => setCurrentStep(prev => Math.min(4, prev + 1))}
              disabled={currentStep === 4}
              style={{ opacity: currentStep === 4 ? 0.4 : 1, cursor: currentStep === 4 ? 'not-allowed' : 'pointer' }}
            >
              Next Phase <ArrowRight size={16} />
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
