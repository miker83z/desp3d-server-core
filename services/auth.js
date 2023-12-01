const axios = require('axios').default;
const Web3 = require('web3');
const { publicKeyConvert } = require('secp256k1');
const HDWalletProvider = require('@truffle/hdwallet-provider');
require('dotenv').config();

const AUTH_PORT = process.env.AUTH_PORT;
const AUTH_HOST = 'http://localhost';
const RPCNODE_PORT = process.env.RPCNODE_PORT;
const RPCNODE_HOST = 'http://localhost';

const DataOwnerContractArt = require('./DataOwnerContract.json');

let provider = RPCNODE_HOST + ':' + RPCNODE_PORT;

const phrase = process.env.IOTA_WASP_MNEMONIC;
const url = process.env.IOTA_WASP_URL;
const chain = process.env.IOTA_WASP_CHAIN;
const providerOrUrl = `${url}/wasp/api/v1/chains/${chain}/evm`;

provider = new HDWalletProvider({
  mnemonic: {
    phrase,
  },
  providerOrUrl,
});

const web3 = new Web3(provider);
const contract = new web3.eth.Contract(DataOwnerContractArt.abi);
const dataToSign = 'sign this pls';

const capsuleDB = {};
const kfragDB = {};
const cfragDB = {};

async function checkPermissions(address, account, dataId) {
  contract.options.address = address;
  return await contract.methods
    .checkPermissions(account, web3.utils.utf8ToHex(dataId))
    .call();
}

function storeCapsule(sender, capsule, dataId) {
  if (capsuleDB[sender] === undefined) {
    capsuleDB[sender] = {};
  }
  capsuleDB[sender][dataId] = capsule;
}

function storeKFrag(sender, receiver, kfrag) {
  if (kfragDB[sender] === undefined) {
    kfragDB[sender] = {};
  }
  kfragDB[sender][receiver] = kfrag;
}

async function generateCFrag(sender, signer, receiver, dataId) {
  if (
    capsuleDB[sender] === undefined ||
    capsuleDB[sender][dataId] === undefined
  ) {
    throw new Error('No capsule for this dataId');
  }
  if (
    kfragDB[sender] === undefined ||
    kfragDB[sender][receiver] === undefined
  ) {
    throw new Error('No kfrag for this receiver');
  }

  if (cfragDB[receiver] === undefined) {
    cfragDB[receiver] = {};
  }
  if (cfragDB[receiver][sender] === undefined) {
    cfragDB[receiver][sender] = {};
  }
  cfragDB[receiver][sender][dataId] = (
    await axios.post(AUTH_HOST + ':' + AUTH_PORT + '/stateless/reencrypt', {
      sender: sender,
      signer: signer,
      receiver: receiver,
      capsule: capsuleDB[sender][dataId],
      kfrag: kfragDB[sender][receiver],
    })
  ).data.cfrag;
}

async function getCfrag(sender, signer, receiver, signature, address, dataId) {
  const { verified } = (
    await axios.post(AUTH_HOST + ':' + AUTH_PORT + '/stateless/verify', {
      signature,
      data: dataToSign,
      pk: signer,
    })
  ).data;

  if (!verified) {
    throw new Error('Signature not verified');
  }

  const consumerPkCompactUint8 = new Uint8Array(signer);
  const consumerPkUint8 = publicKeyConvert(consumerPkCompactUint8, false).slice(
    1
  );
  const consumerPkString = '0x' + Buffer.from(consumerPkUint8).toString('hex');
  const consumerPkStringHash = web3.utils.keccak256(consumerPkString);
  const consumerAddress = '0x' + consumerPkStringHash.slice(24 + 2);

  contract.options.address = address;
  const resultWeb3 = await contract.methods
    .checkPermissions(consumerAddress, web3.utils.utf8ToHex(dataId))
    .call();

  if (!resultWeb3) {
    throw new Error('Not in ACL');
  }

  if (
    cfragDB[receiver] === undefined ||
    cfragDB[receiver][sender] === undefined ||
    cfragDB[receiver][sender][dataId] === undefined
  ) {
    throw new Error('No cfrag for this receiver');
  }
  return cfragDB[receiver][sender][dataId];
}

module.exports = {
  checkPermissions,
  storeCapsule,
  storeKFrag,
  generateCFrag,
  getCfrag,
};
