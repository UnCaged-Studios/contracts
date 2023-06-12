#!/bin/bash

mode=$1
contractName=$2

if [[ $mode == "test" ]]; then
  filePath="test/ka-ching/contracts"
  outputDir="e2e/ka-ching/abi/$contractName"
elif [[ $mode == "prod" ]]; then
  filePath="src/ka-ching"
  outputDir="src/ka-ching/sdk/abi/$contractName"
else
  echo "Invalid mode. Use 'test' or 'prod'."
  exit 1
fi

forge inspect $filePath/$contractName.sol:$contractName abi > $contractName.abi.json && typechain --target=ethers-v5 --out-dir=$outputDir $contractName'.abi.json'
