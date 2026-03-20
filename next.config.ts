import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Analiza estos paquetes y solo incluye los módulos realmente usados,
    // reduciendo el bundle size sin ningún cambio en el código de la app.
    optimizePackageImports: [
      "date-fns",
      "lucide-react",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
      "sonner",
    ],
  },
  // React Compiler — requiere babel-plugin-react-compiler instalado.
  // Habilitar cuando se agregue: npm install -D babel-plugin-react-compiler
  // reactCompiler: true,
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
