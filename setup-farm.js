#!/usr/bin/env node

const Modems = require('./src/Modems')
  
;

(async function() {
  if (process.geteuid() !== 0) {
    throw Error('You must run this script from root user. This is required to manage Linux Network Namespaces');
  }

  const modems = new Modems();
  const namespaces = await modems.setup();
  console.log('Created namespaces: ', namespaces);

})().catch((e) => {
  console.log(e);
});

