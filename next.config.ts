import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  async redirects() {
    return [
      {
        source: '/customers',
        destination: '/contracts',
        permanent: true,
      },
      {
        source: '/customers/:contractNo',
        destination: '/customers/:contractNo',
        permanent: false,
        has: [{ type: 'header', key: 'x-skip-redirect' }],
      },
    ];
  },
};

export default nextConfig;
