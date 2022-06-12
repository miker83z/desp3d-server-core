const express = require('express');
const {
  checkPermissions,
  storeCapsule,
  storeKFrag,
  generateCFrag,
  getCfrag,
} = require('../services/auth');
const router = express.Router();

router.post('/checkPermissions', async (req, res, next) => {
  try {
    res.status(200).send({
      success: true,
      result: await checkPermissions(
        req.body.address,
        req.body.account,
        req.body.dataId
      ),
    });
  } catch (error) {
    console.error(`Error while checking permissions`, err.message);
    next(error);
    //res.status(500).send({ success: false, result: error });
  }
});

router.post('/storeCapsule', async (req, res, next) => {
  try {
    storeCapsule(req.body.sender, req.body.capsule, req.body.dataId);
    res.status(200).send({ success: true, result: true });
  } catch (error) {
    console.error(`Error while storing capsules `, err.message);
    next(error);
    //res.status(500).send({ success: false, result: error });
  }
});

router.post('/storeKFrag', async (req, res, next) => {
  try {
    storeKFrag(req.body.sender, req.body.receiver, req.body.kfrag);
    res.status(200).send({ success: true, result: true });
  } catch (error) {
    console.error(`Error while storing kfrags `, err.message);
    next(error);
    //res.status(500).send({ success: false, result: error });
  }
});

router.post('/generateCFrag', async (req, res, next) => {
  try {
    await generateCFrag(
      req.body.sender,
      req.body.signer,
      req.body.receiver,
      req.body.dataId
    );
    res.status(200).send({
      success: true,
      result: true,
    });
  } catch (error) {
    console.error(`Error while generating cfrags `, err.message);
    next(error);
    //res.status(500).send({ success: false, result: error });
  }
});

router.post('/getCfrag', async (req, res, next) => {
  try {
    res.status(200).send({
      success: true,
      result: await getCfrag(
        req.body.sender,
        req.body.signer,
        req.body.receiver,
        req.body.signature,
        req.body.address,
        req.body.dataId
      ),
    });
  } catch (error) {
    console.error(`Error while getting cfrags `, err.message);
    next(error);
    //res.status(500).send({ success: false, result: error });
  }
});

module.exports = router;
