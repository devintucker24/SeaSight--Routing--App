#pragma once

#include <cstdint>
#include <functional>
#include <vector>
#include <limits> // Required for std::numeric_limits

// IsochroneRouter implements a frontier-based time expansion algorithm for
// maritime routing that respects dynamic environment data.
class IsochroneRouter {
public:
    struct GeoPoint {
        double lat = 0.0;
        double lon = 0.0;
    };

    struct ShipModel {
        double calm_speed_kts = 14.0;
        double draft_m = 7.0;
        double safety_depth_buffer_m = 1.5;
        double max_wave_height_m = 4.5;
        double max_heading_change_deg = 45.0;
        double min_speed_kts = 3.0;
        double wave_drag_coefficient = 0.8; // knots lost per meter of wave height.
    };

    struct Settings {
        double time_step_minutes = 45.0;
        int heading_count = 16;
        double merge_radius_nm = 15.0;
        double goal_radius_nm = 25.0;
        double max_hours = 240.0;
        double simplify_tolerance_nm = 1.5;
        double min_leg_nm = 2.0;
        double min_heading_deg = 5.0;
        double bearing_window_deg = 60.0;  // ±60° window around great-circle bearing to goal
        int beam_width = 1000;  // Maximum number of states to keep in frontier (0 = unlimited)
        double min_time_step_minutes = 15.0;  // Minimum time step for adaptive sampling
        double max_time_step_minutes = 120.0;  // Maximum time step for adaptive sampling
        double complexity_threshold = 0.5;  // Threshold for environmental complexity (0-1)
        bool enable_adaptive_sampling = true;  // Enable/disable adaptive time step adjustment

        // Hierarchical Routing Parameters
        bool enable_hierarchical_routing = true; // Master switch for this feature
        double long_route_threshold_nm = 300.0; // Routes longer than this will use hierarchical search
        double coarse_grid_resolution_deg = 1.0; // Grid resolution for the coarse pass
        double corridor_width_nm = 50.0;         // Width of the search corridor for the fine pass
    };

    struct HazardFlags {
        static constexpr std::uint32_t NONE = 0;
        static constexpr std::uint32_t HIGH_WAVE = 1u << 0;
    };

    struct Request {
        GeoPoint start;
        GeoPoint goal;
        double departure_time_hours = 0.0;
        ShipModel ship;
        Settings settings;
    };

    struct EnvironmentSample {
        double current_east_kn = 0.0;   // positive = eastward
        double current_north_kn = 0.0;  // positive = northward
        double wave_height_m = 0.0;
        double depth_m = 5000.0;
    };

    using EnvironmentSampler = std::function<EnvironmentSample(double, double, double)>;

    struct Waypoint {
        double lat = 0.0;
        double lon = 0.0;
        double time_hours = 0.0;
        double heading_deg = std::numeric_limits<double>::quiet_NaN();
        bool is_course_change = false;
        double max_wave_height_m = 0.0;
        std::uint32_t hazard_flags = 0;
    };

    struct Diagnostics {
        double total_distance_nm = 0.0;
        double eta_hours = 0.0;
        double average_speed_kts = 0.0;
        double max_wave_height_m = 0.0;
        int step_count = 0;
        int frontier_size = 0;
        bool reached_goal = false;
        double final_distance_to_goal_nm = 0.0;
        std::uint32_t hazard_flags = 0;
    };

    struct Result {
        std::vector<Waypoint> waypoints;
        std::vector<Waypoint> waypoints_raw;
        std::vector<int> index_map;
        Diagnostics diagnostics;
        bool is_coarse_route = false; // Flag to indicate if this is from a coarse pass
    };

    IsochroneRouter() = default;

    Result solve(const Request& request, const EnvironmentSampler& sampler) const;

    static double clamp(double value, double min_value, double max_value);
    static double degToRad(double deg);
    static double radToDeg(double rad);
    static double normalizeLongitude(double lon);
    static double headingDifference(double a, double b);
    static double greatCircleDistance(const GeoPoint& a, const GeoPoint& b);
    static GeoPoint advancePosition(const GeoPoint& origin, double heading_deg, double distance_nm);
    static double greatCircleBearing(const GeoPoint& from, const GeoPoint& to);

private:
    struct Corridor {
        std::vector<GeoPoint> centerline;
        double width_nm = 0.0;
    };

    struct State {
        GeoPoint position;
        double time_hours = 0.0;
        double heading_deg = 0.0;
        int parent_index = -1;
        double cumulative_distance_nm = 0.0;
        double segment_distance_nm = 0.0;
        double effective_speed_kts = 0.0;
        double max_wave_height_m = 0.0;
        std::uint32_t hazard_flags = 0;
    };
    
    Result solveInternal(const Request& request, const EnvironmentSampler& sampler, const Corridor& corridor, bool use_corridor) const;
    
    static double calculateComplexity(const State& state, const EnvironmentSample& env, const Settings& settings);
};
