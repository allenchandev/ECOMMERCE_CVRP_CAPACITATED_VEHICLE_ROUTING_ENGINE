package com.ecommerce.routing.engine;

import com.ecommerce.routing.infrastructure.CityGraph;
import com.ecommerce.routing.model.DeliveryAgent;
import com.ecommerce.routing.model.Location;
import com.ecommerce.routing.model.Package;
import com.ecommerce.routing.service.OrderAllocationEngine;
import com.ecommerce.routing.service.PathFinder;
import com.ecommerce.routing.service.RouteSequencer;
import com.ecommerce.routing.service.RouteSequencer.AgentRoutePlan;

import java.util.*;

/**
 * High-level facade coordinating PathFinder, OrderAllocationEngine, and RouteSequencer.
 */
public class RoutingEngineFacade {
    private final CityGraph cityGraph;
    private final PathFinder pathFinder;
    private final OrderAllocationEngine allocationEngine;
    private final RouteSequencer routeSequencer;

    public RoutingEngineFacade(CityGraph cityGraph) {
        this.cityGraph = Objects.requireNonNull(cityGraph, "cityGraph cannot be null");
        this.pathFinder = new PathFinder(cityGraph);
        this.allocationEngine = new OrderAllocationEngine();
        this.routeSequencer = new RouteSequencer(this.pathFinder);
    }

    public CityGraph getCityGraph() {
        return cityGraph;
    }

    public PathFinder getPathFinder() {
        return pathFinder;
    }

    public OrderAllocationEngine getAllocationEngine() {
        return allocationEngine;
    }

    public RouteSequencer getRouteSequencer() {
        return routeSequencer;
    }

    /**
     * Executes the complete end-to-end CVRP pipeline:
     * 1. Shortest path ETAs from Hub
     * 2. Proximity sorting & capacity allocation across fleet
     * 3. Tour sequencing and turn-by-turn itinerary generation
     */
    public DispatchSummary planAndDispatch(Location hub, List<Package> orders, List<DeliveryAgent> fleet) {
        // Step 1 & 2: Allocate orders to fleet
        allocationEngine.allocatePackages(hub, orders, fleet, pathFinder);

        // Step 3: Sequence routes for each active agent
        List<AgentRoutePlan> routePlans = new ArrayList<>();
        double totalFleetDuration = 0.0;
        int activeVehicles = 0;

        for (DeliveryAgent agent : fleet) {
            if (!agent.getAssignedPackages().isEmpty()) {
                AgentRoutePlan plan = routeSequencer.sequenceRoute(agent, hub);
                routePlans.add(plan);
                totalFleetDuration += plan.totalDurationMins();
                activeVehicles++;
            }
        }

        return new DispatchSummary(hub, orders.size(), fleet.size(), activeVehicles, totalFleetDuration, routePlans);
    }

    public record DispatchSummary(
        Location hub,
        int totalOrdersCount,
        int totalFleetSize,
        int activeVehiclesCount,
        double totalFleetDurationMins,
        List<AgentRoutePlan> activePlans
    ) {}
}
