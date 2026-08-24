import { readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

import YAML from 'yaml'

function option(name) {
  const argument = process.argv.find((value) => value.startsWith(`${name}=`))
  if (!argument) throw new Error(`missing ${name}=... argument`)
  return argument.slice(name.length + 1)
}

export function mergeMacUpdateInfos(x64Info, arm64Info) {
  if (x64Info.version !== arm64Info.version) {
    throw new Error(`macOS metadata versions differ: x64=${x64Info.version} arm64=${arm64Info.version}`)
  }

  const files = [...(x64Info.files ?? []), ...(arm64Info.files ?? [])]
  const uniqueFiles = [...new Map(files.map((file) => [file.url, file])).values()]
  const x64Zip = uniqueFiles.find((file) => file.url.includes('-x64.') && file.url.endsWith('.zip'))
  const arm64Zip = uniqueFiles.find((file) => file.url.includes('-arm64.') && file.url.endsWith('.zip'))
  if (!x64Zip || !arm64Zip) {
    throw new Error('latest-mac metadata must contain both x64 and arm64 ZIP files')
  }

  return {
    ...x64Info,
    files: uniqueFiles,
    path: x64Zip.url,
    sha512: x64Zip.sha512,
  }
}

async function main() {
  const x64Path = option('--x64')
  const arm64Path = option('--arm64')
  const outputPath = option('--output')
  const [x64Info, arm64Info] = await Promise.all([
    readFile(x64Path, 'utf8').then(YAML.parse),
    readFile(arm64Path, 'utf8').then(YAML.parse),
  ])
  const merged = mergeMacUpdateInfos(x64Info, arm64Info)
  await writeFile(outputPath, YAML.stringify(merged))
  console.log(`merged macOS ${merged.version} update metadata: ${merged.files.map((file) => file.url).join(', ')}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main()
