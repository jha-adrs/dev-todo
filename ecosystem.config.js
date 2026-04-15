// PM2 process config for DevTodo production.
// Used on the VPS: `pm2 startOrReload ecosystem.config.js`
//
// .env is loaded via Node's native --env-file flag (Node 20.6+).

module.exports = {
  apps: [
    {
      name: "devtodo",
      cwd: __dirname,
      script: "server/dist/index.js",
      node_args: "--env-file=.env",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
      },
      time: true,
      merge_logs: true,
    },
  ],
};
