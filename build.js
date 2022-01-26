import { build } from 'esbuild'

const watch = process.argv.includes('-w') || process.argv.includes('--watch')

const options = {
  entryPoints: ['./src/index.ts'],
  outdir: './lib',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: ['es2020', 'node16'],
  external: [
    'yargs',
    'rimraf',
    'shelljs',
    'tar',
  ],
  watch: !watch ? undefined : { 
    onRebuild(error, result) {
      if (error) console.error('watch build failed:', error)
      else console.log('watch build succeeded:', result)
    }
  }
}

build(options).catch(() => process.exit(1))

// esbuild src/index.ts --platform=node --format=esm --target=es2020,node14 --external:./node_modules/* --bundle --outdir=lib