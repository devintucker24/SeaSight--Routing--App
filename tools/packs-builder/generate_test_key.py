#!/usr/bin/env python3
"""
Generate a test Ed25519 signing key for development purposes.
This should NOT be used in production!
"""

import base64
from nacl.signing import SigningKey
from nacl.encoding import Base64Encoder

def generate_test_key():
    """Generate a test Ed25519 signing key and output it as base64."""
    # Generate a new random signing key
    signing_key = SigningKey.generate()
    
    # Get the raw key bytes
    key_bytes = signing_key.encode()
    
    # Encode as base64
    key_b64 = base64.b64encode(key_bytes).decode('ascii')
    
    print("Generated test Ed25519 signing key:")
    print(f"ED25519_PRIV={key_b64}")
    print()
    print("Add this to your environment variables:")
    print(f"export ED25519_PRIV='{key_b64}'")
    print()
    print("WARNING: This is a test key for development only!")
    print("Do NOT use this key in production!")

if __name__ == "__main__":
    generate_test_key()
