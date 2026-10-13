import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
      allowedOrigins: [
        'tcl.goalcryst.co.in',
        'tcl.goalcryst.co.in.',
        'tcl-api.goalcryst.co.in',
        'tcl-api.goalcryst.co.in.',
        'goalcryst.co.in',
        'goalcryst.co.in.',
        '*.goalcryst.co.in',
        'localhost:3001',
        '127.0.0.1:3001'
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
