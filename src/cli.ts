import yargs from 'yargs'
import { pack } from './pack.js'

const args = yargs(process.argv.slice(2))

export function run() {
  const argv = args
    .scriptName('aeppic-pack')
    .command('*', 'Package a module including production dependencies. Note: Uses Docker and injects local user SSH and NPM credentials, so the Dockerfile must be trusted', packArguments as any, pack as any)
    .help()
    .argv
}

function packArguments(yargs: typeof args) {
  yargs
    .positional('packageDirectory', {
      alias: ['path'],
      type: 'string',
      default: process.cwd(),
    })
    .option('outputDirectory', {
      type: 'string',
      default: 'release',
    })
    .option('output-path', {
      alias: 'o',
      type: 'boolean',
      description: 'Emit the full path the the generated package file as output after build'
    })
    .option('dont-emit-version', {
      type: 'boolean',
      description: 'Do not include the version number of the package in the release file'
    })
    .option('use-npm', {
      type: 'boolean',
      description: 'By default we expect a pnpm-lock.yaml which gives more reliable builds, but in case of npm this option supports npm lockfiles',
    })
    .option('dockerFile', {
      type: 'string',
      description: 'Override the Dockerfile to be used. The paths inside the Dockerfile need to be relative to `packageDirectory`',
      conflicts: ['use-npm'],
    })
    .option('platform', {
      type: 'string',
      default: 'linux/amd64',
    })
    .option('verbose', {
      alias: ['v'],
      description: 'Output docker stdout/stderr',
      type: 'boolean',
      default: false,
    })
    .option('dockerEngine', {
      type: 'string',
      default: 'docker',
      description: 'Override the docker engine to be used',
      describe: 'e.g. use Podman to package: `--docker-engine=podman`',
    })

  return yargs
}

