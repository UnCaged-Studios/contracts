import { expect, test, beforeAll } from '@jest/globals';
import { Wallet, BigNumber } from 'ethers';
import { parse as parseUUID, v4 as uuid } from 'uuid';
import { privateKeys, contracts } from '../anvil.json';
import {
  _ensureNonZeroBalance,
  _waitForTxn,
  localJsonRpcProvider,
  mbsSDK,
} from '../test-utils';

import { KaChingV1 } from '../../dist/cjs';

// wallets
const cashier = new Wallet(privateKeys.cashier, localJsonRpcProvider);
const customer = new Wallet(privateKeys.customer, localJsonRpcProvider);
const orderSigner = Wallet.createRandom(localJsonRpcProvider);

// SDKs under test
const sdk = KaChingV1.sdkFactory(contracts.kaChingCashRegister);
const cashierSdk = sdk.cashier(cashier);
const customerSdk = sdk.customer(customer);
const orderSignerSdk = sdk.orderSigner(orderSigner);
const readonlySdk = sdk.readonly(localJsonRpcProvider);

const _signOffChain = (order: KaChingV1.FullOrderStruct) =>
  orderSignerSdk.signOrder(order, { chainId: '31337' });

let _orders: Uint8Array[];

beforeAll(async () => {
  await _waitForTxn(() => cashierSdk.setOrderSigners([orderSigner.address]));
  _orders = [];
}, 30_000);

test('node is online', async () => {
  expect(await localJsonRpcProvider.getBlockNumber()).toBeGreaterThan(0);
});

test('order signers is set properly', async () => {
  expect(await cashierSdk.getOrderSigners()).toEqual([orderSigner.address]);
});

test('debit customer with erc20', async () => {
  const customer_b0 = await _ensureNonZeroBalance(customer.address);

  const amount = BigNumber.from(BigInt(3 * 10 ** 18));
  await _waitForTxn(() =>
    customerSdk.permitERC20(amount, '1h', {
      name: 'MBS',
      version: '1',
      chainId: '31337',
      verifyingContract: contracts.mbsOptimism,
    })
  );
  const id = parseUUID(uuid());
  const { order, serializedOrder } = readonlySdk.orders.debitCustomerWithERC20({
    id,
    customer: customer.address,
    amount,
    expiresIn: '1m',
  });
  const orderSignature = await _signOffChain(order);
  await _waitForTxn(() =>
    customerSdk.settleOrderPayment(serializedOrder, orderSignature)
  );
  const customer_b1 = await mbsSDK(localJsonRpcProvider).balanceOf(
    customer.address
  );
  expect(customer_b1.toBigInt()).toBe(customer_b0.sub(amount).toBigInt());
  _orders.push(id);
}, 30_000);

test('debit customer with erc20 and built-in permit', async () => {
  const customer_b0 = await _ensureNonZeroBalance(customer.address);
  const amount = BigNumber.from(BigInt(2 * 10 ** 18));
  const id = parseUUID(uuid());
  const { order, serializedOrder } = readonlySdk.orders.debitCustomerWithERC20({
    id,
    customer: customer.address,
    amount,
    expiresIn: '1m',
  });
  const orderSignature = await _signOffChain(order);
  await _waitForTxn(() =>
    customerSdk.settleOrderPaymentWithPermit(serializedOrder, orderSignature, {
      name: 'MBS',
      version: '1',
      chainId: '31337',
      verifyingContract: contracts.mbsOptimism,
    })
  );
  const customer_b1 = await mbsSDK(localJsonRpcProvider).balanceOf(
    customer.address
  );
  expect(customer_b1.toBigInt()).toBe(customer_b0.sub(amount).toBigInt());
  _orders.push(id);
}, 30_000);

test('credit customer with erc20', async () => {
  const cashRegister_b0 = await _ensureNonZeroBalance(
    contracts.kaChingCashRegister
  );

  const mbs = mbsSDK(localJsonRpcProvider);
  const customer_b0 = await mbs.balanceOf(customer.address);
  expect(cashRegister_b0.toBigInt()).toBeGreaterThan(BigInt(0));

  const amount = cashRegister_b0;
  const id = parseUUID(uuid());
  const { order, serializedOrder } = readonlySdk.orders.creditCustomerWithERC20(
    {
      id,
      amount,
      customer: customer.address,
      expiresIn: '30s',
    }
  );
  const orderSignature = await _signOffChain(order);
  await _waitForTxn(() =>
    customerSdk.settleOrderPayment(serializedOrder, orderSignature)
  );
  const customer_b1 = await mbs.balanceOf(customer.address);
  expect(customer_b1.toBigInt()).toBe(customer_b0.add(amount).toBigInt());
  _orders.push(id);
}, 30_000);

test('OrderFullySettled event', async () => {
  const [allEvents, byOrderId_1, byCustomer] = await Promise.all([
    readonlySdk.events.OrderFullySettled.findAll(),
    readonlySdk.events.OrderFullySettled.findByOrderId(_orders[1]),
    readonlySdk.events.OrderFullySettled.findByCustomer(customer.address),
  ]);
  const isOrderProcessed: boolean[] = await Promise.all(
    _orders.map((id) => readonlySdk.state.isOrderProcessed(id))
  );
  expect(isOrderProcessed.every((pred) => pred)).toBe(true);
  expect(allEvents.length).toBe(3);
  expect(byCustomer.length).toBe(3);
  expect(byOrderId_1.length).toBe(1);
}, 30_000);
