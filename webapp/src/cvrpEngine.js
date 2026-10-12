// Exact port of Java Routing Engine & CVRP algorithm into pure JavaScript

export const INITIAL_LOCATIONS = [
  { id: 'HUB-01', name: 'Central Fulfillment Center', lat: 12.9716, lng: 77.5946, x: 260, y: 220, isHub: true, pincode: '560001' },
  { id: 'ZONE-A', name: 'Indiranagar Retail Park', lat: 12.9784, lng: 77.6408, x: 440, y: 150, isHub: false, pincode: '560038' },
  { id: 'ZONE-B', name: 'Koramangala Tech Hub', lat: 12.9352, lng: 77.6245, x: 390, y: 320, isHub: false, pincode: '560034' },
  { id: 'ZONE-C', name: 'HSR Layout Sector 2', lat: 12.9121, lng: 77.6446, x: 460, y: 440, isHub: false, pincode: '560102' },
  { id: 'ZONE-D', name: 'Whitefield IT Corridor', lat: 12.9698, lng: 77.7500, x: 700, y: 170, isHub: false, pincode: '560066' },
  { id: 'ZONE-E', name: 'Electronic City Phase 1', lat: 12.8452, lng: 77.6602, x: 520, y: 550, isHub: false, pincode: '560100' },
  { id: 'ZONE-F', name: 'Marathahalli Bridge', lat: 12.9591, lng: 77.6974, x: 580, y: 230, isHub: false, pincode: '560037' },
];

export const INITIAL_ROADS = [
  { from: 'HUB-01', to: 'ZONE-A', time: 18.0 },
  { from: 'HUB-01', to: 'ZONE-B', time: 15.0 },
  { from: 'ZONE-A', to: 'ZONE-F', time: 14.0 },
  { from: 'ZONE-B', to: 'ZONE-C', time: 10.0 },
  { from: 'ZONE-B', to: 'ZONE-A', time: 12.0 },
  { from: 'ZONE-C', to: 'ZONE-E', time: 22.0 },
  { from: 'ZONE-F', to: 'ZONE-D', time: 16.0 },
  { from: 'ZONE-C', to: 'ZONE-F', time: 20.0 },
  { from: 'ZONE-D', to: 'ZONE-E', time: 35.0 },
];

export const INITIAL_DRIVERS = [
  { id: 'VAN-101', name: 'Rajesh Kumar', vehicle: 'Electric Van', maxCapacity: 50.0, icon: 'van', color: '#10b981' },
  { id: 'BIKE-202', name: 'Amit Patel', vehicle: 'Cargo Bike', maxCapacity: 25.0, icon: 'bike', color: '#3b82f6' },
  { id: 'VAN-103', name: 'Sunil Verma', vehicle: 'Diesel Van', maxCapacity: 60.0, icon: 'truck', color: '#f59e0b' }
];

export const INITIAL_ORDERS = [
  { id: 'ORD-901', destinationId: 'ZONE-A', weight: 12.5, dimensions: '30x25x15 cm', customerName: 'Alice Munro' },
  { id: 'ORD-902', destinationId: 'ZONE-B', weight: 15.0, dimensions: '40x30x20 cm', customerName: 'Bob Dylan' },
  { id: 'ORD-903', destinationId: 'ZONE-C', weight: 18.0, dimensions: '35x35x30 cm', customerName: 'Charlie Chaplin' },
  { id: 'ORD-904', destinationId: 'ZONE-D', weight: 22.0, dimensions: '50x40x25 cm', customerName: 'David Gilmour' },
  { id: 'ORD-905', destinationId: 'ZONE-E', weight: 14.0, dimensions: '30x30x20 cm', customerName: 'Eva Green' },
  { id: 'ORD-906', destinationId: 'ZONE-F', weight: 8.5,  dimensions: '25x20x15 cm', customerName: 'Fiona Apple' },
  { id: 'ORD-907', destinationId: 'ZONE-A', weight: 9.0,  dimensions: '28x20x10 cm', customerName: 'George Orwell' }
];

// Dijkstra shortest-path algorithm
export function buildAdjacencyList(locations, roads) {
  const adj = new Map();
  locations.forEach(loc => adj.set(loc.id, []));

  roads.forEach(road => {
    adj.get(road.from)?.push({ target: road.to, time: road.time });
    adj.get(road.to)?.push({ target: road.from, time: road.time });
  });
  return adj;
}

export function dijkstra(sourceId, targetId, adj) {
  if (sourceId === targetId) {
    return { path: [sourceId], time: 0 };
  }

  const dist = new Map();
  const prev = new Map();
  const visited = new Set();
  
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
    if (u === targetId) break;

    visited.add(u);

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
    return { path: [], time: Infinity };
  }

  const path = [];
  let curr = targetId;
  while (curr) {
    path.unshift(curr);
    curr = prev.get(curr);
  }

  return { path, time: dist.get(targetId) };
}

// Calculate ETAs from hub to all points
export function calculateHubETAs(hubId, adj) {
  const etas = new Map();
  adj.forEach((_, node) => {
    const res = dijkstra(hubId, node, adj);
    etas.set(node, res.time);
  });
  return etas;
}

// CVRP Solver: Order Allocation + Greedy Nearest Neighbor Route Sequencing
export function solveCVRP(hubId, orders, drivers, locations, roads) {
  const adj = buildAdjacencyList(locations, roads);
  const hubEtas = calculateHubETAs(hubId, adj);

  // Deep copy driver list with fresh load track
  const fleet = drivers.map(d => ({
    ...d,
    currentLoad: 0,
    assignedPackages: []
  }));

  // Sort orders by proximity to Hub (as done in Java OrderAllocationEngine)
  const sortedOrders = [...orders].sort((a, b) => {
    const etaA = hubEtas.get(a.destinationId) ?? Infinity;
    const etaB = hubEtas.get(b.destinationId) ?? Infinity;
    return etaA - etaB;
  });

  // Capacity-based Allocation
  let driverIdx = 0;
  for (const pkg of sortedOrders) {
    let assigned = false;
    while (driverIdx < fleet.length) {
      const driver = fleet[driverIdx];
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
      return {
        success: false,
        error: `Fleet capacity exceeded! Could not load package ${pkg.id} (${pkg.weight} kg). Try adding more vehicles or increasing capacity.`
      };
    }
  }

  // Route Sequencing for each driver (Nearest-Neighbor tour like RouteSequencer.java)
  const routePlans = [];
  let totalFleetDurationMins = 0;

  fleet.forEach((driver, idx) => {
    if (driver.assignedPackages.length === 0) return;

    const remaining = [...driver.assignedPackages];
    const stopSequence = [];
    const waypoints = [hubId];
    let currentLocation = hubId;
    let totalTripTime = 0;

    while (remaining.length > 0) {
      let nextPkg = null;
      let bestPathResult = null;
      let shortestTime = Infinity;

      for (const candidate of remaining) {
        const pathRes = dijkstra(currentLocation, candidate.destinationId, adj);
        if (pathRes.time < shortestTime) {
          shortestTime = pathRes.time;
          bestPathResult = pathRes;
          nextPkg = candidate;
        }
      }

      if (!nextPkg || !bestPathResult) break;

      stopSequence.push(nextPkg);
      remaining.splice(remaining.indexOf(nextPkg), 1);
      totalTripTime += bestPathResult.time;

      for (let i = 1; i < bestPathResult.path.length; i++) {
        waypoints.push(bestPathResult.path[i]);
      }

      currentLocation = nextPkg.destinationId;
    }

    // Return to hub
    const returnPath = dijkstra(currentLocation, hubId, adj);
    totalTripTime += returnPath.time;
    for (let i = 1; i < returnPath.path.length; i++) {
      waypoints.push(returnPath.path[i]);
    }

    totalFleetDurationMins += totalTripTime;

    routePlans.push({
      driver,
      stopSequence,
      waypoints,
      totalDurationMins: totalTripTime,
      routeNumber: idx + 1
    });
  });

  return {
    success: true,
    plans: routePlans,
    activeDriversCount: routePlans.length,
    totalFleetSize: drivers.length,
    totalOrdersCount: orders.length,
    totalFleetDurationMins
  };
}
