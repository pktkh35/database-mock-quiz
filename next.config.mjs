/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Monaco throws "InstantiationService has been disposed" under StrictMode double-mount in dev
  serverExternalPackages: ["sql.js"],
  outputFileTracingIncludes: {
    "/api/*": ["./node_modules/sql.js/dist/sql-wasm.wasm", "./src/data/datasets/*.sql", "./src/data/expected.json"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
