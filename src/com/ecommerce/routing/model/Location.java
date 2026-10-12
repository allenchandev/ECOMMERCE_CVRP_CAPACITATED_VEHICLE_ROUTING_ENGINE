package com.ecommerce.routing.model;

import java.util.Objects;

/**
 * Represents a geographical node or delivery waypoint.
 */
public record Location(String id, String name, double latitude, double longitude) {
    public Location {
        Objects.requireNonNull(id, "id must not be null");
        Objects.requireNonNull(name, "name must not be null");
    }

    public Location(String id, double latitude, double longitude) {
        this(id, id, latitude, longitude);
    }

    @Override
    public String toString() {
        return String.format("%s (%s)", name, id);
    }
}
