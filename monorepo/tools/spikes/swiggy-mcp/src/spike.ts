// Throwaway spike. Measures the four claims in the Swiggy MCP plan that the
// published docs cannot answer. Localhost only — no production access needed.
//
// NEVER call `checkout`. It places a real order and moves real money. The
// forbidden list below is enforced, not documented.

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js'
import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js'
import type {
    OAuthClientInformationMixed,
    OAuthClientMetadata,
    OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js'
import { createServer } from 'node:http'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'

const SERVER = 'https://mcp.swiggy.com/im'
const PORT = 8765
const REDIRECT = `http://localhost:${PORT}/callback`
const STORE = new URL('../.tokens.json', import.meta.url)
const FIXTURES = new URL('../fixtures/', import.meta.url)

const FORBIDDEN = new Set(['checkout', 'confirm_order'])

const PROBE = {
    search: 'toor dal',
    // Question 3: a quantity no dark store stocks, to see whether the line is
    // silently dropped or reported.
    overQty: 99,
}

// ---------------------------------------------------------------- persistence

type Store = {
    client?: OAuthClientInformationMixed
    tokens?: OAuthTokens
    verifier?: string
}

const load = (): Store => {
    try {
        return JSON.parse(readFileSync(STORE, 'utf8'))
    } catch {
        return {}
    }
}
const save = (patch: Store) => writeFileSync(STORE, JSON.stringify({ ...load(), ...patch }, null, 2))

// ---------------------------------------------------------------------- oauth

class Provider implements OAuthClientProvider {
    get redirectUrl() {
        return REDIRECT
    }
    get clientMetadata(): OAuthClientMetadata {
        return {
            client_name: 'onecart procurement spike',
            redirect_uris: [REDIRECT],
            grant_types: ['authorization_code', 'refresh_token'],
            response_types: ['code'],
            token_endpoint_auth_method: 'none',
            scope: 'mcp:tools',
        }
    }
    clientInformation() {
        return load().client
    }
    saveClientInformation(client: OAuthClientInformationMixed) {
        save({ client })
    }
    tokens() {
        return load().tokens
    }
    saveTokens(tokens: OAuthTokens) {
        save({ tokens })
    }
    saveCodeVerifier(verifier: string) {
        save({ verifier })
    }
    codeVerifier() {
        const v = load().verifier
        if (!v) throw new Error('no stored code verifier')
        return v
    }
    redirectToAuthorization(url: URL) {
        // Printed, never opened — launching a browser needs the operator's say-so.
        console.log(`\n  Open this and sign in with the pool account:\n\n  ${url}\n`)
    }
}

/**
 * One-shot server that resolves with the `code` from Swiggy's redirect.
 * Ignores anything that is not the callback — a stray /favicon.ico must not
 * close the server out from under a sign-in that is still in progress.
 */
const awaitCode = () =>
    new Promise<string>((resolve, reject) => {
        const server = createServer((req, res) => {
            const url = new URL(req.url ?? '/', REDIRECT)
            if (url.pathname !== '/callback') {
                res.writeHead(404).end()
                return
            }
            const code = url.searchParams.get('code')
            const error = url.searchParams.get('error')
            console.log(`  callback: ${code ? 'code received' : (error ?? 'no code, no error')}`)
            res.writeHead(code ? 200 : 400, { 'content-type': 'text/plain' })
            res.end(code ? 'Got it. Close this tab.' : `Sign-in failed: ${url.search || '(empty)'}`)
            server.close()
            code
                ? resolve(code)
                : reject(new Error(`${error ?? 'no code'}: ${url.searchParams.get('error_description') ?? url.search}`))
        })
        server.on('error', reject)
        server.listen(PORT, () => console.log(`  listening on ${REDIRECT}`))
    })

// -------------------------------------------------------------------- capture

const headers: Record<string, Record<string, string>> = {}

/** Records rate-limit headers off every response. Question: are they as documented? */
const recordingFetch: typeof fetch = async (input, init) => {
    const res = await fetch(input, init)
    const path = new URL(String(input)).pathname
    // Full set once, so an absent X-RateLimit-* is distinguishable from a filter bug.
    headers['_all_headers_first_response'] ??= Object.fromEntries(res.headers)
    const rl = Object.fromEntries(
        [...res.headers].filter(([k]) => k.startsWith('x-ratelimit') || k === 'retry-after'),
    )
    if (Object.keys(rl).length) headers[`${res.status} ${path}`] = rl
    return res
}

const write = (name: string, body: unknown) => {
    mkdirSync(FIXTURES, { recursive: true })
    writeFileSync(new URL(`${name}.json`, FIXTURES), JSON.stringify(body, null, 2))
}

// ----------------------------------------------------------------------- main

const provider = new Provider()
const client = new Client({ name: 'onecart-spike', version: '0.0.0' })

const connect = async () => {
    const transport = () =>
        new StreamableHTTPClientTransport(new URL(SERVER), {
            authProvider: provider,
            fetch: recordingFetch,
        })
    const t = transport()
    try {
        await client.connect(t)
        return
    } catch (e) {
        if (!(e instanceof UnauthorizedError)) throw e
    }
    // Interactive leg — only reached when there is no usable refresh token.
    await t.finishAuth(await awaitCode())
    await client.connect(transport())
}

/** Records every call, success or failure. A failure is a finding, not a crash. */
const call = async (name: string, args: Record<string, unknown> = {}) => {
    if (FORBIDDEN.has(name)) throw new Error(`${name} spends real money — not in a spike`)
    try {
        const out = await client.callTool({ name, arguments: args })
        write(name, out)
        console.log(`  ok    ${name}`)
        return out
    } catch (e) {
        write(`${name}.error`, { args, error: String(e) })
        console.log(`  FAIL  ${name}  ${e}`)
        return null
    }
}

const hadTokens = !!load().tokens
await connect()
console.log(hadTokens ? '\n  connected on stored tokens — no OTP' : '\n  connected after interactive auth')

const { tools } = await client.listTools()
write('tools', tools)
console.log(`  ${tools.length} tools: ${tools.map(t => t.name).join(', ')}\n`)

/** First value for `key` anywhere in a response tree. Saves a round trip guessing shapes. */
const deepFind = (node: unknown, key: string): string | undefined => {
    // The real payload is JSON serialised into content[].text, not structuredContent.
    if (typeof node === 'string' && node.trimStart().startsWith('{')) {
        try {
            return deepFind(JSON.parse(node), key)
        } catch {
            return undefined
        }
    }
    if (Array.isArray(node)) {
        for (const v of node) {
            const hit = deepFind(v, key)
            if (hit !== undefined) return hit
        }
    } else if (node && typeof node === 'object') {
        for (const [k, v] of Object.entries(node)) {
            if (k === key && (typeof v === 'string' || typeof v === 'number')) return String(v)
            const hit = deepFind(v, key)
            if (hit !== undefined) return hit
        }
    }
}

const addresses = await call('get_addresses')
const addressId = deepFind(addresses, 'id')
if (!addressId) throw new Error('no addressId in get_addresses')
console.log(`  addressId ${addressId}`)

// The probe replaces whatever is in the account's cart. Snapshot it first so it
// is recoverable — one account, one cart (11-procurement 1).
await call('get_cart').then(c => write('get_cart.before', c))

const found = await call('search_products', { addressId, query: PROBE.search })
const spinId = deepFind(found, 'spinId')
if (!spinId) throw new Error('no spinId in search_products — inspect fixtures/search_products.json')
console.log(`  spinId ${spinId}`)

await call('update_cart', { selectedAddressId: addressId, items: [{ spinId, quantity: 1 }] })
const first = await call('get_cart')

// Question 1: is the bill stable across the 90s quote TTL?
console.log('  waiting 120s for the second cart snapshot...')
await sleep(120_000)
const second = await client.callTool({ name: 'get_cart' })
write('get_cart.t120', second)
write('get_cart.stable', { stable: JSON.stringify(first) === JSON.stringify(second) })
console.log(`  bill stable over 120s: ${JSON.stringify(first) === JSON.stringify(second)}`)

// Question 3: does an unfillable quantity come back reported or silently dropped?
await call('update_cart', {
    selectedAddressId: addressId,
    items: [{ spinId, quantity: PROBE.overQty }],
}).then(c => write('update_cart.overqty', c))
await call('get_cart').then(c => write('get_cart.overqty', c))

await call('get_payment_options', { addressId }) // shape only — stops here, before checkout
await call('clear_cart')

write('headers', headers)
await client.close()
console.log('\n  fixtures/ written\n')
