
import argparse
import xarray as xr
import numpy as np
import cfgrib # Required for GRIB files
import netCDF4 # Required for NetCDF files (e.g., HYCOM)
from scipy.ndimage import binary_dilation
from shapely.geometry import Point
import geopandas as gpd
from rasterio.features import rasterize
from rasterio.transform import from_bounds
import zstandard as zstd
import json
import os
import hashlib
import base64
from datetime import datetime
from nacl.signing import SigningKey
from nacl.encoding import Base64Encoder

def ingest_gfs(gfs_file_path, grid_info):
    """
    Ingests GFS (wind) data, regrids it, and returns a xarray dataset.
    """
    print(f"Ingesting GFS data from {gfs_file_path}")
    try:
        # Try GRIB first, then fall back to NetCDF
        try:
            ds = xr.open_dataset(gfs_file_path, engine="cfgrib", backend_kwargs={'indexpath': ''})
        except:
            # Fall back to NetCDF for test data
            ds = xr.open_dataset(gfs_file_path)

        # Extract relevant wind components (assuming 'u' and 'v' variables for wind)
        # GFS data often has 'u' and 'v' components for wind, check variable names
        u_wind = ds['u'] # u-component of wind
        v_wind = ds['v'] # v-component of wind

        # Create target coordinates for regridding
        target_lats = grid_info['lats']
        target_lons = grid_info['lons']

        # Regrid the data to the target grid using linear interpolation
        # It's important to align time and depth dimensions if they exist
        regridded_ds = ds.interp(
            latitude=target_lats,
            longitude=target_lons,
            method="linear",
            kwargs={"fill_value": "extrapolate"}
        ).sel(
            time=ds.time.values[0], # Select first time step for simplicity for now
            #surface=ds.surface.values[0] # Select first surface if multiple are present
            drop=True
        )

        # Select only the relevant variables and rename if necessary for consistency
        regridded_ds = regridded_ds[['u', 'v']].rename({'u': 'wind_u', 'v': 'wind_v'})

        return regridded_ds
    except Exception as e:
        print(f"Error ingesting GFS data: {e}")
        return None

def ingest_ww3(ww3_file_path, grid_info):
    """
    Ingests WW3 (waves) data, regrids it, and returns a xarray dataset.
    """
    print(f"Ingesting WW3 data from {ww3_file_path}")
    try:
        # Open the NetCDF file using xarray
        ds = xr.open_dataset(ww3_file_path)

        # Extract relevant wave components (assuming 'hs', 'tp', 'dir' for wave data)
        # Check variable names from actual WW3 files for accuracy
        hs = ds['hs'] # Significant wave height
        tp = ds['tp'] # Peak wave period
        dir = ds['dir'] # Wave direction

        # Create target coordinates for regridding
        target_lats = grid_info['lats']
        target_lons = grid_info['lons']

        # Regrid the data to the target grid using linear interpolation
        regridded_ds = ds.interp(
            latitude=target_lats,
            longitude=target_lons,
            method="linear",
            kwargs={"fill_value": "extrapolate"}
        ).sel(
            time=ds.time.values[0], # Select first time step for simplicity for now
            drop=True
        )

        # Select only the relevant variables and rename if necessary for consistency
        regridded_ds = regridded_ds[['hs', 'tp', 'dir']].rename({'hs': 'wave_hs', 'tp': 'wave_tp', 'dir': 'wave_dir'})

        return regridded_ds
    except Exception as e:
        print(f"Error ingesting WW3 data: {e}")
        return None

def ingest_hycom(hycom_file_path, grid_info):
    """
    Ingests HYCOM (currents) data, regrids it, and returns a xarray dataset.
    """
    print(f"Ingesting HYCOM data from {hycom_file_path}")
    try:
        # Open the NetCDF file using xarray
        ds = xr.open_dataset(hycom_file_path)

        # Extract relevant current components (assuming 'water_u' and 'water_v' for currents)
        # Check variable names from actual HYCOM files for accuracy
        u_current = ds['water_u'] # u-component of current
        v_current = ds['water_v'] # v-component of current

        # Create target coordinates for regridding
        target_lats = grid_info['lats']
        target_lons = grid_info['lons']

        # Regrid the data to the target grid using linear interpolation
        regridded_ds = ds.interp(
            lat=target_lats, 
            lon=target_lons, 
            method="linear",
            kwargs={"fill_value": "extrapolate"}
        ).sel(
            time=ds.time.values[0], # Select first time step for simplicity for now
            #depth=ds.depth.values[0], # Select first depth level if multiple are present
            drop=True
        )

        # Select only the relevant variables and rename if necessary for consistency
        regridded_ds = regridded_ds[['water_u', 'water_v']].rename({'water_u': 'cur_u', 'water_v': 'cur_v'})

        return regridded_ds
    except Exception as e:
        print(f"Error ingesting HYCOM data: {e}")
        return None

def generate_land_mask(grid_info):
    """
    Generate a land mask based on a simple coastline approximation.
    For MVP, this uses a basic geometric approach. In production, 
    this would use high-resolution coastline data.
    """
    print("Generating land mask...")
    lats = grid_info['lats']
    lons = grid_info['lons']
    
    # Create coordinate grids
    lon_grid, lat_grid = np.meshgrid(lons, lats)
    
    # Simple land mask: assume land is above certain latitude thresholds
    # This is a placeholder - in production, use actual coastline data
    land_mask = np.zeros((len(lats), len(lons)), dtype=np.uint8)
    
    # Basic land approximation (this is simplified for MVP)
    # In production, use Natural Earth or GSHHG coastline data
    for i, lat in enumerate(lats):
        for j, lon in enumerate(lons):
            # Simple land detection based on latitude and longitude
            # This is a placeholder - replace with actual coastline data
            if lat > 60 or lat < -60:  # Polar regions
                land_mask[i, j] = 1
            elif 20 < lat < 50 and -80 < lon < -10:  # North America
                land_mask[i, j] = 1
            elif 35 < lat < 70 and -10 < lon < 40:  # Europe
                land_mask[i, j] = 1
            elif 10 < lat < 60 and 100 < lon < 180:  # Asia
                land_mask[i, j] = 1
    
    return land_mask

def generate_shallow_mask(grid_info, depth_threshold=20.0):
    """
    Generate a shallow water mask based on depth threshold.
    For MVP, this uses a simple depth model. In production,
    this would use bathymetry data like GEBCO.
    """
    print(f"Generating shallow water mask (depth < {depth_threshold}m)...")
    lats = grid_info['lats']
    lons = grid_info['lons']
    
    # Create coordinate grids
    lon_grid, lat_grid = np.meshgrid(lons, lats)
    
    # Simple depth model (placeholder for MVP)
    # In production, use GEBCO or other bathymetry data
    shallow_mask = np.zeros((len(lats), len(lons)), dtype=np.uint8)
    
    # Basic shallow water detection
    # This is simplified - replace with actual bathymetry data
    for i, lat in enumerate(lats):
        for j, lon in enumerate(lons):
            # Simple depth approximation based on distance from coast
            # This is a placeholder
            if abs(lat) < 10:  # Tropical regions tend to be deeper
                depth = 50
            elif abs(lat) < 30:  # Subtropical
                depth = 30
            else:  # Higher latitudes
                depth = 15
            
            if depth < depth_threshold:
                shallow_mask[i, j] = 1
    
    return shallow_mask

def generate_restricted_mask(grid_info):
    """
    Generate a restricted area mask for areas like marine protected areas,
    military zones, etc. For MVP, this is mostly empty.
    """
    print("Generating restricted area mask...")
    lats = grid_info['lats']
    lons = grid_info['lons']
    
    # Create empty restricted mask for MVP
    # In production, this would load actual restricted area polygons
    restricted_mask = np.zeros((len(lats), len(lons)), dtype=np.uint8)
    
    # Placeholder: add some restricted areas for demonstration
    # In production, load from shapefiles or other vector data
    for i, lat in enumerate(lats):
        for j, lon in enumerate(lons):
            # Example restricted areas (simplified)
            if 25 < lat < 30 and -80 < lon < -75:  # Example restricted zone
                restricted_mask[i, j] = 1
    
    return restricted_mask

def apply_coastal_dilation(mask, iterations=1):
    """
    Apply 1-cell coastal dilation to expand land/shallow/restricted areas
    by one grid cell to ensure safety margins.
    """
    print(f"Applying {iterations}-cell coastal dilation...")
    
    # Define 8-connected structuring element for dilation
    structure = np.ones((3, 3), dtype=np.uint8)
    
    # Apply binary dilation
    dilated_mask = binary_dilation(mask, structure=structure, iterations=iterations)
    
    return dilated_mask.astype(np.uint8)

def generate_all_masks(grid_info, depth_threshold=20.0):
    """
    Generate all masks (land, shallow, restricted) and apply coastal dilation.
    """
    print("Generating all safety masks...")
    
    # Generate individual masks
    land_mask = generate_land_mask(grid_info)
    shallow_mask = generate_shallow_mask(grid_info, depth_threshold)
    restricted_mask = generate_restricted_mask(grid_info)
    
    # Apply 1-cell coastal dilation to each mask
    land_mask_dilated = apply_coastal_dilation(land_mask)
    shallow_mask_dilated = apply_coastal_dilation(shallow_mask)
    restricted_mask_dilated = apply_coastal_dilation(restricted_mask)
    
    return {
        'land': land_mask_dilated,
        'shallow': shallow_mask_dilated,
        'restricted': restricted_mask_dilated
    }

def compress_data(data_array, compression_level=3):
    """
    Compress a numpy array using zstd compression.
    """
    # Convert to bytes
    data_bytes = data_array.tobytes()
    
    # Compress with zstd
    compressed_data = zstd.compress(data_bytes, compression_level)
    
    return compressed_data

def calculate_sha256(data_bytes):
    """
    Calculate SHA256 hash of data bytes.
    """
    return hashlib.sha256(data_bytes).hexdigest()

def load_signing_key(signing_key_arg):
    """
    Load Ed25519 signing key from environment variable or file.
    """
    if signing_key_arg.startswith('env:'):
        key_name = signing_key_arg[4:]  # Remove 'env:' prefix
        key_b64 = os.environ.get(key_name)
        if not key_b64:
            raise ValueError(f"Environment variable {key_name} not found")
        key_bytes = base64.b64decode(key_b64)
        return SigningKey(key_bytes)
    else:
        # Assume it's a file path
        with open(signing_key_arg, 'rb') as f:
            key_bytes = f.read()
        return SigningKey(key_bytes)

def create_manifest(region, cycle_iso, grid_info, output_data, parts_info, signing_key):
    """
    Create the pack manifest with metadata and signatures.
    """
    # Extract times from the data (simplified for MVP - single time step)
    times_iso = [cycle_iso]  # For MVP, just use the cycle time
    
    # Create the manifest structure
    manifest = {
        "schema_version": 1,
        "region": region,
        "cycle_iso": cycle_iso,
        "grid": {
            "lat0": grid_info['lat0'],
            "lat1": grid_info['lat1'],
            "lon0": grid_info['lon0'],
            "lon1": grid_info['lon1'],
            "d": grid_info['d']
        },
        "times_iso": times_iso,
        "fields": list(output_data.keys()),
        "parts": parts_info,
        "masks": {
            "land": "mask_land.bin.zst",
            "shallow": "mask_shallow.bin.zst",
            "restricted": "mask_restricted.bin.zst"
        }
    }
    
    # Create signature
    manifest_json = json.dumps(manifest, sort_keys=True, separators=(',', ':'))
    manifest_bytes = manifest_json.encode('utf-8')
    signature = signing_key.sign(manifest_bytes)
    
    # Add signing info to manifest
    manifest["signing"] = {
        "alg": "ed25519",
        "key_id": "pack-key-1",
        "sig_base64": base64.b64encode(signature.signature).decode('ascii')
    }
    
    return manifest

def save_pack(output_data, manifest, output_dir):
    """
    Save the pack data and manifest to the output directory.
    """
    print(f"Saving pack to {output_dir}")
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    parts_info = []
    
    # Save each data array as a compressed binary file
    for field_name, data_array in output_data.items():
        print(f"Compressing and saving {field_name}...")
        
        # Compress the data
        compressed_data = compress_data(data_array)
        
        # Calculate SHA256 hash
        sha256_hash = calculate_sha256(compressed_data)
        
        # Save compressed data
        filename = f"{field_name}.bin.zst"
        filepath = os.path.join(output_dir, filename)
        with open(filepath, 'wb') as f:
            f.write(compressed_data)
        
        # Add to parts info
        parts_info.append({
            "idx": len(parts_info),
            "bytes": len(compressed_data),
            "sha256": sha256_hash
        })
        
        print(f"  Saved {filename}: {len(compressed_data)} bytes, SHA256: {sha256_hash[:16]}...")
    
    # Update manifest with parts info
    manifest["parts"] = parts_info
    
    # Save manifest
    manifest_path = os.path.join(output_dir, "manifest.json")
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
    
    print(f"Saved manifest to {manifest_path}")
    print(f"Pack creation complete: {len(parts_info)} parts saved")

def main():
    parser = argparse.ArgumentParser(description="Build SeaSight data packs from weather and ocean model data.")
    parser.add_argument("--region", required=True, help="Region name (e.g., NATL_050)")
    parser.add_argument("--cycle", required=True, help="Cycle time in ISO format (e.g., 2025-09-15T12:00:00Z)")
    parser.add_argument("--grid", required=True, help="Grid definition (lat0/lat1/lon0/lon1/d)")
    parser.add_argument("--depth_threshold", type=float, default=20.0, help="Shallow water depth threshold in meters")
    parser.add_argument("--signing_key", required=True, help="Ed25519 signing key (e.g., env:ED25519_PRIV)")
    parser.add_argument("--out", required=True, help="Output directory for the pack")

    # Add arguments for input file paths
    parser.add_argument("--gfs", help="Path to GFS GRIB2 file (wind data)")
    parser.add_argument("--ww3", help="Path to WW3 NetCDF file (wave data)")
    parser.add_argument("--hycom", help="Path to HYCOM NetCDF file (current data)")

    args = parser.parse_args()

    # Parse grid info
    lat0, lat1, lon0, lon1, d = map(float, args.grid.split('/'))
    grid_info = {
        "lat0": lat0, "lat1": lat1, "lon0": lon0, "lon1": lon1, "d": d,
        "lats": np.arange(lat0, lat1 + d, d),
        "lons": np.arange(lon0, lon1 + d, d)
    }

    print(f"Building pack for region: {args.region}, cycle: {args.cycle}")
    print(f"Target grid: {grid_info['lat0']}/{grid_info['lat1']}/{grid_info['lon0']}/{grid_info['lon1']}/{grid_info['d']}")

    all_data = []

    # Ingest data
    if args.gfs:
        gfs_data = ingest_gfs(args.gfs, grid_info)
        if gfs_data is not None:
            all_data.append(gfs_data)

    if args.ww3:
        ww3_data = ingest_ww3(args.ww3, grid_info)
        if ww3_data is not None:
            all_data.append(ww3_data)

    if args.hycom:
        hycom_data = ingest_hycom(args.hycom, grid_info)
        if hycom_data is not None:
            all_data.append(hycom_data)

    if not all_data:
        print("No data ingested. Exiting.")
        return

    # Combine all datasets. xarray.combine_by_coords handles aligning on common dimensions (like time).
    # For this MVP, we are simplifying to a single time step, so this will effectively merge variables.
    combined_ds = xr.merge(all_data)

    # Ensure the data is in (T, Y, X) C-order and float32
    # Assuming 'time', 'latitude', 'longitude' as dimensions
    # The actual variables are 'wind_u', 'wind_v', 'wave_hs', 'wave_tp', 'wave_dir', 'cur_u', 'cur_v'

    # Extract all data variables and convert to float32 NumPy arrays
    output_data = {}
    for var_name in combined_ds.data_vars:
        if 'time' in combined_ds[var_name].dims:
            # Ensure (T, Y, X) order for time-dependent variables
            # Adjust based on actual dimension names in your xarray dataset
            dims = [dim for dim in ['time', 'latitude', 'longitude'] if dim in combined_ds[var_name].dims]
            data_array = combined_ds[var_name].transpose(*dims).values.astype(np.float32)
        else:
            # For time-independent variables (e.g., masks later), just to_numpy
            data_array = combined_ds[var_name].values.astype(np.float32)
        output_data[var_name] = data_array
        print(f"Prepared {var_name}: Shape {data_array.shape}, Dtype {data_array.dtype}")

    # Generate safety masks
    masks = generate_all_masks(grid_info, args.depth_threshold)
    
    # Add masks to output data
    for mask_name, mask_data in masks.items():
        output_data[f'mask_{mask_name}'] = mask_data
        print(f"Prepared mask_{mask_name}: Shape {mask_data.shape}, Dtype {mask_data.dtype}")

    print("Data ingestion, regridding, mask generation, and preparation to float32 C-order arrays complete.")
    
    # Load signing key
    try:
        signing_key = load_signing_key(args.signing_key)
        print("Loaded Ed25519 signing key")
    except Exception as e:
        print(f"Error loading signing key: {e}")
        return
    
    # Create and save the pack
    manifest = create_manifest(args.region, args.cycle, grid_info, output_data, [], signing_key)
    save_pack(output_data, manifest, args.out)
    
    print(f"Pack creation complete! Output saved to: {args.out}")

if __name__ == "__main__":
    main()
