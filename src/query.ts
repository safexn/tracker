import { ApiPromise } from '@polkadot/api';
import { CommitteeId, toUncheckParam, UncheckParams } from './types';
import { hexToU8a } from '@polkadot/util';
import { HexString } from '@polkadot/util/types';

export const queryUncheckParams = async (
  api: ApiPromise,
  cid: number,
  hash: HexString
): Promise<UncheckParams> => {
  const tx: any = await api.query.channel.txMessages(cid, hash);
  let slave_sigs: Array<Array<number>> = [];
  const bindingType: any = await api.query.channel.committeeBindingInfo(cid);
  if (bindingType.isSlave) {
    const slaveIds = bindingType.asSlave.map((id: CommitteeId) => id);
    for (const id of slaveIds) {
      let slave_tx: any = await api.query.channel.slaveMessages(id, hash);
      slave_sigs.push(Array.from(slave_tx.signature));
    }
  }
  const params = toUncheckParam(tx, hexToU8a(hash), slave_sigs);
  return params;
};
