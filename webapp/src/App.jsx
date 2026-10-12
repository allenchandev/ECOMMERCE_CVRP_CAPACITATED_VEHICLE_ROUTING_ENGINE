import React, { useState } from 'react';
import {
  Truck,
  Package as PackageIcon,
  MapPin,
  Clock,
  Play,
  RotateCcw,
  CheckCircle2,
  Navigation,
  Layers,
  Sparkles,
  Info
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
  const [locations] = useState(INITIAL_LOCATIONS);
  const [roads] = useState(INITIAL_ROADS);
  const [drivers, setDrivers] = useState(INITIAL_DRIVERS);
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  // New order form state
  const [newCustName, setNewCustName] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newDestId, setNewDestId] = useState('ZONE-B');

  // Compute solution directly
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

  return (
    <div className="app-container">
      {/* Header bar */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon">
            <Truck color="#ffffff" size={24} />
          </div>
          <div>
            <h1 className="brand-title">Smart Delivery Routing Engine</h1>
            <div className="brand-subtitle">Bangalore Hub CVRP & Dijkstra Route Optimizer</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={handleReset}>
            <RotateCcw size={15} /> Reset Demo
          </button>
          <button className="btn-primary" onClick={handleRecalculate}>
            <Play size={16} fill="currentColor" /> Recalculate Routes
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Left Column: Orders & Fleet Management */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Quick Metrics */}
          <div className="glass-panel">
            <div className="panel-title-bar">
              <span className="panel-title">
                <PackageIcon size={18} color="#38bdf8" /> Customer Orders
              </span>
              <span className="badge badge-blue">{orders.length} Orders</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.85rem', fontSize: '0.85rem', color: '#94a3b8' }}>
              <span>Total Cargo Weight:</span>
              <strong style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>{totalOrdersWeight.toFixed(1)} kg</strong>
            </div>

            <div className="scroll-list" style={{ maxHeight: '310px' }}>
              {orders.map((ord) => {
                const dest = locations.find(l => l.id === ord.destinationId);
                return (
                  <div key={ord.id} className="order-item-card">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#fff' }}>
                        {ord.customerName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <MapPin size={12} color="#38bdf8" /> {dest?.name || ord.destinationId}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-amber">{ord.weight} kg</span>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
                        {ord.id}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Add Form */}
            <form onSubmit={handleAddOrder} style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                + Add New Package
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  style={{
                    flex: 2,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 8,
                    padding: '0.45rem 0.65rem',
                    color: '#fff',
                    fontSize: '0.8rem'
                  }}
                />
                <input
                  type="number"
                  step="0.5"
                  placeholder="Weight (kg)"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 8,
                    padding: '0.45rem 0.65rem',
                    color: '#fff',
                    fontSize: '0.8rem'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  value={newDestId}
                  onChange={(e) => setNewDestId(e.target.value)}
                  style={{
                    flex: 2,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 8,
                    padding: '0.45rem 0.65rem',
                    color: '#fff',
                    fontSize: '0.8rem'
                  }}
                >
                  {locations.filter(l => !l.isHub).map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.id})</option>
                  ))}
                </select>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '0.45rem 0.65rem', fontSize: '0.78rem' }}>
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Center Column: Interactive Map & Live KPIs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Top KPI row */}
          <div className="metrics-row">
            <div className="metric-card">
              <span className="metric-label">Warehouse Starting Point</span>
              <span className="metric-value" style={{ fontSize: '1.1rem', color: '#f87171' }}>Central Hub (HUB-01)</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Assigned Delivery Drivers</span>
              <span className="metric-value" style={{ color: '#38bdf8' }}>
                {dispatchResult.activeDriversCount || 0} / {drivers.length}
              </span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Total Fleet Drive Time</span>
              <span className="metric-value" style={{ color: '#34d399' }}>
                {dispatchResult.totalFleetDurationMins?.toFixed(0) || 0} mins
              </span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Total Trip Duration</span>
              <span className="metric-value" style={{ color: '#fbbf24' }}>
                {((dispatchResult.totalFleetDurationMins || 0) / 60).toFixed(1)} hrs
              </span>
            </div>
          </div>

          {/* Interactive Map Visualizer */}
          <div className="glass-panel" style={{ padding: '1rem' }}>
            <div className="panel-title-bar" style={{ marginBottom: '0.75rem' }}>
              <span className="panel-title">
                <Navigation size={18} color="#38bdf8" /> Live Road Map & Optimized Routes
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className={`btn-secondary ${selectedPlanId === null ? 'active' : ''}`}
                  onClick={() => setSelectedPlanId(null)}
                >
                  Show All Routes
                </button>
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

        {/* Right Column: Driver Route Plans (Simple English) */}
        <div className="plans-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-panel" style={{ height: '100%' }}>
            <div className="panel-title-bar">
              <span className="panel-title">
                <Sparkles size={18} color="#f59e0b" /> Driver Delivery Schedules
              </span>
              <span className="badge badge-green">Ready to Dispatch</span>
            </div>

            {dispatchResult.error ? (
              <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 8, color: '#fca5a5' }}>
                {dispatchResult.error}
              </div>
            ) : (
              <div className="scroll-list" style={{ maxHeight: '680px' }}>
                {dispatchResult.plans?.map((plan) => {
                  const driver = plan.driver;
                  const isSelected = selectedPlanId === driver.id;
                  const percentUsed = ((driver.currentLoad / driver.maxCapacity) * 100).toFixed(1);

                  return (
                    <div
                      key={driver.id}
                      className="driver-card"
                      style={{
                        borderColor: isSelected ? driver.color : undefined,
                        boxShadow: isSelected ? `0 0 16px ${driver.color}40` : undefined,
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedPlanId(isSelected ? null : driver.id)}
                    >
                      <div className="driver-header">
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: driver.color }}></span>
                            Driver #{plan.routeNumber}: {driver.name}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>
                            {driver.vehicle} • ID: {driver.id}
                          </div>
                        </div>
                        <span className="badge badge-blue">
                          <Clock size={12} /> {plan.totalDurationMins.toFixed(0)} mins trip
                        </span>
                      </div>

                      {/* Capacity progress bar */}
                      <div style={{ marginTop: '0.65rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                          <span>Weight Loaded:</span>
                          <span style={{ color: '#fff', fontWeight: 600 }}>
                            {driver.currentLoad.toFixed(1)} / {driver.maxCapacity.toFixed(1)} kg ({percentUsed}%)
                          </span>
                        </div>
                        <div className="progress-bar-bg">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${percentUsed}%`,
                              backgroundColor: driver.color || '#3b82f6'
                            }}
                          />
                        </div>
                      </div>

                      {/* Delivery Stops in Simple English */}
                      <div style={{ marginTop: '0.85rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                          Order of Deliveries:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {plan.stopSequence.map((pkg, sIdx) => {
                            const dest = locations.find(l => l.id === pkg.destinationId);
                            return (
                              <div
                                key={pkg.id}
                                style={{
                                  background: 'rgba(0, 0, 0, 0.25)',
                                  padding: '0.4rem 0.6rem',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}
                              >
                                <span>
                                  <strong>Step {sIdx + 1}:</strong> Deliver to {dest?.name}
                                </span>
                                <span style={{ color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                                  {pkg.weight} kg
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* GPS Driving Path */}
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '2px' }}>
                          GPS Driving Directions:
                        </div>
                        <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                          {plan.waypoints.join(' ➔ ')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
