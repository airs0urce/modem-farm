Note:
I don't plan to prepare full docs for this project as it was written for myself and actually I don't want spending time preparing instructions and making it ready for everybody. Also I can't garanty that it still works, as I was running it last time one year ago and just now decided to put it on github to make sure I don't lose this code in future. If something doesn't work or work not how it was described in this doc - you have to read code yourself and check it as I wrote this Readme based on what I remember after one year passed.


How it works:

You connect many LTE modems to Raspberry PI using USB hub with external power (because RPI will not give you enough current to power many modems).
I added support of Huawei E3372h and ZTE (don't remember the model now) LTE modems because those are modems I planned to use.
Then you install Raspbian OS (now it's called "Raspberry Pi OS", but I didn't test my project on it) and run:

```
$ node bin/start_farm
```

After http API started you will see message in terminal:
```
HTTP API started. Available on http port: 80
```


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

To connect via certain modem use socks server on port from: "socks_proxy_port"
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
