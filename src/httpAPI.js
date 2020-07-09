const Koa = require('koa')
  , Router = require('koa-router')
  , config = require('../config')
  , exec = require('util').promisify(require('child_process').exec)  
;

module.exports = function(Modems) {
  const app = new Koa();
  const router = new Router();
  router.get('/', async (ctx) => {
    const proxies = await Modems.getProxies();
    ctx.body = JSON.stringify(proxies);
  });
  router.get('/reconnect/:modem_id', async (ctx) => {
    if (ctx.params.modem_id == 'all') {
      const proxies = await Modems.getProxies();
      
      const reconnPromises = Object.keys(proxies).map((modemId) => {
        return Modems.reconnectModem(modemId);
      });
      const reconnectResults = await Promise.all(reconnPromises);
      
      const successes = [];
      const metas = [];
      for (let reconnectResult of reconnectResults) {
        successes.push(reconnectResult.val);
        metas.push(reconnectResult.meta);
      }

      ctx.body = JSON.stringify({success: successes, info: metas});
    } else {
      const result = await Modems.reconnectModem(ctx.params.modem_id);
      ctx.body = JSON.stringify({success: result.val, info: result.meta});
    }
  });


  app.use(router.routes()).use(router.allowedMethods());
  app.listen(config.http_api_port);

  console.log('');
  console.log(`HTTP API started. Available on http port: ${config.http_api_port}`);
  return app;
}