import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const output = join(root, ".fork-packages")
const version = "0.4.0-koffi.2.16.3.1"
const sources = {
  core: "sha512-vPXBPsfo/mG/WajLHZcgc93Lac8MYOTJt70C75+uHTVuYm2Koe8497B5mBZq8hRvHjrNPgLHlyk8ur+t6jhs6g==",
  react: "sha512-GYEWhESvAw6Nw8HWoIfsFgjx9Jlhb7a2FwrdoB64S2R4wdzPKR08PLL7igbl8E49fgie1U9mJ+ognkfCE6QzWw==",
}

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", windowsHide: true })
  assert.equal(result.status, 0, result.stderr || result.stdout || result.error?.message)
  return result.stdout
}

function npm(args, cwd = root) {
  return process.platform === "win32"
    ? run(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `npm ${args.join(" ")}`], cwd)
    : run("npm", args, cwd)
}

function rewriteReact(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) rewriteReact(path)
    else if (/\.(?:js|ts|map)$/.test(entry.name)) {
      const source = readFileSync(path, "utf8")
      const rewritten = source.replaceAll("@jitl/opentui-core", "@opentui/core")
      if (source !== rewritten) writeFileSync(path, rewritten)
    }
  }
}

mkdirSync(output, { recursive: true })
const checksums = []
for (const [name, integrity] of Object.entries(sources)) {
  const directory = join(output, name)
  mkdirSync(directory, { recursive: true })
  const [source] = JSON.parse(npm(["pack", `@jitl/opentui-${name}@0.4.0`, "--ignore-scripts", "--json"], directory))
  const archive = join(directory, source.filename)
  const digest = createHash("sha512").update(readFileSync(archive)).digest("base64")
  assert.equal(`sha512-${digest}`, integrity, `Unexpected upstream ${name} archive`)
  const packageDirectory = join(directory, "package")
  rmSync(packageDirectory, { recursive: true, force: true })
  run("tar", ["-xzf", archive, "-C", directory])
  const manifestPath = join(packageDirectory, "package.json")
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
  manifest.name = `@opentui/${name}`
  manifest.version = version
  manifest.repository.url = "https://github.com/shazhou-ww/opentui"
  if (name === "core") {
    manifest.optionalDependencies.koffi = "2.16.3"
  } else {
    delete manifest.dependencies["@jitl/opentui-core"]
    manifest.peerDependencies["@opentui/core"] = version
    rewriteReact(packageDirectory)
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  const [packed] = JSON.parse(npm(["pack", "--ignore-scripts", "--json"], packageDirectory))
  const bytes = readFileSync(join(packageDirectory, packed.filename))
  writeFileSync(join(output, packed.filename), bytes)
  checksums.push(`${createHash("sha256").update(bytes).digest("hex")}  ${packed.filename}`)
  console.log(`${packed.filename} ${packed.integrity}`)
}
writeFileSync(join(output, "SHA256SUMS"), `${checksums.join("\n")}\n`)
