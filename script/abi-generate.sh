#!/bin/bash

mode=$1
filePath=$2
contractName=$3

if [[ $mode == "test" ]]; then
  outputDir="e2e/sdk/abi/$contractName"
elif [[ $mode == "prod" ]]; then
  outputDir=$filePath"/sdk/abi"
else
  echo "Invalid mode. Use 'test' or 'prod'."
  exit 1
fi

forge inspect $filePath/$contractName.sol:$contractName abi > $contractName.abi.json && typechain --target=ethers-v5 --out-dir=$outputDir $contractName'.abi.json'
