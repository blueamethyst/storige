module.exports = {
  apps: [
    // ===========================================
    // API Server (NestJS)
    // ===========================================
    {
      name: 'storige-api',
      cwd: './apps/api',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        CORS_ORIGIN: 'http://bookmoa.noriter.co.kr:3000,http://bookmoa.noriter.co.kr:3001',
        API_KEYS: 'storige-internal-api-key-2024,bookmoa-api-key-2024',
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379',
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      merge_logs: true,
      time: true,
    },

    // ===========================================
    // Worker Server (NestJS - PDF Processing)
    // ===========================================
    {
      name: 'storige-worker',
      cwd: './apps/worker',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G', // Worker needs more memory for PDF processing
      env: {
        NODE_ENV: 'production',
        DATABASE_USER: 'gprinting_remote',
        DATABASE_PASSWORD: 'Gprinting2024',
        DATABASE_NAME: 'gprinting',
        DATABASE_HOST: '58.229.105.98',
        DATABASE_PORT: '3306',
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379',
        API_BASE_URL: 'http://localhost:4000/api',
        WORKER_API_KEY: 'storige-internal-api-key-2024',
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      merge_logs: true,
      time: true,
    },

    // ===========================================
    // Editor Frontend (Vite Static)
    // ===========================================
    {
      name: 'storige-editor',
      cwd: './apps/editor',
      script: 'npx',
      args: 'serve dist -l 3000 -s', // -s for SPA mode (rewrites to index.html)
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/editor-error.log',
      out_file: './logs/editor-out.log',
      merge_logs: true,
      time: true,
    },

    // ===========================================
    // Admin Frontend (Vite Static)
    // ===========================================
    {
      name: 'storige-admin',
      cwd: './apps/admin',
      script: 'npx',
      args: 'serve dist -l 3001 -s', // -s for SPA mode
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/admin-error.log',
      out_file: './logs/admin-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
