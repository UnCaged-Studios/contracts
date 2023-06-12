import { Signer } from 'ethers';
import type { TypedDataSigner } from '@ethersproject/abstract-signer';

export type AdvancedSigner = Signer & TypedDataSigner;
