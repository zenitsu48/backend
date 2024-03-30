
const Web3 = require('web3');

export const EthereumWeb3 = new Web3(process.env.E_WEB3_URL as string);

export const ArbitrumWeb3 = new Web3(process.env.A_WEB3_URL as string);

export const BscWeb3 = new Web3(process.env.B_WEB3_URL as string);

export const AvaxWeb3 = new Web3(process.env.V_WEB3_URL as string);

export const PolygonWeb3 = new Web3(process.env.P_WEB3_URL as string);

export const PuppyWeb3 = new Web3(process.env.PU_WEB3_URL as string);

