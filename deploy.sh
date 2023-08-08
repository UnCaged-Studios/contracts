set -eu
source .env.deploy

# === 1st step
# forge create --rpc-url $RPC --private-key $DEPLOYER_PK --constructor-args-path args.txt src/ka-ching/KaChingCashRegisterV1.sol:KaChingCashRegisterV1

# === 2nd step
# forge verify-contract --verifier-url https://api.basescan.org/api/ --etherscan-api-key foo --chain-id 8453 --constructor-args-path args.txt 0x2F793CaF0F681e7ce3e417b233Cd7B743EBEcDd7 src/ka-ching/KaChingCashRegisterV1.sol:KaChingCashRegisterV1 --watch
