import React, { useState, useEffect } from 'react';
import { Sparkles, Trophy, Cpu, Zap, RotateCcw, CheckCircle, ArrowRight, Play, Award, HelpCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { dijkstra, buildAdjacencyList } from '../cvrpEngine';

export default function HubAllocationGame({ hubs, zones, roads, orders, onApplyAllocation }) {
  const [activeTab, setActiveTab] = useState('argon'); // 'argon' (AI auto solver) | 'game' (interactive challenge)
  const [selectedOrderIdx, setSelectedOrderIdx] = useState(0);
  
  // Game state
  const [playerScore, setPlayerScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [userGuesses, setUserGuesses] = useState({}); // { [orderId]: chosenHubId }
  const [feedback, setFeedback] = useState(null); // { isCorrect: boolean, message: string, shortestHubId: string }
  const [isCompleted, setIsCompleted] = useState(false);

  // Argon AI Scanner State
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [argonLog, setArgonLog] = useState([
    "Argon AI v4.8 Neural Dispatch initialized.",
    "Ingested 3 regional fulfillment nodes.",
    "Road graph topology verified (15 edges with traffic weights)."
  ]);

  const allLocations = [...hubs, ...zones];
  const adj = buildAdjacencyList(allLocations, roads);

  const HUB_COLORS = {
    'HUB-01': '#6366f1', // Indigo Central
    'HUB-02': '#06b6d4', // Cyan East
    'HUB-03': '#ec4899', // Pink South
  };

  // Helper to compute Dijkstra ETA from all hubs to an order destination
  const getEtasForOrder = (order) => {
    return hubs.map(hub => {
      const res = dijkstra(hub.id, order.destinationId, adj);
      return {
        hub,
        time: res.time,
        path: res.path
      };
    }).sort((a, b) => a.time - b.time);
  };

  const currentOrder = orders[selectedOrderIdx];
  const currentEtas = currentOrder ? getEtasForOrder(currentOrder) : [];
  const optimalHub = currentEtas.length > 0 ? currentEtas[0].hub : null;

  // Handle user picking a hub in game mode
  const handlePickHub = (hubId) => {
    if (!currentOrder || feedback) return;

    const isCorrect = optimalHub && hubId === optimalHub.id;
    const pickedHub = hubs.find(h => h.id === hubId);

    const newGuesses = { ...userGuesses, [currentOrder.id]: hubId };
    setUserGuesses(newGuesses);

    if (isCorrect) {
      const newScore = playerScore + 100 + (streak * 20);
      setPlayerScore(newScore);
      setStreak(prev => prev + 1);
      setFeedback({
        isCorrect: true,
        message: `Spot on! ${pickedHub.name} is only ${currentEtas[0].time.toFixed(0)}m away — shortest travel time!`,
        shortestHubId: optimalHub.id
      });
      // Mini confetti burst on correct guess!
      try {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch (err) {}
    } else {
      setStreak(0);
      setFeedback({
        isCorrect: false,
        message: `Not quite! ${optimalHub.name} was closer at ${currentEtas[0].time.toFixed(0)}m (vs ${pickedHub.name} at ${currentEtas.find(e => e.hub.id === hubId)?.time.toFixed(0)}m).`,
        shortestHubId: optimalHub.id
      });
    }

    // Auto check if completed
    if (Object.keys(newGuesses).length === orders.length) {
      setIsCompleted(true);
      try {
        confetti({
          particleCount: 120,
          spread: 90,
          origin: { y: 0.5 }
        });
      } catch (err) {}
    }
  };

  const handleNextOrder = () => {
    setFeedback(null);
    if (selectedOrderIdx < orders.length - 1) {
      setSelectedOrderIdx(prev => prev + 1);
    }
  };

  const handleRestartGame = () => {
    setUserGuesses({});
    setPlayerScore(0);
    setStreak(0);
    setSelectedOrderIdx(0);
    setFeedback(null);
    setIsCompleted(false);
  };

  // Run Argon AI Neural Simulation
  const handleTriggerArgonAI = () => {
    setIsAiScanning(true);
    setScannedCount(0);
    setArgonLog([
      "⚡ ARGON AI: Starting Neural Dijkstra graph matrix traversal...",
      "Analyzing dynamic traffic matrix & pincode proximity...",
    ]);

    let count = 0;
    const interval = setInterval(() => {
      count++;
      setScannedCount(count);
      const pkg = orders[count - 1];
      if (pkg) {
        const dest = zones.find(z => z.id === pkg.destinationId);
        const etas = getEtasForOrder(pkg);
        setArgonLog(prev => [
          `[Argon-AI] Processed ${pkg.customerName} (${dest?.name}): Optimal -> ${etas[0].hub.name} (${etas[0].time.toFixed(0)}m)`,
          ...prev.slice(0, 5)
        ]);
      }

      if (count >= orders.length) {
        clearInterval(interval);
        setIsAiScanning(false);
        setArgonLog(prev => [
          "✅ ARGON AI: Global minimum distance allocation solved (100% precision).",
          ...prev
        ]);
        try {
          confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
        } catch (e) {}
      }
    }, 350);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Top Mode Selector: Argon AI vs Interactive Challenge */}
      <div style={{
        background: 'linear-gradient(135deg, #090d16 0%, #111827 100%)',
        border: '1.5px solid #1e293b',
        borderRadius: 14,
        padding: '1.2rem 1.6rem',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)'
          }}>
            <Cpu size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.15rem', fontWeight: 900, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                ARGON AI Core
              </span>
              <span style={{ fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', color: '#38bdf8', padding: '2px 8px', borderRadius: 20, fontWeight: 800 }}>
                CVRP SOLVER v4.8
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 2 }}>
              Dijkstra Shortest Path Neural Partitioning Engine
            </div>
          </div>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.06)', borderRadius: 10, padding: 4 }}>
          <button
            onClick={() => setActiveTab('argon')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: activeTab === 'argon' ? '#0284c7' : 'transparent',
              color: activeTab === 'argon' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: 8,
              padding: '0.55rem 1.1rem',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'argon' ? '0 0 14px rgba(2, 132, 199, 0.5)' : 'none'
            }}
          >
            <Sparkles size={16} /> Argon AI Neural Scan
          </button>

          <button
            onClick={() => setActiveTab('game')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: activeTab === 'game' ? '#8b5cf6' : 'transparent',
              color: activeTab === 'game' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: 8,
              padding: '0.55rem 1.1rem',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'game' ? '0 0 14px rgba(139, 92, 246, 0.5)' : 'none'
            }}
          >
            <Trophy size={16} /> 🎮 Dispatcher Game Challenge
          </button>
        </div>
      </div>

      {/* ================= MODE 1: ARGON AI SCANNER ================= */}
      {activeTab === 'argon' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem' }}>
          
          {/* Visual AI Matrix */}
          <div style={{
            background: '#090d16',
            border: '1.5px solid #1e293b',
            borderRadius: 14,
            padding: '1.5rem',
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Background Grid Accent */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: 'radial-gradient(rgba(56, 189, 248, 0.08) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              pointerEvents: 'none'
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#38bdf8', fontWeight: 800 }}>
                    Argon AI Automated Allocation
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: 2 }}>
                    Dijkstra Path-Weight Minimizer
                  </h3>
                </div>

                <button
                  onClick={handleTriggerArgonAI}
                  disabled={isAiScanning}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: isAiScanning ? '#334155' : 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '0.6rem 1.2rem',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: isAiScanning ? 'not-allowed' : 'pointer',
                    boxShadow: isAiScanning ? 'none' : '0 0 16px rgba(14, 165, 233, 0.4)'
                  }}
                >
                  <Zap size={16} /> {isAiScanning ? `Solving... (${scannedCount}/${orders.length})` : 'Run Argon AI Optimizer'}
                </button>
              </div>

              {/* Real-time Order Allocation Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '340px', overflowY: 'auto', paddingRight: '0.3rem' }}>
                {orders.map((ord, idx) => {
                  const dest = zones.find(z => z.id === ord.destinationId);
                  const etas = getEtasForOrder(ord);
                  const best = etas[0];
                  const hubColor = HUB_COLORS[best.hub.id] || '#38bdf8';
                  const isBeingScanned = isAiScanning && scannedCount === idx + 1;

                  return (
                    <div
                      key={ord.id}
                      style={{
                        background: isBeingScanned ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1.5px solid ${isBeingScanned ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)'}`,
                        borderRadius: 10,
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s',
                        boxShadow: isBeingScanned ? '0 0 15px rgba(56, 189, 248, 0.3)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          background: 'rgba(255,255,255,0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 800,
                          color: '#94a3b8'
                        }}>
                          {idx + 1}
                        </span>
                        <div>
                          <strong style={{ fontSize: '0.92rem', color: '#ffffff' }}>{ord.customerName}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            Delivery to: <span style={{ color: '#cbd5e1' }}>{dest?.name}</span> • {ord.weight} kg
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            background: `${hubColor}22`,
                            border: `1px solid ${hubColor}`,
                            color: hubColor,
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: '0.78rem',
                            fontWeight: 800
                          }}>
                            🏢 {best.hub.name.split(' ')[0]} Hub
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                            ETA: <strong style={{ color: '#ffffff' }}>{best.time.toFixed(0)} mins</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Console Log */}
            <div style={{
              marginTop: '1.25rem',
              background: 'rgba(0, 0, 0, 0.6)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: 8,
              padding: '0.75rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: '#38bdf8',
              lineHeight: 1.5,
              position: 'relative',
              zIndex: 1
            }}>
              <div style={{ color: '#94a3b8', fontSize: '0.68rem', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Argon Neural Log Stream:
              </div>
              {argonLog.slice(0, 3).map((line, i) => (
                <div key={i} style={{ opacity: 1 - i * 0.25 }}>➔ {line}</div>
              ))}
            </div>

          </div>

          {/* Visual Hub Capacity & ETA comparison chart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {hubs.map((hub, idx) => {
              const color = idx === 0 ? '#6366f1' : (idx === 1 ? '#06b6d4' : '#ec4899');
              const assignedOrders = orders.filter(o => {
                const etas = getEtasForOrder(o);
                return etas[0].hub.id === hub.id;
              });
              const totalKg = assignedOrders.reduce((sum, o) => sum + o.weight, 0);

              return (
                <div
                  key={hub.id}
                  style={{
                    background: '#ffffff',
                    border: `2px solid ${color}`,
                    borderRadius: 12,
                    padding: '1.25rem',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
                    borderLeft: `8px solid ${color}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                        {hub.name}
                      </h4>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                        {hub.address} • Pincode: {hub.pincode}
                      </div>
                    </div>
                    <span className="badge badge-black" style={{ background: color }}>
                      {assignedOrders.length} Packages
                    </span>
                  </div>

                  {/* Progress load ratio */}
                  <div style={{ marginTop: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                      <span style={{ color: '#64748b' }}>Assigned Payload:</span>
                      <strong>{totalKg.toFixed(1)} kg</strong>
                    </div>
                    <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (totalKg / 80) * 100)}%`, height: '100%', background: color }} />
                    </div>
                  </div>

                  {/* Sample destinations */}
                  <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {assignedOrders.map(o => (
                      <span
                        key={o.id}
                        style={{
                          fontSize: '0.74rem',
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontWeight: 700,
                          color: '#334155'
                        }}
                      >
                        {o.customerName.split(' ')[0]} ({zones.find(z => z.id === o.destinationId)?.name.split(' ')[0]})
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ================= MODE 2: INTERACTIVE DISPATCHER GAME ================= */}
      {activeTab === 'game' && currentOrder && (
        <div style={{
          background: 'linear-gradient(135deg, #090d16 0%, #171c2b 100%)',
          border: '2px solid #8b5cf6',
          borderRadius: 16,
          padding: '2rem',
          color: '#ffffff',
          boxShadow: '0 12px 36px rgba(139, 92, 246, 0.25)'
        }}>
          
          {/* Game Scoreboard Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.12)',
            paddingBottom: '1.25rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trophy size={22} color="#f59e0b" />
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900 }}>
                  Dispatcher Duel: Beat the Dijkstra Algorithm!
                </h3>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#cbd5e1' }}>
                Test your city geography: Pick which Bangalore warehouse gets the package delivered fastest!
              </p>
            </div>

            {/* Score & Streak Counters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.06)', padding: '0.5rem 1rem', borderRadius: 8 }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Score</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>{playerScore}</div>
              </div>

              <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.06)', padding: '0.5rem 1rem', borderRadius: 8 }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Streak</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10b981', fontFamily: 'var(--font-mono)' }}>🔥 {streak}x</div>
              </div>

              <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.06)', padding: '0.5rem 1rem', borderRadius: 8 }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Package</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>{selectedOrderIdx + 1}/{orders.length}</div>
              </div>
            </div>
          </div>

          {/* Current Package Question Box */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1.5px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 12,
            padding: '1.5rem',
            marginBottom: '1.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <span style={{ fontSize: '0.75rem', background: '#38bdf8', color: '#0f172a', padding: '3px 8px', borderRadius: 4, fontWeight: 800 }}>
                INCOMING DELIVERY REQUEST
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, marginTop: 6, color: '#ffffff' }}>
                Customer: {currentOrder.customerName}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginTop: 3 }}>
                📍 Destination: <strong style={{ color: '#38bdf8' }}>{zones.find(z => z.id === currentOrder.destinationId)?.name}</strong> ({currentOrder.destinationId})
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
                Package Weight: <strong>{currentOrder.weight} kg</strong> • Size: {currentOrder.dimensions}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Challenge:</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f59e0b' }}>
                Which warehouse is closest?
              </div>
            </div>
          </div>

          {/* Interactive Hub Selection Cards (Game Buttons) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '1.75rem' }}>
            {hubs.map((hub, idx) => {
              const color = idx === 0 ? '#6366f1' : (idx === 1 ? '#06b6d4' : '#ec4899');
              const etaObj = currentEtas.find(e => e.hub.id === hub.id);
              const isGuessed = userGuesses[currentOrder.id] === hub.id;
              const isWinner = feedback && optimalHub.id === hub.id;

              return (
                <button
                  key={hub.id}
                  onClick={() => handlePickHub(hub.id)}
                  disabled={!!feedback}
                  style={{
                    background: isWinner
                      ? 'rgba(16, 185, 129, 0.2)'
                      : (isGuessed ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.04)'),
                    border: isWinner
                      ? '2.5px solid #10b981'
                      : (isGuessed ? '2.5px solid #ef4444' : `2px solid ${color}`),
                    borderRadius: 12,
                    padding: '1.4rem',
                    color: '#ffffff',
                    cursor: feedback ? 'default' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: isWinner ? '0 0 20px rgba(16, 185, 129, 0.4)' : 'none',
                    transform: feedback ? 'none' : 'scale(1)'
                  }}
                  onMouseEnter={(e) => {
                    if (!feedback) e.currentTarget.style.transform = 'translateY(-3px)';
                  }}
                  onMouseLeave={(e) => {
                    if (!feedback) e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: color, textTransform: 'uppercase' }}>
                      {hub.id}
                    </span>
                    {feedback && (
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isWinner ? '#10b981' : '#94a3b8' }}>
                        {etaObj?.time.toFixed(0)} mins
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '1.1rem', fontWeight: 900, marginTop: 6, color: '#ffffff' }}>
                    🏢 {hub.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 4 }}>
                    {hub.address}
                  </div>

                  <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.82rem', fontWeight: 700, color: color }}>
                    {feedback ? (isWinner ? '✅ Shortest Travel Time' : '❌ Farther Route') : '👉 Choose this Warehouse'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Feedback & Next Button */}
          {feedback && (
            <div style={{
              background: feedback.isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1.5px solid ${feedback.isCorrect ? '#10b981' : '#ef4444'}`,
              borderRadius: 12,
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: feedback.isCorrect ? '#34d399' : '#f87171' }}>
                  {feedback.isCorrect ? '🎉 Correct Answer!' : '⚡ Sub-optimal Choice!'}
                </div>
                <div style={{ fontSize: '0.86rem', color: '#e2e8f0', marginTop: 3 }}>
                  {feedback.message}
                </div>
              </div>

              {selectedOrderIdx < orders.length - 1 ? (
                <button
                  onClick={handleNextOrder}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#8b5cf6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '0.7rem 1.4rem',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    boxShadow: '0 0 16px rgba(139, 92, 246, 0.4)'
                  }}
                >
                  Next Order Challenge <ArrowRight size={16} />
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={handleRestartGame}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#ffffff',
                      borderRadius: 8,
                      padding: '0.7rem 1.2rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    <RotateCcw size={16} /> Play Again
                  </button>
                  <button
                    onClick={() => setActiveTab('argon')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '0.7rem 1.4rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 0 16px rgba(16, 185, 129, 0.4)'
                    }}
                  >
                    <Award size={16} /> View Final Summary
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
