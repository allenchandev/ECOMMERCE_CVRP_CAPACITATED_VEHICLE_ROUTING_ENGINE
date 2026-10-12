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
  Layers
} from 'lucide-react';
import InteractiveMap from './components/InteractiveMap';
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
    { num: 1, title: 'Step 1: Network Hubs & Orders', desc: '3 Hubs + Incoming Packages' },
    { num: 2, title: 'Step 2: Nearest Hub Allocation', desc: 'Orders assigned to closest hub' },
    { num: 3, title: 'Step 3: Multi-Hub Route Map', desc: 'Dijkstra shortest paths' },
    { num: 4, title: 'Step 4: Driver Schedules by Hub', desc: 'Vehicle capacity & itineraries' }
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
            <h1 className="brand-title">Multi-Hub E-Commerce Routing Engine</h1>
            <div className="brand-subtitle">Bangalore Regional Network • Nearest Hub Allocation & Fleet Optimization</div>
          </div>
        </div>

        <button className="btn-secondary" onClick={handleReset}>
          <RotateCcw size={15} /> Reset to Defaults
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
                  <h2 className="step-heading">Step 1: Delivery Hubs & Incoming Customer Orders</h2>
                  <p className="step-subheading">
                    We operate 3 regional fulfillment hubs across Bangalore. Incoming customer packages are automatically routed from the closest one.
                  </p>
                </div>
                <span className="badge badge-black" style={{ padding: '0.4rem 0.8rem' }}>
                  {hubs.length} Hubs • {orders.length} Orders ({totalOrdersWeight.toFixed(1)} kg)
                </span>
              </div>

              {/* 3 Hubs Showcase */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.8rem', textTransform: 'uppercase', color: '#475569' }}>
                  Active Fulfillment Centers:
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  {hubs.map(hub => {
                    const assignedDrivers = drivers.filter(d => d.hubId === hub.id);
                    return (
                      <div key={hub.id} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '1rem', borderLeft: '5px solid #0f172a' }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem' }}>{hub.name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>{hub.address} • Pincode: {hub.pincode}</div>
                        <div style={{ marginTop: '0.65rem', display: 'flex', gap: 6, fontSize: '0.78rem' }}>
                          <span className="badge badge-light">ID: {hub.id}</span>
                          <span className="badge badge-black">{assignedDrivers.length} Stationed Drivers</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Orders Grid */}
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.8rem', textTransform: 'uppercase', color: '#475569' }}>
                Customer Orders Waiting for Dispatch:
              </h3>
              <div className="orders-table-grid">
                {orders.map((ord) => {
                  const dest = zones.find(z => z.id === ord.destinationId);
                  return (
                    <div key={ord.id} className="order-box">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{ord.customerName}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>{ord.id}</div>
                        </div>
                        <span style={{ background: '#0f172a', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: '0.8rem' }}>
                          {ord.weight} kg
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#334155' }}>
                        <MapPin size={14} /> <span><strong>Deliver to:</strong> {dest?.name} ({dest?.id})</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Pincode: {dest?.pincode} • Dimensions: {ord.dimensions}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Order form */}
              <div style={{ marginTop: '2rem', padding: '1.25rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>+ Add Another Package</h3>
                <form onSubmit={handleAddOrder} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    style={{ flex: 2, minWidth: 200, padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: 6 }}
                  />
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Weight (kg)"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    style={{ flex: 1, minWidth: 120, padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: 6 }}
                  />
                  <select
                    value={newDestId}
                    onChange={(e) => setNewDestId(e.target.value)}
                    style={{ flex: 2, minWidth: 220, padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: 6 }}
                  >
                    {zones.map(z => (
                      <option key={z.id} value={z.id}>{z.name} ({z.id})</option>
                    ))}
                  </select>
                  <button type="submit" className="btn-primary">
                    <Plus size={16} /> Add Order
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ================= STEP 2: NEAREST HUB ALLOCATION ================= */}
          {currentStep === 2 && (
            <div>
              <div className="step-header-banner">
                <div>
                  <h2 className="step-heading">Step 2: Nearest Hub Allocation (Dijkstra Shortest Path)</h2>
                  <p className="step-subheading">
                    The engine computes the shortest road distance from each hub to the customer and assigns the order to the nearest fulfillment center.
                  </p>
                </div>
                <button className="btn-primary" onClick={handleRecalculate}>
                  <Play size={14} fill="currentColor" /> Re-allocate
                </button>
              </div>

              {/* 3 Hub Distribution Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                {dispatchResult.hubPlans.map(hp => {
                  const hub = hp.hub;
                  const totalKg = hp.orders.reduce((sum, o) => sum + o.weight, 0);

                  return (
                    <div key={hub.id} style={{ border: '2px solid #0f172a', borderRadius: 10, padding: '1.25rem', background: '#ffffff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>{hub.name}</span>
                        <span className="badge badge-black">{hp.orders.length} Orders</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
                        Hub ID: <strong>{hub.id}</strong> • Total Load: <strong>{totalKg.toFixed(1)} kg</strong>
                      </div>

                      <div style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                          Assigned Packages (Closest by travel time):
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '250px', overflowY: 'auto' }}>
                          {hp.orders.length === 0 ? (
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>No orders closest to this hub today.</div>
                          ) : (
                            hp.orders.map(ord => {
                              const dest = zones.find(z => z.id === ord.destinationId);
                              return (
                                <div key={ord.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.45rem 0.65rem', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                                  <div>
                                    <strong>{ord.customerName}</strong> ➔ {dest?.name}
                                  </div>
                                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                                    {ord.distanceToHubMins.toFixed(0)}m away
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= STEP 3: MULTI-HUB MAP ================= */}
          {currentStep === 3 && (
            <div>
              <div className="step-header-banner">
                <div>
                  <h2 className="step-heading">Step 3: Multi-Hub Route Map & Network Visualization</h2>
                  <p className="step-subheading">
                    View Bangalore delivery routes originating independently from each of the 3 fulfillment hubs.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className={`btn-secondary ${selectedHubId === null ? 'active' : ''}`}
                    onClick={() => setSelectedHubId(null)}
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
                  >
                    All Hubs
                  </button>
                  {hubs.map(h => (
                    <button
                      key={h.id}
                      className={`btn-secondary ${selectedHubId === h.id ? 'active' : ''}`}
                      onClick={() => setSelectedHubId(h.id)}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
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
                  <h2 className="step-heading">Step 4: Final Driver Dispatch Schedules by Hub</h2>
                  <p className="step-subheading">
                    Each driver receives an optimized sequence of drop-offs starting and finishing at their home hub.
                  </p>
                </div>
                <span className="badge badge-black" style={{ padding: '0.4rem 0.8rem' }}>
                  Total Fleet Time: {dispatchResult.totalFleetDurationMins.toFixed(0)} mins
                </span>
              </div>

              {/* Driver schedules grouped by hub */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {dispatchResult.hubPlans.map(hp => {
                  const hub = hp.hub;
                  if (hp.routes.length === 0) return null;

                  return (
                    <div key={hub.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem' }}>
                        <Building2 size={20} />
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{hub.name} ({hub.id})</h3>
                        <span className="badge badge-light" style={{ marginLeft: 'auto' }}>
                          {hp.routes.length} Active Vehicles • {hp.hubDurationMins.toFixed(0)} mins
                        </span>
                      </div>

                      <div className="drivers-grid">
                        {hp.routes.map((route, rIdx) => {
                          const driver = route.driver;
                          const percentUsed = ((driver.currentLoad / driver.maxCapacity) * 100).toFixed(1);

                          return (
                            <div key={driver.id} className="driver-detail-card">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                                    {driver.name}
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                                    {driver.vehicle} • ID: {driver.id}
                                  </div>
                                </div>
                                <span className="badge badge-light" style={{ fontWeight: 700 }}>
                                  {route.totalDurationMins.toFixed(0)} mins
                                </span>
                              </div>

                              {/* Capacity Bar */}
                              <div style={{ margin: '0.85rem 0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                                  <span style={{ color: '#64748b' }}>Capacity:</span>
                                  <strong>{driver.currentLoad.toFixed(1)} / {driver.maxCapacity.toFixed(1)} kg ({percentUsed}%)</strong>
                                </div>
                                <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                                  <div style={{ width: `${percentUsed}%`, height: '100%', background: '#0f172a' }} />
                                </div>
                              </div>

                              {/* Drop off sequence */}
                              <div style={{ marginTop: '1rem' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', marginBottom: '0.4rem' }}>
                                  Drop-Off Order:
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                  {route.stopSequence.map((pkg, sIdx) => {
                                    const dest = zones.find(z => z.id === pkg.destinationId);
                                    return (
                                      <div
                                        key={pkg.id}
                                        style={{
                                          background: '#f8fafc',
                                          border: '1px solid #e2e8f0',
                                          padding: '0.5rem 0.7rem',
                                          borderRadius: 6,
                                          fontSize: '0.8rem'
                                        }}
                                      >
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <strong>Stop {sIdx + 1}: {dest?.name}</strong>
                                          <span style={{ fontWeight: 700 }}>{pkg.weight} kg</span>
                                        </div>
                                        <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: 2 }}>
                                          Customer: {pkg.customerName} ({pkg.id})
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Waypoint Directions */}
                              <div style={{ marginTop: '1rem', paddingTop: '0.65rem', borderTop: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, marginBottom: 4 }}>
                                  GPS Road Directions:
                                </div>
                                <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0f172a', wordBreak: 'break-word' }}>
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

            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#64748b' }}>
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
