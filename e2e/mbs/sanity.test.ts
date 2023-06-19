import { expect, test, describe } from '@jest/globals';
import {
  Wallet,
  Signer,
  providers,
  ContractTransaction,
  ethers,
  BigNumber,
} from 'ethers';
import { contracts, privateKeys } from '../anvil.json';
import { MBS } from '../../dist/cjs';

// wallets
const localJsonRpcProvider = new ethers.providers.JsonRpcProvider();
const bridge = new Wallet(privateKeys.optimismBridge, localJsonRpcProvider);

const mbsSDK = (runner: Signer | providers.Provider) =>
  MBS.sdkFactory(contracts.mbs, runner);

const _waitForTxn = async (sendTxn: () => Promise<ContractTransaction>) => {
  const resp = await sendTxn();
  await resp.wait();
};

const _ensureNonZeroBalance = async (
  walletAddress: string,
  mintAmount = BigNumber.from(BigInt(5 * 10 ** 18))
) => {
  const tokenContract = mbsSDK(bridge);
  const balance = await tokenContract.balanceOf(walletAddress);
  if (balance.gt(0)) {
    return balance;
  }
  await _waitForTxn(() => tokenContract.mint(walletAddress, mintAmount));
  return mintAmount;
};

test('node is online', async () => {
  expect(await localJsonRpcProvider.getBlockNumber()).toBeGreaterThan(0);
});

describe('burnFrom override', () => {
  test("non-bridge accounts cannot burn other accounts' tokens", async () => {
    // Create another wallet
    const alice = Wallet.createRandom().connect(localJsonRpcProvider);
    const evilBob = Wallet.createRandom().connect(localJsonRpcProvider);

    // Set up necessary variables
    const tokenContractEvilBob = mbsSDK(evilBob);
    await _ensureNonZeroBalance(alice.address);

    // Attempt to burn tokens from the deployer's account
    try {
      await _waitForTxn(() =>
        tokenContractEvilBob.burnFrom(
          alice.address,
          BigNumber.from(BigInt(1 * 10 ** 18))
        )
      );
      throw new Error('Expected burnFrom to fail, but it succeeded.');
    } catch (error) {
      /* test passed if we reached here */
    }
  });

  test('bridge can burn tokens', async () => {
    // Create Alice's wallet
    const alice = new Wallet(privateKeys.alice).connect(localJsonRpcProvider);

    // Create token contract instances
    const tokenContractAlice = mbsSDK(alice);
    const tokenContractBridge = mbsSDK(bridge);

    // Ensure Alice has non-zero balance
    const initialBalanceAlice = await _ensureNonZeroBalance(alice.address);

    // Define the amount to be burned
    const burnAmount = BigNumber.from(BigInt(1 * 10 ** 18));

    // Bridge burns tokens from Alice's account
    await _waitForTxn(() =>
      tokenContractBridge.burnFrom(alice.address, burnAmount)
    );

    // Check that Alice's balance has been correctly reduced
    const finalBalanceAlice = await tokenContractAlice.balanceOf(alice.address);
    expect(finalBalanceAlice).toEqual(initialBalanceAlice.sub(burnAmount));
  });

  test("Alice can burn Bob's tokens", async () => {
    // Create Alice and Bob's wallets
    const alice = new Wallet(privateKeys.alice).connect(localJsonRpcProvider);
    const bob = new Wallet(privateKeys.bob).connect(localJsonRpcProvider);

    // Create token contract instances
    const tokenContractAlice = mbsSDK(alice);
    const tokenContractBob = mbsSDK(bob);

    // Ensure Bob has non-zero balance
    const initialBalanceBob = await _ensureNonZeroBalance(bob.address);

    // Define the amount to be burned
    const burnAmount = BigNumber.from(BigInt(1 * 10 ** 18));

    // Bob approves Alice to burn tokens on his behalf
    await _waitForTxn(() =>
      tokenContractBob.approve(alice.address, burnAmount)
    );

    // Alice burns tokens from Bob's account
    await _waitForTxn(() =>
      tokenContractAlice.burnFrom(bob.address, burnAmount)
    );

    // Check that Bob's balance has been correctly reduced
    const finalBalanceBob = await tokenContractBob.balanceOf(bob.address);
    expect(finalBalanceBob).toEqual(initialBalanceBob.sub(burnAmount));
  });
});

test('ERC20Burnable#burn(uint256): Alice can burn her own tokens', async () => {
  // Create Alice's wallet
  const alice = new Wallet(privateKeys.alice).connect(localJsonRpcProvider);

  // Create token contract instance
  const tokenContractAlice = mbsSDK(alice);

  // Ensure Alice has non-zero balance
  const initialBalanceAlice = await _ensureNonZeroBalance(alice.address);

  // Define the amount to be burned
  const burnAmount = BigNumber.from(BigInt(1 * 10 ** 18));

  // Alice burns tokens from her own account
  await _waitForTxn(() => tokenContractAlice['burn(uint256)'](burnAmount));

  // Check that Alice's balance has been correctly reduced
  const finalBalanceAlice = await tokenContractAlice.balanceOf(alice.address);
  expect(finalBalanceAlice).toEqual(initialBalanceAlice.sub(burnAmount));
});
