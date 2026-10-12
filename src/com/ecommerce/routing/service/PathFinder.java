package com.ecommerce.routing.service;

import com.ecommerce.routing.infrastructure.CityGraph;
import com.ecommerce.routing.infrastructure.Edge;
import com.ecommerce.routing.model.Location;

import java.util.*;

/**
 * Encapsulates Dijkstra's shortest path and travel time calculations on the CityGraph.
 */
public class PathFinder {
    private final CityGraph cityGraph;

    public PathFinder(CityGraph cityGraph) {
        this.cityGraph = Objects.requireNonNull(cityGraph, "cityGraph cannot be null");
    }

    private record NodeTime(Location location, double time) {}

    /**
     * Calculates the shortest travel time from startHub to all reachable locations in the graph.
     */
    public Map<Location, Double> calculateETAs(Location startHub) {
        Map<Location, Double> shortestTimes = new HashMap<>();
        PriorityQueue<NodeTime> pq = new PriorityQueue<>(Comparator.comparingDouble(NodeTime::time));

        for (Location loc : cityGraph.getAllLocations()) {
            shortestTimes.put(loc, Double.MAX_VALUE);
        }

        shortestTimes.put(startHub, 0.0);
        pq.add(new NodeTime(startHub, 0.0));

        while (!pq.isEmpty()) {
            NodeTime current = pq.poll();

            // Optimization: Skip if we found a shorter path already
            Double bestKnown = shortestTimes.get(current.location());
            if (bestKnown != null && current.time() > bestKnown) {
                continue;
            }

            for (Edge edge : cityGraph.getNeighbors(current.location())) {
                double newTime = current.time() + edge.travelTimeMins();
                Double targetTime = shortestTimes.get(edge.target());

                // Relaxation step
                if (targetTime == null || newTime < targetTime) {
                    shortestTimes.put(edge.target(), newTime);
                    pq.add(new NodeTime(edge.target(), newTime));
                }
            }
        }
        return shortestTimes;
    }

    /**
     * Calculates the exact shortest path itinerary and total ETA between source and target.
     */
    public PathResult findShortestPath(Location source, Location target) {
        if (source.equals(target)) {
            return new PathResult(List.of(source), 0.0);
        }

        Map<Location, Double> dist = new HashMap<>();
        Map<Location, Location> prev = new HashMap<>();
        PriorityQueue<NodeTime> pq = new PriorityQueue<>(Comparator.comparingDouble(NodeTime::time));

        dist.put(source, 0.0);
        pq.add(new NodeTime(source, 0.0));

        while (!pq.isEmpty()) {
            NodeTime current = pq.poll();
            if (current.location().equals(target)) {
                break;
            }
            if (current.time() > dist.getOrDefault(current.location(), Double.MAX_VALUE)) {
                continue;
            }

            for (Edge edge : cityGraph.getNeighbors(current.location())) {
                double newDist = current.time() + edge.travelTimeMins();
                if (newDist < dist.getOrDefault(edge.target(), Double.MAX_VALUE)) {
                    dist.put(edge.target(), newDist);
                    prev.put(edge.target(), current.location());
                    pq.add(new NodeTime(edge.target(), newDist));
                }
            }
        }

        if (!dist.containsKey(target)) {
            return new PathResult(Collections.emptyList(), Double.MAX_VALUE); // Unreachable
        }

        List<Location> path = new ArrayList<>();
        Location curr = target;
        while (curr != null) {
            path.add(0, curr);
            curr = prev.get(curr);
        }

        return new PathResult(path, dist.get(target));
    }

    public record PathResult(List<Location> waypoints, double totalTimeMins) {}
}
