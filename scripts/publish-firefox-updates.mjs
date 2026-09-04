#!/usr/bin/env node
/**
 * Publish the AMO-signed Firefox XPI and the Firefox update manifest to R2.
 *
 * Requires (env):
 *   R2_ACCESS_KEY_ID       S3-compatible access key (R2 token, Object Read & Write)
 *   R2_SECRET_ACCESS_KEY   S3-compatible secret key
 *   R2_S3_ENDPOINT         e.g. https://<account_id>.r2.cloudflarestorage.com
 *   R2_BUCKET              e.g. belle-pku-assets
 *
 * Optional (env):
 *   R2_PUBLIC_BASE         default: https://belle-pku-assets.time.florist
 *   ADDON_ID               default: belle-pku-timetable@narixhine
 *
 * Behavior:
 *   - Locates the signed XPI in release-packages/ (version taken from package.json).
 *   - Downloads the live updates.json, validates strictly-increasing versions,
 *     appends the new entry with a sha256 update_hash, uploads XPI + manifest.
 *   - Never overwrites an existing XPI object; fails on version regression,
 *     hash error, or upload verification failure. Never logs secrets.
 */

import { createHash, createHmac } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const REQUIRED_ENV = ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_S3_ENDPOINT', 'R2_BUCKET']

const R2_PUBLIC_BASE = (process.env.R2_PUBLIC_BASE ?? 'https://belle-pku-assets.time.florist').replace(/\/$/, '')
const ADDON_ID = process.env.ADDON_ID ?? 'belle-pku-timetable@narixhine'
const MAX_ATTEMPTS = 4
const ATTEMPT_DELAY_MS = 3000

function fail(message) {
    console.error(`✖ ${message}`)
    process.exit(1)
}

async function retry(label, fn) {
    let lastError
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
            return await fn()
        } catch (error) {
            lastError = error
            console.warn(`  attempt ${attempt}/${MAX_ATTEMPTS} failed: ${error.message}`)
            if (attempt < MAX_ATTEMPTS) {
                await new Promise((resolve) => setTimeout(resolve, ATTEMPT_DELAY_MS * attempt))
            }
        }
    }
    fail(`${label} failed after ${MAX_ATTEMPTS} attempts: ${lastError.message}`)
}

function assertEnv() {
    const missing = REQUIRED_ENV.filter((key) => !process.env[key])
    if (missing.length > 0) {
        fail(`missing required environment variables: ${missing.join(', ')}`)
    }
    if (!/^https:\/\//.test(R2_PUBLIC_BASE)) {
        fail(`R2_PUBLIC_BASE must be https (got: ${R2_PUBLIC_BASE})`)
    }
}

/** AWS SigV4 for a single S3 PUT/GET against R2. */
async function s3Request(method, key, { body, contentType, devMode } = {}) {
    const endpoint = new URL(process.env.R2_S3_ENDPOINT)
    const accessKey = process.env.R2_ACCESS_KEY_ID
    const secretKey = process.env.R2_SECRET_ACCESS_KEY
    const bucket = process.env.R2_BUCKET
    const region = 'auto'

    const url = new URL(`/${bucket}/${key}`, endpoint)
    const now = new Date()
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
    const dateStamp = amzDate.slice(0, 8)
    const payloadHash = createHash('sha256').update(body ?? '').digest('hex')

    const headers = {
        host: url.host,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
    }
    if (contentType) {
        headers['content-type'] = contentType
    }
    // Dev-only escape hatch; production flow requires secrets.
    if (devMode && !accessKey && !secretKey) {
        headers.authorization = ''
    }

    const signedHeaders = Object.keys(headers).sort().join(';')
    const canonicalHeaders = Object.keys(headers)
        .sort()
        .map((name) => `${name}:${headers[name]}\n`)
        .join('')
    const canonicalRequest = [method, url.pathname, '', canonicalHeaders, signedHeaders, payloadHash].join('\n')
    const scope = `${dateStamp}/${region}/s3/aws4_request`
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, createHash('sha256').update(canonicalRequest).digest('hex')].join('\n')

    const hmac = (key, data) => createHash('sha256').update(key).update(data).digest()
    const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretKey}`, dateStamp), region), 's3'), 'aws4_request')
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex')

    const response = await fetch(url, {
        method,
        headers: { ...headers, authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}` },
        body: method === 'GET' ? undefined : body,
    })
    return response
}

async function s3Get(key) {
    const response = await retry(`GET ${key}`, () => s3Request('GET', key, { devMode: true }))
    if (response.status === 404) {
        return null
    }
    if (!response.ok) {
        throw new Error(`GET ${key} -> HTTP ${response.status}`)
    }
    return Buffer.from(await response.arrayBuffer())
}

async function s3Put(key, body, contentType) {
    const response = await retry(`PUT ${key}`, () => s3Request('PUT', key, { body, contentType }))
    if (!response.ok) {
        throw new Error(`PUT ${key} -> HTTP ${response.status}`)
    }
}

async function s3Head(key) {
    const response = await retry(`HEAD ${key}`, () => s3Request('HEAD', key, { devMode: true }))
    return response.status
}

function sha256Hex(buffer) {
    return createHash('sha256').update(buffer).digest('hex')
}

function parseVersion(version) {
    const parts = String(version).split('.').map((part) => Number.parseInt(part, 10))
    if (parts.some((part) => !Number.isInteger(part) || part < 0)) {
        throw new Error(`invalid version: ${version}`)
    }
    return parts
}

function compareVersions(a, b) {
    const pa = parseVersion(a)
    const pb = parseVersion(b)
    const length = Math.max(pa.length, pb.length)
    for (let index = 0; index < length; index += 1) {
        const diff = (pa[index] ?? 0) - (pb[index] ?? 0)
        if (diff !== 0) {
            return diff
        }
    }
    return 0
}

async function findSignedXpi(version) {
    const directory = 'release-packages'
    let entries
    try {
        entries = await readdir(directory)
    } catch {
        fail(`missing directory: ${directory}/ (run the Firefox build/sign steps first)`)
    }
    const exact = entries.filter((name) => name === `belle-pku-${version}.xpi`)
    if (exact.length === 1) {
        return path.join(directory, exact[0])
    }
    const candidates = entries.filter((name) => name.startsWith('belle-pku-') && name.endsWith('.xpi'))
    if (candidates.length !== 1) {
        fail(`expected exactly one signed XPI in ${directory}/, found: ${candidates.join(', ') || 'none'}`)
    }
    return path.join(directory, candidates[0])
}

async function main() {
    assertEnv()

    const pkg = JSON.parse(await readFile('package.json', 'utf8'))
    const version = pkg.version
    if (!version) {
        fail('package.json has no version')
    }
    console.log(`publishing Firefox ${version}`)

    const xpiPath = await findSignedXpi(version)
    const xpiBytes = await readFile(xpiPath)
    if (xpiBytes.length === 0) {
        fail(`signed XPI is empty: ${xpiPath}`)
    }
    const hash = sha256Hex(xpiBytes)
    const xpiKey = `xpi/belle-pku-${version}.xpi`
    const xpiUrl = `${R2_PUBLIC_BASE}/${xpiKey}`
    console.log(`  xpi: ${xpiPath} (${xpiBytes.length} bytes, sha256:${hash.slice(0, 12)}…)`)

    // Never overwrite an existing XPI.
    const existingStatus = await s3Head(xpiKey)
    if (existingStatus === 200) {
        fail(`refusing to overwrite existing object: ${xpiKey} (did this version already ship?)`)
    }

    // Download and validate the live manifest.
    const manifestKey = 'updates.json'
    const existingBytes = await s3Get(manifestKey)
    let manifest
    if (existingBytes === null) {
        console.log('  no existing updates.json; creating it')
        manifest = { addons: { [ADDON_ID]: { updates: [] } } }
    } else {
        try {
            manifest = JSON.parse(existingBytes.toString('utf8'))
        } catch (error) {
            fail(`existing updates.json is not valid JSON: ${error.message}`)
        }
        if (!manifest?.addons?.[ADDON_ID] || !Array.isArray(manifest.addons[ADDON_ID].updates)) {
            fail(`existing updates.json does not contain addons["${ADDON_ID}"].updates[]`)
        }
    }
    const updates = manifest.addons[ADDON_ID].updates

    for (const entry of updates) {
        if (compareVersions(version, entry.version) <= 0) {
            fail(`version regression: ${version} is not greater than already-published ${entry.version}`)
        }
    }

    updates.push({
        version,
        update_link: xpiUrl,
        update_hash: `sha256:${hash}`,
    })

    const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 4) + '\n', 'utf8')

    // Upload XPI first, then the manifest that points at it.
    await s3Put(xpiKey, xpiBytes, 'application/x-xpinstall')
    await s3Put(manifestKey, manifestBytes, 'application/json')

    // Verify both objects are live before declaring success.
    const verifyXpi = await s3Head(xpiKey)
    const verifyManifest = await s3Get(manifestKey)
    if (verifyXpi !== 200) {
        fail(`post-upload verification failed for ${xpiKey}`)
    }
    const published = JSON.parse(verifyManifest.toString('utf8'))
    const publishedEntry = published?.addons?.[ADDON_ID]?.updates?.find((entry) => entry.version === version)
    if (!publishedEntry || publishedEntry.update_link !== xpiUrl || publishedEntry.update_hash !== `sha256:${hash}`) {
        fail(`post-upload verification failed for ${manifestKey}: entry missing or incorrect`)
    }

    console.log(`  uploaded ${xpiKey}`)
    console.log(`  uploaded ${manifestKey} (${updates.length} versions)`)
    console.log(`✔ published ${version} to R2`)
}

main().catch((error) => fail(error?.stack ?? String(error)))
