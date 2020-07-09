const utils = require('../utils')
  , Result = require('../Result')
  , a = require('awaiting')
  , NetworkHelper = require('../NetworkHelper')
;

module.exports = class ZTE {
  
  // restarts modem if this is ZTE modem
  static async tryReconnect(linuxNetworkNamespace) {

    try {
      let response;
      let curlRequestString;

      //
      // Check if this is huawei modem
      //
      response = (await utils.exec(`ip netns exec ${linuxNetworkNamespace} curl --include  --connect-timeout 2 --max-time 5  http://192.168.0.1/index.html`)).out;
      if (response.includes('Connection timed out')) {
        return new Result(false, 'Connection to 192.168.0.1 timed out. Looks like there is no LTE modem.');
      }
      if (! response.toLowerCase().includes('zte corporation') 
        && ! response.toLowerCase().includes('ztedevice.com')
        && ! response.toLowerCase().includes('logo_zte.png')
      ) {
        return new Result(false, 'Index page on http://192.168.0.1/index.html returned content without any of these strings: "zte corporation", "ztedevice.com", "logo_zte.png". Looks like there is no LTE modem.' + response);
      }

      //
      // Disconnect modem
      //
      curlRequestString = `curl -X "POST" "http://192.168.0.1/goform/goform_set_cmd_process" \
     -H 'Referer: http://192.168.0.1/index.html' \
     -H 'Content-Type: application/x-www-form-urlencoded; charset=utf-8' \
     --data-urlencode "isTest=false" \
     --data-urlencode "notCallback=true" \
     --data-urlencode "goformId=DISCONNECT_NETWORK"`;

      await a.delay(200);
      response = (await utils.exec(`ip netns exec ${linuxNetworkNamespace} ${curlRequestString}`)).out;

      if (! response.includes('"success"')) {
        return new Result(false, `Can't disconnect LTE modem. [RESPONSE]: ${response}`);
      }
      
      //
      // Set modem mode to "3g only"
      //
      curlRequestString = `curl -X "POST" "http://192.168.0.1/goform/goform_set_cmd_process" \
     -H 'Referer: http://192.168.0.1/index.html' \
     -H 'Content-Type: application/x-www-form-urlencoded; charset=utf-8' \
     --data-urlencode "isTest=false" \
     --data-urlencode "goformId=SET_BEARER_PREFERENCE" \
     --data-urlencode "BearerPreference=Only_WCDMA"`;
      
      await a.delay(300);
      response = (await utils.exec(`ip netns exec ${linuxNetworkNamespace} ${curlRequestString}`)).out;
      

      if (! response.includes('"success"')) {
        return new Result(false, `Can't set ZTE modem to "3g only" mode. [RESPONSE]: ${response}`);
      }

      //
      // Set modem mode to "auto"
      //
      curlRequestString = `curl -X "POST" "http://192.168.0.1/goform/goform_set_cmd_process" \
     -H 'Referer: http://192.168.0.1/index.html' \
     -H 'Content-Type: application/x-www-form-urlencoded; charset=utf-8' \
     --data-urlencode "isTest=false" \
     --data-urlencode "goformId=SET_BEARER_PREFERENCE" \
     --data-urlencode "BearerPreference=NETWORK_auto"`;
      
      await a.delay(100);
      response = (await utils.exec(`ip netns exec ${linuxNetworkNamespace} ${curlRequestString}`)).out;
      

      if (! response.includes('"success"')) {
        return new Result(false, `Can't set ZTE modem to "auto" mode. [RESPONSE]: ${response}`);
      }

      //
      // Connect ZTE modem
      //
      curlRequestString = `curl -X "POST" "http://192.168.0.1/goform/goform_set_cmd_process" \
     -H 'Referer: http://192.168.0.1/index.html' \
     -H 'Content-Type: application/x-www-form-urlencoded; charset=utf-8' \
     --data-urlencode "isTest=false" \
     --data-urlencode "notCallback=true" \
     --data-urlencode "goformId=CONNECT_NETWORK"`;
      
      await a.delay(300);
      response = (await utils.exec(`ip netns exec ${linuxNetworkNamespace} ${curlRequestString}`)).out;
      
      if (! response.includes('"success"')) {
        return new Result(false, `Can't connect ZTE modem. [RESPONSE]: ${response}`);
      }

      // Wait until we really connected to internet
      const isConnected = await NetworkHelper.waitPingOnline(linuxNetworkNamespace);
      if (! isConnected) {
        return new Result(false, `Modem is not becoming online after reconnection`);
      }

      return new Result(true, `Reconnected`);
    } catch (e) {
      const err = e.stack ? JSON.stringify(e.stack): e.toString();
      return new Result(false, 'Exception: ' + err);
    }
  }

}

