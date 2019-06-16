
const os = require('os')
  , exec = require('util').promisify(require('child_process').exec)
  , _ = require('lodash')
  , config = require('../config')
;

module.exports = class Modems {
  
  #log = true

  async setup() {
    await this._deleteAllNamespaces();
    const ifaces = await this._getModemInterfaces();
    const namespaces = await this._createNetworkNamespaces(ifaces);
    return namespaces;
  }

  async _getModemInterfaces() {
    if (this.#log) console.log('--- Getting network interfaces ---');

    const res = await exec('ls /sys/class/net');
    
    let modemInterfaces = [];

    switch (config.interfaces_filter.selector_type) {
      case 'exclude':
        const netInterfaces = res.stdout.trim().split('\n');
        modemInterfaces = _.difference(netInterfaces, config.interfaces_filter.interfaces);
        break;
      case 'include':
        modemInterfaces = config.interfaces_filter.interfaces;
        break;
      default:
        throw Error('Wrong value in config key "interfaces_filter.selector_type"');
        break;
    }

    if (this.#log) console.log('Modem network interfaces: ', modemInterfaces);

    return modemInterfaces;
  }

  async _deleteAllNamespaces() {
    // delete old namespaces
    const netnsListRes = (await exec('ip netns list')).stdout.trim();   
    
    if (this.#log) console.log('--- Deleting namespaces... ---');
    if (this.#log) console.log('Namespaces found:', netnsListRes);

    if (netnsListRes.length > 0) {
      const netNamespaces = netnsListRes.split('\n');

      for (let netNamespace of netNamespaces) {
        const res = await exec(`sudo ip netns exec ${netNamespace} ls /sys/class/net`);
        const netInterfaces = res.stdout.trim().split('\n');

        if (this.#log) console.log(`Namespace ${netNamespace} interfaces:`, netInterfaces);

        for (let netInterface of netInterfaces) {
          if ('lo' != netInterface) { 
            if (this.#log) console.log(`Namespace ${netNamespace}, delete interface:`, netInterface);
            exec(`ip netns exec ${netNamespace} ip link set ${netInterface} netns 1`);
          }
        }
        if (this.#log) console.log(`Namespace ${netNamespace} delete:`, netNamespace);
        await exec(`ip netns delete ${netNamespace}`);
      }
    }
  }

  async _createNetworkNamespaces(interfaces = []) {
    if (this.#log) console.log(`--- Creating network namespaces for each modem ---`);    
    // create namespaces
    const namespaceNameTpl = 'MODEM_{N}';
    const namespaces = [];
    for (let [index, iface] of interfaces.entries()) {
      const namespaceName = namespaceNameTpl.replace('{N}', index + 1);
      await exec(`ip netns add ${namespaceName}`);
      await exec(`ip link set dev ${iface} netns ${namespaceName}`);
      await exec(`ip netns exec ${namespaceName} ip link set ${iface} up`);
      await exec(`ip netns exec ${namespaceName} dhclient`);
      namespaces.push(namespaceName);

      if (this.#log) console.log(`Interface ${iface} added to network namespace ${namespaceName}`);    
    }

    return namespaces;
  }
}

