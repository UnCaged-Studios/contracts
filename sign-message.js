require('dotenv').config({
  path: '.env.deploy',
});

const ethers = require('ethers');

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC);
const wallet = new ethers.Wallet(process.env.DEPLOYER_PK, provider);

async function main() {
  console.log(`DEPLOYER_PK address is ${wallet.address}`);
  console.log(
    `signed message: ${await wallet.signMessage(
      '[basescan.org 18/07/2023 11:12:55] I, hereby verify that I am the owner/creator of the address [0x8Fbd0648971d56f1f2c35Fa075Ff5Bc75fb0e39D]'
    )}`
  );
}

main().catch(console.error);
