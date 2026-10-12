import React, { useState } from 'react';

export default function InteractiveMap({ locations, roads, plans, selectedPlanId }) {
  const [hoveredNode, setHoveredNode] = useState(null);

  const width = 850;
  const height = 620;

  return (
    <div className="map-canvas-container">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          {/* Subtle light grid */}
          <pattern id="light-grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#f1f5f9" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Background Grid */}
        <rect width={width} height={height} fill="url(#light-grid)" />

        {/* Render base roads */}
        {roads.map((road, idx) => {
          const fromLoc = locations.find(l => l.id === road.from);
          const toLoc = locations.find(l => l.id === road.to);
          if (!fromLoc || !toLoc) return null;

          return (
            <g key={`road-${idx}`}>
              <line
                x1={fromLoc.x}
                y1={fromLoc.y}
                x2={toLoc.x}
                y2={toLoc.y}
                stroke="#cbd5e1"
                strokeWidth="2.5"
                strokeDasharray="4 4"
              />
              <text
                x={(fromLoc.x + toLoc.x) / 2}
                y={(fromLoc.y + toLoc.y) / 2 - 5}
                fill="#64748b"
                fontSize="11"
                fontWeight="600"
                fontFamily="var(--font-mono)"
                textAnchor="middle"
              >
                {road.time}m
              </text>
            </g>
          );
        })}

        {/* Highlight routes */}
        {plans?.map((plan) => {
          const isSelected = !selectedPlanId || selectedPlanId === plan.driver.id;
          
          // Clear, distinct stroke styles for white background
          const strokeColor = "#0f172a";
          const strokeWidth = selectedPlanId === plan.driver.id ? "4.5" : "3";
          const strokeDash = plan.routeNumber === 2 ? "6 4" : (plan.routeNumber === 3 ? "10 5" : "none");

          const points = plan.waypoints.map(wpId => {
            const loc = locations.find(l => l.id === wpId);
            return loc ? `${loc.x},${loc.y}` : '';
          }).filter(Boolean).join(' ');

          return (
            <g key={`route-${plan.driver.id}`} opacity={isSelected ? 1 : 0.15}>
              <polyline
                points={points}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDash}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          );
        })}

        {/* Render Locations */}
        {locations.map((loc) => {
          const isHub = loc.isHub;
          const isHovered = hoveredNode === loc.id;

          return (
            <g
              key={loc.id}
              transform={`translate(${loc.x}, ${loc.y})`}
              onMouseEnter={() => setHoveredNode(loc.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Warehouse indicator */}
              {isHub && (
                <circle
                  r="22"
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              )}

              {/* Node Circle */}
              <circle
                r={isHub ? 14 : 10}
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
                fontWeight="700"
                fontFamily="var(--font-sans)"
              >
                {loc.name}
              </text>

              <text
                y={isHub ? 26 : 22}
                textAnchor="middle"
                fill="#64748b"
                fontSize="10"
                fontWeight="500"
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
        padding: '6px 12px',
        display: 'flex',
        gap: 14,
        fontSize: '0.78rem',
        color: '#475569',
        fontWeight: 500
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#0f172a', display: 'inline-block' }}></span>
          Warehouse Hub
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffffff', border: '2px solid #0f172a', display: 'inline-block' }}></span>
          Delivery Zone
        </div>
      </div>
    </div>
  );
}
