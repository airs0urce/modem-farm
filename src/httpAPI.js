const Koa = require('koa')
  , Router = require('koa-router')
  , config = require('./config')
  , exec = require('util').promisify(require('child_process').exec)  
;

module.exports = function(modems) {
  const app = new Koa();
  const router = new Router();
  app.post('/init_modems', async (ctx, next) => {
    await modems.initModems();
    // ctx.body = user;
  });
  app.get('/info', async (ctx, next) => {
    //     const ipByNamespace = {};
    //     const namespaces = await modems.getNetworkNamespaces();
    //     for (let namespace of namespaces) {
    //       const res = await exec(`sudo ip netns exec ${namespace} curl ipecho.net/plain`);
    //       ipByNamespace[namespace] = res.stdout;
    //     }
    //     console.log(JSON.stringify(ipByNamespace));
  });
  app.post('/new_ip/:modem_id', async (ctx, next) => {
    // ctx.params.modem_id

  });


  app.use(router.routes()).use(router.allowedMethods());
  app.listen(config.http_api_port);
  return app;
}