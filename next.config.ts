import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
      allowedOrigins: [
        'goalcryst.co.in',
        'goalcryst.co.in.',
        'api.goalcryst.co.in',
        'api.goalcryst.co.in.'
      ]
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
