
const os = require('os')
  , child_process = require('child_process')
  , util = require('util'),
  , _ = require('lodash')
  , config = require('../config')
;

const exec = util.promisify(child_process.exec);
const spawn = child_process.spawn;

module.exports = class Modems {
  
  #log = true
  #proxies = []

  async initModems() {
    // delete networks namespaces and create again
    await this.deleteAllNamespaces();
    const ifaces = await this.getModemInterfaces();
    const namespaces = await this.createNetworkNamespaces(ifaces);

    if (this.#log) console.log('Created namespaces: ', namespaces);

    for (let namespace of namespaces) {
      if (this.#log) process.stdout.write(`Testing namespace ${namespace}... `);
      const res = await exec(`ip netns exec ${namespace} curl ipecho.net/plain`);
      if (this.#log) console.log(`Success, IP: `, res.stdout);
    }

    // start proxy servers
    this.startProxyServers();
  }

  async getModemInterfaces() {
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

  async getNetworkNamespaces() {
    const netnsListRes = (await exec('ip netns list')).stdout.trim();
    let netNamespaces = netnsListRes.split('\n');
    for (let i = 0; i < netNamespaces.length; i++) {
      netNamespaces[i] = netNamespaces[i].split(' ')[0];
    }
    netNamespaces = netNamespaces.filter((ns) => {
      return (ns != '');
    });
    return netNamespaces;
  }

  async deleteAllNamespaces() {
    // delete old namespaces
    const netNamespaces = await this.getNetworkNamespaces();
    
    if (this.#log) console.log('--- Deleting namespaces... ---');
    if (this.#log) console.log('Namespaces found:', netNamespaces);

    if (netNamespaces.length > 0) {
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

  async createNetworkNamespaces(interfaces = []) {
    if (this.#log) console.log(`--- Creating network namespaces for each modem ---`);    
    // create namespaces
    const namespaceNameTpl = 'MODEM_{N}';
    const namespaces = [];
    for (let [index, iface] of interfaces.entries()) {
      const namespaceName = namespaceNameTpl.replace('{N}', index + 1);
      await exec(`ip netns add ${namespaceName}`);
      await exec(`ip netns exec ${namespaceName} ifconfig lo up`);
      await exec(`ip link set dev ${iface} netns ${namespaceName}`);
      await exec(`ip netns exec ${namespaceName} ip link set ${iface} up`);
      await exec(`ip netns exec ${namespaceName} dhclient`);
      
      namespaces.push(namespaceName);

      if (this.#log) console.log(`Interface ${iface} added to network namespace ${namespaceName}`);    
    }

    return namespaces;
  }

  async startProxyServers() {
    const netNamespaces = await this.getNetworkNamespaces();
    if (this.#log) console.log(`--- Starting proxy servers for namespaces: ${netNamespaces.join(', ')} ---`);
    for (let netNamespace of netNamespaces) {

      // run socks proxy
      let externalIP;

      // forward port from default network namespace to {netNamespace} namespace



      netNamespace

      await exec(`ip netns exec ${namespaceName} 3proxy & `);
    }
  }

}






