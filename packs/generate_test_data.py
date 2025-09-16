#!/usr/bin/env python3
"""
Generate synthetic test data for the pack builder.
This creates mock GFS, WW3, and HYCOM data files for testing.
"""

import numpy as np
import xarray as xr
import os
from datetime import datetime, timedelta

def create_test_gfs_data(output_path, cycle_time):
    """Create synthetic GFS wind data."""
    print(f"Creating test GFS data: {output_path}")
    
    # Create a small test grid (North Atlantic region)
    lats = np.arange(30, 60, 0.5)  # 30N to 60N
    lons = np.arange(-80, -10, 0.5)  # 80W to 10W
    times = [cycle_time]
    
    # Create synthetic wind data
    u_wind = np.random.normal(5, 3, (len(times), len(lats), len(lons)))  # m/s
    v_wind = np.random.normal(2, 2, (len(times), len(lats), len(lons)))  # m/s
    
    # Create xarray dataset
    ds = xr.Dataset({
        'u': (['time', 'latitude', 'longitude'], u_wind),
        'v': (['time', 'latitude', 'longitude'], v_wind)
    }, coords={
        'time': times,
        'latitude': lats,
        'longitude': lons
    })
    
    # Add GRIB attributes
    ds['u'].attrs = {'long_name': 'u-component of wind', 'units': 'm s**-1'}
    ds['v'].attrs = {'long_name': 'v-component of wind', 'units': 'm s**-1'}
    
    # Save as NetCDF (simpler than GRIB for testing)
    ds.to_netcdf(output_path)
    print(f"  Saved GFS test data: {len(lats)}x{len(lons)} grid, {len(times)} time steps")

def create_test_ww3_data(output_path, cycle_time):
    """Create synthetic WW3 wave data."""
    print(f"Creating test WW3 data: {output_path}")
    
    # Same grid as GFS
    lats = np.arange(30, 60, 0.5)
    lons = np.arange(-80, -10, 0.5)
    times = [cycle_time]
    
    # Create synthetic wave data
    hs = np.random.exponential(2, (len(times), len(lats), len(lons)))  # Significant wave height (m)
    tp = np.random.normal(8, 2, (len(times), len(lats), len(lons)))  # Peak period (s)
    dir = np.random.uniform(0, 360, (len(times), len(lats), len(lons)))  # Direction (deg)
    
    # Create xarray dataset
    ds = xr.Dataset({
        'hs': (['time', 'latitude', 'longitude'], hs),
        'tp': (['time', 'latitude', 'longitude'], tp),
        'dir': (['time', 'latitude', 'longitude'], dir)
    }, coords={
        'time': times,
        'latitude': lats,
        'longitude': lons
    })
    
    # Add attributes
    ds['hs'].attrs = {'long_name': 'Significant wave height', 'units': 'm'}
    ds['tp'].attrs = {'long_name': 'Peak wave period', 'units': 's'}
    ds['dir'].attrs = {'long_name': 'Wave direction', 'units': 'degree'}
    
    # Save as NetCDF
    ds.to_netcdf(output_path)
    print(f"  Saved WW3 test data: {len(lats)}x{len(lons)} grid, {len(times)} time steps")

def create_test_hycom_data(output_path, cycle_time):
    """Create synthetic HYCOM current data."""
    print(f"Creating test HYCOM data: {output_path}")
    
    # Same grid as GFS/WW3
    lats = np.arange(30, 60, 0.5)
    lons = np.arange(-80, -10, 0.5)
    times = [cycle_time]
    
    # Create synthetic current data
    u_current = np.random.normal(0.1, 0.05, (len(times), len(lats), len(lons)))  # m/s
    v_current = np.random.normal(0.05, 0.03, (len(times), len(lats), len(lons)))  # m/s
    
    # Create xarray dataset
    ds = xr.Dataset({
        'water_u': (['time', 'lat', 'lon'], u_current),
        'water_v': (['time', 'lat', 'lon'], v_current)
    }, coords={
        'time': times,
        'lat': lats,
        'lon': lons
    })
    
    # Add attributes
    ds['water_u'].attrs = {'long_name': 'u-component of current', 'units': 'm s**-1'}
    ds['water_v'].attrs = {'long_name': 'v-component of current', 'units': 'm s**-1'}
    
    # Save as NetCDF
    ds.to_netcdf(output_path)
    print(f"  Saved HYCOM test data: {len(lats)}x{len(lons)} grid, {len(times)} time steps")

def main():
    """Generate all test data files."""
    print("Generating synthetic test data for pack builder...")
    
    # Create test data directory
    test_data_dir = "test_data"
    os.makedirs(test_data_dir, exist_ok=True)
    
    # Use current time as cycle time
    cycle_time = datetime.now().replace(minute=0, second=0, microsecond=0)
    
    # Generate test data files
    gfs_path = os.path.join(test_data_dir, "gfs_test.nc")
    ww3_path = os.path.join(test_data_dir, "ww3_test.nc")
    hycom_path = os.path.join(test_data_dir, "hycom_test.nc")
    
    create_test_gfs_data(gfs_path, cycle_time)
    create_test_ww3_data(ww3_path, cycle_time)
    create_test_hycom_data(hycom_path, cycle_time)
    
    print(f"\nTest data generation complete!")
    print(f"Files created in: {test_data_dir}/")
    print(f"Cycle time: {cycle_time.isoformat()}Z")
    print("\nTo build a test pack, run:")
    print(f"python build_pack.py --region NATL_050 --cycle {cycle_time.isoformat()}Z --grid 30/60/-80/-10/0.5 --gfs {gfs_path} --ww3 {ww3_path} --hycom {hycom_path} --out ./out/NATL_050_test")

if __name__ == "__main__":
    main()
