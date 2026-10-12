package com.ecommerce.routing.infrastructure;

import com.ecommerce.routing.model.Location;
import java.util.*;

/**
 * Adjacency-list based representation of the city road network.
 */
public class CityGraph {
    private final Map<Location, List<Edge>> adjacencyList = new HashMap<>();

    public void addRoad(Location source, Location destination, double travelTimeMins, double distanceKm, boolean bidirectional) {
        adjacencyList.computeIfAbsent(source, k -> new ArrayList<>()).add(new Edge(destination, travelTimeMins, distanceKm));
        if (bidirectional) {
            adjacencyList.computeIfAbsent(destination, k -> new ArrayList<>()).add(new Edge(source, travelTimeMins, distanceKm));
        }
    }

    public void addRoad(Location source, Location destination, double travelTimeMins, boolean bidirectional) {
        addRoad(source, destination, travelTimeMins, travelTimeMins * 0.5, bidirectional);
    }

    public void addRoad(Location source, Location destination, double travelTimeMins) {
        addRoad(source, destination, travelTimeMins, true);
    }

    public List<Edge> getNeighbors(Location location) {
        return Collections.unmodifiableList(adjacencyList.getOrDefault(location, Collections.emptyList()));
    }

    public Set<Location> getAllLocations() {
        return Collections.unmodifiableSet(adjacencyList.keySet());
    }

    public boolean containsLocation(Location location) {
        return adjacencyList.containsKey(location);
    }
}
