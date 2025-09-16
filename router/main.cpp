// These are standard C++ libraries that provide useful tools.
// iostream: For input and output operations (like printing to the console).
// vector: For dynamic arrays (lists of items).
// queue: For managing a list of items in a specific order (first-in, first-out).
// unordered_map: For storing key-value pairs with fast lookups (like a dictionary).
// unordered_set: For storing unique items with fast lookups.
// cmath: For mathematical functions (like sine, cosine, absolute value).
// algorithm: For common algorithms (like sorting or reversing).
// limits: For information about numerical limits (e.g., maximum double value).
#include <iostream>
#include <vector>
#include <queue>
#include <unordered_map>
#include <unordered_set>
#include <cmath>
#include <algorithm>
#include <limits>
#include <cstdint>
#include <cstring>
#include <initializer_list>
#include <string>
#include <functional>
#include <stdexcept>
// These Emscripten libraries are needed to connect our C++ code to JavaScript.
// emscripten/bind.h: Allows C++ classes and functions to be exposed to JavaScript.
// emscripten/val.h: Provides a way to work with JavaScript values in C++.
#include <emscripten/bind.h>
#include <emscripten/val.h>

#include "isochrone_router.hpp"

namespace {
bool hasKey(const emscripten::val& obj, const char* key) {
    if (obj.isUndefined() || obj.isNull()) {
        return false;
    }
    emscripten::val key_val(key);
    return obj.call<bool>("hasOwnProperty", key_val);
}

double getNumber(const emscripten::val& obj, const char* key, double default_value) {
    if (!hasKey(obj, key)) {
        return default_value;
    }
    emscripten::val value = obj[key];
    if (value.isUndefined() || value.isNull()) {
        return default_value;
    }
    return value.as<double>();
}

int getInt(const emscripten::val& obj, const char* key, int default_value) {
    if (!hasKey(obj, key)) {
        return default_value;
    }
    emscripten::val value = obj[key];
    if (value.isUndefined() || value.isNull()) {
        return default_value;
    }
    return value.as<int>();
}

double getNumberAny(const emscripten::val& obj, std::initializer_list<const char*> keys, double default_value) {
    for (const char* key : keys) {
        if (hasKey(obj, key)) {
            return getNumber(obj, key, default_value);
        }
    }
    return default_value;
}

int getIntAny(const emscripten::val& obj, std::initializer_list<const char*> keys, int default_value) {
    for (const char* key : keys) {
        if (hasKey(obj, key)) {
            return getInt(obj, key, default_value);
        }
    }
    return default_value;
}

} // namespace

// --- Forward Declarations ---
// These tell the compiler that these structures and classes exist, so we can use them before they are fully defined.
struct Node;
struct Edge;
class TimeDependentAStar;

struct LandMaskData {
    double lat0 = -90.0;
    double lat1 = 90.0;
    double lon0 = -180.0;
    double lon1 = 180.0;
    double d_lat = 1.0;
    double d_lon = 1.0;
    std::uint32_t rows = 0;
    std::uint32_t cols = 0;
    std::vector<std::uint8_t> cells;
    bool loaded = false;

    double normalizeLongitude(double lon) const {
        while (lon < lon0) lon += 360.0;
        while (lon > lon1) lon -= 360.0;
        return lon;
    }

    bool isLand(double lat, double lon) const {
        if (!loaded) {
            return false;
        }
        if (lat < lat0 || lat > lat1) {
            return true;
        }
        lon = normalizeLongitude(lon);
        if (lon < lon0 || lon > lon1) {
            return true;
        }
        const double row_pos = (lat - lat0) / d_lat;
        const double col_pos = (lon - lon0) / d_lon;
        const int row = static_cast<int>(std::round(row_pos));
        const int col = static_cast<int>(std::round(col_pos));
        if (row < 0 || col < 0 || static_cast<std::uint32_t>(row) >= rows || static_cast<std::uint32_t>(col) >= cols) {
            return true;
        }
        const std::size_t index = static_cast<std::size_t>(row) * cols + static_cast<std::size_t>(col);
        if (index >= cells.size()) {
            return true;
        }
        return cells[index] != 0;
    }
};

// --- Node Structure ---
// Represents a single point in our search grid at a specific time.
struct Node {
    int i, j;           // Grid coordinates (i for latitude, j for longitude).
    double t;           // Time, representing when the vessel arrives at this grid point.
    double g_cost;      // The actual cost (time in hours) from the start node to this node.
    double f_cost;      // The estimated total cost from the start node to the goal node, passing through this node.
                        // f_cost = g_cost + h_cost (heuristic cost).
    Node* parent;       // A pointer to the previous node in the path, used to reconstruct the shortest route.

    // Constructor: Called when a new Node is created.
    Node(int i, int j, double t) : i(i), j(j), t(t), g_cost(0), f_cost(0), parent(nullptr) {}

    // Hash function: Essential for storing Node objects in `unordered_map` and `unordered_set`.
    // It creates a unique numerical "fingerprint" for each node based on its i, j, and t values.
    struct Hash {
        std::size_t operator()(const Node& node) const {
            // Combines hashes of i, j, and t to create a unique hash for the node.
            return std::hash<int>()(node.i) ^
                   (std::hash<int>()(node.j) << 1) ^
                   (std::hash<double>()(node.t) << 2);
        }
    };

    // Equality operator: Defines when two Node objects are considered the same.
    // This is also needed for `unordered_map` and `unordered_set`.
    bool operator==(const Node& other) const {
        // Nodes are equal if their grid coordinates (i, j) and time (t) are very close.
        // We use std::abs(t - other.t) < 1e-6 to account for small floating-point inaccuracies.
        return i == other.i && j == other.j && std::abs(t - other.t) < 1e-6;
    }

    // Less than operator: Used by the `priority_queue` to decide which node to process next.
    // The node with the smallest `f_cost` (estimated total cost) has the highest priority.
    bool operator<(const Node& other) const {
        return f_cost > other.f_cost; // This makes it a min-heap (smallest f_cost comes out first).
    }
};

// --- Edge Structure ---
// Represents the connection (path segment) between two nodes in the grid.
struct Edge {
    int from_i, from_j, to_i, to_j; // Grid coordinates of the start and end of the edge.
    double distance_nm;             // Length of the edge in nautical miles.
    double time_hours;              // Time taken to traverse this edge in hours.
    double effective_speed_kts;     // Average speed in knots (nautical miles per hour) along this edge.
    // A list of geographical points along the edge, used for detailed checks (like avoiding land).
    std::vector<std::pair<double, double>> sample_points;

    // Constructor: Initializes a new Edge.
    Edge(int fi, int fj, int ti, int tj, double dist, double time, double speed)
        : from_i(fi), from_j(fj), to_i(ti), to_j(tj),
          distance_nm(dist), time_hours(time), effective_speed_kts(speed) {}
};

// --- Mask Types ---
// Defines different types of environmental restrictions on the map.
enum class MaskType {
    LAND = 0,         // Areas that are land and cannot be traversed.
    SHALLOW = 1,      // Areas with shallow water, potentially dangerous for vessels.
    RESTRICTED = 2    // Other restricted areas (e.g., military zones, marine protected areas).
};

// --- Safety Caps Structure ---
// Defines safety limits for vessel navigation.
struct SafetyCaps {
    double max_wave_height_m;    // Maximum permissible wave height in meters.
    double max_heading_change_deg; // Maximum allowed change in vessel's direction in degrees over an edge.
    double min_water_depth_m;    // Minimum required water depth in meters.

    // Constructor: Sets default or custom safety caps.
    SafetyCaps(double max_hs = 5.0, double max_heading = 45.0, double min_depth = 10.0)
        : max_wave_height_m(max_hs), max_heading_change_deg(max_heading), min_water_depth_m(min_depth) {}
};

// --- Time-Dependent A* Implementation ---
// This is the main class that performs the route planning.
class TimeDependentAStar {
private:
    // --- Grid Parameters ---
    // These define the geographical area and resolution of our grid.
    double lat0, lat1, lon0, lon1;  // Minimum and maximum latitudes and longitudes of the grid.
    double d_lat, d_lon;            // Spacing (resolution) of the grid in latitude and longitude degrees.
    int n_lat, n_lon;               // Number of grid cells in latitude and longitude directions.

    // --- Constants ---
    // Fixed values used in calculations.
    static constexpr double GC_SPEED_KTS = 12.0;  // Assumed speed in knots for the Great Circle heuristic.
    static constexpr double EARTH_RADIUS_NM = 3440.065;  // Average Earth radius in nautical miles.
    static constexpr double DEG_TO_RAD = M_PI / 180.0; // Conversion factor from degrees to radians.
    static constexpr double SAMPLE_INTERVAL_KM = 3.0;  // How often to sample points along an edge (every 3 km).
    static constexpr double SAMPLE_INTERVAL_NM = SAMPLE_INTERVAL_KM * 0.539957;  // Sample interval converted to nautical miles.

    // --- Safety Configuration ---
    SafetyCaps caps; // The current safety limits for routing.
    const LandMaskData* land_mask = nullptr; // Optional land mask for land avoidance.

    // --- Custom Hash for std::pair<int, int> ---
    // Needed to use `std::pair<int, int>` as a key in `unordered_map` for mask data.
    struct PairHash {
        std::size_t operator()(const std::pair<int, int>& p) const {
            // Combines hashes of the pair's first (i) and second (j) elements.
            return std::hash<int>()(p.first) ^ (std::hash<int>()(p.second) << 1);
        }
    };

    // --- Mask Data Placeholder ---
    // In a real application, this would be loaded from external data packs (e.g., weather, depth charts).
    // For now, it's a simple map storing boolean values for different mask types at each grid point.
    std::unordered_map<std::pair<int, int>, std::vector<bool>, PairHash> mask_data;

public:
    // Constructor: Initializes the A* router with geographical grid bounds and spacing.
    TimeDependentAStar(double lat0, double lat1, double lon0, double lon1, double d_lat, double d_lon)
        : lat0(lat0), lat1(lat1), lon0(lon0), lon1(lon1),
          d_lat(d_lat), d_lon(d_lon) {
        // Calculate the number of grid cells based on bounds and spacing.
        n_lat = static_cast<int>((lat1 - lat0) / d_lat) + 1;
        n_lon = static_cast<int>((lon1 - lon0) / d_lon) + 1;
    }

    // --- Coordinate Conversion Functions ---

    // Converts grid coordinates (i, j) to geographical latitude and longitude.
    std::pair<double, double> gridToLatLon(int i, int j) const {
        double lat = lat0 + i * d_lat;
        double lon = lon0 + j * d_lon;
        return {lat, lon};
    }

    // Normalizes a longitude value to the range [-180, 180) degrees.
    // This is crucial for handling the anti-meridian (International Date Line).
    double normalizeLongitude(double lon) const {
        while (lon >= 180.0) lon -= 360.0; // If longitude is 180 or more, subtract 360.
        while (lon < -180.0) lon += 360.0; // If longitude is less than -180, add 360.
        return lon;
    }

    // Checks if a path between two longitudes crosses the anti-meridian.
    bool crossesAntiMeridian(double lon1, double lon2) const {
        double diff = std::abs(lon1 - lon2);
        return diff > 180.0; // If the absolute difference is greater than 180, it crosses.
    }

    // Converts geographical latitude and longitude to grid coordinates (i, j).
    // It normalizes longitude first to handle the anti-meridian correctly.
    std::pair<int, int> latLonToGrid(double lat, double lon) const {
        lon = normalizeLongitude(lon); // Normalize longitude before conversion.

        int i = static_cast<int>((lat - lat0) / d_lat);
        int j = static_cast<int>((lon - lon0) / d_lon);
        return {i, j};
    }

    // --- Distance Calculation ---

    // Calculates the great circle distance between two geographical points using the Haversine formula.
    // This function also accounts for crossing the anti-meridian.
    double greatCircleDistance(double lat1, double lon1, double lat2, double lon2) const {
        lon1 = normalizeLongitude(lon1); // Normalize longitudes.
        lon2 = normalizeLongitude(lon2);

        double dlat = (lat2 - lat1) * DEG_TO_RAD; // Difference in latitude, converted to radians.
        double dlon = (lon2 - lon1) * DEG_TO_RAD; // Difference in longitude, converted to radians.

        // Adjust dlon if crossing the anti-meridian to ensure shortest path calculation.
        if (crossesAntiMeridian(lon1, lon2)) {
            if (lon1 > 0 && lon2 < 0) { // e.g., from 170 to -170
                dlon = (lon2 + 360.0 - lon1) * DEG_TO_RAD;
            } else if (lon1 < 0 && lon2 > 0) { // e.g., from -170 to 170
                dlon = (lon2 - (lon1 + 360.0)) * DEG_TO_RAD;
            }
        }

        // Haversine formula components.
        double a = std::sin(dlat/2) * std::sin(dlat/2) +
                   std::cos(lat1 * DEG_TO_RAD) * std::cos(lat2 * DEG_TO_RAD) *
                   std::sin(dlon/2) * std::sin(dlon/2);
        double c = 2 * std::atan2(std::sqrt(a), std::sqrt(1-a)); // Angular distance in radians.
        return EARTH_RADIUS_NM * c; // Total distance in nautical miles.
    }

    // --- Heuristic Function (h_cost) ---
    // Estimates the cost (time) from a current node to the goal node.
    // A* uses this to prioritize nodes that seem closer to the goal.
    double heuristic(int i1, int j1, int i2, int j2) const {
        auto [lat1, lon1] = gridToLatLon(i1, j1); // Get geographical coordinates of node 1.
        auto [lat2, lon2] = gridToLatLon(i2, j2); // Get geographical coordinates of node 2 (goal).
        double distance = greatCircleDistance(lat1, lon1, lat2, lon2); // Calculate great circle distance.
        return distance / GC_SPEED_KTS;  // Estimate time in hours assuming a constant great circle speed.
    }

    // --- Grid Validation ---
    // Checks if given grid coordinates (i, j) are within the defined map bounds.
    bool isValid(int i, int j) const {
        return i >= 0 && i < n_lat && j >= 0 && j < n_lon; // Returns true if within bounds.
    }

    // --- Neighbor Generation ---
    // Finds all valid neighboring grid cells (8-directional: horizontal, vertical, and diagonal).
    std::vector<std::pair<int, int>> getNeighbors(int i, int j) const {
        std::vector<std::pair<int, int>> neighbors;
        for (int di = -1; di <= 1; di++) { // Iterate through -1, 0, 1 for latitude difference.
            for (int dj = -1; dj <= 1; dj++) { // Iterate through -1, 0, 1 for longitude difference.
                if (di == 0 && dj == 0) continue; // Skip the current node itself.
                int ni = i + di; // Calculate neighbor's latitude index.
                int nj = j + dj; // Calculate neighbor's longitude index.
                if (isValid(ni, nj)) { // If the neighbor is within grid bounds.
                    neighbors.push_back({ni, nj}); // Add to the list of valid neighbors.
                }
            }
        }
        return neighbors;
    }

    // --- Geodesic Edge Sampling ---
    // Generates a series of points along a great circle path between two given coordinates.
    // These sample points are used for detailed checks like mask and safety cap violations.
    std::vector<std::pair<double, double>> generateGeodesicSamples(double lat1, double lon1, double lat2, double lon2) const {
        std::vector<std::pair<double, double>> samples;

        lon1 = normalizeLongitude(lon1); // Normalize longitudes for accurate calculations.
        lon2 = normalizeLongitude(lon2);

        double total_distance = greatCircleDistance(lat1, lon1, lat2, lon2); // Total distance of the edge.
        // Calculate number of samples needed based on total distance and sample interval.
        int num_samples = static_cast<int>(total_distance / SAMPLE_INTERVAL_NM) + 1;

        if (num_samples <= 1) { // If the edge is very short, just add the end point.
            samples.push_back({lat2, lon2});
            return samples;
        }

        // Calculate initial bearing from start to end point.
        double dlon = (lon2 - lon1) * DEG_TO_RAD;

        // Adjust dlon for bearing calculation if crossing the anti-meridian.
        if (crossesAntiMeridian(lon1, lon2)) {
            if (lon1 > 0 && lon2 < 0) {
                dlon = (lon2 + 360.0 - lon1) * DEG_TO_RAD;
            } else if (lon1 < 0 && lon2 > 0) {
                dlon = (lon2 - (lon1 + 360.0)) * DEG_TO_RAD;
            }
        }

        double y = std::sin(dlon) * std::cos(lat2 * DEG_TO_RAD);
        double x = std::cos(lat1 * DEG_TO_RAD) * std::sin(lat2 * DEG_TO_RAD) -
                   std::sin(lat1 * DEG_TO_RAD) * std::cos(lat2 * DEG_TO_RAD) * std::cos(dlon);
        double bearing = std::atan2(y, x); // Bearing in radians.

        // Generate intermediate points along the great circle path.
        for (int i = 1; i <= num_samples; i++) {
            double fraction = static_cast<double>(i) / num_samples;
            double distance = total_distance * fraction; // Distance along the edge to the current sample point.

            // Calculate latitude and longitude of the intermediate point using great circle navigation formulas.
            double lat = std::asin(std::sin(lat1 * DEG_TO_RAD) * std::cos(distance / EARTH_RADIUS_NM) +
                                  std::cos(lat1 * DEG_TO_RAD) * std::sin(distance / EARTH_RADIUS_NM) * std::cos(bearing));
            double lon = lon1 * DEG_TO_RAD + std::atan2(std::sin(bearing) * std::sin(distance / EARTH_RADIUS_NM) * std::cos(lat1 * DEG_TO_RAD),
                                                       std::cos(distance / EARTH_RADIUS_NM) - std::sin(lat1 * DEG_TO_RAD) * std::sin(lat));

            lon = normalizeLongitude(lon / DEG_TO_RAD); // Normalize longitude of the sampled point.
            samples.push_back({lat / DEG_TO_RAD, lon}); // Add to samples list.
        }

        return samples;
    }

    // --- Mask Checking ---
    // Checks if a given geographical point (lat, lon) is blocked by a specific mask type.
    bool isMasked(double lat, double lon, MaskType mask_type) const {
        if (land_mask && land_mask->isLand(lat, lon)) {
            return true;
        }
        auto [i, j] = latLonToGrid(lat, lon); // Convert to grid coordinates.
        if (!isValid(i, j)) return true;  // If outside grid, consider it masked (blocked).

        // --- Placeholder for Real Mask Data ---
        // In a real system, this would access actual mask data loaded from data packs.
        // For this demo, it's a simple lookup in a map.
        auto key = std::make_pair(i, j);
        auto it = mask_data.find(key);
        if (it != mask_data.end() && it->second.size() > static_cast<int>(mask_type)) {
            return it->second[static_cast<int>(mask_type)]; // Check the specific mask type.
        }

        // If no specific mask data, assume not masked for now.
        return false;
    }

    // --- Safety Cap Violation Check ---
    // Checks if traversing an edge violates any defined safety limits.
    bool violatesCaps(const Edge& edge, double current_heading = 0.0) const {
        // --- Heading Change Cap (simplified) ---
        // This is a simplified check; a real implementation would use actual headings.
        if (current_heading != 0.0) { // If a heading is provided.
            // A very basic approximation of heading change (absolute difference in grid indices).
            double heading_change = std::abs(edge.from_i - edge.to_i) + std::abs(edge.from_j - edge.to_j);
            if (heading_change > caps.max_heading_change_deg) {
                return true; // Heading change too drastic.
            }
        }

        // --- Mask Check for Sample Points ---
        // Check if any point along the edge (from geodesic sampling) is masked.
        for (const auto& [lat, lon] : edge.sample_points) {
            if (isMasked(lat, lon, MaskType::LAND) ||
                isMasked(lat, lon, MaskType::SHALLOW) ||
                isMasked(lat, lon, MaskType::RESTRICTED)) {
                return true; // Edge passes through a masked area.
            }
        }

        // If no caps or masks are violated, the edge is safe.
        return false;
    }

    // --- Edge Creation ---
    // Creates an `Edge` object, including generating geodesic sample points and calculating basic costs.
    Edge createEdge(int from_i, int from_j, int to_i, int to_j, double current_heading = 0.0) const {
        auto [lat1, lon1] = gridToLatLon(from_i, from_j); // Get start lat/lon.
        auto [lat2, lon2] = gridToLatLon(to_i, to_j);     // Get end lat/lon.

        double distance = greatCircleDistance(lat1, lon1, lat2, lon2); // Calculate distance.
        double time = distance / GC_SPEED_KTS; // Estimate time.

        Edge edge(from_i, from_j, to_i, to_j, distance, time, GC_SPEED_KTS); // Create the edge.

        edge.sample_points = generateGeodesicSamples(lat1, lon1, lat2, lon2); // Generate sample points.

        return edge;
    }

    // --- Setter for Safety Caps ---
    // Allows updating the safety limits used by the router.
    void setSafetyCaps(const SafetyCaps& new_caps) {
        caps = new_caps;
    }

    void setLandMask(const LandMaskData* mask) {
        land_mask = mask;
    }

    // --- Mask Data Setter (Placeholder) ---
    // Allows adding simulated mask data to the router.
    void addMaskData(int i, int j, const std::vector<bool>& masks) {
        mask_data[{i, j}] = masks;
    }

    // --- Public Test Functions ---
    // These functions are exposed to allow testing individual components from JavaScript.
    double testNormalizeLongitude(double lon) const {
        return normalizeLongitude(lon);
    }

    bool testCrossesAntiMeridian(double lon1, double lon2) const {
        return crossesAntiMeridian(lon1, lon2);
    }

    double testGreatCircleDistance(double lat1, double lon1, double lat2, double lon2) const {
        return greatCircleDistance(lat1, lon1, lat2, lon2);
    }

    // --- Main A* Search Function ---
    // Finds the optimal (shortest time) path from a start node to a goal node.
    std::vector<Node> solve(int start_i, int start_j, int goal_i, int goal_j, double start_time = 0.0) {
        // `open_set`: A priority queue containing nodes to be explored, ordered by f_cost (estimated total cost).
        std::priority_queue<Node> open_set;
        // `closed_set`: Stores nodes that have already been fully processed.
        std::unordered_set<Node, Node::Hash> closed_set;
        // `g_scores`: Stores the cheapest cost found so far to reach each node from the start.
        std::unordered_map<Node, double, Node::Hash> g_scores;

        // Create the starting node.
        Node start(start_i, start_j, start_time);
        start.g_cost = 0; // Cost to reach start from start is 0.
        // Calculate initial f_cost for the start node.
        start.f_cost = heuristic(start_i, start_j, goal_i, goal_j);

        open_set.push(start); // Add start node to the open set.
        g_scores[start] = 0;   // Record the g_cost for the start node.

        // Loop as long as there are nodes to explore.
        while (!open_set.empty()) {
            Node current = open_set.top(); // Get the node with the lowest f_cost.
            open_set.pop();               // Remove it from the open set.

            // --- Goal Check ---
            // If the current node is the goal node, we've found a path!
            if (current.i == goal_i && current.j == goal_j) {
                // --- Path Reconstruction ---
                // Trace back from the goal node using the `parent` pointers to build the full path.
                std::vector<Node> path;
                Node* node = &current; // Start from the goal node.
                while (node != nullptr) {
                    path.push_back(*node); // Add current node to path.
                    node = node->parent;   // Move to the parent node.
                }
                std::reverse(path.begin(), path.end()); // Reverse to get path from start to goal.
                return path; // Return the found path.
            }

            // If this node has already been processed (in closed set), skip it.
            if (closed_set.find(current) != closed_set.end()) {
                continue;
            }
            closed_set.insert(current); // Mark current node as processed.

            // --- Explore Neighbors ---
            // Get all valid neighboring grid cells.
            auto neighbors = getNeighbors(current.i, current.j);
            for (auto [ni, nj] : neighbors) { // For each neighbor.
                Node neighbor(ni, nj, current.t); // Create a new Node object for the neighbor.

                // If neighbor already processed, skip.
                if (closed_set.find(neighbor) != closed_set.end()) {
                    continue;
                }

                // Create an edge between current and neighbor, including geodesic sampling.
                Edge edge = createEdge(current.i, current.j, ni, nj);

                // Check if this edge violates any safety caps or passes through masked areas.
                if (violatesCaps(edge)) {
                    continue; // If unsafe, skip this edge and this neighbor.
                }

                // The cost to move to this neighbor is the time taken to traverse the edge.
                double edge_cost = edge.time_hours;

                // Calculate the potential g_cost to reach this neighbor.
                double tentative_g = current.g_cost + edge_cost;

                // --- Path Improvement Check ---
                // Check if this new path to the neighbor is shorter (lower g_cost) than any previously found path.
                auto it = g_scores.find(neighbor);
                if (it == g_scores.end() || tentative_g < it->second) {
                    neighbor.g_cost = tentative_g; // Update g_cost.
                    // Update f_cost: g_cost (actual cost from start) + heuristic (estimated cost to goal).
                    neighbor.f_cost = tentative_g + heuristic(ni, nj, goal_i, goal_j);
                    // Set the current node as the parent for path reconstruction.
                    // IMPORTANT: We create a new Node instance here to store the parent link correctly.
                    neighbor.parent = new Node(current);

                    g_scores[neighbor] = tentative_g; // Record the new best g_cost for this neighbor.
                    open_set.push(neighbor);          // Add neighbor to the open set for further exploration.
                }
            }
        }

        // If the open set becomes empty and the goal was not reached, no path exists.
        return {}; // Return an empty path.
    }
};

// --- Emscripten Wrapper Class ---
// This class acts as a bridge between our C++ `TimeDependentAStar` logic and JavaScript.
// It simplifies exposing methods and handling data types for Embind.
class RouterWrapper {
private:
    // A smart pointer to our A* router instance. `unique_ptr` automatically manages memory.
    std::unique_ptr<TimeDependentAStar> router;
    IsochroneRouter isochrone_router;
    LandMaskData land_mask;

    IsochroneRouter::Request parseIsochroneRequest(const emscripten::val& request) const;
    IsochroneRouter::EnvironmentSampler buildEnvironmentSampler(const emscripten::val& sampler, const IsochroneRouter::ShipModel& ship) const;
    emscripten::val convertIsochroneResult(const IsochroneRouter::Result& result) const;

public:
    // Constructor: Creates a new `TimeDependentAStar` instance when called from JavaScript.
    RouterWrapper(double lat0, double lat1, double lon0, double lon1, double d_lat, double d_lon)
        : router(std::make_unique<TimeDependentAStar>(lat0, lat1, lon0, lon1, d_lat, d_lon)) {}

    // Method to set safety caps from JavaScript.
    void setSafetyCaps(double max_wave_height, double max_heading_change, double min_water_depth) {
        SafetyCaps caps(max_wave_height, max_heading_change, min_water_depth);
        router->setSafetyCaps(caps);
    }

    // Method to add mask data from JavaScript.
    void addMaskData(int i, int j, const std::vector<bool>& masks) {
        router->addMaskData(i, j, masks);
    }

    void loadLandMask(const std::vector<std::uint8_t>& bytes) {
        const std::size_t header_bytes = sizeof(double) * 6 + sizeof(std::uint32_t) * 2;
        if (bytes.size() < header_bytes) {
            throw std::runtime_error("Land mask buffer too small");
        }
        LandMaskData parsed;
        std::size_t offset = 0;
        auto read_double = [&](std::size_t pos) {
            double value;
            std::memcpy(&value, bytes.data() + pos, sizeof(double));
            return value;
        };
        parsed.lat0 = read_double(offset); offset += sizeof(double);
        parsed.lat1 = read_double(offset); offset += sizeof(double);
        parsed.lon0 = read_double(offset); offset += sizeof(double);
        parsed.lon1 = read_double(offset); offset += sizeof(double);
        parsed.d_lat = read_double(offset); offset += sizeof(double);
        parsed.d_lon = read_double(offset); offset += sizeof(double);
        auto read_uint32 = [&](std::size_t pos) {
            std::uint32_t value;
            std::memcpy(&value, bytes.data() + pos, sizeof(std::uint32_t));
            return value;
        };
        parsed.rows = read_uint32(offset); offset += sizeof(std::uint32_t);
        parsed.cols = read_uint32(offset); offset += sizeof(std::uint32_t);
        const std::size_t expected_cells = static_cast<std::size_t>(parsed.rows) * static_cast<std::size_t>(parsed.cols);
        if (bytes.size() - offset < expected_cells) {
            throw std::runtime_error("Land mask buffer missing cell data");
        }
        parsed.cells.assign(bytes.begin() + static_cast<long>(offset), bytes.begin() + static_cast<long>(offset + expected_cells));
        parsed.loaded = true;
        land_mask = std::move(parsed);
        if (router) {
            router->setLandMask(&land_mask);
        }
    }

    // Method to solve a route and return the path as a JavaScript array of objects.
    emscripten::val solve(int start_i, int start_j, int goal_i, int goal_j, double start_time = 0.0) {
        auto path = router->solve(start_i, start_j, goal_i, goal_j, start_time); // Call C++ solve method.

        emscripten::val result = emscripten::val::array(); // Create an empty JavaScript array.
        for (const auto& node : path) { // For each node in the C++ path.
            emscripten::val node_obj = emscripten::val::object(); // Create a JavaScript object for the node.
            node_obj.set("i", node.i);
            node_obj.set("j", node.j);
            node_obj.set("t", node.t);
            node_obj.set("g_cost", node.g_cost);
            node_obj.set("f_cost", node.f_cost);
            result.call<void>("push", node_obj); // Add the node object to the JavaScript array.
        }
        return result; // Return the JavaScript array.
    }

    // Method to create an edge and return its data as a JavaScript object.
    emscripten::val createEdge(int from_i, int from_j, int to_i, int to_j) {
        auto edge = router->createEdge(from_i, from_j, to_i, to_j); // Call C++ createEdge method.

        emscripten::val edge_obj = emscripten::val::object(); // Create a JavaScript object for the edge.
        edge_obj.set("from_i", edge.from_i);
        edge_obj.set("from_j", edge.from_j);
        edge_obj.set("to_i", edge.to_i);
        edge_obj.set("to_j", edge.to_j);
        edge_obj.set("distance_nm", edge.distance_nm);
        edge_obj.set("time_hours", edge.time_hours);
        edge_obj.set("effective_speed_kts", edge.effective_speed_kts);

        emscripten::val sample_points = emscripten::val::array(); // Create a JavaScript array for sample points.
        for (const auto& [lat, lon] : edge.sample_points) { // For each sample point.
            emscripten::val point = emscripten::val::object(); // Create a JavaScript object for the point.
            point.set("lat", lat);
            point.set("lon", lon);
            sample_points.call<void>("push", point); // Add to JavaScript array.
        }
        edge_obj.set("sample_points", sample_points); // Set sample points array in edge object.

        return edge_obj;
    }

    // --- Utility Functions exposed to JavaScript ---
    emscripten::val gridToLatLon(int i, int j) {
        auto [lat, lon] = router->gridToLatLon(i, j);
        emscripten::val result = emscripten::val::object();
        result.set("lat", lat);
        result.set("lon", lon);
        return result;
    }

    emscripten::val latLonToGrid(double lat, double lon) {
        auto [i, j] = router->latLonToGrid(lat, lon);
        emscripten::val result = emscripten::val::object();
        result.set("i", i);
        result.set("j", j);
        return result;
    }

    double greatCircleDistance(double lat1, double lon1, double lat2, double lon2) {
        return router->testGreatCircleDistance(lat1, lon1, lat2, lon2);
    }

    double normalizeLongitude(double lon) {
        return router->testNormalizeLongitude(lon);
    }

bool crossesAntiMeridian(double lon1, double lon2) {
        return router->testCrossesAntiMeridian(lon1, lon2);
    }

    emscripten::val solveIsochrone(const emscripten::val& request, const emscripten::val& sampler = emscripten::val::undefined()) {
        IsochroneRouter::Request parsed_request = parseIsochroneRequest(request);
        auto environment_sampler = buildEnvironmentSampler(sampler, parsed_request.ship);
        auto result = isochrone_router.solve(parsed_request, environment_sampler);
        return convertIsochroneResult(result);
    }
};

IsochroneRouter::Request RouterWrapper::parseIsochroneRequest(const emscripten::val& request) const {
    IsochroneRouter::Request parsed;

    emscripten::val start = hasKey(request, "start") ? request["start"] : emscripten::val::object();
    parsed.start.lat = getNumberAny(start, {"lat", "latitude"}, parsed.start.lat);
    parsed.start.lon = getNumberAny(start, {"lon", "lng", "longitude"}, parsed.start.lon);

    emscripten::val dest = hasKey(request, "destination") ? request["destination"] : emscripten::val::object();
    if (!hasKey(request, "destination") && hasKey(request, "goal")) {
        dest = request["goal"];
    }
    parsed.goal.lat = getNumberAny(dest, {"lat", "latitude"}, parsed.goal.lat);
    parsed.goal.lon = getNumberAny(dest, {"lon", "lng", "longitude"}, parsed.goal.lon);

    parsed.departure_time_hours = getNumberAny(request,
        {"departTimeHours", "departureTimeHours", "depart_time", "departureTime"},
        parsed.departure_time_hours);

    IsochroneRouter::Settings settings = parsed.settings;
    settings.time_step_minutes = getNumberAny(request, {"timeStepMinutes", "time_step_minutes"}, settings.time_step_minutes);
    settings.heading_count = getIntAny(request, {"headingCount", "heading_count"}, settings.heading_count);
    settings.merge_radius_nm = getNumberAny(request, {"mergeRadiusNm", "merge_radius_nm"}, settings.merge_radius_nm);
    settings.goal_radius_nm = getNumberAny(request, {"goalRadiusNm", "goal_radius_nm"}, settings.goal_radius_nm);
    settings.max_hours = getNumberAny(request, {"maxHours", "max_hours"}, settings.max_hours);

    emscripten::val settings_obj = hasKey(request, "settings") ? request["settings"] : emscripten::val::object();
    settings.time_step_minutes = getNumberAny(settings_obj, {"timeStepMinutes", "time_step_minutes"}, settings.time_step_minutes);
    settings.heading_count = getIntAny(settings_obj, {"headingCount", "heading_count"}, settings.heading_count);
    settings.merge_radius_nm = getNumberAny(settings_obj, {"mergeRadiusNm", "merge_radius_nm"}, settings.merge_radius_nm);
    settings.goal_radius_nm = getNumberAny(settings_obj, {"goalRadiusNm", "goal_radius_nm"}, settings.goal_radius_nm);
    settings.max_hours = getNumberAny(settings_obj, {"maxHours", "max_hours"}, settings.max_hours);
    parsed.settings = settings;

    IsochroneRouter::ShipModel ship = parsed.ship;
    emscripten::val ship_obj = hasKey(request, "ship") ? request["ship"] : emscripten::val::object();
    if (!hasKey(request, "ship") && hasKey(request, "shipModel")) {
        ship_obj = request["shipModel"];
    }
    ship.calm_speed_kts = getNumberAny(ship_obj, {"calmSpeedKts", "speed", "cruiseSpeedKts"}, ship.calm_speed_kts);
    ship.draft_m = getNumberAny(ship_obj, {"draft", "draftM", "draftMeters"}, ship.draft_m);
    ship.safety_depth_buffer_m = getNumberAny(ship_obj, {"safetyDepthBuffer", "safetyDepthMargin"}, ship.safety_depth_buffer_m);
    ship.max_wave_height_m = getNumberAny(ship_obj, {"maxWaveHeight", "waveHeightCap"}, ship.max_wave_height_m);
    ship.max_heading_change_deg = getNumberAny(ship_obj, {"maxHeadingChange", "maxHeadingDelta", "headingChangeLimit"}, ship.max_heading_change_deg);
    ship.min_speed_kts = getNumberAny(ship_obj, {"minSpeed", "minSpeedKts"}, ship.min_speed_kts);
    ship.wave_drag_coefficient = getNumberAny(ship_obj, {"waveDragCoefficient", "waveLossCoefficient"}, ship.wave_drag_coefficient);

    emscripten::val safety = hasKey(request, "safetyCaps") ? request["safetyCaps"] : emscripten::val::object();
    ship.max_wave_height_m = getNumberAny(safety, {"maxWaveHeight", "waveHeightCap"}, ship.max_wave_height_m);
    ship.max_heading_change_deg = getNumberAny(safety, {"maxHeadingChange", "maxHeadingDelta"}, ship.max_heading_change_deg);
    double min_water_depth = getNumberAny(safety, {"minWaterDepth", "minimumWaterDepth"}, 0.0);
    if (min_water_depth > 0.0) {
        double buffer = min_water_depth - ship.draft_m;
        if (buffer > ship.safety_depth_buffer_m) {
            ship.safety_depth_buffer_m = buffer;
        }
    }

    double draft_override = getNumberAny(safety, {"draft", "draftMeters"}, ship.draft_m);
    if (draft_override > 0.0) {
        ship.draft_m = draft_override;
    }

    parsed.ship = ship;
    return parsed;
}

IsochroneRouter::EnvironmentSampler RouterWrapper::buildEnvironmentSampler(const emscripten::val& sampler, const IsochroneRouter::ShipModel& ship) const {
    constexpr double PI = 3.14159265358979323846;

    // Default sampler provides gentle background currents and deep water so routing works without external data feeds.
    IsochroneRouter::EnvironmentSampler base_sampler = [this, ship](double lat, double lon, double time_hours) {
        const double lat_rad = lat * PI / 180.0;
        const double lon_rad = lon * PI / 180.0;
        IsochroneRouter::EnvironmentSample sample;
        sample.current_east_kn = 0.4 * std::sin(lat_rad) * std::cos(time_hours / 6.0);
        sample.current_north_kn = 0.3 * std::cos(lat_rad) * std::sin(time_hours / 6.0);
        sample.wave_height_m = std::max(0.0, 1.0 + 0.4 * std::sin(lat_rad + lon_rad + time_hours / 12.0));
        if (land_mask.loaded && land_mask.isLand(lat, lon)) {
            sample.depth_m = 0.0;
            sample.wave_height_m = ship.max_wave_height_m + 10.0;
        } else {
            sample.depth_m = 5000.0;
        }
        return sample;
    };

    if (sampler.isUndefined() || sampler.isNull()) {
        return base_sampler;
    }

    emscripten::val function_constructor = emscripten::val::global("Function");
    const bool is_function = sampler.instanceof(function_constructor);
    const bool has_sample_method = !is_function && hasKey(sampler, "sample");

    if (!is_function && !has_sample_method) {
        return base_sampler;
    }

    return [sampler, base_sampler, is_function, this, ship](double lat, double lon, double time_hours) {
        IsochroneRouter::EnvironmentSample sample = base_sampler(lat, lon, time_hours);
        emscripten::val result = is_function
            ? sampler(lat, lon, time_hours)
            : sampler.call<emscripten::val>("sample", lat, lon, time_hours);

        if (!result.isUndefined() && !result.isNull()) {
            sample.current_east_kn = getNumberAny(result, {"current_east_kn", "currentEastKn", "current_east", "currentU", "currentEast"}, sample.current_east_kn);
            sample.current_north_kn = getNumberAny(result, {"current_north_kn", "currentNorthKn", "current_north", "currentV", "currentNorth"}, sample.current_north_kn);
            sample.wave_height_m = getNumberAny(result, {"wave_height_m", "waveHeightM", "hs", "significantWaveHeight"}, sample.wave_height_m);
            sample.depth_m = getNumberAny(result, {"depth_m", "depth", "depthM"}, sample.depth_m);
        }

        if (land_mask.loaded && land_mask.isLand(lat, lon)) {
            sample.depth_m = 0.0;
            sample.wave_height_m = std::max(sample.wave_height_m, ship.max_wave_height_m + 5.0);
        }

        return sample;
    };
}

emscripten::val RouterWrapper::convertIsochroneResult(const IsochroneRouter::Result& result) const {
    emscripten::val output = emscripten::val::object();
    output.set("mode", std::string("ISOCHRONE"));

    emscripten::val waypoint_array = emscripten::val::array();
    for (std::size_t i = 0; i < result.waypoints.size(); ++i) {
        const auto& wp = result.waypoints[i];
        emscripten::val waypoint = emscripten::val::object();
        waypoint.set("lat", wp.lat);
        waypoint.set("lon", wp.lon);
        waypoint.set("time", wp.time_hours);
        waypoint_array.set(static_cast<unsigned>(i), waypoint);
    }
    output.set("waypoints", waypoint_array);
    output.set("eta", result.diagnostics.eta_hours);

    emscripten::val diagnostics = emscripten::val::object();
    diagnostics.set("totalDistanceNm", result.diagnostics.total_distance_nm);
    diagnostics.set("averageSpeedKts", result.diagnostics.average_speed_kts);
    diagnostics.set("maxWaveHeightM", result.diagnostics.max_wave_height_m);
    diagnostics.set("stepCount", result.diagnostics.step_count);
    diagnostics.set("frontierCount", result.diagnostics.frontier_size);
    diagnostics.set("reachedGoal", result.diagnostics.reached_goal);
    diagnostics.set("finalDistanceToGoalNm", result.diagnostics.final_distance_to_goal_nm);
    diagnostics.set("etaHours", result.diagnostics.eta_hours);
    output.set("diagnostics", diagnostics);

    return output;
}

// --- Emscripten Bindings ---
// This macro registers our C++ classes and functions so they can be called from JavaScript.
EMSCRIPTEN_BINDINGS(seasight_router) {
    // Expose the `RouterWrapper` class to JavaScript.
    emscripten::class_<RouterWrapper>("RouterWrapper")
        // Define the constructor that JavaScript will use to create `RouterWrapper` objects.
        .constructor<double, double, double, double, double, double>()
        // Expose public methods of `RouterWrapper` to JavaScript.
        .function("setSafetyCaps", &RouterWrapper::setSafetyCaps)
        .function("addMaskData", &RouterWrapper::addMaskData)
        .function("loadLandMask", &RouterWrapper::loadLandMask)
        .function("solve", &RouterWrapper::solve)
        .function("solveIsochrone", &RouterWrapper::solveIsochrone)
        .function("createEdge", &RouterWrapper::createEdge)
        .function("gridToLatLon", &RouterWrapper::gridToLatLon)
        .function("latLonToGrid", &RouterWrapper::latLonToGrid)
        .function("greatCircleDistance", &RouterWrapper::greatCircleDistance)
        .function("normalizeLongitude", &RouterWrapper::normalizeLongitude)
        .function("crossesAntiMeridian", &RouterWrapper::crossesAntiMeridian);

    // Register `std::vector<bool>` so Emscripten knows how to convert it to/from JavaScript arrays.
    emscripten::register_vector<bool>("vector<bool>");
    emscripten::register_vector<std::uint8_t>("vector<uint8_t>");
}

// --- Main Function (for C++ standalone testing) ---
// This `main` function is primarily for testing the C++ code directly,
// without involving Emscripten or JavaScript.
// When compiled to WASM, this `main` function might not be directly executed
// depending on Emscripten's settings (e.g., `-s NO_ENTRY`).
int main() {
    std::cout << "SeaSight Router - Time-dependent A* with Anti-meridian Handling" << std::endl;

    // --- Example Usage and Testing ---
    // Create an instance of our A* router with a defined grid (from 30°N to 50°N, -80°W to -60°W, with 0.5° spacing).
    TimeDependentAStar router(30.0, 50.0, -80.0, -60.0, 0.5, 0.5);

    // Set some example safety caps (e.g., max 4m waves, max 30° heading change, min 15m water depth).
    SafetyCaps caps(4.0, 30.0, 15.0);
    router.setSafetyCaps(caps);

    // Add some simulated mask data for testing purposes.
    // At grid (5,5), it's land (true for LAND mask).
    router.addMaskData(5, 5, {true, false, false});
    // At grid (6,6), it's shallow water.
    router.addMaskData(6, 6, {false, true, false});
    // At grid (7,7), it's a restricted area.
    router.addMaskData(7, 7, {false, false, true});

    // --- Test Route Calculation ---
    // Try to find a route from grid (0,0) to grid (10,10), starting at time 0.0.
    auto path = router.solve(0, 0, 10, 10, 0.0);

    std::cout << "Path found with " << path.size() << " nodes" << std::endl;

    // --- Test Edge Sampling ---
    // Create an example edge and print its details.
    auto edge = router.createEdge(0, 0, 5, 5);
    std::cout << "Edge from (0,0) to (5,5) has " << edge.sample_points.size()
              << " sample points" << std::endl;
    std::cout << "Edge distance: " << edge.distance_nm << " nm" << std::endl;
    std::cout << "Edge time: " << edge.time_hours << " hours" << std::endl;

    // --- Test Anti-meridian Handling ---
    std::cout << "\n--- Anti-meridian Tests ---" << std::endl;

    // Test longitude normalization.
    std::cout << "Normalize 190° to: " << router.testNormalizeLongitude(190.0) << "°" << std::endl;
    std::cout << "Normalize -190° to: " << router.testNormalizeLongitude(-190.0) << "°" << std::endl;
    std::cout << "Normalize 180° to: " << router.testNormalizeLongitude(180.0) << "°" << std::endl;
    std::cout << "Normalize -180° to: " << router.testNormalizeLongitude(-180.0) << "°" << std::endl;

    // Test anti-meridian crossing detection.
    std::cout << "Crosses anti-meridian (179°, -179°): "
              << (router.testCrossesAntiMeridian(179.0, -179.0) ? "Yes" : "No") << std::endl;
    std::cout << "Crosses anti-meridian (170°, 175°): "
              << (router.testCrossesAntiMeridian(170.0, 175.0) ? "Yes" : "No") << std::endl;

    // Test distance calculation across the anti-meridian.
    double dist1 = router.testGreatCircleDistance(0.0, 179.0, 0.0, -179.0);
    double dist2 = router.testGreatCircleDistance(0.0, 179.0, 0.0, 181.0);
    std::cout << "Distance 179° to -179°: " << dist1 << " nm" << std::endl;
    std::cout << "Distance 179° to 181°: " << dist2 << " nm" << std::endl;

    return 0; // Indicate successful execution.
}
