const utils = require('./utils')
  , a = require('awaiting')
  , config = require('./../config')
;

const log = true;

module.exports = class NetworkHelper {
  static async waitPingOnline(linuxNetworkNamespace, tries = 50) {
    await a.delay(500);
    let result = false;
    while (tries-- > 0) {
      const res = await utils.exec(`ip netns exec ${linuxNetworkNamespace} ping -q -c 1 8.8.8.8`);
      if (! res.err) {
        if (log) console.log(linuxNetworkNamespace + ': SUCCESS ping');
        result = true;
        break;
      }
      if (log) console.log(linuxNetworkNamespace + `: ERROR ping. It's ok, let's try more`);
      await a.delay(2000);
    }
    return result;
  }
}