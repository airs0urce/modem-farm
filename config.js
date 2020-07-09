module.exports = {
  interfaces_filter: {
    /* Here you specify what network interfaces you want to use for the farm. 
      For example, you use Raspberry Pi 3B and you have default network interfaces:

      lo - loopback
      eth0 - built-in ethernet adapter
      wlan0 - built-in  wi-fi

      Let's say you connected 3 LTE/3G USB modems and you got more interfaces like:
      eth1
      eth2
      eth3

      So, you know you want to use only those 3 new interfaces for your farm,
      so you can do config two ways and both will work:
      1) Set exclude filter:
        selector_type: 'exclude',
        interfaces: ['lo', 'eth0', 'wlan0']

        Only built-in interfaces will be ignored and all interfaces added by USB modems will be included.
      2) Set include filter
        selector_type: 'include',
        interfaces: ['eth1', 'eth2', 'eth3']

        Only these 3 interfaces will be included, all others will be ignored.

    */
    selector_type: 'exclude', // "exclude" or "include"
    interfaces: ['lo', 'eth0', 'wlan0'], // list of interfaces to include or exclude'
  },
  
  http_api_port: 80, // Port of HTTP API that you can use to manage farm
  socks_proxies: {
    start_port: 1100 // As we start one proxy server per network namespace (3g modem), we will start each proxy on different port. 
                     // This is initial port, then we increment it.
  },
  ip_address_api: {
    primary: 'http://ifconfig.co/ip', // this url will be used to get plain text with external IP address
    secondary: 'http://ipecho.net/plain', // this url will be used if primary address failed
    // https://ip.seeip.org/
  } 

}