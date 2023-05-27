import * as child_process from 'child_process';
import * as dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';
import { promisify } from 'util';
import chalk from 'chalk';

const exec = promisify(child_process.exec);

dotenv.config();

export default async () => {
  try {
    await exec('pkill -f anvil || true');
  } catch (error) {}

  try {
    const forkUrl = process.env.ANVIL_FORK_URL || 'https://cloudflare-eth.com';
    const chainId = process.env.ANVIL_CHAIN_ID || '31337';

    const proc = child_process.spawn(
      'anvil',
      ['--fork-url', forkUrl, '--chain-id', chainId],
      { stdio: ['pipe', 'pipe', 'inherit'] }
    );
    (global as any).anvil = proc;
    const privateKeys = await new Promise<string[]>((resolve) => {
      let _privateKeys: string[] = [];
      proc.stdout.on('data', (data) => {
        console.log(chalk.italic.gray(data));
        if (data.toString().includes('Listening on 127.0.0.1:8545')) {
          resolve(_privateKeys);
        }
        data
          .toString()
          .split('\n')
          .forEach((line: string) => {
            let privateKeyMatch = line.match(/^\((\d+)\) (0x[a-fA-F0-9]{64})/);
            if (privateKeyMatch) {
              _privateKeys.push(privateKeyMatch[2]);
            }
          });
      });
    });
    const contractDeployer = privateKeys[0];
    const { stdout } = await exec(
      `forge create src/ka-ching/CashRegisterV1.sol:KaChingCashRegisterV1 --rpc-url http://127.0.0.1:8545 --private-key ${contractDeployer}`
    );
    let match = /Deployed to:\s*(0x[a-fA-F0-9]{40})/.exec(stdout);
    if (!match || !match[1]) {
      throw new Error('cannot find contact created pattern');
    }
    fs.writeJsonSync(
      path.join(__dirname, 'anvil.json'),
      {
        privateKeys,
        contractDeployer,
        contractAddress: match[1],
      },
      {
        spaces: 2,
      }
    );
  } catch (error) {
    console.error(chalk.red(error));
    process.exit(1);
  }
};
