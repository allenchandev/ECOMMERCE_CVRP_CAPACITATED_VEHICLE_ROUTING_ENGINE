import React, { useState, useEffect } from 'react';
import {
  Package,
  CheckCircle2,
  Clock,
  MapPin,
  Truck,
  Building2,
  LogOut,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  UserCheck,
  ShieldAlert,
  Navigation
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { aStarSearch, buildAdjacencyList } from '../cvrpEngine';

function createCustomPin(label, color, isHub) {
  const html = `
    <div style="display:inline-flex;align-items:center;gap:4px;background:${color};color:#ffffff;font-weight:700;font-size:11px;padding:3px 8px;border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid #fff;white-space:nowrap;">
      ${isHub ? '🏢 ' : '📍 '}${label}
    </div>
  `;
  return L.divIcon({
    html,
    className: 'custom-map-pin',
    iconSize: [110, 24],
    iconAnchor: [55, 12]
  });
}

// Auto map recentering helper
function AutoRecenter({ boundsLatLngs }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (boundsLatLngs && boundsLatLngs.length > 1) {
      try {
        const bounds = L.latLngBounds(boundsLatLngs);
        map.fitBounds(bounds, { padding: [70, 70], maxZoom: 14 });
      } catch (e) {}
    } else if (boundsLatLngs && boundsLatLngs.length === 1) {
      map.setView(boundsLatLngs[0], 13);
    }
  }, [boundsLatLngs, map]);
  return null;
}

export default function CustomerPortal({
  user,
  orders,
  hubs,
  zones,
  roads,
  dispatchResult,
  onAddOrder,
  onLogout
}) {
  // Order placement form states
  const [recipientName, setRecipientName] = useState(user?.name || 'Alice Munro');
  const [recipientPhone, setRecipientPhone] = useState('+91 98765 43210');
  const [deliveryAddress, setDeliveryAddress] = useState('Flat 402, Green Glen Layout');
  const [selectedZoneId, setSelectedZoneId] = useState(zones[0]?.id || 'ZONE-A');
  const [weightKg, setWeightKg] = useState('8.5');
  const [dimensions, setDimensions] = useState('30x25x15 cm');
  const [packageType, setPackageType] = useState('Electronics / Gadgets');

  // Tracking selection state
  const [trackingOrderId, setTrackingOrderId] = useState(null);
  const [submittedBanner, setSubmittedBanner] = useState(null);

  // Filter orders for the customer
  const customerOrders = orders.filter((o) => {
    if (user?.name && o.customerName) {
      return o.customerName.toLowerCase() === user.name.toLowerCase();
    }
    return o.id === trackingOrderId || o.customerName === 'Alice Munro';
  });

  // Active tracked order defaults to selected, or latest placed order, or first
  const activeTrackedOrder =
    orders.find((o) => o.id === trackingOrderId) ||
    customerOrders[customerOrders.length - 1] ||
    orders[0];

  // Lookup assigned hub and driver from CVRP dispatch result
  const assignedPkg = dispatchResult?.ordersWithAssignedHub?.find((o) => o.id === activeTrackedOrder?.id);
  const assignedHub = hubs.find((h) => h.id === assignedPkg?.assignedHubId) || hubs[0];
  const destZone = zones.find((z) => z.id === activeTrackedOrder?.destinationId) || zones[0];

  const hubPlan = dispatchResult?.hubPlans?.find((hp) => hp.hub.id === assignedHub?.id);
  const driverRoute = hubPlan?.routes?.find((r) => r.stopSequence.some((p) => p.id === activeTrackedOrder?.id));
  const assignedDriver = driverRoute?.driver;

  // Build road network for precise A* path calculation
  const allLocations = [...hubs, ...zones];
  const adj = buildAdjacencyList(allLocations, roads);
  const aStarRes = assignedHub && destZone ? aStarSearch(assignedHub.id, destZone.id, adj, allLocations) : null;
  const pathNodes = aStarRes?.path || [];

  const routeLatLngs = pathNodes.map((id) => {
    const loc = allLocations.find((l) => l.id === id);
    return loc ? [loc.lat, loc.lng] : null;
  }).filter(Boolean);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!recipientName || !weightKg) return;

    const newOrder = {
      customerName: recipientName,
      destinationId: selectedZoneId,
      weight: parseFloat(weightKg),
      dimensions: dimensions || '30x25x15 cm',
      phone: recipientPhone,
      address: deliveryAddress,
      packageType
    };

    const createdOrder = onAddOrder(newOrder);
    if (createdOrder) {
      setTrackingOrderId(createdOrder.id);
      setSubmittedBanner(`🎉 Order #${createdOrder.id} confirmed! Engine auto-allotted nearest fulfillment hub & delivery driver.`);
      setTimeout(() => setSubmittedBanner(null), 6000);
    }
  };

  const boundsLatLngs = routeLatLngs.length > 0
    ? routeLatLngs
    : (destZone ? [[destZone.lat, destZone.lng]] : [[12.9716, 77.5946]]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', background: '#f8fafc' }}>
      
      {/* 1. Customer Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.85rem 1.75rem',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: 42,
            height: 42,
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            color: '#fff',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
          }}>
            <ShoppingBag size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Customer Express Portal
              </h1>
              <span style={{
                background: '#dcfce7',
                color: '#166534',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 9999
              }}>
                Customer Account
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Logged in as: <strong>{user?.name || 'Customer'}</strong> ({user?.email || 'customer@store.com'})
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={onLogout}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#fee2e2',
              border: '1.5px solid #fecaca',
              color: '#991b1b',
              borderRadius: 6,
              padding: '0.5rem 0.9rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <LogOut size={15} /> Logout
          </button>
        </div>
      </header>

      {/* Confirmation Notification Toast */}
      {submittedBanner && (
        <div style={{
          background: '#dcfce7',
          borderBottom: '1px solid #86efac',
          padding: '0.65rem 1.75rem',
          color: '#14532d',
          fontSize: '0.86rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <Sparkles size={16} /> {submittedBanner}
        </div>
      )}

      {/* 2-Column Split: Customer Order Actions & Status (Left) | Nearest Hub & Delivery Tracking Map (Right) */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Side: Order Placement Form & My Order Statuses */}
        <div style={{
          width: '520px',
          minWidth: '480px',
          background: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.25rem',
          gap: '1.25rem'
        }}>
          
          {/* Order Placement Card */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: 12,
            padding: '1.25rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.85rem' }}>
              <div style={{
                background: '#ecfdf5',
                color: '#059669',
                padding: 6,
                borderRadius: 8
              }}>
                <ShoppingBag size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  Place New Order
                </h2>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Enter delivery package details. Nearest hub & driver are automatically assigned.
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Customer Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alice Munro"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #cbd5e1', borderRadius: 6, fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98765 43210"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #cbd5e1', borderRadius: 6, fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Delivery Destination Area
                  </label>
                  <select
                    value={selectedZoneId}
                    onChange={(e) => setSelectedZoneId(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #cbd5e1', borderRadius: 6, fontSize: '0.84rem', background: '#fff' }}
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} ({z.pincode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Street Address
                </label>
                <input
                  type="text"
                  required
                  placeholder="Apartment, Street, Landmark"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #cbd5e1', borderRadius: 6, fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Package Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="60"
                    required
                    placeholder="e.g. 8.5"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #cbd5e1', borderRadius: 6, fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Dimensions (LxWxH)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 30x25x15 cm"
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #cbd5e1', borderRadius: 6, fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Item Category
                </label>
                <select
                  value={packageType}
                  onChange={(e) => setPackageType(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #cbd5e1', borderRadius: 6, fontSize: '0.84rem', background: '#fff' }}
                >
                  <option value="Electronics / Gadgets">Electronics / Gadgets</option>
                  <option value="Apparel & Fashion">Apparel & Fashion</option>
                  <option value="Home & Kitchen Appliance">Home & Kitchen Appliance</option>
                  <option value="Books & Stationery">Books & Stationery</option>
                  <option value="Perishable / Groceries">Perishable / Groceries</option>
                </select>
              </div>

              <button
                type="submit"
                style={{
                  marginTop: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0.7rem 1.25rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)'
                }}
              >
                Place Order & Auto-Assign Nearest Hub <ArrowRight size={16} />
              </button>
            </form>
          </div>

          {/* Customer Orders & Real-Time Status List */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: 12,
            padding: '1.25rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={16} color="#059669" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  My Placed Orders ({customerOrders.length})
                </h3>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Select to view status</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {customerOrders.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: '#64748b', textAlign: 'center', padding: '1rem' }}>
                  No orders placed yet. Submit the form above to dispatch your package!
                </div>
              ) : (
                customerOrders.map((ord) => {
                  const z = zones.find((item) => item.id === ord.destinationId);
                  const isSelected = ord.id === activeTrackedOrder?.id;
                  const alloc = dispatchResult?.ordersWithAssignedHub?.find((o) => o.id === ord.id);
                  const hub = hubs.find((h) => h.id === alloc?.assignedHubId);
                  const hPlan = dispatchResult?.hubPlans?.find((hp) => hp.hub.id === hub?.id);
                  const dRoute = hPlan?.routes?.find((r) => r.stopSequence.some((p) => p.id === ord.id));
                  const driver = dRoute?.driver;

                  return (
                    <div
                      key={ord.id}
                      onClick={() => setTrackingOrderId(ord.id)}
                      style={{
                        padding: '0.75rem 0.85rem',
                        borderRadius: 8,
                        border: isSelected ? '2px solid #059669' : '1px solid #e2e8f0',
                        background: isSelected ? '#f0fdf4' : '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#0f172a' }}>
                          Order #{ord.id}
                        </span>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: '#dcfce7',
                          color: '#15803d',
                          padding: '2px 8px',
                          borderRadius: 4
                        }}>
                          Assigned to Driver
                        </span>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                        📍 Destination: <strong>{z?.name}</strong> (Pincode: {z?.pincode})
                      </div>

                      {/* Display assigned Hub and Driver */}
                      <div style={{
                        marginTop: 6,
                        paddingTop: 6,
                        borderTop: '1px solid #e2e8f0',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 8,
                        fontSize: '0.72rem'
                      }}>
                        <div style={{ background: '#ffffff', padding: '4px 6px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '0.66rem', fontWeight: 700 }}>
                            🏢 NEAREST HUB:
                          </span>
                          <strong style={{ color: '#1a73e8' }}>{hub?.name?.split(' ')[0] || 'Nearest'} Hub</strong>
                        </div>
                        <div style={{ background: '#ecfdf5', padding: '4px 6px', borderRadius: 4, border: '1px solid #a7f3d0' }}>
                          <span style={{ color: '#047857', display: 'block', fontSize: '0.66rem', fontWeight: 700 }}>
                            🚚 ALLOTTED DRIVER:
                          </span>
                          <strong style={{ color: '#059669' }}>{driver ? driver.name : 'Allotted in Route'}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Map displaying ONLY the nearest assigned Hub and the Delivery Destination */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          
          {/* Order Details Header */}
          <div style={{
            padding: '0.75rem 1.25rem',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                  Active Order
                </span>
                <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
                  {activeTrackedOrder?.id} • {activeTrackedOrder?.customerName}
                </div>
              </div>

              <div style={{ height: 28, width: 1, background: '#e2e8f0' }} />

              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                  Nearest Fulfillment Hub
                </span>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1a73e8' }}>
                  🏢 {assignedHub?.name}
                </div>
              </div>

              <div style={{ height: 28, width: 1, background: '#e2e8f0' }} />

              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                  Allotted Driver
                </span>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#059669' }}>
                  🚚 {assignedDriver ? `${assignedDriver.name} (${assignedDriver.id})` : 'Allotted in Delivery Fleet'}
                </div>
              </div>
            </div>

            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: '0.76rem',
              fontWeight: 700,
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <CheckCircle2 size={15} /> Allotted Automatically by CVRP Engine
            </div>
          </div>

          {/* Map Leaflet Canvas displaying ONLY the nearest assigned hub & destination */}
          <div style={{ flex: 1, position: 'relative' }}>
            <MapContainer
              center={destZone ? [destZone.lat, destZone.lng] : [12.9716, 77.5946]}
              zoom={13}
              style={{ width: '100%', height: '100%' }}
              scrollWheelZoom={true}
            >
              <AutoRecenter boundsLatLngs={boundsLatLngs} />

              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* ONLY render the single nearest assigned hub */}
              {assignedHub && (
                <Marker
                  position={[assignedHub.lat, assignedHub.lng]}
                  icon={createCustomPin(assignedHub.name.split(' ')[0] + ' Hub', '#1a73e8', true)}
                >
                  <Popup>
                    <div style={{ padding: '4px 0' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{assignedHub.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{assignedHub.address}</div>
                      <div style={{ fontSize: '0.75rem', marginTop: 4, color: '#16a34a', fontWeight: 700 }}>
                        Allotted Dispatch Hub (Pincode: {assignedHub.pincode})
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* ONLY render the customer delivery destination location */}
              {destZone && (
                <Marker
                  position={[destZone.lat, destZone.lng]}
                  icon={createCustomPin(destZone.name.split(' ')[0], '#059669', false)}
                >
                  <Popup>
                    <div>
                      <strong>{destZone.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Pincode: {destZone.pincode}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 800, marginTop: 4 }}>
                        🎯 Your Delivery Destination
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Route connecting the assigned nearest hub to destination */}
              {routeLatLngs.length > 1 && (
                <Polyline
                  positions={routeLatLngs}
                  color="#059669"
                  weight={5}
                  dashArray="8, 8"
                  opacity={0.85}
                />
              )}
            </MapContainer>

            {/* Floating Order Status Card */}
            <div style={{
              position: 'absolute',
              bottom: 24,
              right: 24,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
              border: '1.5px solid #cbd5e1',
              borderRadius: 12,
              padding: '1rem',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              maxWidth: 360,
              zIndex: 1000
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Truck size={18} color="#059669" />
                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>
                  Live Order Dispatch Status
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>
                Order #{activeTrackedOrder?.id} automatically routed to <strong>{assignedHub?.name}</strong>.
              </p>
              
              <div style={{
                marginTop: 8,
                padding: '8px 10px',
                background: '#f0fdf4',
                borderRadius: 8,
                border: '1px solid #bbf7d0',
                fontSize: '0.75rem',
                color: '#15803d'
              }}>
                <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <UserCheck size={14} /> Assigned Driver: {assignedDriver ? `${assignedDriver.name} (${assignedDriver.id})` : 'Allotted in Route'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#166534', marginTop: 3 }}>
                  Vehicle: {assignedDriver?.vehicle || 'Delivery Van'} • Est. Travel Time: {aStarRes?.time ? `${Math.round(aStarRes.time)} mins` : '15 mins'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
