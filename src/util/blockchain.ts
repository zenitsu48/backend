// Require Dependencies
import { JsonRpc } from 'eosjs';
import fetch from 'node-fetch';
import { httpProviderApi } from '../config';
const rpc = new JsonRpc(httpProviderApi, { fetch });

// Grab EOS block with id
export const getPublicSeed = async (): Promise<string> => {
  try {
    const info = await rpc.get_info();
    const blockNumber = info.last_irreversible_block_num + 1;
    const block = await rpc.get_block(blockNumber || 1);
    return block.id;
  } catch (error) {
    // console.log(error);
    return '';
  }
};
