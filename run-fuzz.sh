#!/bin/bash

# First compile the project with hardhat to ensure all dependencies are resolved
echo "Compiling contracts with Hardhat..."
pnpm hardhat compile

# Run echidna with proper configuration
echo "Running echidna fuzzing tests..."
echidna test/fuzz/NFTMarketplaceFuzz.sol \
  --contract NFTMarketplaceFuzzTest \
  --config echidna.config.yml \
  --format text \
  --solc-args "--base-path . --include-path node_modules"