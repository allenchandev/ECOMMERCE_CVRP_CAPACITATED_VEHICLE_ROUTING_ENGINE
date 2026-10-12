package com.ecommerce.routing.service;

import com.ecommerce.routing.model.DeliveryAgent;
import com.ecommerce.routing.model.Location;
import com.ecommerce.routing.model.Package;

import java.util.*;

/**
 * Groups packages by proximity to the dispatch hub and vehicle capacity limits.
 */
public class OrderAllocationEngine {

    /**
     * Allocates packages across the available delivery fleet based on hub distance and vehicle capacity.
     */
    public List<DeliveryAgent> allocatePackages(
            Location hub,
            List<Package> orders,
            List<DeliveryAgent> fleet,
            PathFinder pathFinder) {

        // 1. Calculate travel ETAs from Hub to all drop-off locations
        Map<Location, Double> etas = pathFinder.calculateETAs(hub);

        // 2. Sort copy of orders by proximity to Hub (Nearest Neighbor / Greedy heuristic)
        List<Package> sortedOrders = new ArrayList<>(orders);
        sortedOrders.sort(Comparator.comparingDouble(pkg -> {
            Double eta = etas.get(pkg.destination());
            if (eta == null || eta.equals(Double.MAX_VALUE)) {
                return Double.MAX_VALUE;
            }
            return eta;
        }));

        // 3. Allocate to fleet based on vehicle capacity constraints
        int agentIndex = 0;
        for (Package pkg : sortedOrders) {
            boolean assigned = false;
            while (agentIndex < fleet.size()) {
                DeliveryAgent currentAgent = fleet.get(agentIndex);
                if (currentAgent.canLoad(pkg)) {
                    currentAgent.load(pkg);
                    assigned = true;
                    break;
                } else {
                    agentIndex++;
                }
            }

            if (!assigned) {
                throw new IllegalStateException(
                    String.format("Fleet capacity exhausted. Could not assign %s. Total fleet size: %d",
                        pkg, fleet.size())
                );
            }
        }

        return fleet;
    }
}
