const utils = require('../utils')
  , Result = require('../Result')
  , a = require('awaiting')
  , NetworkHelper = require('../NetworkHelper')
;


module.exports = class Huawei {

  // restarts modem if this is Huawei modem
  static async tryReconnect(linuxNetworkNamespace) {

    try {
      let response;

      //
      // Check if this is huawei modem
      //   
      response = (await utils.exec(`ip netns exec ${linuxNetworkNamespace} curl --include  --connect-timeout 2 --max-time 5  http://192.168.8.1/config/global/config.xml`)).out;
      if (response.includes('Connection timed out')) {
        return new Result(false, 'Connection to 192.168.8.1 timed out. Looks like there is no Huawei modem.');
      }
      if (! response.toLowerCase().includes('hilink')) {
        return new Result(false, 'Index page on http://192.168.8.1/config/global/config.xml returned content without "hilink" word. Looks like there is no Huawei modem.' + response);
      }
      
      //
      // get session cookie and csrf token
      //
      let csrfToken;
      let sessionCookieValue;   

      const initResponse = (await utils.exec(`ip netns exec ${linuxNetworkNamespace} curl --include -s -S --connect-timeout 2 --max-time 5  http://192.168.8.1/html/home.html`)).out;
      sessionCookieValue = initResponse.match(/SessionID=(.+?);/i)[1].trim();
      csrfToken = initResponse.match(/name="csrf_token"\scontent="(.+?)"/i)[1].trim();

      let curlRequestString;  
      //
      // Set modem mode to 3g and later set to "auto" to force reconnect
      //
      curlRequestString = `curl --include --connect-timeout 5 --max-time 20 -H 'Cookie: SessionID=${sessionCookieValue}' \
      -H 'Origin: http://192.168.8.1' \
      -H 'Accept-Language: en-US,en;q=0.9,vi;q=0.8,ru;q=0.7' \
      -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.109 Safari/537.36' \
      -H 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8' \
      -H 'Accept: */*' \
      -H 'Referer: http://192.168.8.1/html/mobilenetworksettings.html' \
      -H 'X-Requested-With: XMLHttpRequest' \
      -H '__requestverificationtoken: ${csrfToken}' \
      -H 'Host: 192.168.8.1' \
      --data-binary '<?xml version="1.0" encoding="UTF-8"?><request><NetworkMode>02</NetworkMode><NetworkBand>3FFFFFFF</NetworkBand><LTEBand>7FFFFFFFFFFFFFFF</LTEBand></request>' \
      --compressed 'http://192.168.8.1/api/net/net-mode'`;
    
      await a.delay(100);
      response = (await utils.exec(`ip netns exec ${linuxNetworkNamespace} ${curlRequestString}`)).out;

      if (! response.includes('<response>OK</response>')) {
        return new Result(false, `Can't set huawei modem to 2G mode. [REQUEST]: ${curlRequestString} [RESPONSE]: ${response} [INIT_REQUEST]: ${initResponse}`);
      }
      csrfToken = response.match(/__RequestVerificationToken:(.+?)\s/i)[1].trim();  
      //
      // Set modem mode to "auto"
      //
      curlRequestString = `curl --include --connect-timeout 5 --max-time 20 -H 'Cookie: SessionID=${sessionCookieValue}' \
      -H 'Origin: http://192.168.8.1' \
      -H 'Accept-Language: en-US,en;q=0.9,vi;q=0.8,ru;q=0.7' \
      -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.109 Safari/537.36' \
      -H 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8' \
      -H 'Accept: */*' \
      -H 'Referer: http://192.168.8.1/html/mobilenetworksettings.html' \
      -H 'X-Requested-With: XMLHttpRequest' \
      -H '__requestverificationtoken: ${csrfToken}' \
      -H 'Host: 192.168.8.1' \
      --data-binary '<?xml version="1.0" encoding="UTF-8"?><request><NetworkMode>00</NetworkMode><NetworkBand>3FFFFFFF</NetworkBand><LTEBand>7FFFFFFFFFFFFFFF</LTEBand></request>' \
      --compressed 'http://192.168.8.1/api/net/net-mode'`;

      await a.delay(100);
      response = (await utils.exec(`ip netns exec ${linuxNetworkNamespace} ${curlRequestString}`)).out;

      if (! response.includes('<response>OK</response>')) {
        return new Result(false, `Can't set huawei modem to "auto" mode. [RESPONSE]: ${response}  [REQUEST]: ${curlRequestString}`);
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


