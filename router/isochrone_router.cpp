#include "isochrone_router.hpp"

#include <algorithm>
#include <cmath>
#include <initializer_list>
#include <limits>

namespace {
constexpr double EARTH_RADIUS_NM = 3440.065;
constexpr double PI = 3.14159265358979323846;
constexpr double EPS = 1e-6;
}

static double safeHypot(double a, double b) {
    return std::sqrt(a * a + b * b);
}

IsochroneRouter::Result IsochroneRouter::solve(const Request& request, const EnvironmentSampler& sampler) const {
    Result result;

    Settings settings = request.settings;
    settings.time_step_minutes = clamp(settings.time_step_minutes, 30.0, 90.0);
    settings.heading_count = static_cast<int>(clamp(static_cast<double>(settings.heading_count), 6.0, 72.0));
    settings.merge_radius_nm = clamp(settings.merge_radius_nm, 5.0, 40.0);
    settings.goal_radius_nm = clamp(settings.goal_radius_nm, 10.0, 60.0);
    settings.max_hours = clamp(settings.max_hours <= 0.0 ? 240.0 : settings.max_hours, 12.0, 720.0);

    const double delta_hours = settings.time_step_minutes / 60.0;
    const double bearing_increment = 360.0 / static_cast<double>(settings.heading_count);

    std::vector<State> states;
    states.reserve(2048);

    State start_state;
    start_state.position = request.start;
    start_state.time_hours = request.departure_time_hours;
    start_state.heading_deg = std::numeric_limits<double>::quiet_NaN();
    start_state.parent_index = -1;
    start_state.cumulative_distance_nm = 0.0;
    start_state.segment_distance_nm = 0.0;
    start_state.effective_speed_kts = 0.0;
    start_state.max_wave_height_m = 0.0;
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
    const int max_steps = static_cast<int>(settings.max_hours / delta_hours) + 1;

    while (!frontier.empty() && step_count < max_steps) {
        ++step_count;
        std::vector<int> next_frontier;
        next_frontier.reserve(frontier.size() * settings.heading_count);

        bool reached_this_layer = false;

        for (int idx : frontier) {
            const State& current = states[idx];
            const EnvironmentSample env_src = sampler(current.position.lat, current.position.lon, current.time_hours);

            for (int h = 0; h < settings.heading_count; ++h) {
                const double heading = bearing_increment * static_cast<double>(h);

                if (!std::isnan(current.heading_deg)) {
                    const double delta_heading = headingDifference(current.heading_deg, heading);
                    if (delta_heading > request.ship.max_heading_change_deg) {
                        continue;
                    }
                }

                double through_water_speed = request.ship.calm_speed_kts - request.ship.wave_drag_coefficient * env_src.wave_height_m;
                if (through_water_speed < request.ship.min_speed_kts) {
                    through_water_speed = request.ship.min_speed_kts;
                }

                const double heading_rad = degToRad(heading);
                const double vessel_north = through_water_speed * std::cos(heading_rad);
                const double vessel_east = through_water_speed * std::sin(heading_rad);

                const double ground_north = vessel_north + env_src.current_north_kn;
                const double ground_east = vessel_east + env_src.current_east_kn;
                double ground_speed = safeHypot(ground_north, ground_east);
                if (ground_speed < request.ship.min_speed_kts) {
                    ground_speed = request.ship.min_speed_kts;
                }

                const double distance_nm = ground_speed * delta_hours;
                if (distance_nm < 0.05) {
                    continue;
                }

                const GeoPoint destination = advancePosition(current.position, heading, distance_nm);
                const double arrival_time = current.time_hours + delta_hours;

                const EnvironmentSample env_dst = sampler(destination.lat, destination.lon, arrival_time);
                const double min_depth = request.ship.draft_m + request.ship.safety_depth_buffer_m;
                if (env_dst.depth_m + EPS < min_depth) {
                    continue;
                }

                const double wave_height = std::max({current.max_wave_height_m, env_src.wave_height_m, env_dst.wave_height_m});
                if (wave_height > request.ship.max_wave_height_m) {
                    continue;
                }

                State candidate;
                candidate.position = destination;
                candidate.time_hours = arrival_time;
                candidate.heading_deg = heading;
                candidate.parent_index = idx;
                candidate.segment_distance_nm = distance_nm;
                candidate.cumulative_distance_nm = current.cumulative_distance_nm + distance_nm;
                candidate.effective_speed_kts = ground_speed;
                candidate.max_wave_height_m = wave_height;

                int replace_index = -1;
                bool dominated = false;

                for (int existing_index : next_frontier) {
                    const State& existing = states[existing_index];
                    const double separation = greatCircleDistance(existing.position, candidate.position);
                    if (separation <= settings.merge_radius_nm) {
                        dominated = true;
                        if (candidate.time_hours + EPS < existing.time_hours) {
                            replace_index = existing_index;
                        }
                        break;
                    }
                }

                if (dominated && replace_index == -1) {
                    continue;
                }

                int candidate_index;
                if (replace_index != -1) {
                    states[replace_index] = candidate;
                    candidate_index = replace_index;
                } else {
                    candidate_index = static_cast<int>(states.size());
                    states.push_back(candidate);
                    next_frontier.push_back(candidate_index);
                }

                const State& stored = states[candidate_index];
                const double goal_distance = greatCircleDistance(stored.position, request.goal);
                if (goal_distance < closest_distance) {
                    closest_distance = goal_distance;
                    closest_index = candidate_index;
                }

                if (goal_distance <= settings.goal_radius_nm) {
                    reached_this_layer = true;
                    if (stored.time_hours < best_goal_arrival) {
                        best_goal_arrival = stored.time_hours;
                        best_goal_index = candidate_index;
                        goal_reached = true;
                    }
                }
            }
        }

        last_frontier_size = static_cast<int>(next_frontier.size());

        if (reached_this_layer) {
            break;
        }

        frontier.swap(next_frontier);
    }

    const int final_index = best_goal_index != -1 ? best_goal_index : closest_index;
    const State& final_state = states[final_index];

    std::vector<int> backtrack;
    backtrack.reserve(states.size());
    int cursor = final_index;
    int guard = 0;
    while (cursor >= 0 && guard < static_cast<int>(states.size())) {
        backtrack.push_back(cursor);
        cursor = states[cursor].parent_index;
        ++guard;
    }
    std::reverse(backtrack.begin(), backtrack.end());

    result.waypoints.reserve(backtrack.size());
    for (int index : backtrack) {
        const State& state = states[index];
        Waypoint wp;
        wp.lat = state.position.lat;
        wp.lon = state.position.lon;
        wp.time_hours = state.time_hours;
        result.waypoints.push_back(wp);
    }

    Diagnostics& diagnostics = result.diagnostics;
    diagnostics.total_distance_nm = final_state.cumulative_distance_nm;
    diagnostics.eta_hours = final_state.time_hours;
    const double travel_time = final_state.time_hours - request.departure_time_hours;
    diagnostics.average_speed_kts = travel_time > EPS ? diagnostics.total_distance_nm / travel_time : 0.0;
    diagnostics.max_wave_height_m = final_state.max_wave_height_m;
    diagnostics.step_count = step_count;
    diagnostics.frontier_size = last_frontier_size;
    diagnostics.reached_goal = goal_reached;
    diagnostics.final_distance_to_goal_nm = greatCircleDistance(final_state.position, request.goal);

    return result;
}

double IsochroneRouter::clamp(double value, double min_value, double max_value) {
    if (value < min_value) {
        return min_value;
    }
    if (value > max_value) {
        return max_value;
    }
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

    if (dlon > M_PI) {
        dlon -= 2.0 * M_PI;
    } else if (dlon < -M_PI) {
        dlon += 2.0 * M_PI;
    }

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
