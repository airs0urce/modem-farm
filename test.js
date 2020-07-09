const os = require('os');

var interfaces = os.networkInterfaces();
for (var inter in interfaces) {
  var addresses = interfaces[inter];
  for (var i = 0; i < addresses.length; i++) {
    if ('IPv4' == addresses[i].family) {
      console.log(addresses[i].address);
    }
  }
}