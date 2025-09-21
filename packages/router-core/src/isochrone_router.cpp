#include "isochrone_router.hpp"

#include <algorithm>
#include <cmath>
#include <initializer_list>
#include <limits>
#include <string>
#include <unordered_set>

#ifdef __EMSCRIPTEN__
#include <emscripten/val.h>
#endif

namespace {
    constexpr double EARTH_RADIUS_NM = 3440.065;
    constexpr double PI = 3.14159265358979323846;
    constexpr double EPS = 1e-6;

    IsochroneRouter::GeoPoint toGeoPoint(const IsochroneRouter::Waypoint& wp) { return {wp.lat, wp.lon}; }
    static double safeHypot(double a, double b) { return std::sqrt(a * a + b * b); }
    double crossTrackDistance(const IsochroneRouter::GeoPoint& p, const IsochroneRouter::GeoPoint& a, const IsochroneRouter::GeoPoint& b);
    void dpSimplifyRecursive(const std::vector<IsochroneRouter::Waypoint>& points, double tolerance_nm, int start_idx, int end_idx, const std::unordered_set<int>& preserve_indices, std::vector<int>& simplified_indices);
}

// Hierarchical routing dispatcher
IsochroneRouter::Result IsochroneRouter::solve(const Request& request, const EnvironmentSampler& sampler) const {
    double distance_nm = greatCircleDistance(request.start, request.goal);

    if (request.settings.enable_hierarchical_routing && distance_nm > request.settings.long_route_threshold_nm) {
        // --- PHASE 1: COARSE SEARCH ---
        Request coarse_request = request;
        coarse_request.settings.time_step_minutes = 90.0;
        coarse_request.settings.heading_count = 12;
        coarse_request.settings.merge_radius_nm = 40.0;
        coarse_request.settings.beam_width = 300;
        coarse_request.settings.simplify_tolerance_nm = 50.0;
        coarse_request.settings.enable_adaptive_sampling = false;

        Result coarse_result = solveInternal(coarse_request, sampler, {}, false);
        coarse_result.is_coarse_route = true;

        if (coarse_result.waypoints.empty() || coarse_result.waypoints.size() < 2) {
            return solveInternal(request, sampler, {}, false); // Fallback to standard search
        }

        // --- PHASE 2: FINE SEARCH WITHIN CORRIDOR ---
        Corridor corridor;
        corridor.width_nm = request.settings.corridor_width_nm;
        for(const auto& wp : coarse_result.waypoints) {
            corridor.centerline.push_back({wp.lat, wp.lon});
        }
        
        return solveInternal(request, sampler, corridor, true);
    }

    // Standard search for shorter routes
    return solveInternal(request, sampler, {}, false);
}

// The main solver logic, now accepting a corridor
IsochroneRouter::Result IsochroneRouter::solveInternal(const Request& request, const EnvironmentSampler& sampler, const Corridor& corridor, bool use_corridor) const {
    Result result;
    Settings settings = request.settings;

    // Parameter Validation & Clamping
    settings.time_step_minutes = clamp(settings.time_step_minutes, 15.0, 120.0);
    settings.heading_count = static_cast<int>(clamp(static_cast<double>(settings.heading_count), 8.0, 72.0));
    settings.merge_radius_nm = clamp(settings.merge_radius_nm, 5.0, 40.0);
    settings.goal_radius_nm = clamp(settings.goal_radius_nm, 10.0, 60.0);
    settings.max_hours = clamp(settings.max_hours <= 0.0 ? 240.0 : settings.max_hours, 12.0, 720.0);

    double current_time_step_minutes = settings.time_step_minutes;
    double delta_hours = current_time_step_minutes / 60.0;
    const double bearing_increment = 360.0 / static_cast<double>(settings.heading_count);

    std::vector<State> states;
    states.reserve(8192);

    State start_state;
    start_state.position = request.start;
    start_state.time_hours = request.departure_time_hours;
    start_state.heading_deg = std::numeric_limits<double>::quiet_NaN();
    states.push_back(start_state);

    std::vector<int> frontier;
    frontier.push_back(0);

    int best_goal_index = -1;
    double best_goal_arrival = std::numeric_limits<double>::max();
    bool goal_reached = false;

    int closest_index = 0;
    double closest_distance = greatCircleDistance(request.start, request.goal);

    int step_count = 0;
    int last_frontier_size = 1;
    const int max_steps = static_cast<int>(settings.max_hours / (settings.min_time_step_minutes / 60.0)) + 1;

    while (!frontier.empty() && step_count < max_steps) {
        ++step_count;
        
        if (settings.enable_adaptive_sampling && step_count > 1) {
            double total_complexity = 0.0;
            for (int idx : frontier) {
                const State& state = states[idx];
                const EnvironmentSample env = sampler(state.position.lat, state.position.lon, state.time_hours);
                total_complexity += calculateComplexity(state, env, settings);
            }
            double avg_complexity = frontier.empty() ? 0.0 : total_complexity / frontier.size();
            double factor = std::clamp((avg_complexity - 0.3) / (settings.complexity_threshold - 0.3), 0.0, 1.0);
            current_time_step_minutes = settings.max_time_step_minutes - factor * (settings.max_time_step_minutes - settings.min_time_step_minutes);
            delta_hours = current_time_step_minutes / 60.0;
        }
        
        std::vector<int> next_frontier;
        next_frontier.reserve(frontier.size() * settings.heading_count);
        bool reached_this_layer = false;

        for (int idx : frontier) {
            const State& current = states[idx];
            const EnvironmentSample env_src = sampler(current.position.lat, current.position.lon, current.time_hours);
            const double bearing_to_goal = greatCircleBearing(current.position, request.goal);

            for (int h = 0; h < settings.heading_count; ++h) {
                const double heading = bearing_increment * static_cast<double>(h);

                if (headingDifference(bearing_to_goal, heading) > settings.bearing_window_deg) continue;
                if (!std::isnan(current.heading_deg) && headingDifference(current.heading_deg, heading) > request.ship.max_heading_change_deg) continue;

                double through_water_speed = request.ship.calm_speed_kts - request.ship.wave_drag_coefficient * env_src.wave_height_m;
                through_water_speed = std::max(through_water_speed, request.ship.min_speed_kts);

                const double heading_rad = degToRad(heading);
                const double ground_speed = safeHypot(through_water_speed * std::cos(heading_rad) + env_src.current_north_kn, through_water_speed * std::sin(heading_rad) + env_src.current_east_kn);
                const double distance_nm = std::max(ground_speed, request.ship.min_speed_kts) * delta_hours;

                if (distance_nm < 0.05) continue;

                State candidate;
                candidate.position = advancePosition(current.position, heading, distance_nm);
                candidate.time_hours = current.time_hours + delta_hours;
                
                // --- Intermediate point sampling for land and depth checks ---
                // This is crucial for preventing routes from cutting corners over land
                constexpr double FIXED_SAMPLE_SPACING_NM = 2.0; // Sample every 2 nautical miles
                int intermediate_samples_count = static_cast<int>(std::ceil(distance_nm / FIXED_SAMPLE_SPACING_NM));
                intermediate_samples_count = std::max(2, std::min(intermediate_samples_count, 50)); // Clamp between 2 and 50 samples
                bool intersects_land_or_shallow = false;

                for (int s = 1; s < intermediate_samples_count; ++s) {
                    double fraction = static_cast<double>(s) / intermediate_samples_count;
                    GeoPoint midpoint = advancePosition(current.position, heading, distance_nm * fraction);
                    double midpoint_time = current.time_hours + delta_hours * fraction;
                    EnvironmentSample env_mid = sampler(midpoint.lat, midpoint.lon, midpoint_time);

                    const double min_depth = request.ship.draft_m + request.ship.safety_depth_buffer_m;
                    if (env_mid.depth_m < min_depth || (env_mid.depth_m == 0.0)) { // Explicit land check
                        intersects_land_or_shallow = true;
                        break;
                    }
                    // Add more robust checks for wave height/hazards at midpoints if needed
                }

                if (intersects_land_or_shallow) continue;

                // --- END Intermediate point sampling ---
                
                if (use_corridor) {
                    bool in_corridor = false;
                    if (!corridor.centerline.empty()) {
                        for (size_t i = 0; i + 1 < corridor.centerline.size(); ++i) {
                            if (crossTrackDistance(candidate.position, corridor.centerline[i], corridor.centerline[i+1]) < corridor.width_nm) {
                                in_corridor = true;
                                break;
                            }
                        }
                    }
                    if (!in_corridor) continue;
                }

                const EnvironmentSample env_dst = sampler(candidate.position.lat, candidate.position.lon, candidate.time_hours);
                const double min_depth = request.ship.draft_m + request.ship.safety_depth_buffer_m;
                if (env_dst.depth_m + EPS < min_depth) continue;

                double peak_wave_height = std::max({current.max_wave_height_m, env_src.wave_height_m, env_dst.wave_height_m});
                bool wave_hazard = env_dst.wave_height_m > request.ship.max_wave_height_m;

                candidate.heading_deg = heading;
                candidate.parent_index = idx;
                candidate.cumulative_distance_nm = current.cumulative_distance_nm + distance_nm;
                candidate.max_wave_height_m = peak_wave_height;
                candidate.hazard_flags = current.hazard_flags | (wave_hazard ? HazardFlags::HIGH_WAVE : HazardFlags::NONE);

                int replace_index = -1;
                bool dominated = false;
                for (int existing_index : next_frontier) {
                    const State& existing = states[existing_index];
                    if (greatCircleDistance(existing.position, candidate.position) <= settings.merge_radius_nm) {
                        dominated = true;
                        if (candidate.time_hours + EPS < existing.time_hours) {
                            replace_index = existing_index;
                        }
                        break;
                    }
                }

                if (dominated && replace_index == -1) continue;

                int candidate_index;
                if (replace_index != -1) {
                    states[replace_index] = candidate;
                    candidate_index = replace_index;
                } else {
                    candidate_index = static_cast<int>(states.size());
                    states.push_back(candidate);
                    next_frontier.push_back(candidate_index);
                }

                const double goal_distance = greatCircleDistance(states[candidate_index].position, request.goal);
                if (goal_distance < closest_distance) {
                    closest_distance = goal_distance;
                    closest_index = candidate_index;
                }
                if (goal_distance <= settings.goal_radius_nm) {
                    reached_this_layer = true;
                    if (states[candidate_index].time_hours < best_goal_arrival) {
                        best_goal_arrival = states[candidate_index].time_hours;
                        best_goal_index = candidate_index;
                        goal_reached = true;
                    }
                }
            }
        }
        
        last_frontier_size = static_cast<int>(next_frontier.size());

        if (settings.beam_width > 0 && next_frontier.size() > static_cast<size_t>(settings.beam_width)) {
            std::sort(next_frontier.begin(), next_frontier.end(), [&states, &request](int a, int b) {
                const State& state_a = states[a];
                const State& state_b = states[b];
                double cost_a = state_a.cumulative_distance_nm + greatCircleDistance(state_a.position, request.goal);
                double cost_b = state_b.cumulative_distance_nm + greatCircleDistance(state_b.position, request.goal);
                return cost_a < cost_b;
            });
            next_frontier.resize(settings.beam_width);
            last_frontier_size = settings.beam_width;
        }

        if (reached_this_layer) break;
        frontier.swap(next_frontier);
    }
    
    if (states.empty()) return result;
    const int final_index = best_goal_index != -1 ? best_goal_index : closest_index;
    const State& final_state = states[final_index];
    
    std::vector<int> backtrack;
    int cursor = final_index;
    while (cursor >= 0) {
        backtrack.push_back(cursor);
        cursor = states[cursor].parent_index;
    }
    std::reverse(backtrack.begin(), backtrack.end());
    
    std::unordered_set<int> preserve_indices;
    if (!backtrack.empty()) {
        preserve_indices.insert(0);
        preserve_indices.insert(static_cast<int>(backtrack.size()) - 1);
    }

    for (int i = 0; i < static_cast<int>(backtrack.size()); ++i) {
        const auto& state = states[backtrack[i]];
        result.waypoints_raw.push_back({state.position.lat, state.position.lon, state.time_hours, state.heading_deg, false, state.max_wave_height_m, state.hazard_flags});
    }

    if (request.settings.simplify_tolerance_nm > 0 && result.waypoints_raw.size() > 2) {
        std::vector<int> simplified_indices;
        simplified_indices.push_back(0);
        dpSimplifyRecursive(result.waypoints_raw, request.settings.simplify_tolerance_nm, 0, static_cast<int>(result.waypoints_raw.size()) - 1, preserve_indices, simplified_indices);
        simplified_indices.push_back(static_cast<int>(result.waypoints_raw.size()) - 1);
        
        std::sort(simplified_indices.begin(), simplified_indices.end());
        simplified_indices.erase(std::unique(simplified_indices.begin(), simplified_indices.end()), simplified_indices.end());

        for (int raw_idx : simplified_indices) {
            result.waypoints.push_back(result.waypoints_raw[raw_idx]);
            result.index_map.push_back(raw_idx);
        }
    } else {
        result.waypoints = result.waypoints_raw;
        for(int i=0; i< static_cast<int>(result.waypoints.size()); ++i) result.index_map.push_back(i);
    }
    
    result.diagnostics.total_distance_nm = final_state.cumulative_distance_nm;
    result.diagnostics.eta_hours = final_state.time_hours;
    result.diagnostics.step_count = step_count;
    result.diagnostics.frontier_size = last_frontier_size;
    result.diagnostics.reached_goal = goal_reached;
    result.diagnostics.final_distance_to_goal_nm = greatCircleDistance(final_state.position, request.goal);
    
    // ... (Backtracking and result processing logic)

    return result;
}


double IsochroneRouter::calculateComplexity(const IsochroneRouter::State& state, const IsochroneRouter::EnvironmentSample& env, const IsochroneRouter::Settings& settings) {
    if (!settings.enable_adaptive_sampling) return 0.0;
    double wave_complexity = std::min(env.wave_height_m / 8.0, 1.0);
    double depth_complexity = (env.depth_m < 100.0) ? std::min((100.0 - env.depth_m) / 100.0, 1.0) : 0.0;
    return (wave_complexity * 0.7 + depth_complexity * 0.3);
}

// --- UTILITY FUNCTION IMPLEMENTATIONS ---
double IsochroneRouter::clamp(double value, double min_value, double max_value) {
    if (value < min_value) return min_value;
    if (value > max_value) return max_value;
    return value;
}

double IsochroneRouter::degToRad(double deg) {
    return deg * PI / 180.0;
}

double IsochroneRouter::radToDeg(double rad) {
    return rad * 180.0 / PI;
}

double IsochroneRouter::normalizeLongitude(double lon) {
    while (lon >= 180.0) lon -= 360.0;
    while (lon < -180.0) lon += 360.0;
    return lon;
}

double IsochroneRouter::headingDifference(double a, double b) {
    double diff = std::fmod(std::fabs(a - b), 360.0);
    if (diff > 180.0) {
        diff = 360.0 - diff;
    }
    return diff;
}

double IsochroneRouter::greatCircleDistance(const GeoPoint& a, const GeoPoint& b) {
    const double lat1 = degToRad(a.lat);
    const double lat2 = degToRad(b.lat);
    double dlat = lat2 - lat1;
    double dlon = degToRad(b.lon - a.lon);

    if (dlon > PI) dlon -= 2.0 * PI;
    else if (dlon < -PI) dlon += 2.0 * PI;

    const double sin_dlat = std::sin(dlat / 2.0);
    const double sin_dlon = std::sin(dlon / 2.0);
    const double a_val = sin_dlat * sin_dlat + std::cos(lat1) * std::cos(lat2) * sin_dlon * sin_dlon;
    const double c = 2.0 * std::atan2(std::sqrt(a_val), std::sqrt(std::max(0.0, 1.0 - a_val)));
    return EARTH_RADIUS_NM * c;
}

IsochroneRouter::GeoPoint IsochroneRouter::advancePosition(const GeoPoint& origin, double heading_deg, double distance_nm) {
    const double heading_rad = degToRad(heading_deg);
    const double angular_distance = distance_nm / EARTH_RADIUS_NM;

    const double lat1 = degToRad(origin.lat);
    const double lon1 = degToRad(origin.lon);

    const double sin_lat1 = std::sin(lat1);
    const double cos_lat1 = std::cos(lat1);
    const double sin_ad = std::sin(angular_distance);
    const double cos_ad = std::cos(angular_distance);

    GeoPoint result_point;
    const double lat2 = std::asin(sin_lat1 * cos_ad + cos_lat1 * sin_ad * std::cos(heading_rad));
    const double lon2 = lon1 + std::atan2(std::sin(heading_rad) * sin_ad * cos_lat1,
                                          cos_ad - sin_lat1 * std::sin(lat2));

    result_point.lat = radToDeg(lat2);
    result_point.lon = normalizeLongitude(radToDeg(lon2));
    return result_point;
}

double IsochroneRouter::greatCircleBearing(const GeoPoint& from, const GeoPoint& to) {
    const double lat1 = degToRad(from.lat);
    const double lon1 = degToRad(from.lon);
    const double lat2 = degToRad(to.lat);
    const double lon2 = degToRad(to.lon);

    const double dLon = lon2 - lon1;
    const double y = std::sin(dLon) * std::cos(lat2);
    const double x = std::cos(lat1) * std::sin(lat2) - std::sin(lat1) * std::cos(lat2) * std::cos(dLon);
    const double bearing = std::atan2(y, x);
    return radToDeg(bearing);
}


// --- ANONYMOUS NAMESPACE IMPLEMENTATIONS ---
namespace {
    double crossTrackDistance(const IsochroneRouter::GeoPoint& p, const IsochroneRouter::GeoPoint& a, const IsochroneRouter::GeoPoint& b) {
        double dist_ap = IsochroneRouter::greatCircleDistance(a, p);
        if (dist_ap < EPS) return 0.0;
        
        double bearing_ap = IsochroneRouter::greatCircleBearing(a, p);
        double bearing_ab = IsochroneRouter::greatCircleBearing(a, b);
        double angle_diff_rad = IsochroneRouter::degToRad(bearing_ap - bearing_ab);

        double delta13 = dist_ap / EARTH_RADIUS_NM;
        double sin_term = std::sin(delta13) * std::sin(angle_diff_rad);
        sin_term = IsochroneRouter::clamp(sin_term, -1.0, 1.0);
        double d_xt_rad = std::asin(sin_term);
        double d_xt = std::fabs(d_xt_rad * EARTH_RADIUS_NM);

        double along_track_rad = std::atan2(std::sin(delta13) * std::cos(angle_diff_rad), std::cos(delta13));
        double d_at = along_track_rad * EARTH_RADIUS_NM;
        double dist_ab = IsochroneRouter::greatCircleDistance(a, b);

        if (d_at < 0.0 || d_at > dist_ab) {
            return std::min(dist_ap, IsochroneRouter::greatCircleDistance(b, p));
        }
        return d_xt;
    }

    void dpSimplifyRecursive(const std::vector<IsochroneRouter::Waypoint>& points, double tolerance_nm, int start_idx, int end_idx, const std::unordered_set<int>& preserve_indices, std::vector<int>& simplified_indices) {
        if (start_idx >= end_idx) return;
        double max_dist = 0.0;
        int max_idx = -1;
        for (int i = start_idx + 1; i < end_idx; ++i) {
            double dist = crossTrackDistance(toGeoPoint(points[i]), toGeoPoint(points[start_idx]), toGeoPoint(points[end_idx]));
            if (dist > max_dist) {
                max_dist = dist;
                max_idx = i;
            }
        }
        if (max_dist > tolerance_nm) {
            dpSimplifyRecursive(points, tolerance_nm, start_idx, max_idx, preserve_indices, simplified_indices);
            simplified_indices.push_back(max_idx);
            dpSimplifyRecursive(points, tolerance_nm, max_idx, end_idx, preserve_indices, simplified_indices);
        }
    }
}
