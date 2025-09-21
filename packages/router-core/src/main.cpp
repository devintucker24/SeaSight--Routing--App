#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstring>
#include <initializer_list>
#include <limits>
#include <memory>
#include <queue>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include "isochrone_router.hpp"

namespace {

bool hasKey(const emscripten::val& obj, const char* key) {
    if (obj.isUndefined() || obj.isNull()) {
        return false;
    }
    return obj.call<bool>("hasOwnProperty", emscripten::val(key));
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
            emscripten::val value = obj[key];
            if (!value.isUndefined() && !value.isNull()) {
                return value.as<int>();
            }
        }
    }
    return default_value;
}

template <typename T>
std::vector<T> copyTypedArray(const emscripten::val& array, std::size_t count, T fill_value = T{}) {
    std::vector<T> output(count, fill_value);
    if (count == 0 || array.isUndefined() || array.isNull()) {
        return output;
    }

    emscripten::val length_val = array["length"];
    if (length_val.isUndefined() || length_val.isNull()) {
        return output;
    }

    std::size_t length = length_val.as<std::size_t>();
    if (length == 0) {
        return output;
    }

    std::size_t copy_count = std::min(count, length);
    for (std::size_t idx = 0; idx < copy_count; ++idx) {
        output[idx] = array[idx].as<T>();
    }

    return output;
}

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

struct EnvironmentPointSample {
    double current_east_kn = 0.0;
    double current_north_kn = 0.0;
    double wave_height_m = 0.0;
    double depth_m = 5000.0;
};

struct EnvironmentGrid {
    double lat0 = -90.0;
    double lon0 = -180.0;
    double spacing_deg = 1.0;
    std::uint32_t rows = 0;
    std::uint32_t cols = 0;
    double default_depth_m = 5000.0;
    double shallow_depth_m = 5.0;
    double default_wave_height_m = 1.0;
    std::vector<float> cur_u;
    std::vector<float> cur_v;
    std::vector<float> wave_hs;
    std::vector<std::uint8_t> mask_land;
    std::vector<std::uint8_t> mask_shallow;
    bool loaded = false;

    std::size_t expectedCells() const {
        return static_cast<std::size_t>(rows) * static_cast<std::size_t>(cols);
    }

    bool inBounds(double lat, double lon) const {
        return !std::isnan(lat) && !std::isnan(lon) && rows > 0 && cols > 0 &&
               lat >= lat0 && lat <= lat0 + spacing_deg * (static_cast<double>(rows) - 1) &&
               lon >= lon0 && lon <= lon0 + spacing_deg * (static_cast<double>(cols) - 1);
    }

    template <typename T>
    T bilinearSample(const std::vector<T>& field, double row, double col, T fallback) const {
        if (field.empty() || rows == 0 || cols == 0) {
            return fallback;
        }

        double clamped_row = std::clamp(row, 0.0, static_cast<double>(rows - 1));
        double clamped_col = std::clamp(col, 0.0, static_cast<double>(cols - 1));

        int r0 = static_cast<int>(std::floor(clamped_row));
        int c0 = static_cast<int>(std::floor(clamped_col));
        int r1 = std::min(r0 + 1, static_cast<int>(rows - 1));
        int c1 = std::min(c0 + 1, static_cast<int>(cols - 1));

        double fr = clamped_row - static_cast<double>(r0);
        double fc = clamped_col - static_cast<double>(c0);

        auto idx = [&](int r, int c) {
            return static_cast<std::size_t>(r) * static_cast<std::size_t>(cols) + static_cast<std::size_t>(c);
        };

        T v00 = field[idx(r0, c0)];
        T v10 = field[idx(r1, c0)];
        T v01 = field[idx(r0, c1)];
        T v11 = field[idx(r1, c1)];

        T v0 = static_cast<T>(v00 + (v10 - v00) * fr);
        T v1 = static_cast<T>(v01 + (v11 - v01) * fr);
        return static_cast<T>(v0 + (v1 - v0) * fc);
    }

    std::uint8_t sampleMask(const std::vector<std::uint8_t>& mask, double row, double col) const {
        if (mask.empty() || rows == 0 || cols == 0) {
            return 0;
        }

        double clamped_row = std::clamp(row, 0.0, static_cast<double>(rows - 1));
        double clamped_col = std::clamp(col, 0.0, static_cast<double>(cols - 1));

        int r = static_cast<int>(std::round(clamped_row));
        int c = static_cast<int>(std::round(clamped_col));

        auto idx = static_cast<std::size_t>(r) * static_cast<std::size_t>(cols) + static_cast<std::size_t>(c);
        if (idx >= mask.size()) {
            return 0;
        }
        return mask[idx];
    }

    EnvironmentPointSample sample(double lat, double lon) const {
        EnvironmentPointSample sample;
        if (!loaded || rows == 0 || cols == 0) {
            sample.depth_m = default_depth_m;
            sample.wave_height_m = default_wave_height_m;
            return sample;
        }

        double row = (lat - lat0) / spacing_deg;
        double col = (lon - lon0) / spacing_deg;

        if (std::isnan(row) || std::isnan(col) || !inBounds(lat, lon)) {
            sample.depth_m = default_depth_m;
            sample.wave_height_m = default_wave_height_m;
            return sample;
        }

        sample.current_east_kn = bilinearSample(cur_u, row, col, 0.0f);
        sample.current_north_kn = bilinearSample(cur_v, row, col, 0.0f);
        sample.wave_height_m = bilinearSample(wave_hs, row, col, static_cast<float>(default_wave_height_m));

        bool is_land = sampleMask(mask_land, row, col) != 0;
        bool is_shallow = sampleMask(mask_shallow, row, col) != 0;

        if (is_land) {
            sample.depth_m = 0.0;
        } else if (is_shallow) {
            sample.depth_m = shallow_depth_m;
        } else {
            sample.depth_m = default_depth_m;
        }

        return sample;
    }
};

} // namespace

enum class MaskType {
    LAND = 0,
    SHALLOW = 1,
    RESTRICTED = 2
};

struct Node {
    int i;
    int j;
    double t;
    double g_cost;
    double f_cost;
    Node* parent;

    Node(int i, int j, double t)
        : i(i), j(j), t(t), g_cost(0.0), f_cost(0.0), parent(nullptr) {}

    struct Hash {
        std::size_t operator()(const Node& node) const {
            return std::hash<int>()(node.i) ^ (std::hash<int>()(node.j) << 1) ^ (std::hash<double>()(node.t) << 2);
        }
    };

    bool operator==(const Node& other) const {
        return i == other.i && j == other.j && std::abs(t - other.t) < 1e-6;
    }

    bool operator<(const Node& other) const {
        return f_cost > other.f_cost;
    }
};

struct Edge {
    int from_i;
    int from_j;
    int to_i;
    int to_j;
    double distance_nm;
    double time_hours;
    double effective_speed_kts;
    std::vector<std::pair<double, double>> sample_points;

    Edge(int fi, int fj, int ti, int tj, double dist, double time, double speed)
        : from_i(fi), from_j(fj), to_i(ti), to_j(tj), distance_nm(dist), time_hours(time), effective_speed_kts(speed) {}
};

struct SafetyCaps {
    double max_wave_height_m;
    double max_heading_change_deg;
    double min_water_depth_m;

    SafetyCaps(double max_hs = 5.0, double max_heading = 45.0, double min_depth = 10.0)
        : max_wave_height_m(max_hs), max_heading_change_deg(max_heading), min_water_depth_m(min_depth) {}
};

class TimeDependentAStar {
private:
    double lat0, lat1, lon0, lon1;
    double d_lat, d_lon;
    int n_lat, n_lon;

    static constexpr double GC_SPEED_KTS = 12.0;
    static constexpr double EARTH_RADIUS_NM = 3440.065;
    static constexpr double DEG_TO_RAD = M_PI / 180.0;
    static constexpr double SAMPLE_INTERVAL_KM = 3.0;
    static constexpr double SAMPLE_INTERVAL_NM = SAMPLE_INTERVAL_KM * 0.539957;

    SafetyCaps caps;
    const LandMaskData* land_mask = nullptr;
    const EnvironmentGrid* environment_grid = nullptr;

    struct PairHash {
        std::size_t operator()(const std::pair<int, int>& p) const {
            return std::hash<int>()(p.first) ^ (std::hash<int>()(p.second) << 1);
        }
    };

    std::unordered_map<std::pair<int, int>, std::vector<std::uint8_t>, PairHash> mask_data;

public:
    TimeDependentAStar(double lat0, double lat1, double lon0, double lon1, double d_lat, double d_lon)
        : lat0(lat0), lat1(lat1), lon0(lon0), lon1(lon1), d_lat(d_lat), d_lon(d_lon) {
        n_lat = static_cast<int>((lat1 - lat0) / d_lat) + 1;
        n_lon = static_cast<int>((lon1 - lon0) / d_lon) + 1;
    }

    void setLandMask(const LandMaskData* mask) {
        land_mask = mask;
    }

    void setEnvironmentGrid(const EnvironmentGrid* grid) {
        environment_grid = grid;
    }

    std::pair<double, double> gridToLatLon(int i, int j) const {
        double lat = lat0 + i * d_lat;
        double lon = lon0 + j * d_lon;
        return {lat, lon};
    }

    double normalizeLongitude(double lon) const {
        while (lon >= 180.0) lon -= 360.0;
        while (lon < -180.0) lon += 360.0;
        return lon;
    }

    bool crossesAntiMeridian(double lon1, double lon2) const {
        return std::abs(lon1 - lon2) > 180.0;
    }

    std::pair<int, int> latLonToGrid(double lat, double lon) const {
        lon = normalizeLongitude(lon);
        int i = static_cast<int>((lat - lat0) / d_lat);
        int j = static_cast<int>((lon - lon0) / d_lon);
        return {i, j};
    }

    double greatCircleDistance(double lat1, double lon1, double lat2, double lon2) const {
        lon1 = normalizeLongitude(lon1);
        lon2 = normalizeLongitude(lon2);

        double dlat = (lat2 - lat1) * DEG_TO_RAD;
        double dlon = (lon2 - lon1) * DEG_TO_RAD;

        if (crossesAntiMeridian(lon1, lon2)) {
            if (lon1 > 0 && lon2 < 0) {
                dlon = (lon2 + 360.0 - lon1) * DEG_TO_RAD;
            } else if (lon1 < 0 && lon2 > 0) {
                dlon = (lon2 - (lon1 + 360.0)) * DEG_TO_RAD;
            }
        }

        double a = std::sin(dlat / 2) * std::sin(dlat / 2) +
                   std::cos(lat1 * DEG_TO_RAD) * std::cos(lat2 * DEG_TO_RAD) *
                   std::sin(dlon / 2) * std::sin(dlon / 2);
        double c = 2 * std::atan2(std::sqrt(a), std::sqrt(1 - a));
        return EARTH_RADIUS_NM * c;
    }

    double heuristic(int i1, int j1, int i2, int j2) const {
        auto [lat1, lon1] = gridToLatLon(i1, j1);
        auto [lat2, lon2] = gridToLatLon(i2, j2);
        double distance = greatCircleDistance(lat1, lon1, lat2, lon2);
        return distance / GC_SPEED_KTS;
    }

    bool isValid(int i, int j) const {
        return i >= 0 && i < n_lat && j >= 0 && j < n_lon;
    }

    std::vector<std::pair<int, int>> getNeighbors(int i, int j) const {
        std::vector<std::pair<int, int>> neighbors;
        for (int di = -1; di <= 1; ++di) {
            for (int dj = -1; dj <= 1; ++dj) {
                if (di == 0 && dj == 0) continue;
                int ni = i + di;
                int nj = j + dj;
                if (isValid(ni, nj)) {
                    neighbors.emplace_back(ni, nj);
                }
            }
        }
        return neighbors;
    }

    std::vector<std::pair<double, double>> generateGeodesicSamples(double lat1, double lon1, double lat2, double lon2) const {
        std::vector<std::pair<double, double>> samples;

        lon1 = normalizeLongitude(lon1);
        lon2 = normalizeLongitude(lon2);

        double total_distance = greatCircleDistance(lat1, lon1, lat2, lon2);
        int num_samples = static_cast<int>(total_distance / SAMPLE_INTERVAL_NM) + 1;

        if (num_samples <= 1) {
            samples.push_back({lat2, lon2});
            return samples;
        }

        double dlon = (lon2 - lon1) * DEG_TO_RAD;

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
        double bearing = std::atan2(y, x);

        for (int k = 1; k <= num_samples; ++k) {
            double fraction = static_cast<double>(k) / num_samples;
            double distance = total_distance * fraction;
            double lat = std::asin(std::sin(lat1 * DEG_TO_RAD) * std::cos(distance / EARTH_RADIUS_NM) +
                                   std::cos(lat1 * DEG_TO_RAD) * std::sin(distance / EARTH_RADIUS_NM) * std::cos(bearing));
            double lon = lon1 * DEG_TO_RAD + std::atan2(std::sin(bearing) * std::sin(distance / EARTH_RADIUS_NM) * std::cos(lat1 * DEG_TO_RAD),
                                                       std::cos(distance / EARTH_RADIUS_NM) - std::sin(lat1 * DEG_TO_RAD) * std::sin(lat));
            lon = normalizeLongitude(lon / DEG_TO_RAD);
            samples.push_back({lat / DEG_TO_RAD, lon});
        }

        return samples;
    }

    bool isMasked(double lat, double lon, MaskType mask_type) const {
        if (land_mask && mask_type == MaskType::LAND && land_mask->isLand(lat, lon)) {
            return true;
        }

        auto [i, j] = latLonToGrid(lat, lon);
        if (!isValid(i, j)) return true;

        auto key = std::make_pair(i, j);
        auto it = mask_data.find(key);
        if (it != mask_data.end() && it->second.size() > static_cast<std::size_t>(mask_type)) {
            return it->second[static_cast<std::size_t>(mask_type)] != 0;
        }

        return false;
    }

    bool violatesCaps(const Edge& edge, double current_heading = 0.0) const {
        if (current_heading != 0.0) {
            double heading_change = std::abs(edge.from_i - edge.to_i) + std::abs(edge.from_j - edge.to_j);
            if (heading_change > caps.max_heading_change_deg) {
                return true;
            }
        }

        for (const auto& sample : edge.sample_points) {
            if (isMasked(sample.first, sample.second, MaskType::LAND) ||
                isMasked(sample.first, sample.second, MaskType::SHALLOW) ||
                isMasked(sample.first, sample.second, MaskType::RESTRICTED)) {
                return true;
            }

            if (environment_grid) {
                EnvironmentPointSample env = environment_grid->sample(sample.first, sample.second);
                if (env.depth_m <= caps.min_water_depth_m) {
                    return true;
                }
                if (env.wave_height_m >= caps.max_wave_height_m) {
                    return true;
                }
            }
        }

        return false;
    }

    Edge createEdge(int from_i, int from_j, int to_i, int to_j, double current_heading = 0.0) const {
        auto [lat1, lon1] = gridToLatLon(from_i, from_j);
        auto [lat2, lon2] = gridToLatLon(to_i, to_j);

        double distance = greatCircleDistance(lat1, lon1, lat2, lon2);
        double time = distance / GC_SPEED_KTS;

        Edge edge(from_i, from_j, to_i, to_j, distance, time, GC_SPEED_KTS);
        edge.sample_points = generateGeodesicSamples(lat1, lon1, lat2, lon2);
        return edge;
    }

    void setSafetyCaps(const SafetyCaps& new_caps) {
        caps = new_caps;
    }

    void addMaskData(int i, int j, const std::vector<std::uint8_t>& masks) {
        mask_data[{i, j}] = masks;
    }

    double testNormalizeLongitude(double lon) const {
        return normalizeLongitude(lon);
    }

    bool testCrossesAntiMeridian(double lon1, double lon2) const {
        return crossesAntiMeridian(lon1, lon2);
    }

    double testGreatCircleDistance(double lat1, double lon1, double lat2, double lon2) const {
        return greatCircleDistance(lat1, lon1, lat2, lon2);
    }

    std::vector<Node> solve(int start_i, int start_j, int goal_i, int goal_j, double start_time = 0.0) {
        std::priority_queue<Node> open_set;
        std::unordered_set<Node, Node::Hash> closed_set;
        std::unordered_map<Node, double, Node::Hash> g_scores;

        Node start(start_i, start_j, start_time);
        start.g_cost = 0.0;
        start.f_cost = heuristic(start_i, start_j, goal_i, goal_j);

        open_set.push(start);
        g_scores[start] = 0.0;

        while (!open_set.empty()) {
            Node current = open_set.top();
            open_set.pop();

            if (closed_set.find(current) != closed_set.end()) {
                continue;
            }
            closed_set.insert(current);

            if (current.i == goal_i && current.j == goal_j) {
                std::vector<Node> path;
                Node* node = &current;
                while (node != nullptr) {
                    path.push_back(*node);
                    node = node->parent;
                }
                std::reverse(path.begin(), path.end());
                return path;
            }

            auto neighbors = getNeighbors(current.i, current.j);
            for (auto [ni, nj] : neighbors) {
                Node neighbor(ni, nj, current.t);

                if (closed_set.find(neighbor) != closed_set.end()) {
                    continue;
                }

                Edge edge = createEdge(current.i, current.j, ni, nj);

                if (violatesCaps(edge)) {
                    continue;
                }

                double edge_cost = edge.time_hours;
                double tentative_g = current.g_cost + edge_cost;

                auto it = g_scores.find(neighbor);
                if (it == g_scores.end() || tentative_g < it->second) {
                    neighbor.g_cost = tentative_g;
                    neighbor.f_cost = tentative_g + heuristic(ni, nj, goal_i, goal_j);
                    neighbor.parent = new Node(current);

                    g_scores[neighbor] = tentative_g;
                    open_set.push(neighbor);
                }
            }
        }

        return {};
    }
};

class RouterWrapper {
private:
    std::unique_ptr<TimeDependentAStar> router;
    IsochroneRouter isochrone_router;
    LandMaskData land_mask;
    EnvironmentGrid environment_grid;

    IsochroneRouter::Request parseIsochroneRequest(const emscripten::val& request) const {
        IsochroneRouter::Request parsed;

        if (hasKey(request, "start")) {
            emscripten::val start = request["start"];
            parsed.start.lat = getNumberAny(start, {"lat", "latitude"}, parsed.start.lat);
            parsed.start.lon = getNumberAny(start, {"lon", "lng", "longitude"}, parsed.start.lon);
        }
        if (hasKey(request, "destination")) {
            emscripten::val dest = request["destination"];
            parsed.goal.lat = getNumberAny(dest, {"lat", "latitude"}, parsed.goal.lat);
            parsed.goal.lon = getNumberAny(dest, {"lon", "lng", "longitude"}, parsed.goal.lon);
        }

        parsed.departure_time_hours = getNumberAny(request,
            {"departTimeHours", "departureTimeHours", "depart_time", "departureTime"},
            parsed.departure_time_hours);

        IsochroneRouter::Settings settings = parsed.settings;
        settings.time_step_minutes = getNumberAny(request, {"timeStepMinutes", "time_step_minutes"}, settings.time_step_minutes);
        settings.heading_count = getIntAny(request, {"headingCount", "heading_count"}, settings.heading_count);
        settings.merge_radius_nm = getNumberAny(request, {"mergeRadiusNm", "merge_radius_nm"}, settings.merge_radius_nm);
        settings.goal_radius_nm = getNumberAny(request, {"goalRadiusNm", "goal_radius_nm"}, settings.goal_radius_nm);
        settings.max_hours = getNumberAny(request, {"maxHours", "max_hours"}, settings.max_hours);
        settings.simplify_tolerance_nm = getNumberAny(request, {"simplifyToleranceNm", "simplify_tolerance_nm"}, settings.simplify_tolerance_nm);
        settings.min_leg_nm = getNumberAny(request, {"minLegNm", "min_leg_nm"}, settings.min_leg_nm);
        settings.min_heading_deg = getNumberAny(request, {"minHeadingDeg", "min_heading_deg"}, settings.min_heading_deg);
        settings.bearing_window_deg = getNumberAny(request, {"bearingWindowDeg", "bearing_window_deg"}, settings.bearing_window_deg);
        settings.beam_width = getIntAny(request, {"beamWidth", "beam_width"}, settings.beam_width);
        settings.min_time_step_minutes = getNumberAny(request, {"minTimeStepMinutes", "min_time_step_minutes"}, settings.min_time_step_minutes);
        settings.max_time_step_minutes = getNumberAny(request, {"maxTimeStepMinutes", "max_time_step_minutes"}, settings.max_time_step_minutes);
        settings.complexity_threshold = getNumberAny(request, {"complexityThreshold", "complexity_threshold"}, settings.complexity_threshold);
        settings.enable_adaptive_sampling = hasKey(request, "enableAdaptiveSampling") ? request["enableAdaptiveSampling"].as<bool>() : settings.enable_adaptive_sampling;
        settings.enable_hierarchical_routing = hasKey(request, "enableHierarchicalRouting") ? request["enableHierarchicalRouting"].as<bool>() : settings.enable_hierarchical_routing;
        settings.long_route_threshold_nm = getNumberAny(request, {"longRouteThresholdNm", "long_route_threshold_nm"}, settings.long_route_threshold_nm);
        settings.coarse_grid_resolution_deg = getNumberAny(request, {"coarseGridResolutionDeg", "coarse_grid_resolution_deg"}, settings.coarse_grid_resolution_deg);
        settings.corridor_width_nm = getNumberAny(request, {"corridorWidthNm", "corridor_width_nm"}, settings.corridor_width_nm);

        if (hasKey(request, "settings")) {
            emscripten::val settings_obj = request["settings"];
            settings.time_step_minutes = getNumberAny(settings_obj, {"timeStepMinutes", "time_step_minutes"}, settings.time_step_minutes);
            settings.heading_count = getIntAny(settings_obj, {"headingCount", "heading_count"}, settings.heading_count);
            settings.merge_radius_nm = getNumberAny(settings_obj, {"mergeRadiusNm", "merge_radius_nm"}, settings.merge_radius_nm);
            settings.goal_radius_nm = getNumberAny(settings_obj, {"goalRadiusNm", "goal_radius_nm"}, settings.goal_radius_nm);
            settings.max_hours = getNumberAny(settings_obj, {"maxHours", "max_hours"}, settings.max_hours);
            settings.simplify_tolerance_nm = getNumberAny(settings_obj, {"simplifyToleranceNm", "simplify_tolerance_nm"}, settings.simplify_tolerance_nm);
            settings.min_leg_nm = getNumberAny(settings_obj, {"minLegNm", "min_leg_nm"}, settings.min_leg_nm);
            settings.min_heading_deg = getNumberAny(settings_obj, {"minHeadingDeg", "min_heading_deg"}, settings.min_heading_deg);
            settings.bearing_window_deg = getNumberAny(settings_obj, {"bearingWindowDeg", "bearing_window_deg"}, settings.bearing_window_deg);
            settings.beam_width = getIntAny(settings_obj, {"beamWidth", "beam_width"}, settings.beam_width);
            settings.min_time_step_minutes = getNumberAny(settings_obj, {"minTimeStepMinutes", "min_time_step_minutes"}, settings.min_time_step_minutes);
            settings.max_time_step_minutes = getNumberAny(settings_obj, {"maxTimeStepMinutes", "max_time_step_minutes"}, settings.max_time_step_minutes);
            settings.complexity_threshold = getNumberAny(settings_obj, {"complexityThreshold", "complexity_threshold"}, settings.complexity_threshold);
            settings.enable_adaptive_sampling = hasKey(settings_obj, "enableAdaptiveSampling") ? settings_obj["enableAdaptiveSampling"].as<bool>() : settings.enable_adaptive_sampling;
            settings.enable_hierarchical_routing = hasKey(settings_obj, "enableHierarchicalRouting") ? settings_obj["enableHierarchicalRouting"].as<bool>() : settings.enable_hierarchical_routing;
            settings.long_route_threshold_nm = getNumberAny(settings_obj, {"longRouteThresholdNm", "long_route_threshold_nm"}, settings.long_route_threshold_nm);
            settings.coarse_grid_resolution_deg = getNumberAny(settings_obj, {"coarseGridResolutionDeg", "coarse_grid_resolution_deg"}, settings.coarse_grid_resolution_deg);
            settings.corridor_width_nm = getNumberAny(settings_obj, {"corridorWidthNm", "corridor_width_nm"}, settings.corridor_width_nm);
        }
        parsed.settings = settings;

        IsochroneRouter::ShipModel ship = parsed.ship;
        if (hasKey(request, "ship")) {
            emscripten::val ship_obj = request["ship"];
            ship.calm_speed_kts = getNumberAny(ship_obj, {"calmSpeedKts", "speed", "cruiseSpeedKts"}, ship.calm_speed_kts);
            ship.draft_m = getNumberAny(ship_obj, {"draft", "draftM", "draftMeters"}, ship.draft_m);
            ship.safety_depth_buffer_m = getNumberAny(ship_obj, {"safetyDepthBuffer", "safetyDepthMargin"}, ship.safety_depth_buffer_m);
            ship.max_wave_height_m = getNumberAny(ship_obj, {"maxWaveHeight", "waveHeightCap"}, ship.max_wave_height_m);
            ship.max_heading_change_deg = getNumberAny(ship_obj, {"maxHeadingChange", "maxHeadingDelta", "headingChangeLimit"}, ship.max_heading_change_deg);
            ship.min_speed_kts = getNumberAny(ship_obj, {"minSpeed", "minSpeedKts"}, ship.min_speed_kts);
            ship.wave_drag_coefficient = getNumberAny(ship_obj, {"waveDragCoefficient", "waveLossCoefficient"}, ship.wave_drag_coefficient);
        }

        if (hasKey(request, "safetyCaps")) {
            emscripten::val safety = request["safetyCaps"];
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
        }

        parsed.ship = ship;
        return parsed;
    }

    IsochroneRouter::EnvironmentSampler buildEnvironmentSampler(const emscripten::val& sampler,
                                                                 const IsochroneRouter::ShipModel& ship) const {
        constexpr double PI = 3.14159265358979323846;

        IsochroneRouter::EnvironmentSampler base_sampler = [this, ship](double lat, double lon, double time_hours) {
            IsochroneRouter::EnvironmentSample sample;
            if (environment_grid.loaded) {
                EnvironmentPointSample env = environment_grid.sample(lat, lon);
                sample.current_east_kn = env.current_east_kn;
                sample.current_north_kn = env.current_north_kn;
                sample.wave_height_m = env.wave_height_m;
                sample.depth_m = env.depth_m;
            } else {
                const double lat_rad = lat * PI / 180.0;
                const double lon_rad = lon * PI / 180.0;
                sample.current_east_kn = 0.4 * std::sin(lat_rad) * std::cos(time_hours / 6.0);
                sample.current_north_kn = 0.3 * std::cos(lat_rad) * std::sin(time_hours / 6.0);
                sample.wave_height_m = std::max(0.0, 1.0 + 0.4 * std::sin(lat_rad + lon_rad + time_hours / 12.0));
                sample.depth_m = 5000.0;
            }

            if (land_mask.loaded && land_mask.isLand(lat, lon)) {
                sample.depth_m = 0.0;
                sample.wave_height_m = ship.max_wave_height_m + 10.0;
            }
            return sample;
        };

        if (sampler.isUndefined() || sampler.isNull()) {
            return base_sampler;
        }

        emscripten::val function_constructor = emscripten::val::global("Function");
        bool is_function = sampler.instanceof(function_constructor);
        bool has_sample = !is_function && hasKey(sampler, "sample");

        if (!is_function && !has_sample) {
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

    emscripten::val convertIsochroneResult(const IsochroneRouter::Result& result) const {
        emscripten::val output = emscripten::val::object();
        output.set("mode", std::string("ISOCHRONE"));

        emscripten::val waypoint_array = emscripten::val::array();
        for (std::size_t i = 0; i < result.waypoints.size(); ++i) {
            const auto& wp = result.waypoints[i];
            emscripten::val waypoint = emscripten::val::object();
            waypoint.set("lat", wp.lat);
            waypoint.set("lon", wp.lon);
            waypoint.set("time", wp.time_hours);
            waypoint.set("headingDeg", wp.heading_deg);
            waypoint.set("isCourseChange", wp.is_course_change);
            waypoint.set("maxWaveHeightM", wp.max_wave_height_m);
            waypoint.set("hazardFlags", wp.hazard_flags);
            waypoint_array.set(static_cast<unsigned>(i), waypoint);
        }
        output.set("waypoints", waypoint_array);

        emscripten::val waypoint_raw_array = emscripten::val::array();
        for (std::size_t i = 0; i < result.waypoints_raw.size(); ++i) {
            const auto& wp = result.waypoints_raw[i];
            emscripten::val waypoint = emscripten::val::object();
            waypoint.set("lat", wp.lat);
            waypoint.set("lon", wp.lon);
            waypoint.set("time", wp.time_hours);
            waypoint.set("headingDeg", wp.heading_deg);
            waypoint.set("isCourseChange", wp.is_course_change);
            waypoint.set("maxWaveHeightM", wp.max_wave_height_m);
            waypoint.set("hazardFlags", wp.hazard_flags);
            waypoint_raw_array.set(static_cast<unsigned>(i), waypoint);
        }
        output.set("waypointsRaw", waypoint_raw_array);

        emscripten::val index_map_array = emscripten::val::array();
        for (std::size_t i = 0; i < result.index_map.size(); ++i) {
            index_map_array.set(static_cast<unsigned>(i), result.index_map[i]);
        }
        output.set("indexMap", index_map_array);

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
        diagnostics.set("hazardFlags", result.diagnostics.hazard_flags);
        output.set("diagnostics", diagnostics);
        output.set("isCoarseRoute", result.is_coarse_route);

        return output;
    }

public:
    RouterWrapper(double lat0, double lat1, double lon0, double lon1, double d_lat, double d_lon)
        : router(std::make_unique<TimeDependentAStar>(lat0, lat1, lon0, lon1, d_lat, d_lon)) {
        router->setEnvironmentGrid(&environment_grid);
    }

    void loadEnvironmentPack(const emscripten::val& meta,
                             const emscripten::val& cur_u_array,
                             const emscripten::val& cur_v_array,
                             const emscripten::val& wave_hs_array,
                             const emscripten::val& land_mask_array,
                             const emscripten::val& shallow_mask_array) {
        environment_grid.lat0 = getNumber(meta, "lat0", environment_grid.lat0);
        environment_grid.lon0 = getNumber(meta, "lon0", environment_grid.lon0);
        environment_grid.spacing_deg = getNumberAny(meta, {"spacingDeg", "spacing", "d", "step"}, environment_grid.spacing_deg);
        if (environment_grid.spacing_deg <= 0.0) {
            environment_grid.spacing_deg = 1.0;
        }
        environment_grid.rows = static_cast<std::uint32_t>(std::max(0.0, getNumberAny(meta, {"rows"}, static_cast<double>(environment_grid.rows))));
        environment_grid.cols = static_cast<std::uint32_t>(std::max(0.0, getNumberAny(meta, {"cols", "columns"}, static_cast<double>(environment_grid.cols))));
        environment_grid.default_depth_m = getNumberAny(meta, {"defaultDepth", "defaultDepthM"}, environment_grid.default_depth_m);
        environment_grid.shallow_depth_m = getNumberAny(meta, {"shallowDepth", "shallowDepthM"}, environment_grid.shallow_depth_m);
        environment_grid.default_wave_height_m = getNumberAny(meta, {"defaultWaveHeight", "defaultWaveHeightM"}, environment_grid.default_wave_height_m);

        std::size_t cell_count = environment_grid.expectedCells();
        environment_grid.cur_u = copyTypedArray<float>(cur_u_array, cell_count, 0.0f);
        environment_grid.cur_v = copyTypedArray<float>(cur_v_array, cell_count, 0.0f);
        environment_grid.wave_hs = copyTypedArray<float>(wave_hs_array, cell_count, static_cast<float>(environment_grid.default_wave_height_m));
        environment_grid.mask_land = copyTypedArray<std::uint8_t>(land_mask_array, cell_count, 0);
        environment_grid.mask_shallow = copyTypedArray<std::uint8_t>(shallow_mask_array, cell_count, 0);

        auto clear_if_uniform = [](auto& vec) {
            if (vec.empty()) return;
            auto first = vec.front();
            bool uniform = std::all_of(vec.begin(), vec.end(), [&](auto value) {
                return value == first;
            });
            if (uniform) {
                vec.clear();
            }
        };

        clear_if_uniform(environment_grid.mask_land);
        clear_if_uniform(environment_grid.mask_shallow);

        auto soften_mask_edges = [&](std::vector<std::uint8_t>& mask) {
            if (mask.empty() || environment_grid.rows == 0 || environment_grid.cols == 0) {
                return;
            }

            auto row_all_same = [&](std::uint32_t r) {
                std::size_t offset = static_cast<std::size_t>(r) * environment_grid.cols;
                std::uint8_t first = mask[offset];
                for (std::uint32_t c = 1; c < environment_grid.cols; ++c) {
                    if (mask[offset + c] != first) {
                        return static_cast<int>(first);
                    }
                }
                return static_cast<int>(first);
            };

            auto zero_row = [&](std::uint32_t r) {
                std::size_t offset = static_cast<std::size_t>(r) * environment_grid.cols;
                std::fill(mask.begin() + static_cast<long>(offset), mask.begin() + static_cast<long>(offset + environment_grid.cols), 0);
            };

            std::uint32_t top = 0;
            while (top < environment_grid.rows && row_all_same(top) == 1) {
                zero_row(top);
                ++top;
            }

            if (environment_grid.rows > 0) {
                std::int64_t bottom = static_cast<std::int64_t>(environment_grid.rows) - 1;
                while (bottom >= 0 && row_all_same(static_cast<std::uint32_t>(bottom)) == 1) {
                    zero_row(static_cast<std::uint32_t>(bottom));
                    --bottom;
                }
            }

            auto col_all_same = [&](std::uint32_t c) {
                std::uint8_t first = mask[c];
                for (std::uint32_t r = 1; r < environment_grid.rows; ++r) {
                    if (mask[static_cast<std::size_t>(r) * environment_grid.cols + c] != first) {
                        return static_cast<int>(first);
                    }
                }
                return static_cast<int>(first);
            };

            auto zero_col = [&](std::uint32_t c) {
                for (std::uint32_t r = 0; r < environment_grid.rows; ++r) {
                    mask[static_cast<std::size_t>(r) * environment_grid.cols + c] = 0;
                }
            };

            std::uint32_t left = 0;
            while (left < environment_grid.cols && col_all_same(left) == 1) {
                zero_col(left);
                ++left;
            }

            if (environment_grid.cols > 0) {
                std::int64_t right = static_cast<std::int64_t>(environment_grid.cols) - 1;
                while (right >= 0 && col_all_same(static_cast<std::uint32_t>(right)) == 1) {
                    zero_col(static_cast<std::uint32_t>(right));
                    --right;
                }
            }
        };

        soften_mask_edges(environment_grid.mask_land);
        soften_mask_edges(environment_grid.mask_shallow);

        if (!environment_grid.mask_land.empty()) {
            // Temporarily rely on the global land mask instead of pack-provided edges, which
            // flag large open-water regions as land near the boundaries.
            environment_grid.mask_land.clear();
        }
        if (!environment_grid.mask_shallow.empty()) {
            environment_grid.mask_shallow.clear();
        }

        environment_grid.loaded = (environment_grid.rows > 0 && environment_grid.cols > 0 && cell_count > 0);

        if (router) {
            router->setEnvironmentGrid(environment_grid.loaded ? &environment_grid : nullptr);
        }
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

    void setSafetyCaps(double max_wave_height, double max_heading_change, double min_water_depth) {
        SafetyCaps caps(max_wave_height, max_heading_change, min_water_depth);
        router->setSafetyCaps(caps);
    }

    void addMaskData(int i, int j, const std::vector<std::uint8_t>& masks) {
        router->addMaskData(i, j, masks);
    }

    emscripten::val solve(int start_i, int start_j, int goal_i, int goal_j, double start_time = 0.0) {
        auto path = router->solve(start_i, start_j, goal_i, goal_j, start_time);
        emscripten::val result = emscripten::val::array();
        for (const auto& node : path) {
            emscripten::val node_obj = emscripten::val::object();
            node_obj.set("i", node.i);
            node_obj.set("j", node.j);
            node_obj.set("t", node.t);
            node_obj.set("g_cost", node.g_cost);
            node_obj.set("f_cost", node.f_cost);
            result.call<void>("push", node_obj);
        }
        return result;
    }

    emscripten::val solveIsochrone(const emscripten::val& request, const emscripten::val& sampler = emscripten::val::undefined()) {
        IsochroneRouter::Request parsed_request = parseIsochroneRequest(request);
        auto environment_sampler = buildEnvironmentSampler(sampler, parsed_request.ship);
        auto result = isochrone_router.solve(parsed_request, environment_sampler);
        return convertIsochroneResult(result);
    }

    emscripten::val createEdge(int from_i, int from_j, int to_i, int to_j) {
        auto edge = router->createEdge(from_i, from_j, to_i, to_j);
        emscripten::val edge_obj = emscripten::val::object();
        edge_obj.set("from_i", edge.from_i);
        edge_obj.set("from_j", edge.from_j);
        edge_obj.set("to_i", edge.to_i);
        edge_obj.set("to_j", edge.to_j);
        edge_obj.set("distance_nm", edge.distance_nm);
        edge_obj.set("time_hours", edge.time_hours);
        edge_obj.set("effective_speed_kts", edge.effective_speed_kts);

        emscripten::val sample_points = emscripten::val::array();
        for (const auto& [lat, lon] : edge.sample_points) {
            emscripten::val point = emscripten::val::object();
            point.set("lat", lat);
            point.set("lon", lon);
            sample_points.call<void>("push", point);
        }
        edge_obj.set("sample_points", sample_points);

        return edge_obj;
    }

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

    IsochroneRouter::EnvironmentSample sampleEnvironment(double lat, double lon, double time_hours = 0.0) const {
        IsochroneRouter::EnvironmentSample sample;
        if (environment_grid.loaded) {
            EnvironmentPointSample env = environment_grid.sample(lat, lon);
            sample.current_east_kn = env.current_east_kn;
            sample.current_north_kn = env.current_north_kn;
            sample.wave_height_m = env.wave_height_m;
            sample.depth_m = env.depth_m;
        } else {
            constexpr double PI = 3.14159265358979323846;
            const double lat_rad = lat * PI / 180.0;
            const double lon_rad = lon * PI / 180.0;
            sample.current_east_kn = 0.4 * std::sin(lat_rad) * std::cos(time_hours / 6.0);
            sample.current_north_kn = 0.3 * std::cos(lat_rad) * std::sin(time_hours / 6.0);
            sample.wave_height_m = std::max(0.0, 1.0 + 0.4 * std::sin(lat_rad + lon_rad + time_hours / 12.0));
            sample.depth_m = 5000.0;
        }

        if (land_mask.loaded && land_mask.isLand(lat, lon)) {
            sample.depth_m = 0.0;
        }

        return sample;
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

    // Function to get land mask data for visualization
    emscripten::val getLandMaskData() const {
        emscripten::val result = emscripten::val::object();
        result.set("loaded", land_mask.loaded);
        if (land_mask.loaded) {
            result.set("lat0", land_mask.lat0);
            result.set("lat1", land_mask.lat1);
            result.set("lon0", land_mask.lon0);
            result.set("lon1", land_mask.lon1);
            result.set("d_lat", land_mask.d_lat);
            result.set("d_lon", land_mask.d_lon);
            result.set("rows", land_mask.rows);
            result.set("cols", land_mask.cols);
            result.set("cells", emscripten::val(emscripten::typed_memory_view(land_mask.cells.size(), land_mask.cells.data())));
        }
        return result;
    }
};

EMSCRIPTEN_BINDINGS(seasight_router) {
    emscripten::value_object<IsochroneRouter::EnvironmentSample>("IsochroneEnvironmentSample")
        .field("current_east_kn", &IsochroneRouter::EnvironmentSample::current_east_kn)
        .field("current_north_kn", &IsochroneRouter::EnvironmentSample::current_north_kn)
        .field("wave_height_m", &IsochroneRouter::EnvironmentSample::wave_height_m)
        .field("depth_m", &IsochroneRouter::EnvironmentSample::depth_m);

    emscripten::class_<RouterWrapper>("RouterWrapper")
        .constructor<double, double, double, double, double, double>()
        .function("loadLandMask", &RouterWrapper::loadLandMask)
        .function("loadEnvironmentPack", &RouterWrapper::loadEnvironmentPack)
        .function("setSafetyCaps", &RouterWrapper::setSafetyCaps)
        .function("addMaskData", &RouterWrapper::addMaskData)
        .function("solve", &RouterWrapper::solve)
        .function("solveIsochrone", &RouterWrapper::solveIsochrone)
        .function("createEdge", &RouterWrapper::createEdge)
        .function("gridToLatLon", &RouterWrapper::gridToLatLon)
        .function("latLonToGrid", &RouterWrapper::latLonToGrid)
        .function("sampleEnvironment", &RouterWrapper::sampleEnvironment)
        .function("greatCircleDistance", &RouterWrapper::greatCircleDistance)
        .function("normalizeLongitude", &RouterWrapper::normalizeLongitude)
        .function("crossesAntiMeridian", &RouterWrapper::crossesAntiMeridian)
        .function("getLandMaskData", &RouterWrapper::getLandMaskData);

    emscripten::register_vector<std::uint8_t>("vector<uint8_t>");
}

int main() {
    return 0;
}
