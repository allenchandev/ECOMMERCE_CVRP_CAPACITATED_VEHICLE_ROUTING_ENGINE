package com.ecommerce.routing.service;

import com.ecommerce.routing.model.DeliveryAgent;
import com.ecommerce.routing.model.Location;
import com.ecommerce.routing.model.Package;

import java.util.*;

/**
 * Uses PathFinder to sequence the allocated packages for each delivery agent into an optimal route.
 */
public class RouteSequencer {
    private final PathFinder pathFinder;

    public RouteSequencer(PathFinder pathFinder) {
        this.pathFinder = Objects.requireNonNull(pathFinder, "pathFinder cannot be null");
    }

    /**
     * Orders an agent's assigned packages using a greedy Nearest-Neighbor tour from the hub.
     * Updates the agent's route and returns detailed route statistics.
     */
    public AgentRoutePlan sequenceRoute(DeliveryAgent agent, Location hub) {
        List<Package> remaining = new ArrayList<>(agent.getAssignedPackages());
        List<Package> orderedPackages = new ArrayList<>();
        List<Location> fullWaypoints = new ArrayList<>();
        fullWaypoints.add(hub);

        Location currentLocation = hub;
        double totalTripTimeMins = 0.0;

        while (!remaining.isEmpty()) {
            Package nextPkg = null;
            PathFinder.PathResult bestPath = null;
            double shortestTime = Double.MAX_VALUE;

            for (Package candidate : remaining) {
                PathFinder.PathResult path = pathFinder.findShortestPath(currentLocation, candidate.destination());
                if (path.totalTimeMins() < shortestTime) {
                    shortestTime = path.totalTimeMins();
                    bestPath = path;
                    nextPkg = candidate;
                }
            }

            if (nextPkg == null || bestPath == null) {
                break;
            }

            orderedPackages.add(nextPkg);
            remaining.remove(nextPkg);
            totalTripTimeMins += bestPath.totalTimeMins();

            // Append intermediate waypoints (excluding current start node to avoid duplicates)
            for (int i = 1; i < bestPath.waypoints().size(); i++) {
                fullWaypoints.add(bestPath.waypoints().get(i));
            }

            currentLocation = nextPkg.destination();
        }

        // Return path back to hub
        PathFinder.PathResult returnPath = pathFinder.findShortestPath(currentLocation, hub);
        totalTripTimeMins += returnPath.totalTimeMins();
        for (int i = 1; i < returnPath.waypoints().size(); i++) {
            fullWaypoints.add(returnPath.waypoints().get(i));
        }

        agent.setOptimizedRoute(orderedPackages);

        return new AgentRoutePlan(agent, orderedPackages, fullWaypoints, totalTripTimeMins);
    }

    public record AgentRoutePlan(
        DeliveryAgent agent,
        List<Package> stopSequence,
        List<Location> detailedTurnByTurnWaypoints,
        double totalDurationMins
    ) {}
}
