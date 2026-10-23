import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, FastForward, CheckCircle2, Navigation, Truck, Zap, Info, MapPin } from 'lucide-react';

export default function InteractiveMap({ hubs, zones, roads, hubPlans, selectedHubId }) {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(null);
  const [activeTab, setActiveTab] = useState('full'); // 'full' | 'stepbystep'
  
  // Animation & simulation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [simProgress, setSimProgress] = useState(0); // 0.0 to 1.0
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [animStepIdx, setAnimStepIdx] = useState(0);
  
  const width = 960;
  const height = 580;
  const allLocations = [...hubs, ...zones];

  // Distinct vibrant neon / modern hues for different hubs/drivers
  const HUB_COLORS = {
    'HUB-01': '#6366f1', // Indigo
    'HUB-02': '#06b6d4', // Cyan
    'HUB-03': '#ec4899', // Pink
  };

  const DRIVER_PALETTE = [
    '#38bdf8', // Light sky blue
    '#a855f7', // Purple
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#f43f5e', // Rose
    '#8b5cf6', // Violet
  ];

  // Flatten active routes based on selected hub
  const activeRoutes = selectedHubId
    ? (hubPlans.find(hp => hp.hub.id === selectedHubId)?.routes || [])
    : hubPlans.flatMap(hp => hp.routes);

  // Map route with explicit color
  const coloredRoutes = activeRoutes.map((route, idx) => {
    const hubColor = HUB_COLORS[route.hub.id] || '#64748b';
    const driverColor = DRIVER_PALETTE[idx % DRIVER_PALETTE.length];
    return {
      ...route,
      color: driverColor,
      hubColor,
      index: idx
    };
  });

  // Calculate detailed segment coordinates for each route
  const routeSegments = coloredRoutes.map(r => {
    const points = r.waypoints.map(wpId => {
      const loc = allLocations.find(l => l.id === wpId);
      return loc ? { id: loc.id, name: loc.name, x: loc.x, y: loc.y, isHub: loc.isHub } : null;
    }).filter(Boolean);

    // Compute segment lengths
    let totalLen = 0;
    const segs = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      segs.push({ p1, p2, dist, startDist: totalLen, endDist: totalLen + dist });
      totalLen += dist;
    }

    return { route: r, points, segments: segs, totalLength: totalLen };
  });

  // Animation ticker
  const animRef = useRef(null);
  const lastTimeRef = useRef(null);

  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      lastTimeRef.current = null;
      return;
    }

    const animate = (time) => {
      if (lastTimeRef.current != null) {
        const delta = (time - lastTimeRef.current) / 1000;
        // Total loop time ~ 12 seconds at 1x
        const advance = (delta / 12) * playbackSpeed;
        setSimProgress(prev => {
          const next = prev + advance;
          if (next >= 1) {
            return 1;
          }
          return next;
        });
      }
      lastTimeRef.current = time;
      if (simProgress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, playbackSpeed, simProgress]);

  const handleRestart = () => {
    setSimProgress(0);
    setIsPlaying(true);
  };

  const handleTogglePlay = () => {
    if (simProgress >= 1) {
      setSimProgress(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  // Helper to interpolate position along polyline segments
  const getVehiclePos = (routeSeg, progress) => {
    if (!routeSeg || routeSeg.segments.length === 0) return null;
    const currentDist = progress * routeSeg.totalLength;
    
    // Find active segment
    for (const seg of routeSeg.segments) {
      if (currentDist >= seg.startDist && currentDist <= seg.endDist) {
        const segDist = seg.endDist - seg.startDist;
        const segT = segDist > 0 ? (currentDist - seg.startDist) / segDist : 0;
        const x = seg.p1.x + (seg.p2.x - seg.p1.x) * segT;
        const y = seg.p1.y + (seg.p2.y - seg.p1.y) * segT;
        const angle = Math.atan2(seg.p2.y - seg.p1.y, seg.p2.x - seg.p1.x) * (180 / Math.PI);
        return { x, y, angle, fromNode: seg.p1.id, toNode: seg.p2.id };
      }
    }
    // Return last point
    const last = routeSeg.points[routeSeg.points.length - 1];
    return { x: last.x, y: last.y, angle: 0, fromNode: last.id, toNode: last.id };
  };

  // Algorithm Step-by-Step Explanation Walkthrough
  const algoSteps = [
    {
      step: 1,
      title: "1. Demand Ingestion & Geographic Mapping",
      tag: "Graph Initialization",
      desc: "Incoming customer orders across Bangalore zones (Indiranagar, Whitefield, Koramangala, etc.) are projected onto the regional weighted road network graph with known travel-time weights.",
      badgeColor: "#64748b"
    },
    {
      step: 2,
      title: "2. Dijkstra Multi-Source ETA Calculation",
      tag: "Optimal Hub Assignment",
      desc: "For every order, Dijkstra's priority-queue algorithm computes the exact minimum travel time from each of the 3 regional fulfillment centers (Central, Whitefield, Electronic City). Orders are partitioned to the closest hub.",
      badgeColor: "#6366f1"
    },
    {
      step: 3,
      title: "3. Bin-Packing Capacity Partitioning",
      tag: "Vehicle Constraints",
      desc: "Stationed vehicles at each hub (Electric Vans, Cargo Bikes, Express Scooters) have physical payload capacities (25kg - 60kg). Orders are assigned to preserve load boundaries without vehicle overload.",
      badgeColor: "#0ea5e9"
    },
    {
      step: 4,
      title: "4. Traveling Salesman TSP Tour Optimization",
      tag: "Shortest Route Sequence",
      desc: "For each driver, a greedy Nearest-Neighbor TSP heuristic sequences customer stops into a minimal-duration loop, returning to the origin hub.",
      badgeColor: "#10b981"
    }
  ];

  // Active focused route for detail sidebar or inspect
  const activeFocus = selectedRouteIdx !== null ? coloredRoutes[selectedRouteIdx] : null;

  return (
    <div className="visualizer-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* Control Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        background: '#0f172a',
        color: '#ffffff',
        padding: '0.85rem 1.25rem',
        borderRadius: 12,
        boxShadow: '0 4px 15px rgba(15, 23, 42, 0.15)'
      }}>
        {/* Playback & Step Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={handleTogglePlay}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: isPlaying ? '#ef4444' : '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '0.55rem 1rem',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: isPlaying ? '0 0 12px rgba(239, 68, 68, 0.4)' : '0 0 12px rgba(16, 185, 129, 0.4)'
            }}
          >
            {isPlaying ? <><Pause size={16} /> Pause</> : <><Play size={16} /> {simProgress >= 1 ? 'Replay' : 'Simulate Delivery'}</>}
          </button>

          <button
            onClick={handleRestart}
            title="Reset to Start"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#ffffff',
              borderRadius: 8,
              padding: '0.55rem 0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.85rem'
            }}
          >
            <RotateCcw size={15} /> Reset
          </button>

          {/* Speed toggles */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 2 }}>
            {[1, 2, 4].map(spd => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                style={{
                  background: playbackSpeed === spd ? '#38bdf8' : 'transparent',
                  color: playbackSpeed === spd ? '#0f172a' : '#94a3b8',
                  border: 'none',
                  borderRadius: 6,
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: '0.15s'
                }}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Live Scrubber */}
        <div style={{ flex: 1, minWidth: 200, maxWidth: 380, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
            {(simProgress * 100).toFixed(0)}% Complete
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.005"
            value={simProgress}
            onChange={(e) => {
              setSimProgress(parseFloat(e.target.value));
              setIsPlaying(false);
            }}
            style={{
              flex: 1,
              accentColor: '#38bdf8',
              cursor: 'pointer'
            }}
          />
        </div>

        {/* Algorithm View Modes */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('full')}
            style={{
              background: activeTab === 'full' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              border: activeTab === 'full' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.15)',
              color: activeTab === 'full' ? '#38bdf8' : '#cbd5e1',
              borderRadius: 8,
              padding: '0.45rem 0.8rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🗺️ Live Fleet Animation
          </button>
          <button
            onClick={() => setActiveTab('stepbystep')}
            style={{
              background: activeTab === 'stepbystep' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
              border: activeTab === 'stepbystep' ? '1px solid #c084fc' : '1px solid rgba(255,255,255,0.15)',
              color: activeTab === 'stepbystep' ? '#c084fc' : '#cbd5e1',
              borderRadius: 8,
              padding: '0.45rem 0.8rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ⚡ Algorithm Steps & Tour
          </button>
        </div>
      </div>

      {/* Main SVG Visualization Canvas */}
      <div style={{
        position: 'relative',
        width: '100%',
        minHeight: 560,
        background: 'radial-gradient(ellipse at 40% 30%, #1e293b 0%, #0f172a 100%)',
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid #334155',
        boxShadow: 'inset 0 0 50px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.12)'
      }}>
        
        {/* Step-by-Step Info Floating Drawer */}
        {activeTab === 'stepbystep' && (
          <div style={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 10,
            width: 340,
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            borderRadius: 12,
            padding: '1.25rem',
            color: '#ffffff',
            boxShadow: '0 12px 30px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: '0.95rem' }}>
                <Zap size={18} color="#f59e0b" /> Optimization Pipeline
              </div>
              <span style={{ fontSize: '0.75rem', background: '#334155', padding: '2px 8px', borderRadius: 4, color: '#94a3b8' }}>
                Step {animStepIdx + 1} / {algoSteps.length}
              </span>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.04)',
              borderLeft: `4px solid ${algoSteps[animStepIdx].badgeColor}`,
              borderRadius: 6,
              padding: '0.75rem',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>
                {algoSteps[animStepIdx].title}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                {algoSteps[animStepIdx].desc}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                disabled={animStepIdx === 0}
                onClick={() => setAnimStepIdx(prev => Math.max(0, prev - 1))}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.45rem',
                  borderRadius: 6,
                  cursor: animStepIdx === 0 ? 'not-allowed' : 'pointer',
                  opacity: animStepIdx === 0 ? 0.3 : 1,
                  fontSize: '0.78rem',
                  fontWeight: 700
                }}
              >
                ◀ Previous
              </button>
              <button
                disabled={animStepIdx === algoSteps.length - 1}
                onClick={() => setAnimStepIdx(prev => Math.min(algoSteps.length - 1, prev + 1))}
                style={{
                  flex: 1,
                  background: '#6366f1',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.45rem',
                  borderRadius: 6,
                  cursor: animStepIdx === algoSteps.length - 1 ? 'not-allowed' : 'pointer',
                  opacity: animStepIdx === algoSteps.length - 1 ? 0.3 : 1,
                  fontSize: '0.78rem',
                  fontWeight: 700
                }}
              >
                Next Step ▶
              </button>
            </div>
          </div>
        )}

        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          style={{ display: 'block' }}
        >
          <defs>
            {/* Dark Cyber/Grid Background */}
            <pattern id="cyber-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <circle cx="0" cy="0" r="1.5" fill="rgba(255,255,255,0.06)" />
            </pattern>

            {/* Glowing filter for active paths */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Marker arrow */}
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
            </marker>
          </defs>

          <rect width={width} height={height} fill="url(#cyber-grid)" />

          {/* Base Road Network (Undirected Graph Edges) */}
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
                  stroke="rgba(148, 163, 184, 0.18)"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                />
                {/* Midpoint travel time badge */}
                <rect
                  x={(fromLoc.x + toLoc.x) / 2 - 15}
                  y={(fromLoc.y + toLoc.y) / 2 - 9}
                  width="30"
                  height="18"
                  fill="#1e293b"
                  stroke="rgba(148, 163, 184, 0.3)"
                  strokeWidth="1"
                  rx="4"
                />
                <text
                  x={(fromLoc.x + toLoc.x) / 2}
                  y={(fromLoc.y + toLoc.y) / 2 + 3.5}
                  fill="#94a3b8"
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

          {/* Highlighted Driver Optimized Routes */}
          {coloredRoutes.map((route, rIdx) => {
            const isSelected = selectedRouteIdx === rIdx;
            const pointsStr = route.waypoints.map(wpId => {
              const loc = allLocations.find(l => l.id === wpId);
              return loc ? `${loc.x},${loc.y}` : '';
            }).filter(Boolean).join(' ');

            return (
              <g
                key={`route-path-${route.driver.id}`}
                onClick={() => setSelectedRouteIdx(isSelected ? null : rIdx)}
                style={{ cursor: 'pointer' }}
              >
                {/* Glow underlay */}
                <polyline
                  points={pointsStr}
                  fill="none"
                  stroke={route.color}
                  strokeWidth={isSelected ? "9" : "5"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={isSelected ? "0.85" : "0.35"}
                  filter="url(#glow)"
                />

                {/* Main animated track */}
                <polyline
                  points={pointsStr}
                  fill="none"
                  stroke={route.color}
                  strokeWidth="3.5"
                  strokeDasharray={isPlaying ? "10 6" : "none"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={isSelected ? 1 : 0.8}
                >
                  {isPlaying && (
                    <animate
                      attributeName="stroke-dashoffset"
                      from="100"
                      to="0"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  )}
                </polyline>
              </g>
            );
          })}

          {/* Animated Fleet Vehicles moving along polyline */}
          {routeSegments.map((rSeg, idx) => {
            const vehPos = getVehiclePos(rSeg, simProgress);
            if (!vehPos) return null;
            const isSelected = selectedRouteIdx === idx;
            const route = rSeg.route;

            return (
              <g
                key={`veh-marker-${route.driver.id}`}
                transform={`translate(${vehPos.x}, ${vehPos.y})`}
                style={{ transition: isPlaying ? 'none' : 'transform 0.15s ease' }}
              >
                {/* Pulsing radar ring */}
                <circle
                  r={isSelected ? 22 : 16}
                  fill={route.color}
                  opacity="0.25"
                >
                  <animate
                    attributeName="r"
                    values="14;24;14"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.4;0.05;0.4"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>

                {/* Vehicle icon / pin */}
                <circle
                  r="10"
                  fill="#0f172a"
                  stroke={route.color}
                  strokeWidth="3"
                  filter="url(#glow)"
                />
                
                {/* Driver / Van label */}
                <rect
                  x="-35"
                  y="-28"
                  width="70"
                  height="17"
                  fill="rgba(15, 23, 42, 0.9)"
                  stroke={route.color}
                  strokeWidth="1"
                  rx="4"
                />
                <text
                  x="0"
                  y="-16"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="9.5"
                  fontWeight="800"
                  fontFamily="var(--font-mono)"
                >
                  🚚 {route.driver.id}
                </text>
              </g>
            );
          })}

          {/* Render Nodes (Hubs vs Drop-off Customer Zones) */}
          {allLocations.map((loc) => {
            const isHub = loc.isHub;
            const isHovered = hoveredNode === loc.id;
            const isSelectedHub = selectedHubId === loc.id;
            const hubColor = isHub ? (HUB_COLORS[loc.id] || '#ffffff') : '#ffffff';

            return (
              <g
                key={loc.id}
                transform={`translate(${loc.x}, ${loc.y})`}
                onMouseEnter={() => setHoveredNode(loc.id)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Pulse ring for Hubs */}
                {isHub && (
                  <circle
                    r={isSelectedHub ? "28" : "22"}
                    fill="none"
                    stroke={hubColor}
                    strokeWidth="1.8"
                    strokeDasharray="4 4"
                    opacity={isSelectedHub ? "0.9" : "0.5"}
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0"
                      to="360"
                      dur="25s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* Node Body */}
                <circle
                  r={isHub ? 15 : 9}
                  fill={isHub ? hubColor : (isHovered ? "#38bdf8" : "#1e293b")}
                  stroke={isHub ? "#ffffff" : (isHovered ? "#ffffff" : "#94a3b8")}
                  strokeWidth={isHub ? 3 : 2}
                  filter={isHub || isHovered ? "url(#glow)" : undefined}
                />

                {isHub && (
                  <text
                    textAnchor="middle"
                    y="4"
                    fontSize="11"
                    fill="#0f172a"
                    fontWeight="900"
                  >
                    🏢
                  </text>
                )}

                {/* Location Title */}
                <text
                  y={isHub ? -24 : -16}
                  textAnchor="middle"
                  fill={isHub ? "#ffffff" : (isHovered ? "#38bdf8" : "#e2e8f0")}
                  fontSize={isHub ? 12.5 : 11}
                  fontWeight={isHub ? "800" : "600"}
                  fontFamily="var(--font-sans)"
                  letterSpacing="-0.01em"
                >
                  {loc.name}
                </text>

                {/* Subtitle ID */}
                <text
                  y={isHub ? 32 : 22}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="var(--font-mono)"
                >
                  {loc.id} • {loc.pincode}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Dynamic Fleet Driver Inspector Overlay (Top Right) */}
        <div style={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 320,
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 12,
          padding: '1rem',
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>
              🚗 Live Fleet Dispatch ({coloredRoutes.length} Active)
            </span>
            {selectedRouteIdx !== null && (
              <button
                onClick={() => setSelectedRouteIdx(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Clear Filter
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 220, overflowY: 'auto' }}>
            {coloredRoutes.map((r, idx) => {
              const isSelected = selectedRouteIdx === idx;
              return (
                <div
                  key={r.driver.id}
                  onClick={() => setSelectedRouteIdx(isSelected ? null : idx)}
                  style={{
                    background: isSelected ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                    border: `1.5px solid ${isSelected ? r.color : 'rgba(255, 255, 255, 0.08)'}`,
                    borderRadius: 8,
                    padding: '0.55rem 0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: r.color }} />
                      <strong style={{ fontSize: '0.85rem' }}>{r.driver.name}</strong>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                      {r.totalDurationMins.toFixed(0)}m
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#cbd5e1', marginTop: 4 }}>
                    <span>{r.driver.vehicle} ({r.driver.currentLoad.toFixed(1)}kg)</span>
                    <span style={{ color: '#38bdf8' }}>{r.stopSequence.length} Stops</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend strip at bottom left */}
        <div style={{
          position: 'absolute',
          bottom: 14,
          left: 14,
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 8,
          padding: '6px 14px',
          display: 'flex',
          gap: 16,
          fontSize: '0.78rem',
          color: '#cbd5e1',
          fontWeight: 600
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366f1' }} />
            Hubs (3 Bangalore FCs)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffffff', border: '1px solid #94a3b8' }} />
            Customer Delivery Zones
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 16, height: 2, background: '#38bdf8' }} />
            Optimized TSP Route
          </div>
        </div>

      </div>

      {/* Selected Route Detailed Turn-by-Turn Inspection */}
      {activeFocus && (
        <div style={{
          background: '#ffffff',
          border: `2px solid ${activeFocus.color}`,
          borderRadius: 12,
          padding: '1.25rem',
          boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Truck size={20} color={activeFocus.color} />
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                {activeFocus.driver.name} ({activeFocus.driver.id}) — Detailed Optimized Path
              </h4>
              <span className="badge badge-black" style={{ background: activeFocus.color }}>
                {activeFocus.hub.name}
              </span>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>
              Round-trip Duration: <strong>{activeFocus.totalDurationMins.toFixed(0)} minutes</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', padding: '0.5rem 0' }}>
            {activeFocus.waypoints.map((wpId, idx) => {
              const loc = allLocations.find(l => l.id === wpId);
              const isFirstOrLast = idx === 0 || idx === activeFocus.waypoints.length - 1;
              return (
                <React.Fragment key={`wp-${idx}`}>
                  <div style={{
                    padding: '0.4rem 0.8rem',
                    background: isFirstOrLast ? '#0f172a' : '#f1f5f9',
                    color: isFirstOrLast ? '#ffffff' : '#0f172a',
                    borderRadius: 6,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    border: '1px solid #cbd5e1'
                  }}>
                    {isFirstOrLast ? '🏢 ' : '📍 '}{loc ? loc.name : wpId}
                  </div>
                  {idx < activeFocus.waypoints.length - 1 && (
                    <span style={{ color: '#94a3b8', fontWeight: 800 }}>➔</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
