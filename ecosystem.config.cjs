module.exports = {
  apps: [{
    name: 'larosa',
    cwd: './server',
    script: 'src/index.js',
    node_args: '--no-warnings',
    env: { PORT: 3000, NODE_ENV: 'production' },
    max_memory_restart: '300M',
  }],
};
