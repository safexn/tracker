import { getDefaultApi, toKeyPair, postUncheckTransaction } from './apis';
import { hexToU8a } from '@polkadot/util';
import { spawn, Thread, Worker } from 'threads';
import { ScanTask, toUncheckParam } from './types';
import { server } from './server';
import { MONITOR_URL, SCANNER_KEY, SUBSCRIBE_KEY, CHAIN_WS_URL, MODE } from './constant';
import { CommitteeId } from './types';

const test = async () => {
  let api = await getDefaultApi();
  let cid = 10;
  let hash = '0x06e215575dcccdeae13e3d79b52285f642559bcd846a8b0007b3ddd0bbe1efd2';
  let hashU8 = hexToU8a(hash);
  let tx: any = await api.query.channel.txMessages(cid, hashU8);
  console.log(JSON.stringify(tx));

  let slave_sigs: Array<Array<number>> = new Array();
  let bindingType: any = await api.query.channel.committeeBindingInfo(cid);
  // Handle the BindingType enum
  if (bindingType.isSlave) {
    const slaveIds = bindingType.asSlave.map((id: CommitteeId) => id);
    for (const id of slaveIds) {
      let slave_tx: any = await api.query.channel.slaveMessages(id, hashU8);
      slave_sigs.push(Array.from(slave_tx.signature));
    }
  }
  let params = toUncheckParam(tx, hashU8, slave_sigs);
  console.log(JSON.stringify(params));
  let result = await postUncheckTransaction(params);
  console.log(result);
};

const showConfig = () => {
  let subscribeAccount = toKeyPair(SUBSCRIBE_KEY);
  let scannerAccount = toKeyPair(SCANNER_KEY);
  console.log(
    `CHAIN_WS_URL: ${CHAIN_WS_URL} \n MONITOR_URL: ${MONITOR_URL} \n SCANNER: ${scannerAccount.address} \n SUBSCRIBER: ${subscribeAccount.address}`
  );
};

let main = async () => {
  server();
  showConfig();
  // test();
  // subscribe thread
  if (MODE !== 'Aider') {
    const subscribe = await spawn(new Worker('./workers/subscribe'));
    await subscribe();
    console.log('finished subscribe');
    await Thread.terminate(subscribe);
    console.log('terminate subscribe');
  }
};

main().catch(console.error);
