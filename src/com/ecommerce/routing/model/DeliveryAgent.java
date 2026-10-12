package com.ecommerce.routing.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Encapsulates delivery vehicle state, constraints, and assigned drop-offs.
 */
public class DeliveryAgent {
    private final String agentId;
    private final String driverName;
    private final double maxCapacity;
    private double currentLoad = 0.0;
    private final List<Package> assignedPackages = new ArrayList<>();

    public DeliveryAgent(String agentId, String driverName, double maxCapacity) {
        this.agentId = Objects.requireNonNull(agentId, "agentId must not be null");
        this.driverName = Objects.requireNonNull(driverName, "driverName must not be null");
        if (maxCapacity <= 0) {
            throw new IllegalArgumentException("Max capacity must be positive: " + maxCapacity);
        }
        this.maxCapacity = maxCapacity;
    }

    public DeliveryAgent(String agentId, double maxCapacity) {
        this(agentId, "Driver-" + agentId, maxCapacity);
    }

    public String getAgentId() {
        return agentId;
    }

    public String getDriverName() {
        return driverName;
    }

    public double getMaxCapacity() {
        return maxCapacity;
    }

    public double getCurrentLoad() {
        return currentLoad;
    }

    public double getRemainingCapacity() {
        return maxCapacity - currentLoad;
    }

    public List<Package> getAssignedPackages() {
        return Collections.unmodifiableList(assignedPackages);
    }

    public boolean canLoad(Package pkg) {
        return currentLoad + pkg.weight() <= maxCapacity;
    }

    public void load(Package pkg) {
        if (!canLoad(pkg)) {
            throw new IllegalStateException(
                String.format("Capacity exceeded for Agent %s. Current load: %.1fkg, Pkg weight: %.1fkg, Max capacity: %.1fkg",
                    agentId, currentLoad, pkg.weight(), maxCapacity)
            );
        }
        assignedPackages.add(pkg);
        currentLoad += pkg.weight();
    }

    public void setOptimizedRoute(List<Package> sequencedPackages) {
        this.assignedPackages.clear();
        this.assignedPackages.addAll(sequencedPackages);
    }

    @Override
    public String toString() {
        return String.format("DeliveryAgent{id='%s', name='%s', load=%.1f/%.1fkg, packages=%d}",
                agentId, driverName, currentLoad, maxCapacity, assignedPackages.size());
    }
}
