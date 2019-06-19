
POST /init_modems
  {
    success: true,  
  }

GET /info
  {
    success: true,
    modems: {
      MODEM_1:{
        modem_mac: 'ac:de:48:00:11:22',
        external_ip: '103.7.39.62',
        socks_proxy_port: 1080,
      },
      MODEM_2: {
        modem_mac: 'ee:ef:48:00:11:33',
        external_ip: '171.255.138.131',
        socks_proxy_port: 1081,
      },
      MODEM_3: {
        modem_mac: 'сс:de:48:00:11:32',
        external_ip: '171.255.146.23',
        socks_proxy_port: 1082,
      }
    },
  }


POST /new_ip/MODEM_1
  {
    success: true,
    old_ip: '171.255.143.78',
    new_ip: '171.255.146.23',
  }
  {
    success: false,
    error: 'Error message'
  }


