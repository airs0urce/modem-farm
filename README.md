Modems farm. Makes it possible to get many IP addresses from 3G/LTE providers to prevent blocking while scrapping data or doing any other activity which requires changing of your IP address. It automatically handles many LTE modems with same MAC Address by runnning each modem inside own Linux Network Namespace.

Note:
I don't plan to prepare full docs for this project as it was written for myself and actually I don't want spending time preparing instructions and making it ready for everybody. Also I can't garanty that it still works, as I was running it last time one year ago and just now decided to put it on github to make sure I don't lose this code in future. If something doesn't work or works not how it was described in this doc - you have to read code yourself and check it as I wrote this Readme based on what I remember after one year passed.

Note 2: When I was using it, I remember I had issue when I connected more than 5 (as I remember) modems to RPI. Not sure why. Probably on other hardware it will work fine. Just wanted to let you know that you better to start trying from 3-5 modems and later connect more.

How it works:

Note: it works only on linux.
You connect many LTE modems to computer (I used Raspberry PI with Raspbian OS, didn't test other linuxes) using USB hub with external power (because RPI will not give you enough current to power many modems).
I added support of Huawei E3372h and ZTE (don't remember the model now) LTE modems because those are modems I planned to use.

Also check out config.js, you can set interfaces of LTE modems, http port for API, ports for socks proxy and service to use to check if modem is online after reconnection.

Run:

```
$ node bin/start_farm
```

After http API started you will see message in terminal:
```
HTTP API started. Available on http port: 80
```

The API will give you list of socks proxies that you can use to make requests from certain modem and also ability to reconnect modem to get new IP address.
Request/response examples:
```
API available on port 80 by default, you can make requests to you RPI:

Get list of modems:

GET /
  {
      MODEM_1:{
        modem_id: 'MODEM_1',
        status: 'connected',
        interface: '<network_interface>',
        detectedExternalIp: '103.7.39.62',
        socks_proxy_port: 1100,
      },
      MODEM_2: {
        modem_id: 'MODEM_2',
        status: 'connecting...',
        interface: '<network_interface>',
        detectedExternalIp: '',
        socks_proxy_port: 1101,
      },
  }

To connect via certain modem use socks server on port from: "socks_proxy_port".
For example, I used socks servers to feed them to Puppeteer.
If you need new IP address - reconnect modem:

POST /reconnect/MODEM_1
  success response:
  {
    success: true,
    old_ip: '171.255.143.78',
    new_ip: '171.255.146.23',
  }
  
  error response:
  {
    success: false,
    error: 'Error message'
  }

```
