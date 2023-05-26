import * as child_process from 'child_process';
import * as dotenv from 'dotenv';
import { promisify } from 'util';
import waitOn from 'wait-on';

const exec = promisify(child_process.exec);

dotenv.config();

export default async () => {
  try {
    await exec('pkill -f anvil || true');
  } catch (error) {}

  try {
    const forkUrl = process.env.ANVIL_FORK_URL || 'https://cloudflare-eth.com';
    const chainId = process.env.ANVIL_CHAIN_ID || '31337';
    (global as any).anvil = child_process.spawn(
      'anvil',
      ['--fork-url', forkUrl, '--chain-id', chainId],
      { stdio: 'inherit' }
    );

    // Wait for the port to be available
    await waitOn({
      resources: ['tcp:localhost:8545'],
      delay: 3_000, // initial delay in ms, default 0
      timeout: 15_000, // timeout in ms, default Infinity
      tcpTimeout: 1_000, // tcp timeout in ms, default 300ms
      window: 1_000, // stabilization time in ms, default 750ms
    });
    const privateKey =
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    const deploy_output = await exec(
      `forge create src/ka-ching/CashRegisterV1.sol:KaChingCashRegisterV1 --rpc-url http://127.0.0.1:8545 --private-key ${privateKey}`
    );
    const deployed_address = deploy_output.stdout
      .split(' ')
      .find((word) => word.startsWith('0x'));

    console.log(`contract address is ${deployed_address}`);
    console.log('✨ Local chain was setup successfully!');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
