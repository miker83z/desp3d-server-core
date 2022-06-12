const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { log, ExpressAPILogMiddleware } = require('@rama41222/node-logger');

const authRouter = require('./routes/auth');

const NODE_PORT = process.env.NODE_PORT;

const config = {
  name: 'sample-express-app',
  port: NODE_PORT,
  host: '0.0.0.0',
};

const app = express();
const logger = log({ console: true, file: false, label: config.name });

app.use(bodyParser.json());
app.use(cors());
app.use(ExpressAPILogMiddleware(logger, { request: false }));

app.use('/auth', authRouter);

/* Error handler middleware */
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error(err.message, err.stack);
  res.status(statusCode).json({ success: false, message: err.message });
  return;
});

app.listen(config.port, config.host, (e) => {
  /*if (e) {
    throw new Error('Internal Server Error');
  }*/
  logger.info(`${config.name} running on ${config.host}:${config.port}`);
});
