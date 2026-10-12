import React, { useState } from 'react';
import {
  Package as PackageIcon,
  Truck,
  MapPin,
  Clock,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  Navigation,
  Plus,
  Play,
  FileCheck
} from 'lucide-react';
import InteractiveMap from './components/InteractiveMap';
import {
  INITIAL_LOCATIONS,
  INITIAL_ROADS,
  INITIAL_DRIVERS,
  INITIAL_ORDERS,
  solveCVRP
} from './cvrpEngine';

export default function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [locations] = useState(INITIAL_LOCATIONS);
  const [roads] = useState(INITIAL_ROADS);
  const [drivers, setDrivers] = useState(INITIAL_DRIVERS);
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  // New order form
  const [newCustName, setNewCustName] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newDestId, setNewDestId] = useState('ZONE-B');

  // Solution computation
  const [dispatchResult, setDispatchResult] = useState(() =>
    solveCVRP('HUB-01', INITIAL_ORDERS, INITIAL_DRIVERS, INITIAL_LOCATIONS, INITIAL_ROADS)
  );

  const handleRecalculate = () => {
    const result = solveCVRP('HUB-01', orders, drivers, locations, roads);
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
    setDispatchResult(solveCVRP('HUB-01', updated, drivers, locations, roads));
    setNewCustName('');
    setNewWeight('');
  };

  const handleReset = () => {
    setOrders(INITIAL_ORDERS);
    setDrivers(INITIAL_DRIVERS);
    setSelectedPlanId(null);
    setDispatchResult(solveCVRP('HUB-01', INITIAL_ORDERS, INITIAL_DRIVERS, INITIAL_LOCATIONS, INITIAL_ROADS));
  };

  const totalOrdersWeight = orders.reduce((sum, o) => sum + o.weight, 0);

  const steps = [
    { num: 1, title: 'Step 1: Customer Orders', desc: 'Incoming packages & destination' },
    { num: 2, title: 'Step 2: City Map & Roads', desc: 'Distances & travel times' },
    { num: 3, title: 'Step 3: Route Optimization', desc: 'Dijkstra & Capacity Allocation' },
    { num: 4, title: 'Step 4: Driver Schedules', desc: 'Turn-by-turn dispatch plan' }
  ];

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon">
            <Truck size={24} />
          </div>
          <div>
            <h1 className="brand-title">E-Commerce Delivery Routing System</h1>
            <div className="brand-subtitle">Step-by-Step Delivery Planning & Route Optimization</div>
          </div>
        </div>

        <button className="btn-secondary" onClick={handleReset}>
          <RotateCcw size={15} /> Reset to Defaults
        </button>
      </header>

      {/* Stepper Progress Bar */}
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

      {/* Step Content View */}
      <main className="step-container">
        <div className="step-content-card">

          {/* ================= STEP 1: INCOMING ORDERS ================= */}
          {currentStep === 1 && (
            <div>
              <div className="step-header-banner">
                <div>
                  <h2 className="step-heading">Step 1: Review Customer Packages to Deliver</h2>
                  <p className="step-subheading">
                    Here are all the orders received from customers today, along with their weights and drop-off zones.
                  </p>
                </div>
                <span className="badge badge-black" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                  {orders.length} Orders | Total: {totalOrdersWeight.toFixed(1)} kg
                </span>
              </div>

              {/* Order Cards */}
              <div className="orders-table-grid">
                {orders.map((ord) => {
                  const dest = locations.find(l => l.id === ord.destinationId);
                  return (
                    <div key={ord.id} className="order-box">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{ord.customerName}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                            {ord.id}
                          </div>
                        </div>
                        <span style={{ background: '#0f172a', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: '0.8rem' }}>
                          {ord.weight} kg
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#334155', marginTop: 4 }}>
                        <MapPin size={14} />
                        <span><strong>Deliver to:</strong> {dest?.name} ({dest?.id})</span>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Pincode: {dest?.pincode} • Dimensions: {ord.dimensions}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Package Box */}
              <div style={{ marginTop: '2rem', padding: '1.25rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>+ Add Another Package</h3>
                <form onSubmit={handleAddOrder} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    style={{ flex: '2', minWidth: 200, padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: 6 }}
                  />
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Weight (kg)"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    style={{ flex: '1', minWidth: 120, padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: 6 }}
                  />
                  <select
                    value={newDestId}
                    onChange={(e) => setNewDestId(e.target.value)}
                    style={{ flex: '2', minWidth: 220, padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: 6 }}
                  >
                    {locations.filter(l => !l.isHub).map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.id})</option>
                    ))}
                  </select>
                  <button type="submit" className="btn-primary">
                    <Plus size={16} /> Add Order
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ================= STEP 2: CITY MAP & ROADS ================= */}
          {currentStep === 2 && (
            <div>
              <div className="step-header-banner">
                <div>
                  <h2 className="step-heading">Step 2: City Road Network & Travel Times</h2>
                  <p className="step-subheading">
                    The map shows the Central Warehouse Hub and connected zones with estimated travel times in minutes.
                  </p>
                </div>
                <span className="badge badge-black" style={{ padding: '0.4rem 0.8rem' }}>
                  {locations.length} Locations • {roads.length} Roads
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
                <InteractiveMap
                  locations={locations}
                  roads={roads}
                  plans={[]}
                  selectedPlanId={null}
                />

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.75rem' }}>Direct Road Travel Times</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '420px', overflowY: 'auto' }}>
                    {roads.map((r, i) => {
                      const from = locations.find(l => l.id === r.from);
                      const to = locations.find(l => l.id === r.to);
                      return (
                        <div key={i} style={{ padding: '0.5rem 0.75rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{from?.name} ↔ {to?.name}</span>
                          <strong>{r.time} mins</strong>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: OPTIMIZATION RESULTS ================= */}
          {currentStep === 3 && (
            <div>
              <div className="step-header-banner">
                <div>
                  <h2 className="step-heading">Step 3: Route Optimization & Vehicle Allocation</h2>
                  <p className="step-subheading">
                    Packages are grouped by vehicle weight limits, and Dijkstra's algorithm finds the shortest delivery route.
                  </p>
                </div>
                <button className="btn-primary" onClick={handleRecalculate}>
                  <Play size={15} fill="currentColor" /> Recalculate Now
                </button>
              </div>

              {/* Summary Stats Strip */}
              <div className="summary-strip">
                <div className="summary-metric">
                  <div className="summary-metric-label">Warehouse Starting Point</div>
                  <div className="summary-metric-val" style={{ fontSize: '1.15rem' }}>Central Hub (HUB-01)</div>
                </div>
                <div className="summary-metric">
                  <div className="summary-metric-label">Packages Assigned</div>
                  <div className="summary-metric-val">{dispatchResult.totalOrdersCount} / {orders.length}</div>
                </div>
                <div className="summary-metric">
                  <div className="summary-metric-label">Active Delivery Drivers</div>
                  <div className="summary-metric-val">{dispatchResult.activeDriversCount} Drivers</div>
                </div>
                <div className="summary-metric">
                  <div className="summary-metric-label">Combined Fleet Driving Time</div>
                  <div className="summary-metric-val">
                    {dispatchResult.totalFleetDurationMins?.toFixed(0)} mins ({((dispatchResult.totalFleetDurationMins || 0) / 60).toFixed(1)} hrs)
                  </div>
                </div>
              </div>

              {/* Optimized Map */}
              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Optimized Delivery Routes on Map:</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className={`btn-secondary ${selectedPlanId === null ? 'active' : ''}`}
                      onClick={() => setSelectedPlanId(null)}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      Show All Drivers
                    </button>
                    {dispatchResult.plans?.map((p) => (
                      <button
                        key={p.driver.id}
                        className={`btn-secondary ${selectedPlanId === p.driver.id ? 'active' : ''}`}
                        onClick={() => setSelectedPlanId(p.driver.id)}
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        Driver #{p.routeNumber}
                      </button>
                    ))}
                  </div>
                </div>

                <InteractiveMap
                  locations={locations}
                  roads={roads}
                  plans={dispatchResult.plans || []}
                  selectedPlanId={selectedPlanId}
                />
              </div>
            </div>
          )}

          {/* ================= STEP 4: DRIVER DISPATCH SCHEDULES ================= */}
          {currentStep === 4 && (
            <div>
              <div className="step-header-banner">
                <div>
                  <h2 className="step-heading">Step 4: Final Driver Delivery Schedules</h2>
                  <p className="step-subheading">
                    Clear, turn-by-turn drop-off instructions given to each driver before leaving the warehouse.
                  </p>
                </div>
                <span className="badge badge-black" style={{ padding: '0.4rem 0.8rem' }}>
                  All 3 Drivers Dispatched
                </span>
              </div>

              {/* 3 Driver Columns */}
              <div className="drivers-grid">
                {dispatchResult.plans?.map((plan) => {
                  const driver = plan.driver;
                  const percentUsed = ((driver.currentLoad / driver.maxCapacity) * 100).toFixed(1);

                  return (
                    <div key={driver.id} className="driver-detail-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                            Driver #{plan.routeNumber}: {driver.name}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>
                            {driver.vehicle} • ID: {driver.id}
                          </div>
                        </div>
                        <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 700 }}>
                          {plan.totalDurationMins.toFixed(0)} mins
                        </span>
                      </div>

                      {/* Weight Progress Bar */}
                      <div style={{ margin: '1rem 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                          <span style={{ color: '#64748b' }}>Cargo Capacity:</span>
                          <strong>{driver.currentLoad.toFixed(1)} / {driver.maxCapacity.toFixed(1)} kg ({percentUsed}%)</strong>
                        </div>
                        <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${percentUsed}%`, height: '100%', background: '#0f172a' }} />
                        </div>
                      </div>

                      {/* Step by Step Deliveries */}
                      <div style={{ marginTop: '1.25rem' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', marginBottom: '0.5rem' }}>
                          Drop-Off Order:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {plan.stopSequence.map((pkg, idx) => {
                            const dest = locations.find(l => l.id === pkg.destinationId);
                            return (
                              <div
                                key={pkg.id}
                                style={{
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  padding: '0.65rem 0.8rem',
                                  borderRadius: 6,
                                  fontSize: '0.82rem'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <strong>Stop {idx + 1}: {dest?.name}</strong>
                                  <span style={{ fontWeight: 700 }}>{pkg.weight} kg</span>
                                </div>
                                <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 3 }}>
                                  Customer: {pkg.customerName} ({pkg.id})
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Turn-by-Turn GPS Waypoints */}
                      <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: 4 }}>
                          GPS Road Directions:
                        </div>
                        <div style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0f172a', wordBreak: 'break-word' }}>
                          {plan.waypoints.join(' ➔ ')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Next/Prev Phase Navigation */}
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
