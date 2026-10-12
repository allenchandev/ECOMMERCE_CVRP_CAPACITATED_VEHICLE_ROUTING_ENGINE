import React, { useState } from 'react';

export default function InteractiveMap({ locations, roads, plans, selectedPlanId }) {
  const [hoveredNode, setHoveredNode] = useState(null);

  // Map coordinate bounds
  const width = 850;
  const height = 620;

  // Active plan waypoint edges
  const activePlan = plans?.find(p => p.driver.id === selectedPlanId);

  return (
    <div className="map-canvas-container">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          {/* Subtle grid pattern */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
          </pattern>
          {/* Glow filter */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background Grid */}
        <rect width={width} height={height} fill="url(#grid)" />

        {/* Render base road network */}
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
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="3"
                strokeDasharray="4 4"
              />
              {/* Road time badge */}
              <text
                x={(fromLoc.x + toLoc.x) / 2}
                y={(fromLoc.y + toLoc.y) / 2 - 6}
                fill="#64748b"
                fontSize="10"
                fontFamily="var(--font-mono)"
                textAnchor="middle"
              >
                {road.time}m
              </text>
            </g>
          );
        })}

        {/* Highlight routes for each active plan */}
        {plans?.map((plan) => {
          const isSelected = !selectedPlanId || selectedPlanId === plan.driver.id;
          const color = plan.driver.color || '#3b82f6';

          const points = plan.waypoints.map(wpId => {
            const loc = locations.find(l => l.id === wpId);
            return loc ? `${loc.x},${loc.y}` : '';
          }).filter(Boolean).join(' ');

          return (
            <g key={`route-${plan.driver.id}`} opacity={isSelected ? 1 : 0.2}>
              <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth={isSelected && selectedPlanId === plan.driver.id ? "5" : "3.5"}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
              />
            </g>
          );
        })}

        {/* Render City Locations / Nodes */}
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
              {/* Outer pulsing ring for Hub */}
              {isHub && (
                <circle
                  r="24"
                  fill="none"
                  stroke="rgba(239, 68, 68, 0.4)"
                  strokeWidth="2"
                >
                  <animate attributeName="r" values="18;28;18" dur="3s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.1;0.8" dur="3s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Node background circle */}
              <circle
                r={isHub ? 16 : 12}
                fill={isHub ? '#ef4444' : '#1e293b'}
                stroke={isHovered ? '#38bdf8' : (isHub ? '#fca5a5' : '#475569')}
                strokeWidth={isHovered ? 3 : 2}
                filter="url(#glow)"
              />

              {/* Inner dot */}
              {!isHub && (
                <circle r="4" fill="#38bdf8" />
              )}

              {/* Node Label */}
              <text
                y={isHub ? -22 : -18}
                textAnchor="middle"
                fill={isHub ? '#fca5a5' : '#f1f5f9'}
                fontSize={isHub ? 12 : 11}
                fontWeight={isHub ? '700' : '600'}
                fontFamily="var(--font-sans)"
              >
                {loc.name}
              </text>

              <text
                y={isHub ? 30 : 25}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="9"
                fontFamily="var(--font-mono)"
              >
                {loc.id} ({loc.pincode})
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating map legend */}
      <div style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
        padding: '8px 12px',
        display: 'flex',
        gap: 12,
        fontSize: '0.75rem',
        color: '#94a3b8'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
          Warehouse Hub
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }}></span>
          Customer Delivery Zone
        </div>
      </div>
    </div>
  );
}
