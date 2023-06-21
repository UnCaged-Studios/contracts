#!/bin/bash

mode=prod
filePath=$1
contractName=$2

if [[ $mode == "test" ]]; then
  outputDir="e2e/sdk/abi/$contractName"
elif [[ $mode == "prod" ]]; then
  outputDir=$filePath"/sdk/abi"
else
  echo "Invalid mode. Use 'test' or 'prod'."
  exit 1
fi

forge inspect $filePath/$contractName.sol:$contractName abi > src/abi/$contractName.abi.json && typechain --target=ethers-v5 --out-dir=$outputDir src/abi/$contractName'.abi.json'
