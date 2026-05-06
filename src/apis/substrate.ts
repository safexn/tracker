// @ts-nocheck

import { ApiPromise, WsProvider } from '@polkadot/api';
import { CustomType, CHAIN_WS_URL } from '../constant';
import { KeyringPair } from '@polkadot/keyring/types';
import { createTestKeyring } from '@polkadot/keyring';
import { hexToU8a } from '@polkadot/util';

let api: any = undefined;

interface NonceState {
  nextNonce?: number;
  initPromise?: Promise<void>;
}

const nonceStates: Map<string, NonceState> = new Map();

const getAddress = (keyPair: KeyringPair): string => {
  return keyPair.address;
};

const ensureNonceState = (address: string): NonceState => {
  let state = nonceStates.get(address);
  if (state == undefined) {
    state = {};
    nonceStates.set(address, state);
  }
  return state;
};

const refreshLocalNonce = async (api: ApiPromise, keyPair: KeyringPair): Promise<void> => {
  const address = getAddress(keyPair);
  const state = ensureNonceState(address);
  const chainNonce = await api.rpc.system.accountNextIndex(address);
  state.nextNonce = chainNonce.toNumber();
};

const allocateLocalNonce = async (api: ApiPromise, keyPair: KeyringPair): Promise<number> => {
  const address = getAddress(keyPair);
  const state = ensureNonceState(address);

  if (state.nextNonce == undefined) {
    if (state.initPromise == undefined) {
      state.initPromise = refreshLocalNonce(api, keyPair).finally(() => {
        state.initPromise = undefined;
      });
    }
    await state.initPromise;
  }

  const nonce = state.nextNonce!;
  state.nextNonce = nonce + 1;
  return nonce;
};

const isRetryableNonceError = (err: any): boolean => {
  const message = `${err}`;
  return (
    message.includes('Priority is too low')
  );
};

export const getDefaultApi = async (): Promise<ApiPromise> => {
  if (api == undefined) {
    const wsProvider = new WsProvider(CHAIN_WS_URL);
    const options = {
      types: CustomType,
      provider: wsProvider
    };
    api = await ApiPromise.create(options);
  }
  return api;
};

export const toKeyPair = (privateKey: string): KeyringPair => {
  const keyring = createTestKeyring();
  const keyPair = keyring.addFromSeed(hexToU8a(privateKey), undefined, 'ethereum');
  return keyPair;
};

export const isDroppedTransaction = async (
  api: ApiPromise,
  cid: number,
  hash: string
): Promise<boolean> => {
  let tx: any = await api.query.channel.txMessages(cid, hash);
  // Drop type is 3
  return tx.status.toNumber() === 3;
};

export const triggerAndWatch = async (
  api: ApiPromise,
  keyPair: KeyringPair,
  cid: number,
  hash: string
): Promise<string> => {
  let doWithListener = async (seed: any, call: any, nonce: number) => {
    return new Promise(function (resolve, reject) {
      let unsub: any = undefined;
      let done = false;
      const finish = (cb: any, withError?: any) => {
        if (done) {
          return;
        }
        done = true;
        if (unsub != undefined) {
          try {
            unsub();
          } catch (_e) {
            // noop
          }
        }
        if (withError != undefined) {
          reject(withError);
          return;
        }

        let result = '';
        cb.events.forEach(({ phase, event: { data, method, section } }: any) => {
          result += '\t' + phase.toString() + `: ${section}.${method}` + data.toString();
        });
        resolve(result);
      };

      call
        .signAndSend(seed, { nonce }, (cb: any) => {
          if (cb.isError) {
            finish(cb, new Error(`submit failed for nonce ${nonce}`));
            return;
          }

          if (cb.dispatchError) {
            finish(cb, new Error(cb.dispatchError.toString()));
            return;
          }

          if (cb.status.isInBlock || cb.status.isFinalized) {
            finish(cb);
          }
        })
        .then((u: any) => {
          unsub = u;
        })
        .catch((err: any) => {
          finish(undefined, err);
        });
    });
  };

  let latestErr: any = undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const nonce = await allocateLocalNonce(api, keyPair);
      let call = api.tx.channel.requestSign(cid, hash);
      let result = await doWithListener(keyPair, call, nonce);
      return result;
    } catch (err) {
      latestErr = err;
      if (!isRetryableNonceError(err)) {
        break;
      }
      await refreshLocalNonce(api, keyPair);
    }
  }

  throw latestErr;
};
