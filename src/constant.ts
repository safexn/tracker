require('dotenv').config();

export const CHAIN_WS_URL = process.env.CHAIN_WS_URL || 'wss://rpc-testnet.safex.network';
export const MONITOR_URL = process.env.MONITOR_URL || 'http://127.0.0.1:8755';
export const SCANNER_KEY =
  process.env.SCANNER_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001';
export const SUBSCRIBE_KEY =
  process.env.SUBSCRIBE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001';

export const DELAY_BLOCKS = process.env.DELAY_BLOCKS || '0';
export const LATEST_BLOCK = process.env.LATEST_BLOCK || '0';
export const MODE = process.env.MODE || 'Full';

export const CustomType = {
      "CommitteeId": "u32",
      "BindingType": {
        "_enum": {
          "None": null,
          "Master": "CommitteeId",
          "Slave": "Vec<CommitteeId>"
        }
      }
}