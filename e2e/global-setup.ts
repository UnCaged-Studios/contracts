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
  privateKey: string,
  args?: string[]
) {
  const constructor = args
    ? `--constructor-args ${args.map((arg) => `"${arg}"`).join(' ')}`
    : '';
  const { stdout } = await exec(
    `forge create ${contract} --rpc-url http://127.0.0.1:8545 --private-key ${privateKey} ${constructor}`.trim()
  );
  const match = /Deployed to:\s*(0x[a-fA-F0-9]{40})/.exec(stdout);
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
  return await new Promise<{ privateKeys: string[]; publicKeys: string[] }>(
    (resolve) => {
      const privateKeys: string[] = [];
      const publicKeys: string[] = [];
      proc.stdout.on('data', (data) => {
        console.log(chalk.italic.gray(data));
        if (data.toString().includes('Listening on 127.0.0.1:8545')) {
          resolve({ privateKeys, publicKeys });
        }
        data
          .toString()
          .split('\n')
          .forEach((line: string) => {
            const privateKeyMatch = line.match(
              /^\((\d+)\) (0x[a-fA-F0-9]{64})/
            );
            const pubKeyMatch = line.match(/^\((\d+)\) "(0x[a-fA-F0-9]{40})"/);
            if (privateKeyMatch) {
              privateKeys.push(privateKeyMatch[2]);
            } else if (pubKeyMatch) {
              publicKeys.push(pubKeyMatch[2]);
            }
          });
      });
    }
  );
}

export default async () => {
  try {
    await exec('pkill -f anvil || true');
  } catch (error) {
    /* shhhhh */
  }

  try {
    const chainId = process.env.ANVIL_CHAIN_ID || '31337';
    const proc = child_process.spawn('anvil', ['--chain-id', chainId], {
      stdio: ['pipe', 'pipe', 'inherit'],
    });
    // eslint-disable-next-line
    (global as any).anvil = proc;
    const { privateKeys, publicKeys } = await _anvilProcessHandler(proc);
    const contractDeployerIdx = 0;
    const contractDeployer = privateKeys[contractDeployerIdx];
    const contractDeployerPubkey = publicKeys[contractDeployerIdx];
    const kaChingCashRegister = await _deployContract(
      'src/ka-ching/KaChingCashRegisterV1.sol:KaChingCashRegisterV1',
      contractDeployer
    );
    const mbs = await _deployContract(
      'src/mbs/MBSOptimismMintableERC20.sol:MBSOptimismMintableERC20',
      contractDeployer,
      [contractDeployerPubkey, '0xDeaDBEEF00000000000000000000000000000000']
    );
    const json = {
      privateKeys,
      contractDeployer,
      kaChingCashRegister,
      mbs,
    };
    await fs.writeJSON(path.join(__dirname, 'anvil.json'), json, {
      spaces: 2,
    });
    console.log(
      chalk.bold.green(
        `🚀 anvil deployed contracts:\nMBS: ${mbs}\nKaChing: ${kaChingCashRegister}`
      )
    );
  } catch (error) {
    console.error(chalk.red(error));
    process.exit(1);
  }
};
