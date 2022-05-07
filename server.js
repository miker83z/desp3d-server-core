const express = require('express');
const axios = require('axios').default;
const bodyParser = require('body-parser');
const cors = require('cors');
const { log, ExpressAPILogMiddleware } = require('@rama41222/node-logger');
const Web3 = require('web3');
const { publicKeyConvert } = require('secp256k1');

const NODE_PORT = process.env.NODE_PORT;
const AUTH_PORT = process.env.AUTH_PORT;
const AUTH_HOST = 'http://127.0.0.1';
const RPCNODE_PORT = process.env.RPCNODE_PORT;
const RPCNODE_HOST = 'http://127.0.0.1';

const config = {
  name: 'sample-express-app',
  port: NODE_PORT,
  host: '0.0.0.0',
};

const DataOwnerContractArt = require('./DataOwnerContract.json');
const provider = RPCNODE_HOST + ':' + RPCNODE_PORT;
const web3 = new Web3(provider);
const contract = new web3.eth.Contract(DataOwnerContractArt.abi);
const dataToSign = 'sign this pls';

const capsuleDB = {};
const kfragDB = {};
const cfragDB = {};

const app = express();
const logger = log({ console: true, file: false, label: config.name });

app.use(bodyParser.json());
app.use(cors());
app.use(ExpressAPILogMiddleware(logger, { request: false }));

app.post('/checkPermissions', async (req, res) => {
  try {
    contract.options.address = req.body.address;
    const resultWeb3 = await contract.methods
      .checkPermissions(req.body.account, web3.utils.utf8ToHex(req.body.dataId))
      .call();
    res.status(200).send({ success: true, result: resultWeb3 });
  } catch (error) {
    res.status(500).send({ success: false, result: error });
  }
});

app.post('/storeCapsule', async (req, res) => {
  try {
    if (capsuleDB[req.body.sender] === undefined) {
      capsuleDB[req.body.sender] = {};
    }
    capsuleDB[req.body.sender][req.body.dataId] = req.body.capsule;
    res.status(200).send({ success: true, result: true });
  } catch (error) {
    res.status(500).send({ success: false, result: error });
  }
});

app.post('/storeKFrag', async (req, res) => {
  try {
    if (kfragDB[req.body.sender] === undefined) {
      kfragDB[req.body.sender] = {};
    }
    kfragDB[req.body.sender][req.body.receiver] = req.body.kfrag;
    res.status(200).send({ success: true, result: true });
  } catch (error) {
    res.status(500).send({ success: false, result: error });
  }
});

app.post('/generateCFrag', async (req, res) => {
  try {
    if (
      capsuleDB[req.body.sender] === undefined ||
      capsuleDB[req.body.sender][req.body.dataId] === undefined
    ) {
      throw new Error('No capsule for this dataId');
    }
    if (
      kfragDB[req.body.sender] === undefined ||
      kfragDB[req.body.sender][req.body.receiver] === undefined
    ) {
      throw new Error('No kfrag for this receiver');
    }

    if (cfragDB[req.body.receiver] === undefined) {
      cfragDB[req.body.receiver] = {};
    }
    if (cfragDB[req.body.receiver][req.body.sender] === undefined) {
      cfragDB[req.body.receiver][req.body.sender] = {};
    }
    cfragDB[req.body.receiver][req.body.sender][req.body.dataId] = (
      await axios.post(AUTH_HOST + ':' + AUTH_PORT + '/stateless/reencrypt', {
        sender: req.body.sender,
        signer: req.body.signer,
        receiver: req.body.receiver,
        capsule: capsuleDB[req.body.sender][req.body.dataId],
        kfrag: kfragDB[req.body.sender][req.body.receiver],
      })
    ).data.cfrag;

    res.status(200).send({
      success: true,
      result: true,
    });
  } catch (error) {
    res.status(500).send({ success: false, result: error });
  }
});

app.post('/getCfrag', async (req, res) => {
  try {
    const { verified } = (
      await axios.post(AUTH_HOST + ':' + AUTH_PORT + '/stateless/verify', {
        signature: req.body.signature,
        data: dataToSign,
        pk: req.body.signer,
      })
    ).data;

    if (!verified) {
      throw new Error('Signature not verified');
    }

    const consumerPkCompactUint8 = new Uint8Array(req.body.signer);
    const consumerPkUint8 = publicKeyConvert(
      consumerPkCompactUint8,
      false
    ).slice(1);
    const consumerPkString =
      '0x' + Buffer.from(consumerPkUint8).toString('hex');
    const consumerPkStringHash = web3.utils.keccak256(consumerPkString);
    const consumerAddress = '0x' + consumerPkStringHash.slice(24 + 2);

    contract.options.address = req.body.address;
    const resultWeb3 = await contract.methods
      .checkPermissions(consumerAddress, web3.utils.utf8ToHex(req.body.dataId))
      .call();

    if (!resultWeb3) {
      throw new Error('Not in ACL');
    }

    if (
      cfragDB[req.body.receiver] === undefined ||
      cfragDB[req.body.receiver][req.body.sender] === undefined ||
      cfragDB[req.body.receiver][req.body.sender][req.body.dataId] === undefined
    ) {
      throw new Error('No cfrag for this receiver');
    }

    res.status(200).send({
      success: true,
      result: cfragDB[req.body.receiver][req.body.sender][req.body.dataId],
    });
  } catch (error) {
    res.status(500).send({ success: false, result: error });
  }
});

app.listen(config.port, config.host, (e) => {
  if (e) {
    throw new Error('Internal Server Error');
  }
  logger.info(`${config.name} running on ${config.host}:${config.port}`);
});
