package com.ecommerce.routing;

import com.ecommerce.routing.engine.RoutingEngineFacade;
import com.ecommerce.routing.infrastructure.CityGraph;
import com.ecommerce.routing.model.DeliveryAgent;
import com.ecommerce.routing.model.Location;
import com.ecommerce.routing.model.Package;
import com.ecommerce.routing.service.RouteSequencer.AgentRoutePlan;

import java.util.*;

public class Main {
    public static void main(String[] args) {
        System.out.println("================================================================================");
        System.out.println("                 SMART E-COMMERCE DELIVERY ROUTE FINDER                         ");
        System.out.println("================================================================================");

        // 1. Define City Locations
        Location hub = new Location("HUB-01", "Central Fulfillment Center", 12.9716, 77.5946);
        Location locA = new Location("ZONE-A", "Indiranagar Retail Park", 12.9784, 77.6408);
        Location locB = new Location("ZONE-B", "Koramangala Tech Hub", 12.9352, 77.6245);
        Location locC = new Location("ZONE-C", "HSR Layout Sector 2", 12.9121, 77.6446);
        Location locD = new Location("ZONE-D", "Whitefield IT Corridor", 12.9698, 77.7500);
        Location locE = new Location("ZONE-E", "Electronic City Phase 1", 12.8452, 77.6602);
        Location locF = new Location("ZONE-F", "Marathahalli Bridge", 12.9591, 77.6974);

        // 2. Build City Road Graph with realistic travel times (minutes)
        CityGraph cityGraph = new CityGraph();
        cityGraph.addRoad(hub, locA, 18.0);
        cityGraph.addRoad(hub, locB, 15.0);
        cityGraph.addRoad(locA, locF, 14.0);
        cityGraph.addRoad(locB, locC, 10.0);
        cityGraph.addRoad(locB, locA, 12.0);
        cityGraph.addRoad(locC, locE, 22.0);
        cityGraph.addRoad(locF, locD, 16.0);
        cityGraph.addRoad(locC, locF, 20.0);
        cityGraph.addRoad(locD, locE, 35.0);

        System.out.println("\n[City Map Loaded] Total Locations: " + cityGraph.getAllLocations().size());
        for (Location loc : cityGraph.getAllLocations()) {
            System.out.printf("  • %-32s -> %d connected roads\n", loc.toString(), cityGraph.getNeighbors(loc).size());
        }

        // 3. Define Delivery Fleet with max weight capacities (kg)
        List<DeliveryAgent> fleet = new ArrayList<>(List.of(
            new DeliveryAgent("VAN-101", "Rajesh Kumar (Electric Van)", 50.0),
            new DeliveryAgent("BIKE-202", "Amit Patel (Cargo Bike)", 25.0),
            new DeliveryAgent("VAN-103", "Sunil Verma (Diesel Van)", 60.0)
        ));

        // 4. Define Customer Packages
        List<Package> incomingOrders = new ArrayList<>(List.of(
            new Package("ORD-901", locA, 12.5, "Alice Munro"),
            new Package("ORD-902", locB, 15.0, "Bob Dylan"),
            new Package("ORD-903", locC, 18.0, "Charlie Chaplin"),
            new Package("ORD-904", locD, 22.0, "David Gilmour"),
            new Package("ORD-905", locE, 14.0, "Eva Green"),
            new Package("ORD-906", locF, 8.5,  "Fiona Apple"),
            new Package("ORD-907", locA, 9.0,  "George Orwell")
        ));

        double totalPayloadWeight = incomingOrders.stream().mapToDouble(Package::weight).sum();
        System.out.printf("\n[New Customer Orders] Orders to deliver: %d | Total Package Weight: %.1f kg\n", incomingOrders.size(), totalPayloadWeight);
        for (Package p : incomingOrders) {
            System.out.printf("  • Order %-8s -> Deliver to: %-26s | Weight: %4.1f kg | Customer: %s\n",
                p.orderId(), p.destination().name(), p.weight(), p.customerName());
        }

        // 5. Run Routing Engine Pipeline
        RoutingEngineFacade engine = new RoutingEngineFacade(cityGraph);
        RoutingEngineFacade.DispatchSummary summary = engine.planAndDispatch(hub, incomingOrders, fleet);

        // 6. Display Dispatch Summary
        System.out.println("\n================================================================================");
        System.out.println("                       FINAL DELIVERY PLAN FOR DRIVERS                         ");
        System.out.println("================================================================================");
        System.out.printf("Starting Warehouse  : %s\n", summary.hub());
        System.out.printf("Total Packages      : %d\n", summary.totalOrdersCount());
        System.out.printf("Drivers Assigned    : %d out of %d drivers available\n", summary.activeVehiclesCount(), summary.totalFleetSize());
        System.out.printf("Total Fleet Drive Time: %.1f minutes (about %.1f hours)\n\n",
            summary.totalFleetDurationMins(), summary.totalFleetDurationMins() / 60.0);

        int routeIndex = 1;
        for (AgentRoutePlan plan : summary.activePlans()) {
            DeliveryAgent agent = plan.agent();
            System.out.printf(">>> [DRIVER #%d] %s (Vehicle ID: %s)\n", routeIndex++, agent.getDriverName(), agent.getAgentId());
            System.out.printf("    Vehicle Weight Limit : %.1f kg used of %.1f kg max (%.1f%% full)\n",
                agent.getCurrentLoad(), agent.getMaxCapacity(), (agent.getCurrentLoad() / agent.getMaxCapacity()) * 100.0);
            System.out.printf("    Total Trip Time      : %.1f minutes (including return trip)\n", plan.totalDurationMins());
            System.out.println("    Order of Deliveries  :");

            int stop = 1;
            for (Package pkg : plan.stopSequence()) {
                System.out.printf("      Step %d: Deliver Order %-7s to %-26s (Weight: %.1f kg, Customer: %s)\n",
                    stop++, pkg.orderId(), pkg.destination().name(), pkg.weight(), pkg.customerName());
            }

            System.out.print("    GPS Driving Path     : ");
            for (int i = 0; i < plan.detailedTurnByTurnWaypoints().size(); i++) {
                Location wp = plan.detailedTurnByTurnWaypoints().get(i);
                System.out.print(wp.id());
                if (i < plan.detailedTurnByTurnWaypoints().size() - 1) {
                    System.out.print(" -> ");
                }
            }
            System.out.println("\n" + "-".repeat(80));
        }

        System.out.println("All packages have been successfully assigned and routes are ready!\n");
    }
}
