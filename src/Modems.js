
const os = require('os')
  , util = require('util')
  , _ = require('lodash')
  , config = require('../config')
  , child_process = require('child_process')
  , [exec, spawn] = [util.promisify(child_process.exec), child_process.spawn]
  , fs = require('mz/fs')
  , a = require('awaiting')
  , ModemManager = require('./ModemManager')
  , Result = require('./Result')
  , NetworkHelper = require('./NetworkHelper')
  , utils = require('./utils')  
  , isIp = require('is-ip')
  , commandExists = require('command-exists')
;

const log = true
let proxies = {}

class Modems {

  static async modemProxiesUp() {
    if (process.geteuid() !== 0) {
      throw Error('You must run this script from root user. This is required to manage Linux Network Namespaces');
    }
    if (! await commandExists('socat')) {
      throw Error('Please make sure "socat" installed in your system');
    }
    if (! await commandExists('3proxy')) {
      throw Error('Please make sure "3proxy" installed in your system (https://github.com/z3APA3A/3proxy)');
    }
    if (! await commandExists('curl')) {
      throw Error('Please make sure "curl" installed in your system');
    }

    // let's disable proxies first
    await this.modemProxiesDown();
    
    const interfaces = await this._getModemInterfaces();
    if (interfaces.length == 0) {
      throw Error('No network interfaces found. Check "interfaces_filter" parameter in config.js');
    }
    
    let proxyPort = config.socks_proxies.start_port;
    
    for (let [index, iface] of interfaces.entries()) {

      //
      // create network namespace
      //
      const namespaceName = 'MODEM_{N}'.replace('{N}', iface.toUpperCase());
      await exec(`ip netns add ${namespaceName}`);
      await exec(`ip netns exec ${namespaceName} ifconfig lo up`);
      await exec(`ip link set dev ${iface} netns ${namespaceName}`);
      await exec(`ip netns exec ${namespaceName} ip link set ${iface} up`);
      await exec(`ip netns exec ${namespaceName} dhclient`);
      
      if (log) console.log('--');
      if (log) console.log(`${namespaceName} up: Interface ${iface} added to network namespace`);    

      //
      // start proxy server and add port-forwarding
      //

      // start 3proxy
      if (log) console.log(`${namespaceName} up: start 3proxy`);
      
      let template3ProxyConfig = await fs.readFile(`${__dirname}/../files/3proxy_config_tpl`, {'encoding': 'utf8'});
      template3ProxyConfig = template3ProxyConfig.replace('{SOCKS_PORT}', proxyPort);
      const proxyConfigPath = `${__dirname}/../tmp/3proxy_config_port_${proxyPort}`;
      await fs.writeFile(proxyConfigPath, template3ProxyConfig);

      const process3Proxy = spawn(`ip`, [`netns`, `exec`, `${namespaceName}`, `3proxy`, proxyConfigPath]);
      await a.delay(100);
      await fs.unlink(proxyConfigPath);
      
      // forward port from default network namespace to {namespaceName} namespace
      if (log) console.log(`${namespaceName} up: start socat`);
      const processSocat = spawn(`socat`, [`tcp-listen:${proxyPort},fork,reuseaddr`, `exec:'ip netns exec ${namespaceName} socat STDIO tcp-connect\:127.0.0.1\:${proxyPort}',nofork`]);

      //
      // Wait until modem really goes online
      //
      if (log) console.log(`${namespaceName} up: wait until we online (using ping)`);
      await NetworkHelper.waitPingOnline(namespaceName);

      //
      // Get external IP
      //
      if (log) process.stdout.write(`${namespaceName} up: getting external IP: `);
      let externalIP = await this._getIp(namespaceName);
      if (log) console.log(externalIP);
      

      //
      //  Add proxy info to object
      //
      proxies[namespaceName] = {
        modem_id: namespaceName,
        status: 'connected',
        interface: iface,
        detectedExternalIp: externalIP,
        socks_proxy_port: proxyPort,
        processes: {
          proxy: process3Proxy,
          socat: processSocat
        },
      };

      // 
      // Check if we can get modem's IP. If we can't, probably there is issue with connection. We have to exclude modems like this from list
      //
      if (! isIp(externalIP)) {
        if (log) console.log(`${namespaceName} up: ERROR GETTING EXTERNAL IP, MODEM WILL NOT BE USED. External IP returned: "${externalIP}"`);
        await this.modemProxiesDown(namespaceName);
      }

      proxyPort++;
    }
    
  }

  static async modemProxiesDown(onlyNetNamespace = null) {
    
    for (let netNamespace in proxies) {
      
      if (onlyNetNamespace && onlyNetNamespace !== netNamespace) {
        continue;
      }

      const proxy = proxies[netNamespace];

      // Stop "socat" and "3proxy"
      if (log) console.log(`${netNamespace} down: Kill "socat" and "3proxy for namespace`);
      proxy.processes.socat.kill();
      proxy.processes.proxy.kill();

      // Delete network namespace
      if (log) console.log(`${netNamespace} down: Delete network namespace`);
      const res = await exec(`sudo ip netns exec ${netNamespace} ls /sys/class/net`);
      const netInterfaces = res.stdout.trim().split('\n');
      if (log) console.log(`${netNamespace} down: Namespace interfaces to remove:`, netInterfaces);
      for (let netInterface of netInterfaces) {
        if ('lo' != netInterface) { 
          if (log) console.log(`${netNamespace} down: Delete interface:`, netInterface);
          exec(`ip netns exec ${netNamespace} ip link set ${netInterface} netns 1`); // move interface outside of namespace
        }
      }
      if (log) console.log(`${netNamespace} down: delete namespace`);
      await exec(`ip netns delete ${netNamespace}`);

      // delete proxy from list
      delete proxies[netNamespace];
    }
  }

  static getProxies() {
    const userProxies = {};
    for (let namespaceId in proxies) {
      userProxies[namespaceId] = Object.assign({}, proxies[namespaceId]);
      delete userProxies[namespaceId].processes;
    }
    return userProxies;
  }  

  static async reconnectModem(linuxNetworkNamespace) {
    try {
      if (typeof proxies[linuxNetworkNamespace] == 'undefined') {
        const err = `reconnectModem ${linuxNetworkNamespace} - ERROR:  namespace doesn't exist`;
        if (log) { 
          console.log(err);
        }
        throw Error(err)
      }
      
      proxies[linuxNetworkNamespace].status = 'reconnecting...';
      proxies[linuxNetworkNamespace].detectedExternalIp = '';
      const reconnectResult = await ModemManager.tryReconnect(linuxNetworkNamespace);

      if (reconnectResult.val) {
        const externalIP = await this._getIp(linuxNetworkNamespace);
        proxies[linuxNetworkNamespace].status = 'connected';
        proxies[linuxNetworkNamespace].detectedExternalIp = externalIP;

        if (log) console.log(`${linuxNetworkNamespace} reconnected`);

        return new Result(true, `successfully reconnected modem, new IP: ${externalIP}`);
      } else {
        proxies[linuxNetworkNamespace].status = 'No Network. May be you should top up sim card balance?';
        proxies[linuxNetworkNamespace].detectedExternalIp = '';
        return new Result(false, `can't reconnect modem, new IP: ${reconnectResult.meta}`);
      }
    } catch (e) {
      const err = e.stack ? JSON.stringify(e.stack): e.toString();
      return new Result(false, 'Exception: ' + err);
    }
    
  }  

  static async _getIp(linuxNetworkNamespace) {
    let externalIP = (await utils.exec(`ip netns exec ${linuxNetworkNamespace} curl --connect-timeout 10 --max-time 10 ${config.ip_address_api.primary}`)).out.trim();
    if (! isIp(externalIP)) {
      externalIP = (await utils.exec(`ip netns exec ${linuxNetworkNamespace} curl --connect-timeout 10 --max-time 10 ${config.ip_address_api.secondary}`)).out.trim();
    }
    if (! isIp(externalIP)) {
      if (log) console.log(`${linuxNetworkNamespace} (_getIp) something wrong, can't get IP address`);
    }
    return externalIP;
  }

  static async _getModemInterfaces() {
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

    if (log) console.log('Modem network interfaces: ', modemInterfaces);

    return modemInterfaces;
  }


}


module.exports = Modems;



