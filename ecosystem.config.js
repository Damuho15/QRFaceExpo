
module.exports = {
  apps: [
    {
      name: 'qr-expo-3002',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        // The port your Next.js application will run on.
        // This should match the port you are proxying to in Nginx (e.g., 3002).
        PORT: 3002,
      },
    },
  ],
};
