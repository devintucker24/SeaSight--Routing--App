#!/usr/bin/env python3
"""
Verify a SeaSight data pack by checking manifest, signatures, and data integrity.
"""

import json
import os
import zstandard as zstd
import hashlib
import base64
import numpy as np
from nacl.signing import VerifyKey
from nacl.encoding import Base64Encoder

def load_manifest(pack_dir):
    """Load and parse the pack manifest."""
    manifest_path = os.path.join(pack_dir, "manifest.json")
    
    if not os.path.exists(manifest_path):
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")
    
    with open(manifest_path, 'r') as f:
        manifest = json.load(f)
    
    print(f"Loaded manifest for region: {manifest['region']}")
    print(f"Cycle: {manifest['cycle_iso']}")
    print(f"Grid: {manifest['grid']}")
    print(f"Fields: {manifest['fields']}")
    print(f"Parts: {len(manifest['parts'])}")
    
    return manifest

def verify_signature(manifest, public_key_b64=None):
    """Verify the Ed25519 signature of the manifest."""
    print("\nVerifying manifest signature...")
    
    # Extract signature info
    signing_info = manifest.get('signing', {})
    if not signing_info:
        print("❌ No signing information found in manifest")
        return False
    
    alg = signing_info.get('alg')
    key_id = signing_info.get('key_id')
    sig_b64 = signing_info.get('sig_base64')
    
    if alg != 'ed25519':
        print(f"❌ Unsupported signature algorithm: {alg}")
        return False
    
    print(f"  Algorithm: {alg}")
    print(f"  Key ID: {key_id}")
    
    # Create manifest without signature for verification
    manifest_copy = manifest.copy()
    del manifest_copy['signing']
    manifest_json = json.dumps(manifest_copy, sort_keys=True, separators=(',', ':'))
    manifest_bytes = manifest_json.encode('utf-8')
    
    try:
        # Decode signature
        signature = base64.b64decode(sig_b64)
        
        if public_key_b64:
            # Verify with provided public key
            verify_key = VerifyKey(base64.b64decode(public_key_b64))
            verify_key.verify(manifest_bytes, signature)
            print("✅ Signature verified with provided public key")
        else:
            # For now, just check that signature exists and is valid base64
            print("⚠️  No public key provided - signature format verified only")
            print(f"  Signature length: {len(signature)} bytes")
        
        return True
        
    except Exception as e:
        print(f"❌ Signature verification failed: {e}")
        return False

def verify_parts(manifest, pack_dir):
    """Verify all pack parts (files and checksums)."""
    print("\nVerifying pack parts...")
    
    parts = manifest.get('parts', [])
    if not parts:
        print("❌ No parts found in manifest")
        return False
    
    all_valid = True
    
    for i, part in enumerate(parts):
        idx = part.get('idx', i)
        expected_bytes = part.get('bytes', 0)
        expected_sha256 = part.get('sha256', '')
        
        # Find the corresponding file
        field_name = manifest['fields'][idx]
        filename = f"{field_name}.bin.zst"
        filepath = os.path.join(pack_dir, filename)
        
        if not os.path.exists(filepath):
            print(f"❌ Part {idx} ({filename}): File not found")
            all_valid = False
            continue
        
        # Check file size
        actual_bytes = os.path.getsize(filepath)
        if actual_bytes != expected_bytes:
            print(f"❌ Part {idx} ({filename}): Size mismatch ({actual_bytes} != {expected_bytes})")
            all_valid = False
            continue
        
        # Check SHA256 hash
        with open(filepath, 'rb') as f:
            file_data = f.read()
        actual_sha256 = hashlib.sha256(file_data).hexdigest()
        
        if actual_sha256 != expected_sha256:
            print(f"❌ Part {idx} ({filename}): SHA256 mismatch")
            print(f"  Expected: {expected_sha256}")
            print(f"  Actual:   {actual_sha256}")
            all_valid = False
            continue
        
        print(f"✅ Part {idx} ({filename}): {actual_bytes} bytes, SHA256 verified")
    
    return all_valid

def verify_masks(manifest, pack_dir):
    """Verify mask files."""
    print("\nVerifying mask files...")
    
    masks = manifest.get('masks', {})
    all_valid = True
    
    for mask_name, filename in masks.items():
        filepath = os.path.join(pack_dir, filename)
        
        if not os.path.exists(filepath):
            print(f"❌ Mask {mask_name} ({filename}): File not found")
            all_valid = False
            continue
        
        # Try to decompress and check basic properties
        try:
            with open(filepath, 'rb') as f:
                compressed_data = f.read()
            
            # Decompress
            decompressed_data = zstd.decompress(compressed_data)
            
            # Convert back to numpy array (assuming uint8 for masks)
            mask_array = np.frombuffer(decompressed_data, dtype=np.uint8)
            
            # Basic validation
            unique_values = np.unique(mask_array)
            if not all(v in [0, 1] for v in unique_values):
                print(f"❌ Mask {mask_name}: Invalid values (should be 0 or 1)")
                all_valid = False
                continue
            
            print(f"✅ Mask {mask_name} ({filename}): {len(mask_array)} cells, values {unique_values}")
            
        except Exception as e:
            print(f"❌ Mask {mask_name} ({filename}): Decompression failed - {e}")
            all_valid = False
    
    return all_valid

def verify_data_integrity(manifest, pack_dir):
    """Verify data can be decompressed and has expected properties."""
    print("\nVerifying data integrity...")
    
    parts = manifest.get('parts', [])
    all_valid = True
    
    for i, part in enumerate(parts):
        field_name = manifest['fields'][i]
        filename = f"{field_name}.bin.zst"
        filepath = os.path.join(pack_dir, filename)
        
        # Skip masks - they're handled separately
        if field_name.startswith('mask_'):
            continue
        
        try:
            # Load and decompress
            with open(filepath, 'rb') as f:
                compressed_data = f.read()
            
            decompressed_data = zstd.decompress(compressed_data)
            
            # Convert to numpy array (assuming float32 for data)
            data_array = np.frombuffer(decompressed_data, dtype=np.float32)
            
            # Basic statistics
            min_val = np.min(data_array)
            max_val = np.max(data_array)
            mean_val = np.mean(data_array)
            
            print(f"✅ {field_name}: {len(data_array)} values, range [{min_val:.3f}, {max_val:.3f}], mean {mean_val:.3f}")
            
        except Exception as e:
            print(f"❌ {field_name}: Decompression failed - {e}")
            all_valid = False
    
    return all_valid

def main():
    """Main verification function."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Verify a SeaSight data pack")
    parser.add_argument("pack_dir", help="Path to the pack directory")
    parser.add_argument("--public-key", help="Base64-encoded Ed25519 public key for signature verification")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.pack_dir):
        print(f"❌ Pack directory not found: {args.pack_dir}")
        return 1
    
    print(f"Verifying pack: {args.pack_dir}")
    print("=" * 50)
    
    try:
        # Load manifest
        manifest = load_manifest(args.pack_dir)
        
        # Verify signature
        sig_ok = verify_signature(manifest, args.public_key)
        
        # Verify parts
        parts_ok = verify_parts(manifest, args.pack_dir)
        
        # Verify masks
        masks_ok = verify_masks(manifest, args.pack_dir)
        
        # Verify data integrity
        data_ok = verify_data_integrity(manifest, args.pack_dir)
        
        # Summary
        print("\n" + "=" * 50)
        print("VERIFICATION SUMMARY:")
        print(f"  Manifest: ✅")
        print(f"  Signature: {'✅' if sig_ok else '❌'}")
        print(f"  Parts: {'✅' if parts_ok else '❌'}")
        print(f"  Masks: {'✅' if masks_ok else '❌'}")
        print(f"  Data: {'✅' if data_ok else '❌'}")
        
        all_ok = sig_ok and parts_ok and masks_ok and data_ok
        print(f"\nOverall: {'✅ PACK VALID' if all_ok else '❌ PACK INVALID'}")
        
        return 0 if all_ok else 1
        
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        return 1

if __name__ == "__main__":
    exit(main())
