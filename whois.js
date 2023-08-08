require('dotenv').config({
  path: './.env.deploy',
});

const { ethers } = require('ethers');
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC);
const wallet = new ethers.Wallet(process.env.DEPLOYER_PK, provider);

console.log('wallet address: ', wallet.address);
wallet.getBalance().then((blnc) => {
  console.log('balance: ', ethers.utils.formatEther(blnc));
});
