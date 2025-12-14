import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'server/index': 'src/server/index.ts',
    'client/index': 'src/client/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    'react',
    'react-dom',
    'lucide-react',
    '@nestjs/common',
    '@nestjs/config',
    '@nestjs/core',
    '@nestjs/bull',
    '@nestjs/typeorm',
    '@nestjs/swagger',
    'typeorm',
    'bull',
    'uuid',
    'class-validator',
    'class-transformer',
    '@storige/types',
  ],
});
