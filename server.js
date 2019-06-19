#!/usr/bin/env node

const commandExists = require('command-exists')
  , Modems = require('./src/Modems')
  , httpApi = require('./src/httpApi')

;

const modems = new Modems();
let server;

(async function() {
  if (process.geteuid() !== 0) {
    throw Error('You must run this script from root user. This is required to manage Linux Network Namespaces');
  }
  if (! await commandExists('socat')) {
    throw Error('Please make sure "socat" installed in your system');
  }
  if (! await commandExists('3proxy')) {
    throw Error('Please make sure "3proxy" installed in your system (https://github.com/z3APA3A/3proxy)');
  }

  // sudo socat tcp-listen:8080,fork,reuseaddr exec:'ip netns exec MODEM_1 socat STDIO tcp-connect\:127.0.0.1\:8080',nofork



  server = httpApi(modems);
})();


let shuttingDown = false;
async function gracefulShutdown() {
  if (shuttingDown) {
    return;
  }
  console.log('shutting down');
  shuttingDown = true;
  if (server) {
    server.close();
  }
  await modems.deleteAllNamespaces();
}

process.on('SIGINT', async () => {
  await gracefulShutdown();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await gracefulShutdown();
  process.exit(0);
});








