import axios from 'axios';
import * as bs58 from 'bs58';
import { decrypt } from '../base';
import { getOrCreateAssociatedTokenAccount, createTransferCheckedInstruction } from '@solana/spl-token';
import { Keypair, Transaction, Connection, PublicKey, clusterApiUrl, SystemProgram, LAMPORTS_PER_SOL, Cluster } from '@solana/web3.js';

let param: any;
let URL: any;
let connection: any;
let PRIVKEY: any;
let txWallet: any;

try {
    param = 'mainnet-beta';
    URL = clusterApiUrl(param);
    connection = new Connection(clusterApiUrl(param));
    // PRIVKEY = decrypt(process.env.S_W_PRIVATE_ADDRESS as string);
    // txWallet = Keypair.fromSecretKey(bs58.decode(PRIVKEY));
} catch (error) {
    console.log('Solana web3 error =>', error);
}

export const getTxnSolana = async (signature: string) => {
    const res = await axios(URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        data: {
            jsonrpc: '2.0',
            id: 'get-transaction',
            method: 'getTransaction',
            params: [signature]
        }
    });
    return res;
};

export const getSOLbalance = async (walletAddress: string, currency: any) => {
    // const ownerPubkey = new PublicKey(walletAddress);
    // let tokenBalance: any;
    // try {
    //     if (currency.symbol === 'SOL') {
    //         tokenBalance = (await connection.getBalance(ownerPubkey)) / LAMPORTS_PER_SOL;
    //     } else {
    //         const mintPubkey = new PublicKey(currency.contractAddress);
    //         const ownerTokenAccount: any = await getOrCreateAssociatedTokenAccount(connection, txWallet, mintPubkey, ownerPubkey);
    //         const tokenAccountBalance: any = await connection.getTokenAccountBalance(ownerTokenAccount.address);
    //         tokenBalance = tokenAccountBalance.value.amount / 10 ** tokenAccountBalance.value.decimals;
    //     }
    // } catch (error) {
    //     tokenBalance = 0;
    // }
    // return tokenBalance;
};
