package com.ecommerce.routing.model;

import java.util.Objects;

/**
 * Represents a customer order/package to be delivered.
 */
public record Package(String orderId, Location destination, double weight, String customerName) {
    public Package {
        Objects.requireNonNull(orderId, "orderId must not be null");
        Objects.requireNonNull(destination, "destination must not be null");
        if (weight <= 0) {
            throw new IllegalArgumentException("Package weight must be positive: " + weight);
        }
    }

    public Package(String orderId, Location destination, double weight) {
        this(orderId, destination, weight, "Customer-" + orderId);
    }

    @Override
    public String toString() {
        return String.format("[Order #%s -> %s (%.1f kg)]", orderId, destination.id(), weight);
    }
}
