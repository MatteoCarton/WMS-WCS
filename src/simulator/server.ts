import { readFile } from 'node:fs/promises'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { drawTicks, makePacer, setFactor, type Pacer } from './clock.js'
import { start, step, type Runtime } from './runtime.js'
import { frameOf, scene } from './snapshot.js'
import type { Telegram } from './telegram.js'

const LOOP_MS = 20

const FRAMES_EVERY = 2

const MAX_LINES = 120

const ALLOWED_FACTORS = [1, 2, 5, 10]

const page = new URL('./ui.html', import.meta.url)

export const serve = async (port: number): Promise<Server> => {
  const html = await readFile(page, 'utf8')
  const started = start()

  let runtime: Runtime = started.runtime
  let pacer: Pacer = makePacer(1)
  let running = true
  let pending: Telegram[] = [...started.telegrams]
  let history: Telegram[] = [...started.telegrams]
  let beat = 0

  const listeners = new Set<ServerResponse>()

  const broadcast = (): void => {
    const lines = pending.slice(-MAX_LINES)
    pending = []
    history = [...history, ...lines].slice(-MAX_LINES)
    const payload = `data: ${JSON.stringify(frameOf(runtime.state, pacer.factor, running, lines))}\n\n`
    for (const listener of listeners) listener.write(payload)
  }

  const loop = (): void => {
    if (running) {
      const drawn = drawTicks(pacer, LOOP_MS / 1000)
      pacer = drawn.pacer
      for (let index = 0; index < drawn.ticks; index += 1) {
        const advanced = step(runtime)
        runtime = advanced.runtime
        pending.push(...advanced.telegrams)
      }
      if (pending.length > MAX_LINES * 4) pending = pending.slice(-MAX_LINES * 4)
    }
    beat += 1
    if (beat % FRAMES_EVERY === 0) broadcast()
  }

  const timer = setInterval(loop, LOOP_MS)
  timer.unref?.()

  const handle = (request: IncomingMessage, response: ServerResponse): void => {
    const url = new URL(request.url ?? '/', 'http://localhost')

    if (url.pathname === '/') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      response.end(html)
      return
    }

    if (url.pathname === '/scene') {
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify(scene()))
      return
    }

    if (url.pathname === '/control') {
      const factor = Number(url.searchParams.get('factor'))
      if (ALLOWED_FACTORS.includes(factor)) pacer = setFactor(pacer, factor)
      const wanted = url.searchParams.get('running')
      if (wanted !== null) running = wanted === '1'
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ factor: pacer.factor, running }))
      return
    }

    if (url.pathname === '/stream') {
      response.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      })
      response.write('retry: 1000\n\n')
      response.write(
        `data: ${JSON.stringify(frameOf(runtime.state, pacer.factor, running, history))}\n\n`,
      )
      listeners.add(response)
      request.on('close', () => {
        listeners.delete(response)
      })
      return
    }

    response.writeHead(404, { 'content-type': 'text/plain' })
    response.end('not found')
  }

  const server = createServer(handle)
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, () => {
      server.removeListener('error', reject)
      resolve()
    })
  })
  return server
}
