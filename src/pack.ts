import { homedir } from 'node:os'
import fs from 'node:fs/promises'
import path from 'node:path'

// import { createReadStream } from 'node:fs'
// import stream from 'node:stream/promises'
// import { createGunzip } from 'node:zlib'

import rimraf from 'rimraf'
import tar from 'tar'
import shell from 'shelljs'

import { exit } from './exit.js'

type Options = {
  packageDirectory: string
  outputDirectory: string
  platform: string
  dockerFile: string
  useNpm: string
  verbose: boolean
  dontEmitVersion: boolean
  outputPath: boolean
}

export async function pack(options: Options)
{
  if (options.useNpm && options.dockerFile) {
    throw new Error('Conflicting options')
  }  

  const packageJsonPath = path.resolve(options.packageDirectory, 'package.json')
  let { name: packageName } = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'))
  packageName = packageName.startsWith('@') ? packageName.substring(1).replace(/\//,'-') : packageName

  const outputFolderPath = path.resolve(options.outputDirectory)
  const currentWorkingDirectory = path.resolve(options.packageDirectory)

  const defaultDockerFile = `../content/Dockerfile-${options.useNpm ? 'npm' : 'pnpm'}`
  const dockerFilePath =  path.resolve(dirname(import.meta), options.dockerFile ?? defaultDockerFile)

  if (!options.dockerFile) {
    const requiredLockFiles = {
      'npm': 'package-lock.json',
      'pnpm': 'pnpm-lock.yaml'
    }

    const requiredLockFileName = requiredLockFiles[options.useNpm ? 'npm' : 'pnpm']
    const packageLockFilePath = path.resolve(currentWorkingDirectory, requiredLockFileName)
    
    try {
      await fs.access(packageLockFilePath)
    } catch (error) {
      return exit(1, `The Dockerfile at ${dockerFilePath} requires a ${requiredLockFileName} file at ${currentWorkingDirectory}`)
    }
  }

  rimraf.sync(outputFolderPath)
  await fs.mkdir(outputFolderPath)

  const { stdout } = shell.exec(`npm pack . --json --pack-destination=${outputFolderPath}`, { silent: true })
  const [ primaryPackFileInfo ] = JSON.parse(stdout)

  const primaryPackFilePath = path.resolve(outputFolderPath, primaryPackFileInfo.filename)

  rimraf.sync(outputFolderPath)
  await fs.mkdir(outputFolderPath)

  const npmRcFilePath = path.resolve(homedir(), '.npmrc')
  const keyFilePath = path.resolve(homedir(), '.ssh', 'id_rsa')
  
  // process.env.DOCKER_BUILDKIT='1'
  // https://github.com/moby/buildkit#local-directory
  const output = shell.exec(
    `DOCKER_BUILDKIT=1 docker build --ssh default=${keyFilePath} ${currentWorkingDirectory} -f ${dockerFilePath} --platform ${options.platform} -t secure-app-secrets --secret id=npm,src=${npmRcFilePath} --output type=local,dest=${outputFolderPath}`,
    {
      silent: options.verbose !== true,
    })

  if (output.code !== 0) {
    console.error('Error running Docker command. Is Docker running ?', output.stderr)
    return exit(2, 'Trouble connecting to Docker');
  }

  const nodeModulesTarPath = path.relative(currentWorkingDirectory, path.resolve(outputFolderPath, 'node_modules.tar'))

  const filesToIncludeFromNpmPackFile = primaryPackFileInfo.files.map((f: { path: string }) => path.resolve(f.path)).map((absolutePath: string) => path.relative(currentWorkingDirectory, absolutePath))

  const version = options.dontEmitVersion === true ? '' : `-${primaryPackFileInfo.version}`
  const outputFilePath = path.resolve(outputFolderPath, `${packageName}${version}.tgz`)
  
  const fullOutputDirectoryPath = path.dirname(outputFilePath)
  await fs.mkdir(fullOutputDirectoryPath, { recursive: true }) 

  tar.c({
    file: outputFilePath,
    gzip: true,
    strict: true,
    sync: true,
  }, [
    ...filesToIncludeFromNpmPackFile,
    `@${nodeModulesTarPath}`,
  ])

  await fs.unlink(nodeModulesTarPath)
  await sleep(500)

  if (options.outputPath) {
    console.log(outputFilePath)
  }

  return 0
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

// async function copyTarInto(inputFilePath: string, targetTar: any, { filter = [] } = {}) {
//   return new Promise<void>((resolve, reject) => {
//     const tgzFileStream = createReadStream(inputFilePath)

//     const extract = tar.extract()
  
//     extract.on('entry', (header: any, entryStream: any, next: any) => {
//       console.log(header.name)

//       const modifiedHeader: any = { ...header, name: header.name.replace(/^package\//,'') }

//       if (filter.includes(modifiedHeader.name)) {
//         entryStream.on('end', () => next())
//         entryStream.resume()
//       } else {
//         const newEntry = targetTar.entry(modifiedHeader, (err: any) => {
//           if (err) {
//             console.error('failed', err)
//             reject(err)
//           } else {
//             next()
//           }
//         })
//         stream.pipeline(entryStream, newEntry)
//       }
//     })

//     extract.on('finish', () => {
//       resolve()
//     })
  
//     stream.pipeline(tgzFileStream, createGunzip(), extract)
//   })
// }

export function dirname(importMeta: ImportMeta) {
  const directoryPath = path.dirname(decodeURI(new URL(importMeta.url).pathname))
  return path.resolve((process.platform == "win32") ? directoryPath.substring(1) : directoryPath)
}
