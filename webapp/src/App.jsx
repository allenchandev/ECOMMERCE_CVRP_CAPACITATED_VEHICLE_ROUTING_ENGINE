import React, { useState } from 'react';
import {
  Truck,
  Package as PackageIcon,
  MapPin,
  Clock,
  Play,
  RotateCcw,
  Navigation,
  CheckCircle,
  Plus
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

  // Compute solution
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
      {/* Clean Black & White Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon">
            <Truck size={22} />
          </div>
          <div>
            <h1 className="brand-title">E-Commerce Delivery Routing Engine</h1>
            <div className="brand-subtitle">Bangalore Hub CVRP & Shortest Path Optimizer</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={handleReset}>
            <RotateCcw size={14} /> Reset
          </button>
          <button className="btn-primary" onClick={handleRecalculate}>
            <Play size={14} fill="currentColor" /> Recalculate Routes
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Left Column: Orders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="clean-panel">
            <div className="panel-title-bar">
              <span className="panel-title">
                <PackageIcon size={16} /> Customer Orders
              </span>
              <span className="badge badge-black">{orders.length} Total</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.85rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span>Total Cargo Weight:</span>
              <strong style={{ color: '#0f172a' }}>{totalOrdersWeight.toFixed(1)} kg</strong>
            </div>

            <div className="scroll-list" style={{ maxHeight: '320px' }}>
              {orders.map((ord) => {
                const dest = locations.find(l => l.id === ord.destinationId);
                return (
                  <div key={ord.id} className="order-item-card">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a' }}>
                        {ord.customerName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <MapPin size={12} /> {dest?.name || ord.destinationId}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-light" style={{ fontWeight: 700 }}>
                        {ord.weight} kg
                      </span>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
                        {ord.id}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Simple Add Order Form */}
            <form onSubmit={handleAddOrder} style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                Add New Order
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  style={{
                    flex: 2,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: '0.45rem 0.65rem',
                    color: '#0f172a',
                    fontSize: '0.82rem'
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
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: '0.45rem 0.65rem',
                    color: '#0f172a',
                    fontSize: '0.82rem'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  value={newDestId}
                  onChange={(e) => setNewDestId(e.target.value)}
                  style={{
                    flex: 2,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: '0.45rem 0.65rem',
                    color: '#0f172a',
                    fontSize: '0.82rem'
                  }}
                >
                  {locations.filter(l => !l.isHub).map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.id})</option>
                  ))}
                </select>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '0.45rem 0.65rem', fontSize: '0.82rem' }}>
                  <Plus size={14} /> Add
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Center Column: Map & High-Level KPIs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="metrics-row">
            <div className="metric-card">
              <span className="metric-label">Warehouse</span>
              <span className="metric-value" style={{ fontSize: '1.1rem' }}>Central Hub (HUB-01)</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Assigned Drivers</span>
              <span className="metric-value">
                {dispatchResult.activeDriversCount || 0} / {drivers.length}
              </span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Total Drive Time</span>
              <span className="metric-value">
                {dispatchResult.totalFleetDurationMins?.toFixed(0) || 0} mins
              </span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Total Trip Hours</span>
              <span className="metric-value">
                {((dispatchResult.totalFleetDurationMins || 0) / 60).toFixed(1)} hrs
              </span>
            </div>
          </div>

          {/* Interactive Map */}
          <div className="clean-panel" style={{ padding: '1rem' }}>
            <div className="panel-title-bar" style={{ marginBottom: '0.75rem' }}>
              <span className="panel-title">
                <Navigation size={16} /> Live Road Map
              </span>
              <button
                className={`btn-secondary ${selectedPlanId === null ? 'active' : ''}`}
                onClick={() => setSelectedPlanId(null)}
              >
                Show All Routes
              </button>
            </div>

            <InteractiveMap
              locations={locations}
              roads={roads}
              plans={dispatchResult.plans || []}
              selectedPlanId={selectedPlanId}
            />
          </div>
        </div>

        {/* Right Column: Driver Route Schedules */}
        <div className="plans-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="clean-panel">
            <div className="panel-title-bar">
              <span className="panel-title">
                <Truck size={16} /> Driver Delivery Schedules
              </span>
              <span className="badge badge-light">3 Active</span>
            </div>

            {dispatchResult.error ? (
              <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #f87171', borderRadius: 6, color: '#991b1b' }}>
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
                      className={`driver-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedPlanId(isSelected ? null : driver.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="driver-header">
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>
                            Driver #{plan.routeNumber}: {driver.name}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                            {driver.vehicle} • ID: {driver.id}
                          </div>
                        </div>
                        <span className="badge badge-light">
                          <Clock size={12} /> {plan.totalDurationMins.toFixed(0)} mins
                        </span>
                      </div>

                      {/* Weight progress bar */}
                      <div style={{ marginTop: '0.65rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569' }}>
                          <span>Weight Loaded:</span>
                          <span style={{ color: '#0f172a', fontWeight: 700 }}>
                            {driver.currentLoad.toFixed(1)} / {driver.maxCapacity.toFixed(1)} kg ({percentUsed}%)
                          </span>
                        </div>
                        <div className="progress-bar-bg">
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${percentUsed}%` }}
                          />
                        </div>
                      </div>

                      {/* Plain-English Order of Deliveries */}
                      <div style={{ marginTop: '0.85rem' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                          Order of Deliveries:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {plan.stopSequence.map((pkg, sIdx) => {
                            const dest = locations.find(l => l.id === pkg.destinationId);
                            return (
                              <div
                                key={pkg.id}
                                style={{
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  padding: '0.45rem 0.6rem',
                                  borderRadius: '6px',
                                  fontSize: '0.78rem',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}
                              >
                                <span>
                                  <strong>Step {sIdx + 1}:</strong> Deliver to {dest?.name}
                                </span>
                                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                                  {pkg.weight} kg
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* GPS Driving Directions */}
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '2px', fontWeight: 600 }}>
                          GPS Driving Directions:
                        </div>
                        <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#0f172a', fontWeight: 600 }}>
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
