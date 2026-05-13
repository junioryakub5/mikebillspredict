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
    return [
      // Secret path → serves admin page without changing URL to /admin
      {
        source: "/portal",
        destination: "/admin",
      },
    ];
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
