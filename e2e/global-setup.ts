import * as child_process from 'child_process';
import * as dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';
import { promisify } from 'util';
import chalk from 'chalk';

const exec = promisify(child_process.exec);

dotenv.config();

const predefinedWalletsIdx = {
  kaChing_deployer: 0,
  mbs_deployer: 1,
  kaChing_cashier: 3,
  kaChing_customer: 4,
  mbs_OptimismBridge: 5,
  alice: 6,
  bob: 7,
};

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
        if (process.env.ANVIL_VERBOSE === 'true') {
          console.log(chalk.italic.gray(data));
        }
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
    const kaChingContractDeployer =
      privateKeys[predefinedWalletsIdx.kaChing_deployer];
    const mbsContractDeployer = privateKeys[predefinedWalletsIdx.mbs_deployer];

    const bridgeAddress = publicKeys[predefinedWalletsIdx.mbs_OptimismBridge];
    const cashierAddress = publicKeys[predefinedWalletsIdx.kaChing_cashier];

    const mbsToken = await _deployContract(
      'src/mbs/MBS.sol:MBS',
      mbsContractDeployer
    );
    const mbsOptimism = await _deployContract(
      'src/mbs-optimism/MBSOptimismMintableERC20.sol:MBSOptimismMintableERC20',
      mbsContractDeployer,
      [bridgeAddress, mbsToken]
    );
    const kaChing = await _deployContract(
      'src/ka-ching/KaChingCashRegisterV1.sol:KaChingCashRegisterV1',
      kaChingContractDeployer,
      [cashierAddress, mbsOptimism]
    );
    const json = {
      privateKeys: {
        kaChingDeployer: kaChingContractDeployer,
        mbsDeployer: mbsContractDeployer,
        optimismBridge: privateKeys[predefinedWalletsIdx.mbs_OptimismBridge],
        cashier: privateKeys[predefinedWalletsIdx.kaChing_cashier],
        customer: privateKeys[predefinedWalletsIdx.kaChing_customer],
        alice: privateKeys[predefinedWalletsIdx.alice],
        bob: privateKeys[predefinedWalletsIdx.bob],
      },
      contracts: {
        kaChingCashRegister: kaChing,
        mbsOptimism,
        mbsToken,
      },
    };
    await fs.writeJSON(path.join(__dirname, 'anvil.json'), json, {
      spaces: 2,
    });
    console.log(
      chalk.bold.green(
        `🚀 anvil deployed contracts:\n${[
          ['MBS Optimism', mbsOptimism],
          ['MBS', mbsToken],
          ['KaChing', kaChing],
        ]
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n')}`
      )
    );
  } catch (error) {
    console.error(chalk.red(error));
    process.exit(1);
  }
};
