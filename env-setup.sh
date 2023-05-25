#!/bin/bash
set -e

print_green() {
    echo -e "\033[32m\033[1m$1\033[0m"
}

print_red() {
    echo -e "\033[31m\033[1m$1\033[0m"
}

function deploy_contract {
    local contract_file=$1

    # deploy contract
    deploy_output=$(forge create "$contract_file" --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
    deployed_address=$(echo "$deploy_output" | awk '/Deployed to/{print $NF}')

    # print success message
    print_green "contract address is $deployed_address , updated file $replace_file"
}

pkill -f anvil || true

source .env

# run anvil locally
anvil --fork-url $ANVIL_FORK_URL --chain-id $ANVIL_CHAIN_ID &
anvil_pid=$!

# waiting for anvil to list on port
for i in {1..10}
do
  if netstat -an | grep 8545 > /dev/null; then
    break
  fi
  sleep 1
done

if ! netstat -an | grep 8545 > /dev/null; then
  echo "Anvil did not start within 10 seconds"
  kill $anvil_pid
  exit 1
fi

# fund target dev wallet with ETH
cast send --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 $DEV_WALLET_ADDRESS --value 1ether

# deploy KaChing contract
deploy_contract "src/ka-ching/CashRegisterV1.sol:KaChingCashRegisterV1"

print_green "✨ Local chain was setup successfully!"

echo -e "\n\033[33m\033[1mThe anvil process is now running in the background with PID: $anvil_pid\033[0m"
while true; do
  sleep 1
done