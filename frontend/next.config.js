/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async rewrites() {
    const rules = [
      // Secret path → serves admin page without exposing /admin in URL
      {
        source: "/portal",
        destination: "/admin",
      },
    ];

    // In production (Vercel), proxy /api/* to the backend server.
    // Set BACKEND_URL in Vercel → Project Settings → Environment Variables
    // e.g. https://your-backend.railway.app
    if (process.env.BACKEND_URL) {
      rules.push({
        source: "/api/:path*",
        destination: `${process.env.BACKEND_URL}/api/:path*`,
      });
    }

    return rules;
  },
  async redirects() {
    return [
      // Block direct access to /admin — redirect to home
      {
        source: "/admin",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
