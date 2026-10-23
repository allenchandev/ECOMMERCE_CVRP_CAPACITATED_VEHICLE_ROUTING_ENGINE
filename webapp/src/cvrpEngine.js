// Multi-Hub CVRP Routing Engine supporting multiple fulfillment centers

export const INITIAL_HUBS = [
  { id: 'HUB-01', name: 'Central Bangalore Hub', address: 'MG Road / Majestic', lat: 12.9716, lng: 77.5946, x: 260, y: 220, isHub: true, pincode: '560001' },
  { id: 'HUB-02', name: 'East Tech Hub (Whitefield)', address: 'ITPL Main Road', lat: 12.9850, lng: 77.7400, x: 740, y: 280, isHub: true, pincode: '560066' },
  { id: 'HUB-03', name: 'South Industrial Hub (ECity)', address: 'Hosur Road Phase 1', lat: 12.8452, lng: 77.6602, x: 500, y: 550, isHub: true, pincode: '560100' }
];

export const INITIAL_ZONES = [
  { id: 'ZONE-A', name: 'Indiranagar Retail Park', lat: 12.9784, lng: 77.6408, x: 440, y: 150, isHub: false, pincode: '560038' },
  { id: 'ZONE-B', name: 'Koramangala Tech Hub', lat: 12.9352, lng: 77.6245, x: 390, y: 320, isHub: false, pincode: '560034' },
  { id: 'ZONE-C', name: 'HSR Layout Sector 2', lat: 12.9121, lng: 77.6446, x: 460, y: 440, isHub: false, pincode: '560102' },
  { id: 'ZONE-D', name: 'Whitefield Commercial Area', lat: 12.9698, lng: 77.7500, x: 700, y: 160, isHub: false, pincode: '560066' },
  { id: 'ZONE-E', name: 'Electronic City Residential', lat: 12.8350, lng: 77.6700, x: 570, y: 560, isHub: false, pincode: '560100' },
  { id: 'ZONE-F', name: 'Marathahalli Bridge', lat: 12.9591, lng: 77.6974, x: 580, y: 230, isHub: false, pincode: '560037' },
];

export const INITIAL_ROADS = [
  // Roads connecting Central Hub (HUB-01)
  { from: 'HUB-01', to: 'ZONE-A', time: 18.0 },
  { from: 'HUB-01', to: 'ZONE-B', time: 15.0 },
  
  // Roads connecting East Hub (HUB-02 - Whitefield)
  { from: 'HUB-02', to: 'ZONE-D', time: 8.0 },
  { from: 'HUB-02', to: 'ZONE-F', time: 12.0 },
  { from: 'HUB-02', to: 'HUB-03', time: 38.0 },

  // Roads connecting South Hub (HUB-03 - Electronic City)
  { from: 'HUB-03', to: 'ZONE-E', time: 6.0 },
  { from: 'HUB-03', to: 'ZONE-C', time: 15.0 },

  // Inter-zone roads
  { from: 'ZONE-A', to: 'ZONE-F', time: 14.0 },
  { from: 'ZONE-B', to: 'ZONE-C', time: 10.0 },
  { from: 'ZONE-B', to: 'ZONE-A', time: 12.0 },
  { from: 'ZONE-C', to: 'ZONE-E', time: 20.0 },
  { from: 'ZONE-F', to: 'ZONE-D', time: 16.0 },
  { from: 'ZONE-C', to: 'ZONE-F', time: 20.0 },
  { from: 'ZONE-D', to: 'ZONE-E', time: 35.0 },
];

export const INITIAL_DRIVERS = [
  // Drivers stationed at Central Hub (HUB-01)
  { id: 'VAN-101', name: 'Rajesh Kumar', vehicle: 'Electric Van', maxCapacity: 50.0, hubId: 'HUB-01' },
  { id: 'BIKE-102', name: 'Amit Patel', vehicle: 'Cargo Bike', maxCapacity: 25.0, hubId: 'HUB-01' },
  
  // Drivers stationed at East Hub (HUB-02)
  { id: 'VAN-201', name: 'Sunil Verma', vehicle: 'Diesel Van', maxCapacity: 60.0, hubId: 'HUB-02' },
  { id: 'BIKE-202', name: 'Kiran Rao', vehicle: 'Express Scooter', maxCapacity: 30.0, hubId: 'HUB-02' },

  // Drivers stationed at South Hub (HUB-03)
  { id: 'VAN-301', name: 'Deepak Nair', vehicle: 'City Van', maxCapacity: 55.0, hubId: 'HUB-03' }
];

export const INITIAL_ORDERS = [
  { id: 'ORD-901', destinationId: 'ZONE-A', weight: 12.5, dimensions: '30x25x15 cm', customerName: 'Alice Munro' },
  { id: 'ORD-902', destinationId: 'ZONE-B', weight: 15.0, dimensions: '40x30x20 cm', customerName: 'Bob Dylan' },
  { id: 'ORD-903', destinationId: 'ZONE-C', weight: 18.0, dimensions: '35x35x30 cm', customerName: 'Charlie Chaplin' },
  { id: 'ORD-904', destinationId: 'ZONE-D', weight: 22.0, dimensions: '50x40x25 cm', customerName: 'David Gilmour' },
  { id: 'ORD-905', destinationId: 'ZONE-E', weight: 14.0, dimensions: '30x30x20 cm', customerName: 'Eva Green' },
  { id: 'ORD-906', destinationId: 'ZONE-F', weight: 8.5,  dimensions: '25x20x15 cm', customerName: 'Fiona Apple' },
  { id: 'ORD-907', destinationId: 'ZONE-A', weight: 9.0,  dimensions: '28x20x10 cm', customerName: 'George Orwell' },
  { id: 'ORD-908', destinationId: 'ZONE-D', weight: 16.0, dimensions: '35x30x20 cm', customerName: 'Hannah Arendt' }
];

// Dijkstra shortest-path algorithm
export function buildAdjacencyList(allLocations, roads) {
  const adj = new Map();
  allLocations.forEach(loc => adj.set(loc.id, []));

  roads.forEach(road => {
    adj.get(road.from)?.push({ target: road.to, time: road.time });
    adj.get(road.to)?.push({ target: road.from, time: road.time });
  });
  return adj;
}

// Euclidean heuristic for A* in minutes (distance / avg city speed 40km/h ~ approx scale)
export function euclideanHeuristic(nodeA, nodeB) {
  if (!nodeA || !nodeB) return 0;
  const dx = nodeA.x - nodeB.x;
  const dy = nodeA.y - nodeB.y;
  // Scaled factor so heuristic is admissible (h(n) <= true distance)
  return Math.hypot(dx, dy) * 0.045;
}

// A* Search Algorithm with step recording for visualization
export function aStarSearch(sourceId, targetId, adj, allLocations) {
  const locMap = new Map(allLocations.map(l => [l.id, l]));
  const targetLoc = locMap.get(targetId);

  if (sourceId === targetId) {
    return { path: [sourceId], time: 0, visitedNodes: [sourceId], steps: [] };
  }

  const gScore = new Map();
  const fScore = new Map();
  const prev = new Map();
  const openSet = new Set([sourceId]);
  const closedSet = new Set();
  const visitedOrder = [];
  const steps = []; // each step records { current, openSet, closedSet, gScore, fScore, consideredEdge }

  allLocations.forEach(loc => {
    gScore.set(loc.id, Infinity);
    fScore.set(loc.id, Infinity);
  });

  gScore.set(sourceId, 0);
  const startH = euclideanHeuristic(locMap.get(sourceId), targetLoc);
  fScore.set(sourceId, startH);

  while (openSet.size > 0) {
    // Find node in openSet with lowest fScore
    let current = null;
    let lowestF = Infinity;
    openSet.forEach(node => {
      const f = fScore.get(node) ?? Infinity;
      if (f < lowestF) {
        lowestF = f;
        current = node;
      }
    });

    if (!current) break;

    visitedOrder.push(current);
    openSet.delete(current);
    closedSet.add(current);

    steps.push({
      currentNode: current,
      openSet: Array.from(openSet),
      closedSet: Array.from(closedSet),
      currentG: gScore.get(current),
      currentF: fScore.get(current),
      action: current === targetId ? 'TARGET_REACHED' : 'EXPANDING'
    });

    if (current === targetId) {
      break;
    }

    const neighbors = adj.get(current) || [];
    for (const edge of neighbors) {
      if (closedSet.has(edge.target)) continue;

      const tentativeG = gScore.get(current) + edge.time;
      if (!openSet.has(edge.target)) {
        openSet.add(edge.target);
      } else if (tentativeG >= (gScore.get(edge.target) ?? Infinity)) {
        continue;
      }

      prev.set(edge.target, current);
      gScore.set(edge.target, tentativeG);
      const h = euclideanHeuristic(locMap.get(edge.target), targetLoc);
      fScore.set(edge.target, tentativeG + h);
    }
  }

  if (!prev.has(targetId) && sourceId !== targetId) {
    return { path: [], time: Infinity, visitedNodes: visitedOrder, steps };
  }

  const path = [];
  let curr = targetId;
  while (curr) {
    path.unshift(curr);
    curr = prev.get(curr);
  }

  return { path, time: gScore.get(targetId), visitedNodes: visitedOrder, steps };
}

export function dijkstraWithSteps(sourceId, targetId, adj) {
  if (sourceId === targetId) {
    return { path: [sourceId], time: 0, visitedOrder: [sourceId], steps: [] };
  }

  const dist = new Map();
  const prev = new Map();
  const visited = new Set();
  const visitedOrder = [];
  const steps = [];

  adj.forEach((_, node) => dist.set(node, Infinity));
  dist.set(sourceId, 0);

  while (visited.size < adj.size) {
    let u = null;
    let minDist = Infinity;
    dist.forEach((d, node) => {
      if (!visited.has(node) && d < minDist) {
        minDist = d;
        u = node;
      }
    });

    if (u === null || minDist === Infinity) break;
    visited.add(u);
    visitedOrder.push(u);

    steps.push({
      currentNode: u,
      visited: Array.from(visited),
      distance: minDist,
      action: u === targetId ? 'TARGET_REACHED' : 'EXPANDING'
    });

    if (u === targetId) break;

    const neighbors = adj.get(u) || [];
    for (const edge of neighbors) {
      if (!visited.has(edge.target)) {
        const alt = dist.get(u) + edge.time;
        if (alt < dist.get(edge.target)) {
          dist.set(edge.target, alt);
          prev.set(edge.target, u);
        }
      }
    }
  }

  if (dist.get(targetId) === Infinity) {
    return { path: [], time: Infinity, visitedOrder, steps };
  }

  const path = [];
  let curr = targetId;
  while (curr) {
    path.unshift(curr);
    curr = prev.get(curr);
  }
  return { path, time: dist.get(targetId), visitedOrder, steps };
}

export function dijkstra(sourceId, targetId, adj) {
  const res = dijkstraWithSteps(sourceId, targetId, adj);
  return { path: res.path, time: res.time };
}

/**
 * Multi-Hub Allocation & CVRP Router:
 * Phase 1: Determine nearest hub for each incoming order based on Dijkstra travel time
 * Phase 2: Group orders by nearest assigned hub
 * Phase 3: For each hub, solve vehicle capacity constraints and sequence driver routes
 */
export function solveMultiHubCVRP(hubs, zones, roads, orders, drivers) {
  const allLocations = [...hubs, ...zones];
  const adj = buildAdjacencyList(allLocations, roads);

  // Phase 1: Assign each package to its NEAREST hub
  const ordersWithAssignedHub = orders.map(pkg => {
    let bestHub = null;
    let shortestEta = Infinity;

    for (const hub of hubs) {
      const result = dijkstra(hub.id, pkg.destinationId, adj);
      if (result.time < shortestEta) {
        shortestEta = result.time;
        bestHub = hub;
      }
    }

    return {
      ...pkg,
      assignedHubId: bestHub ? bestHub.id : hubs[0].id,
      distanceToHubMins: shortestEta
    };
  });

  // Phase 2: Group orders and drivers per hub
  const hubPlans = [];
  let totalFleetDurationMins = 0;
  let totalActiveVehicles = 0;

  for (const hub of hubs) {
    const hubOrders = ordersWithAssignedHub.filter(o => o.assignedHubId === hub.id);
    const hubDrivers = drivers.filter(d => d.hubId === hub.id);

    if (hubOrders.length === 0) {
      hubPlans.push({
        hub,
        orders: [],
        routes: [],
        hubDurationMins: 0,
        activeDriversCount: 0
      });
      continue;
    }

    // Sort hub orders by proximity to this hub
    const sortedHubOrders = [...hubOrders].sort((a, b) => a.distanceToHubMins - b.distanceToHubMins);

    // Fleet allocation for this hub
    const activeFleet = hubDrivers.map(d => ({
      ...d,
      currentLoad: 0,
      assignedPackages: []
    }));

    let driverIdx = 0;
    for (const pkg of sortedHubOrders) {
      let assigned = false;
      while (driverIdx < activeFleet.length) {
        const driver = activeFleet[driverIdx];
        if (driver.currentLoad + pkg.weight <= driver.maxCapacity) {
          driver.assignedPackages.push(pkg);
          driver.currentLoad += pkg.weight;
          assigned = true;
          break;
        } else {
          driverIdx++;
        }
      }

      if (!assigned) {
        // Fallback: assign to first driver if capacity full for demo resilience
        if (activeFleet.length > 0) {
          activeFleet[0].assignedPackages.push(pkg);
          activeFleet[0].currentLoad += pkg.weight;
        }
      }
    }

    // Phase 3: Route sequencing per driver from this hub
    const hubRoutes = [];
    let hubDurationMins = 0;

    activeFleet.forEach((driver) => {
      if (driver.assignedPackages.length === 0) return;

      const remaining = [...driver.assignedPackages];
      const stopSequence = [];
      const waypoints = [hub.id];
      let currentLocation = hub.id;
      let tripTime = 0;

      while (remaining.length > 0) {
        let nextPkg = null;
        let bestPath = null;
        let shortestTime = Infinity;

        for (const candidate of remaining) {
          const pathRes = dijkstra(currentLocation, candidate.destinationId, adj);
          if (pathRes.time < shortestTime) {
            shortestTime = pathRes.time;
            bestPath = pathRes;
            nextPkg = candidate;
          }
        }

        if (!nextPkg || !bestPath) break;

        stopSequence.push(nextPkg);
        remaining.splice(remaining.indexOf(nextPkg), 1);
        tripTime += bestPath.time;

        for (let i = 1; i < bestPath.path.length; i++) {
          waypoints.push(bestPath.path[i]);
        }

        currentLocation = nextPkg.destinationId;
      }

      // Return to hub
      const returnPath = dijkstra(currentLocation, hub.id, adj);
      tripTime += returnPath.time;
      for (let i = 1; i < returnPath.path.length; i++) {
        waypoints.push(returnPath.path[i]);
      }

      hubDurationMins += tripTime;
      hubRoutes.push({
        driver,
        hub,
        stopSequence,
        waypoints,
        totalDurationMins: tripTime
      });
    });

    totalFleetDurationMins += hubDurationMins;
    totalActiveVehicles += hubRoutes.length;

    hubPlans.push({
      hub,
      orders: hubOrders,
      routes: hubRoutes,
      hubDurationMins,
      activeDriversCount: hubRoutes.length
    });
  }

  return {
    success: true,
    ordersWithAssignedHub,
    hubPlans,
    totalOrdersCount: orders.length,
    totalActiveVehicles,
    totalFleetSize: drivers.length,
    totalFleetDurationMins
  };
}
