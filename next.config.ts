import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Fixa a raiz do Turbopack no diretório deste config. Sem isso, o Next 16
  // infere a raiz do workspace a partir de lockfiles e pode escolher errado
  // (há um package-lock.json órfão fora do projeto além do pnpm-workspace.yaml),
  // o que afeta o file tracing do `next build`.
  turbopack: {
    root: import.meta.dirname,
  },
  // Cache persistente do Turbopack em `.next/dev/cache/turbopack` cresce sem
  // limite e, em filesystem lento (ex.: drive D:), pode deixar o dev preso em
  // "Compiling..." com CPU alta mesmo sem requests.
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
}

export default nextConfig
