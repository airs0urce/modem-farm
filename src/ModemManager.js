const Result = require('./Result')
  , Huawei = require('./ModemManager/Huawei')
  , ZTE = require('./ModemManager/ZTE')
;


module.exports = class ModemManager {
  static async tryReconnect(linuxNetworkNamespace) {

    const resultHuawei = await Huawei.tryReconnect(linuxNetworkNamespace);
    if (resultHuawei.val) {
      return new Result(true, 'Successfully reconnected Huawei modem');
    }
    const resultZTE = await ZTE.tryReconnect(linuxNetworkNamespace);
    if (resultZTE.val) {
      return new Result(true, 'Successfully reconnected ZTE modem');
    }

    return new Result(false, `[Huawei modem]: ${resultHuawei.meta}, ` + "\n\n" + `[ZTE modem]: ${resultZTE.meta}`);
  }
}