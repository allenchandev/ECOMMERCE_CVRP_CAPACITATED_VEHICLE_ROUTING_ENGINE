import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
  Zap,
  Target,
  Compass,
  CheckCircle2,
  Info
} from 'lucide-react';
import { aStarSearch, dijkstraWithSteps, buildAdjacencyList, euclideanHeuristic } from '../cvrpEngine';

export default function DirectedGraphVisualizer({ hubs, zones, roads, orders }) {
  const [algorithm, setAlgorithm] = useState('astar'); // 'astar' | 'dijkstra'
  const [selectedSource, setSelectedSource] = useState('HUB-01');
  const [selectedTarget, setSelectedTarget] = useState('ZONE-D');
  const [isPlaying, setIsPlaying] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [speedMs, setSpeedMs] = useState(600); // ms per step

  const width = 940;
  const height = 520;
  const allLocations = [...hubs, ...zones];
  const adj = buildAdjacencyList(allLocations, roads);

  // Compute full execution steps based on algorithm
  const result = algorithm === 'astar'
    ? aStarSearch(selectedSource, selectedTarget, adj, allLocations)
    : dijkstraWithSteps(selectedSource, selectedTarget, adj);

  const steps = result.steps || [];
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)] || null;

  // Nodes visited up to currentStep
  const visitedNodesUpToStep = new Set();
  const openSetNodes = new Set();
  const closedSetNodes = new Set();

  for (let i = 0; i <= stepIndex && i < steps.length; i++) {
    const s = steps[i];
    visitedNodesUpToStep.add(s.currentNode);
    if (s.openSet) s.openSet.forEach(n => openSetNodes.add(n));
    if (s.closedSet) s.closedSet.forEach(n => closedSetNodes.add(n));
  }

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    if (stepIndex >= steps.length - 1) {
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setStepIndex(prev => prev + 1);
    }, speedMs);

    return () => clearTimeout(timer);
  }, [isPlaying, stepIndex, steps.length, speedMs]);

  const handleStartSim = () => {
    setStepIndex(0);
    setIsPlaying(true);
  };

  const handleTogglePlay = () => {
    if (stepIndex >= steps.length - 1) {
      setStepIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  // Find destination coordinates
  const targetLoc = allLocations.find(l => l.id === selectedTarget);

  return (
    <div style={{
      background: 'radial-gradient(ellipse at 50% 20%, #0d1527 0%, #060a12 100%)',
      border: '2px solid #1e293b',
      borderRadius: 16,
      padding: '1.4rem',
      color: '#ffffff',
      boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      position: 'relative'
    }}>
      {/* Visual Header & Algorithm Selector */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: algorithm === 'astar' ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : 'linear-gradient(135deg, #ec4899, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)'
          }}>
            {algorithm === 'astar' ? <Compass size={24} color="#fff" /> : <Cpu size={24} color="#fff" />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#ffffff' }}>
                Directed Weighted Graph Explorer
              </span>
              <span style={{
                fontSize: '0.72rem',
                background: algorithm === 'astar' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(236, 72, 153, 0.2)',
                color: algorithm === 'astar' ? '#38bdf8' : '#f472b6',
                border: `1px solid ${algorithm === 'astar' ? '#38bdf8' : '#f472b6'}`,
                padding: '2px 8px',
                borderRadius: 16,
                fontWeight: 800
              }}>
                {algorithm === 'astar' ? 'A* (h(n) Guided)' : "Dijkstra's Greedy"}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
              Visualizing edge weights, vector directions, and priority queue node expansions
            </div>
          </div>
        </div>

        {/* Algorithm Switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.06)', padding: 4, borderRadius: 10 }}>
          <button
            onClick={() => { setAlgorithm('astar'); setStepIndex(0); setIsPlaying(false); }}
            style={{
              background: algorithm === 'astar' ? '#0284c7' : 'transparent',
              color: algorithm === 'astar' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: 8,
              padding: '0.5rem 1rem',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            ⭐ A* Heuristic Search
          </button>
          <button
            onClick={() => { setAlgorithm('dijkstra'); setStepIndex(0); setIsPlaying(false); }}
            style={{
              background: algorithm === 'dijkstra' ? '#8b5cf6' : 'transparent',
              color: algorithm === 'dijkstra' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: 8,
              padding: '0.5rem 1rem',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            📊 Dijkstra Shortest Path
          </button>
        </div>
      </div>

      {/* Origin, Destination & Stepping Controls Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: '0.85rem 1.25rem'
      }}>
        {/* Source and Target Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 800 }}>Start Hub:</span>
            <select
              value={selectedSource}
              onChange={(e) => { setSelectedSource(e.target.value); setStepIndex(0); setIsPlaying(false); }}
              style={{
                background: '#0f172a',
                color: '#38bdf8',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: '0.4rem 0.8rem',
                fontSize: '0.85rem',
                fontWeight: 700
              }}
            >
              {hubs.map(h => (
                <option key={h.id} value={h.id}>{h.name.split(' ')[0]} ({h.id})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 800 }}>Target Drop-off:</span>
            <select
              value={selectedTarget}
              onChange={(e) => { setSelectedTarget(e.target.value); setStepIndex(0); setIsPlaying(false); }}
              style={{
                background: '#0f172a',
                color: '#f43f5e',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: '0.4rem 0.8rem',
                fontSize: '0.85rem',
                fontWeight: 700
              }}
            >
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.name} ({z.id})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Playback Controls */}
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
              padding: '0.5rem 1rem',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: isPlaying ? '0 0 12px rgba(239, 68, 68, 0.4)' : '0 0 12px rgba(16, 185, 129, 0.4)'
            }}
          >
            {isPlaying ? <><Pause size={15} /> Pause</> : <><Play size={15} /> {stepIndex >= steps.length - 1 ? 'Replay' : 'Run Graph Search'}</>}
          </button>

          <button
            onClick={() => { setStepIndex(0); setIsPlaying(false); }}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#cbd5e1',
              borderRadius: 8,
              padding: '0.5rem 0.75rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={14} />
          </button>

          {/* Stepping Scrubber */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
              Step {stepIndex + 1}/{steps.length || 1}
            </span>
            <input
              type="range"
              min="0"
              max={Math.max(0, steps.length - 1)}
              value={stepIndex}
              onChange={(e) => {
                setStepIndex(parseInt(e.target.value));
                setIsPlaying(false);
              }}
              style={{ width: 110, accentColor: '#38bdf8' }}
            />
          </div>
        </div>
      </div>

      {/* SVG Canvas for Directed Weighted Graph */}
      <div style={{
        position: 'relative',
        width: '100%',
        minHeight: 460,
        background: '#040711',
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid rgba(56, 189, 248, 0.15)',
        boxShadow: 'inset 0 0 60px rgba(0,0,0,0.8)'
      }}>
        
        {/* Floating Metrics / Cost Explainer Overlay */}
        <div style={{
          position: 'absolute',
          top: 14,
          left: 14,
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 10,
          padding: '0.85rem 1.15rem',
          color: '#ffffff',
          zIndex: 10,
          fontSize: '0.82rem',
          minWidth: 260
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <strong style={{ color: '#38bdf8' }}>
              {algorithm === 'astar' ? 'f(n) = g(n) + h(n)' : 'Dijkstra dist(u)'}
            </strong>
            <span style={{ fontSize: '0.72rem', background: '#1e293b', padding: '2px 6px', borderRadius: 4, color: '#94a3b8' }}>
              {currentStep?.action === 'TARGET_REACHED' ? '🎯 Target Reached' : '🔄 Searching Node'}
            </span>
          </div>

          {currentStep && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.78rem' }}>
              <div>Currently Visiting: <strong style={{ color: '#f59e0b' }}>{currentStep.currentNode}</strong></div>
              {algorithm === 'astar' ? (
                <>
                  <div>g(n) (True Road Time): <strong>{currentStep.currentG?.toFixed(1)} mins</strong></div>
                  <div>f(n) (Estimated Total): <strong>{currentStep.currentF?.toFixed(1)} mins</strong></div>
                </>
              ) : (
                <div>Current Known Cost: <strong>{currentStep.distance?.toFixed(1)} mins</strong></div>
              )}
            </div>
          )}

          {stepIndex >= steps.length - 1 && result.path.length > 0 && (
            <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)', color: '#10b981', fontWeight: 800 }}>
              Optimal Path Found: {result.time.toFixed(1)} mins
            </div>
          )}
        </div>

        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          style={{ display: 'block' }}
        >
          <defs>
            {/* Cyber graph grid */}
            <pattern id="graph-cyber-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <circle cx="0" cy="0" r="1" fill="rgba(56, 189, 248, 0.1)" />
            </pattern>

            {/* Glowing filter */}
            <filter id="vector-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Directed Arrows */}
            <marker id="arrow-default" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="rgba(148, 163, 184, 0.5)" />
            </marker>

            <marker id="arrow-optimal" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
            </marker>
          </defs>

          <rect width={width} height={height} fill="url(#graph-cyber-grid)" />

          {/* Directed Weighted Roads */}
          {roads.map((road, idx) => {
            const fromLoc = allLocations.find(l => l.id === road.from);
            const toLoc = allLocations.find(l => l.id === road.to);
            if (!fromLoc || !toLoc) return null;

            // Check if this edge is in the optimal path
            let isOptimalEdge = false;
            if (result.path && stepIndex >= steps.length - 1) {
              for (let i = 0; i < result.path.length - 1; i++) {
                if ((result.path[i] === road.from && result.path[i + 1] === road.to) ||
                    (result.path[i] === road.to && result.path[i + 1] === road.from)) {
                  isOptimalEdge = true;
                  break;
                }
              }
            }

            // Directed arrow midpoint
            const mx = (fromLoc.x + toLoc.x) / 2;
            const my = (fromLoc.y + toLoc.y) / 2;

            return (
              <g key={`d-edge-${idx}`}>
                {/* Directed line with arrowheads */}
                <line
                  x1={fromLoc.x}
                  y1={fromLoc.y}
                  x2={toLoc.x}
                  y2={toLoc.y}
                  stroke={isOptimalEdge ? '#38bdf8' : 'rgba(148, 163, 184, 0.22)'}
                  strokeWidth={isOptimalEdge ? 4 : 2}
                  strokeDasharray={isOptimalEdge ? 'none' : '4 4'}
                  markerEnd={isOptimalEdge ? 'url(#arrow-optimal)' : 'url(#arrow-default)'}
                  filter={isOptimalEdge ? 'url(#vector-glow)' : undefined}
                />

                {/* Road Weight Badge (Minutes) */}
                <rect
                  x={mx - 16}
                  y={my - 10}
                  width="32"
                  height="20"
                  fill="#090d16"
                  stroke={isOptimalEdge ? '#38bdf8' : 'rgba(148, 163, 184, 0.4)'}
                  strokeWidth="1"
                  rx="5"
                />
                <text
                  x={mx}
                  y={my + 4}
                  fill={isOptimalEdge ? '#38bdf8' : '#cbd5e1'}
                  fontSize="10"
                  fontWeight="800"
                  fontFamily="var(--font-mono)"
                  textAnchor="middle"
                >
                  {road.time}m
                </text>
              </g>
            );
          })}

          {/* Graph Nodes (Hubs & Zones with Weights/Heuristics) */}
          {allLocations.map((loc) => {
            const isSource = loc.id === selectedSource;
            const isTarget = loc.id === selectedTarget;
            const isCurrent = currentStep?.currentNode === loc.id;
            const isVisited = visitedNodesUpToStep.has(loc.id);
            const inPath = result.path?.includes(loc.id) && stepIndex >= steps.length - 1;
            
            // Calculate heuristic to target
            const hDist = targetLoc ? euclideanHeuristic(loc, targetLoc) : 0;

            // Fill color depending on state
            let nodeFill = '#0f172a';
            let strokeColor = 'rgba(148, 163, 184, 0.4)';
            if (isSource) {
              nodeFill = '#6366f1';
              strokeColor = '#ffffff';
            } else if (isTarget) {
              nodeFill = '#f43f5e';
              strokeColor = '#ffffff';
            } else if (inPath) {
              nodeFill = '#0284c7';
              strokeColor = '#38bdf8';
            } else if (isCurrent) {
              nodeFill = '#f59e0b';
              strokeColor = '#ffffff';
            } else if (isVisited) {
              nodeFill = '#1e293b';
              strokeColor = '#10b981';
            }

            return (
              <g
                key={`d-node-${loc.id}`}
                transform={`translate(${loc.x}, ${loc.y})`}
                onClick={() => {
                  if (loc.isHub) setSelectedSource(loc.id);
                  else setSelectedTarget(loc.id);
                  setStepIndex(0);
                  setIsPlaying(false);
                }}
                style={{ cursor: 'pointer' }}
              >
                {/* Active radar ring for current explored node */}
                {isCurrent && (
                  <circle r="26" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4">
                    <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="4s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Target pulse ring */}
                {isTarget && (
                  <circle r="24" fill="none" stroke="#f43f5e" strokeWidth="1.8" opacity="0.6">
                    <animate attributeName="r" values="18;28;18" dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0.1;0.8" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Main Node Circle */}
                <circle
                  r={loc.isHub ? 16 : 12}
                  fill={nodeFill}
                  stroke={strokeColor}
                  strokeWidth={isSource || isTarget || inPath ? 3 : 2}
                  filter={isCurrent || inPath ? 'url(#vector-glow)' : undefined}
                />

                {/* Node icon / initials */}
                <text
                  textAnchor="middle"
                  y="4"
                  fill="#ffffff"
                  fontSize={loc.isHub ? "11" : "10"}
                  fontWeight="900"
                >
                  {loc.isHub ? '🏢' : loc.id.replace('ZONE-', '')}
                </text>

                {/* Node Name Label */}
                <text
                  y={loc.isHub ? -24 : -18}
                  textAnchor="middle"
                  fill={isSource ? '#818cf8' : (isTarget ? '#fb7185' : (inPath ? '#38bdf8' : '#ffffff'))}
                  fontSize="11.5"
                  fontWeight="800"
                  fontFamily="var(--font-sans)"
                >
                  {loc.name}
                </text>

                {/* Subtitle: Pincode or A* heuristic estimate */}
                <text
                  y={loc.isHub ? 32 : 24}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="9.5"
                  fontWeight="700"
                  fontFamily="var(--font-mono)"
                >
                  {algorithm === 'astar' && !loc.isHub ? `h: ~${hDist.toFixed(1)}m` : loc.id}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend strip at bottom */}
        <div style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 8,
          padding: '6px 14px',
          display: 'flex',
          gap: 14,
          fontSize: '0.75rem',
          color: '#cbd5e1',
          fontWeight: 700
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366f1' }} />
            Start (Hub)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f43f5e' }} />
            Target Drop-off
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
            Current Node
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 3, background: '#38bdf8' }} />
            Optimal Directed Vector
          </div>
        </div>
      </div>

      {/* Path Sequence Output */}
      {result.path.length > 0 && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: 10,
          padding: '0.85rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} color="#10b981" />
            <span style={{ fontSize: '0.86rem', fontWeight: 800 }}>
              {algorithm === 'astar' ? 'A* Guided Solution:' : 'Dijkstra Shortest Path:'}
            </span>
            <span style={{ fontSize: '0.84rem', fontFamily: 'var(--font-mono)', color: '#38bdf8', fontWeight: 700 }}>
              {result.path.join(' ➔ ')}
            </span>
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff', background: '#0284c7', padding: '3px 10px', borderRadius: 6 }}>
            Total Travel Time: {result.time.toFixed(1)} mins
          </span>
        </div>
      )}

    </div>
  );
}
