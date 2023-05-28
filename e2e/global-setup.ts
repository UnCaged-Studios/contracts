import * as child_process from 'child_process';
import * as dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';
import { promisify } from 'util';
import chalk from 'chalk';

const exec = promisify(child_process.exec);

dotenv.config();

async function _deployContract(
  contract: `${string}:${string}`,
  privateKey: string
) {
  const { stdout } = await exec(
    `forge create ${contract} --rpc-url http://127.0.0.1:8545 --private-key ${privateKey}`
  );
  let match = /Deployed to:\s*(0x[a-fA-F0-9]{40})/.exec(stdout);
  if (!match || !match[1]) {
    throw new Error('cannot find contact created pattern');
  }
  return match[1];
}

async function _anvilProcessHandler(
  proc: child_process.ChildProcessByStdio<
    import('stream').Writable,
    import('stream').Readable,
    null
  >
) {
  return await new Promise<{ privateKeys: string[] }>((resolve) => {
    let _privateKeys: string[] = [];
    proc.stdout.on('data', (data) => {
      console.log(chalk.italic.gray(data));
      if (data.toString().includes('Listening on 127.0.0.1:8545')) {
        resolve({ privateKeys: _privateKeys });
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
}

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
    const { privateKeys } = await _anvilProcessHandler(proc);
    const contractDeployer = privateKeys[0];
    const kaChingCashRegister = await _deployContract(
      'src/ka-ching/CashRegisterV1.sol:KaChingCashRegisterV1',
      contractDeployer
    );
    const mockMBS = await _deployContract(
      'test/CashRegisterV1/contracts/MockMBS.sol:MockMBS',
      contractDeployer
    );
    await fs.writeJSON(
      path.join(__dirname, 'anvil.json'),
      {
        privateKeys,
        contractDeployer,
        kaChingCashRegister,
        mockMBS,
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
