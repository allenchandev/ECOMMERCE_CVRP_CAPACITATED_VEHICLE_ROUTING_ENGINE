import React, { useState } from 'react';

export default function InteractiveMap({ hubs, zones, roads, hubPlans, selectedHubId }) {
  const [hoveredNode, setHoveredNode] = useState(null);

  const width = 940;
  const height = 620;
  const allLocations = [...hubs, ...zones];

  // Active routes to display
  const activeRoutes = selectedHubId
    ? (hubPlans.find(hp => hp.hub.id === selectedHubId)?.routes || [])
    : hubPlans.flatMap(hp => hp.routes);

  return (
    <div className="map-canvas-container">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <pattern id="light-grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#f1f5f9" strokeWidth="1" />
          </pattern>
        </defs>

        <rect width={width} height={height} fill="url(#light-grid)" />

        {/* Base Road Connections */}
        {roads.map((road, idx) => {
          const fromLoc = allLocations.find(l => l.id === road.from);
          const toLoc = allLocations.find(l => l.id === road.to);
          if (!fromLoc || !toLoc) return null;

          return (
            <g key={`road-${idx}`}>
              <line
                x1={fromLoc.x}
                y1={fromLoc.y}
                x2={toLoc.x}
                y2={toLoc.y}
                stroke="#cbd5e1"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              <rect
                x={(fromLoc.x + toLoc.x) / 2 - 14}
                y={(fromLoc.y + toLoc.y) / 2 - 9}
                width="28"
                height="17"
                fill="#ffffff"
                stroke="#cbd5e1"
                rx="4"
              />
              <text
                x={(fromLoc.x + toLoc.x) / 2}
                y={(fromLoc.y + toLoc.y) / 2 + 3}
                fill="#64748b"
                fontSize="10"
                fontWeight="700"
                fontFamily="var(--font-mono)"
                textAnchor="middle"
              >
                {road.time}m
              </text>
            </g>
          );
        })}

        {/* Highlighted Driver Routes */}
        {activeRoutes.map((route, rIdx) => {
          const points = route.waypoints.map(wpId => {
            const loc = allLocations.find(l => l.id === wpId);
            return loc ? `${loc.x},${loc.y}` : '';
          }).filter(Boolean).join(' ');

          const strokeDash = rIdx % 2 === 1 ? "8 4" : "none";

          return (
            <g key={`route-${route.driver.id}`}>
              <polyline
                points={points}
                fill="none"
                stroke="#0f172a"
                strokeWidth="3.5"
                strokeDasharray={strokeDash}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.85"
              />
            </g>
          );
        })}

        {/* Render Locations (Hubs vs Drop-off Zones) */}
        {allLocations.map((loc) => {
          const isHub = loc.isHub;
          const isHovered = hoveredNode === loc.id;
          const isSelectedHub = selectedHubId === loc.id;

          return (
            <g
              key={loc.id}
              transform={`translate(${loc.x}, ${loc.y})`}
              onMouseEnter={() => setHoveredNode(loc.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Outer pulsing ring for Hubs */}
              {isHub && (
                <circle
                  r={isSelectedHub ? "26" : "22"}
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              )}

              {/* Node Circle */}
              <circle
                r={isHub ? 15 : 10}
                fill={isHub ? "#0f172a" : (isHovered ? "#0f172a" : "#ffffff")}
                stroke="#0f172a"
                strokeWidth="2.5"
              />

              {/* Label */}
              <text
                y={isHub ? -20 : -16}
                textAnchor="middle"
                fill="#0f172a"
                fontSize={isHub ? 12 : 11}
                fontWeight="800"
                fontFamily="var(--font-sans)"
              >
                {isHub ? `🏢 ${loc.name}` : loc.name}
              </text>

              <text
                y={isHub ? 28 : 22}
                textAnchor="middle"
                fill="#64748b"
                fontSize="10"
                fontWeight="600"
                fontFamily="var(--font-mono)"
              >
                {loc.id} ({loc.pincode})
              </text>
            </g>
          );
        })}
      </svg>

      {/* Clean Legend */}
      <div style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 6,
        padding: '6px 14px',
        display: 'flex',
        gap: 16,
        fontSize: '0.8rem',
        color: '#475569',
        fontWeight: 600
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#0f172a', display: 'inline-block' }}></span>
          Fulfillment Hub (3 Total)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffffff', border: '2px solid #0f172a', display: 'inline-block' }}></span>
          Customer Drop-off Zone
        </div>
      </div>
    </div>
  );
}
