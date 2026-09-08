/**
 * ecosystem.config.cjs — Production Process Management Configuration (PM2)
 * SIGMA Rubber Nursery PWA & Process Mapping Portal
 */

module.exports = {
  apps: [
    {
      name: 'sigma-nursery',
      script: 'server.js',
      instances: 1, // Single instance to preserve in-process mutex write-lock for file store
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000
      }
    }
  ]
};
