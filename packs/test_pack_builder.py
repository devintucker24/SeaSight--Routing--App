#!/usr/bin/env python3
"""
Test script to generate test data and build a sample NATL_050 pack.
"""

import os
import sys
import subprocess
from datetime import datetime

def run_command(cmd, description):
    """Run a command and handle errors."""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Command: {cmd}")
    print('='*60)
    
    try:
        result = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
        print("✅ SUCCESS")
        if result.stdout:
            print("STDOUT:")
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print("❌ FAILED")
        print(f"Return code: {e.returncode}")
        if e.stdout:
            print("STDOUT:")
            print(e.stdout)
        if e.stderr:
            print("STDERR:")
            print(e.stderr)
        return False

def main():
    """Main test function."""
    print("SeaSight Pack Builder Test")
    print("=" * 60)
    
    # Get current directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # Step 1: Generate test data
    print("\nStep 1: Generating synthetic test data...")
    if not run_command("python3 generate_test_data.py", "Generate test data"):
        print("❌ Failed to generate test data")
        return 1
    
    # Step 2: Generate test signing key
    print("\nStep 2: Generating test signing key...")
    if not run_command("python3 generate_test_key.py", "Generate test key"):
        print("❌ Failed to generate test key")
        return 1
    
    # Step 3: Set up environment with test key
    print("\nStep 3: Setting up environment...")
    # Get the test key from the output
    try:
        result = subprocess.run("python3 generate_test_key.py", shell=True, capture_output=True, text=True)
        if result.returncode != 0:
            print("❌ Failed to get test key")
            return 1
        
        # Extract the key from output
        key_line = None
        for line in result.stdout.split('\n'):
            if line.startswith('ED25519_PRIV='):
                key_line = line
                break
        
        if not key_line:
            print("❌ Could not extract test key")
            return 1
        
        # Set environment variable
        os.environ['ED25519_PRIV'] = key_line.split('=', 1)[1]
        print("✅ Test key set in environment")
        
    except Exception as e:
        print(f"❌ Failed to set up environment: {e}")
        return 1
    
    # Step 4: Build the pack
    print("\nStep 4: Building sample NATL_050 pack...")
    
    # Get current time for cycle
    cycle_time = datetime.now().replace(minute=0, second=0, microsecond=0)
    cycle_str = cycle_time.isoformat() + 'Z'
    
    # Build command
    build_cmd = f"""python3 build_pack.py \
        --region NATL_050 \
        --cycle {cycle_str} \
        --grid 30/60/-80/-10/0.5 \
        --gfs test_data/gfs_test.nc \
        --ww3 test_data/ww3_test.nc \
        --hycom test_data/hycom_test.nc \
        --signing_key env:ED25519_PRIV \
        --out ./out/NATL_050_test"""
    
    if not run_command(build_cmd, "Build sample pack"):
        print("❌ Failed to build pack")
        return 1
    
    # Step 5: Verify the pack
    print("\nStep 5: Verifying the built pack...")
    if not run_command("python3 verify_pack.py ./out/NATL_050_test", "Verify pack"):
        print("❌ Pack verification failed")
        return 1
    
    # Step 6: Show pack contents
    print("\nStep 6: Pack contents...")
    if not run_command("ls -la ./out/NATL_050_test/", "List pack contents"):
        print("❌ Failed to list pack contents")
        return 1
    
    # Show manifest
    print("\nStep 7: Pack manifest...")
    if not run_command("cat ./out/NATL_050_test/manifest.json", "Show manifest"):
        print("❌ Failed to show manifest")
        return 1
    
    print("\n" + "=" * 60)
    print("✅ PACK BUILDER TEST COMPLETED SUCCESSFULLY!")
    print("=" * 60)
    print(f"Sample pack created: ./out/NATL_050_test/")
    print(f"Cycle time: {cycle_str}")
    print("The pack contains:")
    print("  - Compressed weather data (wind, waves, currents)")
    print("  - Safety masks (land, shallow, restricted)")
    print("  - Ed25519-signed manifest")
    print("  - SHA256 integrity verification")
    
    return 0

if __name__ == "__main__":
    exit(main())
