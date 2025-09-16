import struct
from pathlib import Path

DATA_DIR = Path('data/geopolygondata')
SHAPEFILE = DATA_DIR / 'GSHHS_i_L1.shp'
OUTPUT = Path('app/public/land_mask.bin')

LAT0 = -80.0
LAT1 = 80.0
LON0 = -180.0
LON1 = 180.0
DLAT = 0.5
DLON = 0.5

# Basic shapefile polygon parser (2D, no Z/M)
class Ring:
    __slots__ = ('points', 'area')

    def __init__(self, points):
        self.points = points
        self.area = signed_area(points)

    @property
    def is_clockwise(self):
        return self.area < 0

class Polygon:
    __slots__ = ('outer', 'holes', 'bbox')

    def __init__(self, outer, holes):
        self.outer = outer
        self.holes = holes
        xs = [p[0] for p in outer.points]
        ys = [p[1] for p in outer.points]
        self.bbox = (min(xs), min(ys), max(xs), max(ys))


def signed_area(points):
    area = 0.0
    for (x1, y1), (x2, y2) in zip(points, points[1:]):
        area += x1 * y2 - x2 * y1
    x1, y1 = points[-1]
    x2, y2 = points[0]
    area += x1 * y2 - x2 * y1
    return 0.5 * area


def point_in_ring(point, ring):
    x, y = point
    inside = False
    pts = ring.points
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        if ((y1 > y) != (y2 > y)):
            xinters = (x2 - x1) * (y - y1) / (y2 - y1 + 1e-15) + x1
            if xinters > x:
                inside = not inside
    x1, y1 = pts[-1]
    x2, y2 = pts[0]
    if ((y1 > y) != (y2 > y)):
        xinters = (x2 - x1) * (y - y1) / (y2 - y1 + 1e-15) + x1
        if xinters > x:
            inside = not inside
    return inside


def point_in_polygon(point, poly: Polygon):
    if not poly.outer:
        return False
    minx, miny, maxx, maxy = poly.bbox
    x, y = point
    if x < minx or x > maxx or y < miny or y > maxy:
        return False
    if not point_in_ring(point, poly.outer):
        return False
    for hole in poly.holes:
        if point_in_ring(point, hole):
            return False
    return True


def read_polygons(path: Path):
    polys = []
    with path.open('rb') as f:
        header = f.read(100)
        if len(header) != 100:
            raise RuntimeError('Invalid shapefile header')
        file_code = struct.unpack('>i', header[:4])[0]
        if file_code != 9994:
            raise RuntimeError('Unexpected file code')
        f.seek(100)
        while True:
            record_header = f.read(8)
            if not record_header:
                break
            if len(record_header) != 8:
                raise RuntimeError('Corrupt record header')
            rec_num, content_len = struct.unpack('>ii', record_header)
            content_bytes = content_len * 2
            content = f.read(content_bytes)
            if len(content) != content_bytes:
                raise RuntimeError('Unexpected EOF in record')
            shape_type = struct.unpack('<i', content[:4])[0]
            if shape_type == 0:
                continue
            if shape_type != 5:
                raise RuntimeError(f'Unsupported shape type {shape_type}')
            xmin, ymin, xmax, ymax, num_parts, num_points = struct.unpack('<4d2i', content[4:4 + 32 + 8])
            offset = 4 + 32 + 8
            parts = struct.unpack('<' + 'i'*num_parts, content[offset:offset + 4*num_parts])
            offset += 4 * num_parts
            coords = struct.unpack('<' + 'd'*(num_points*2), content[offset:offset + 16*num_points])
            points = [(coords[i], coords[i+1]) for i in range(0, len(coords), 2)]
            rings = []
            for idx, start in enumerate(parts):
                end = parts[idx + 1] if idx + 1 < len(parts) else len(points)
                ring_points = points[start:end]
                if len(ring_points) < 4:
                    continue
                rings.append(Ring(ring_points))
            current_outer = None
            holes = []
            for ring in rings:
                if ring.is_clockwise:
                    if current_outer is not None:
                        polys.append(Polygon(current_outer, holes))
                        holes = []
                    current_outer = ring
                else:
                    if current_outer is None:
                        continue
                    holes.append(ring)
            if current_outer is not None:
                polys.append(Polygon(current_outer, holes))
    return polys


def build_mask(polygons):
    rows = int(round((LAT1 - LAT0) / DLAT)) + 1
    cols = int(round((LON1 - LON0) / DLON)) + 1
    mask = [0] * (rows * cols)

    import math

    def lat_to_row(lat):
        return int(math.floor((lat - LAT0) / DLAT))

    def lon_to_col(lon):
        return int(math.floor((lon - LON0) / DLON))

    for poly in polygons:
        minx, miny, maxx, maxy = poly.bbox
        r_start = max(0, lat_to_row(miny) - 1)
        r_end = min(rows - 1, lat_to_row(maxy) + 1)
        c_start = max(0, lon_to_col(minx) - 1)
        c_end = min(cols - 1, lon_to_col(maxx) + 1)
        for r in range(r_start, r_end + 1):
            lat = LAT0 + r * DLAT
            for c in range(c_start, c_end + 1):
                idx = r * cols + c
                if mask[idx]:
                    continue
                lon = LON0 + c * DLON
                if point_in_polygon((lon, lat), poly):
                    mask[idx] = 1
    return rows, cols, mask


def main():
    if not SHAPEFILE.exists():
        raise SystemExit(f'Missing shapefile: {SHAPEFILE}')
    polys = read_polygons(SHAPEFILE)
    rows, cols, mask = build_mask(polys)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open('wb') as f:
        f.write(struct.pack('<6d', LAT0, LAT1, LON0, LON1, DLAT, DLON))
        f.write(struct.pack('<II', rows, cols))
        f.write(bytes(mask))
    print(f'Wrote mask with {rows}x{cols} cells to {OUTPUT}')


if __name__ == '__main__':
    main()
