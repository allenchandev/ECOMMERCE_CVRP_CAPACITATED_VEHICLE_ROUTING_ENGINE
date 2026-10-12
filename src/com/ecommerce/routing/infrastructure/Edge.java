package com.ecommerce.routing.infrastructure;

import com.ecommerce.routing.model.Location;
import java.util.Objects;

/**
 * Weighted directed edge representing a transit connection between two locations.
 */
public record Edge(Location target, double travelTimeMins, double distanceKm) {
    public Edge {
        Objects.requireNonNull(target, "target location cannot be null");
        if (travelTimeMins < 0) {
            throw new IllegalArgumentException("travelTimeMins must be non-negative: " + travelTimeMins);
        }
    }

    public Edge(Location target, double travelTimeMins) {
        this(target, travelTimeMins, travelTimeMins * 0.6); // Approximate distance fallback
    }
}
