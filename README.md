# 🚚 Smart E-Commerce Capacitated Vehicle Routing Problem (CVRP) Engine

A full-stack, enterprise-grade Capacitated Vehicle Routing Problem (CVRP) and fleet dispatch optimization system designed for modern e-commerce logistics. It features an object-oriented Java routing core, graph algorithms (Dijkstra / A*), and an interactive React + Leaflet real-time dispatch dashboard.

---

## 🌟 Key Highlights

- **Multi-Hub & Capacitated Fleet Dispatching**: Automatically balances order weight loads against delivery agent vehicle payload constraints.
- **Advanced Graph Routing & Pathfinding**:
  - **Dijkstra & A\* Search**: Computes shortest travel-time routes through city road networks.
  - **Nearest Neighbor & 2-Opt Heuristic Optimization**: Solves the Travelling Salesperson Problem (TSP) per delivery driver route sequence to reduce deadheading and overall transit duration.
- **Interactive Web Simulator & Dashboard**:
  - Live interactive maps using Leaflet and OpenStreetMap.
  - Multi-hub dispatching, road network visualization, live delivery vehicle turn-by-turn route simulation.
  - Role-based portal interface (Fleet Dispatcher & Customer Tracking view).
- **Object-Oriented Design (Java Core)**: Built using clean OOP patterns (Facade pattern, separation of models, infrastructure graph, and allocation services).

---

## 🏗️ System Architecture

```
ECOMMERCE_CVRP_CAPACITATED_VEHICLE_ROUTING_ENGINE/
├── src/                                  # Java Core Routing Engine
│   └── com/ecommerce/routing/
│       ├── Main.java                     # CLI Simulation entrypoint
│       ├── engine/
│       │   └── RoutingEngineFacade.java  # Unified facade orchestrating allocation & sequencing
│       ├── infrastructure/
│       │   └── CityGraph.java            # Graph adjacency representation & Dijkstra shortest paths
│       ├── model/
│       │   ├── DeliveryAgent.java        # Fleet driver model with capacity limits
│       │   ├── Location.java             # Coordinates (lat/lon) & name entity
│       │   └── Package.java              # Delivery order entity with weights & destinations
│       └── service/
│           ├── OrderAllocationEngine.java# Knapsack & capacity-constrained order-to-driver allocator
│           ├── PathFinder.java           # Point-to-point pathfinder & time evaluator
│           └── RouteSequencer.java       # Stop order sequence generator (TSP heuristics)
├── run.sh                                # Shell script to compile and run Java CLI
├── bin/                                  # Compiled Java bytecode
└── webapp/                               # Interactive React + Vite Web Dashboard
    ├── src/
    │   ├── App.jsx                       # Main logistics operations dashboard
    │   ├── cvrpEngine.js                 # JS port of CVRP & A* algorithms for browser simulation
    │   └── components/
    │       ├── OptimalPathFinder.jsx     # Point-to-point route inspection tool
    │       ├── CustomerPortal.jsx        # Customer live delivery order tracker
    │       └── LoginScreen.jsx           # Portal access control
    ├── package.json
    └── vite.config.js
```

---

## 🚀 Quick Start Guide

### 1. Java Routing Engine (CLI)

#### Prerequisites
- Java Development Kit (JDK 17 or JDK 21 recommended)
- Bash shell (Linux / macOS / WSL)

#### Execution
You can compile and launch the simulation in one command:
```bash
chmod +x run.sh
./run.sh
```

Or manually compile and run via standard `javac`:
```bash
mkdir -p bin
javac -d bin \
    src/com/ecommerce/routing/model/*.java \
    src/com/ecommerce/routing/infrastructure/*.java \
    src/com/ecommerce/routing/service/*.java \
    src/com/ecommerce/routing/engine/*.java \
    src/com/ecommerce/routing/*.java

java -cp bin com.ecommerce.routing.Main
```

---

### 2. Interactive Web Application (React + Vite)

#### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

#### Setup & Run
```bash
# Navigate to the webapp directory
cd webapp

# Install dependencies
npm install

# Start development server
npm run dev
```

Open your browser at `http://localhost:5173` to interact with:
- 🗺️ **Live Leaflet Map**: Visualize hubs, delivery zones, road connectivity, and driver routes.
- 🚚 **Dispatch Simulator**: Add dynamic customer orders, assign vehicles, and animate turn-by-turn delivery routes.
- 📦 **Customer Tracking Portal**: Check order status, estimated delivery times, and assigned driver details.

---

## 🧠 Algorithmic Pipeline

1. **City Graph Representation**: Locations as vertices and bi-directional road segments weighted by real-time travel duration (minutes).
2. **Shortest Path Computation**: Calculates all-pairs shortest paths using Dijkstra's algorithm.
3. **Capacity Constrained Order Allocation**:
   - Sorts pending orders based on delivery cluster and payload weight.
   - Assigns packages to vehicles ensuring $\sum \text{weight} \le \text{MaxCapacity}$.
4. **Route Sequencing (TSP)**:
   - Orders stops via Nearest Neighbor heuristic from the warehouse hub.
   - Employs 2-Opt local search improvement to eliminate crossing paths and minimize total fleet transit time.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
