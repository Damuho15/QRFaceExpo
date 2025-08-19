
module.exports = {
  apps: [
    {
      name: 'qr-expo-3002',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        // --- IMPORTANT ---
        // You MUST replace these placeholder values with your actual production values.
        // The URL should be the public-facing URL that your users will access.
        NEXT_PUBLIC_SUPABASE_URL: 'https://feastsgexpo.com/expoattendance',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'your-long-secure-random-string-for-anon-key',
        
        // The port your Next.js application will run on.
        // This should match the port you are proxying to in Nginx (e.g., 3002).
        PORT: 3002,
      },
    },
  ],
};
