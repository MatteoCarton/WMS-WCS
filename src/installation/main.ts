import { serve } from './server.js'

const port = Number(process.env['PORT'] ?? 4173)

const complain = (cause: unknown): string => {
  const code = cause instanceof Error ? (cause as NodeJS.ErrnoException).code : undefined
  if (code === 'EADDRINUSE') {
    return [
      `Le port ${port} est déjà occupé — une autre installation tourne probablement déjà.`,
      `Pour la trouver et l'arrêter : lsof -ti:${port} | xargs kill`,
      `Ou pour démarrer à côté : PORT=${port + 1} npm run installation`,
    ].join('\n')
  }
  return cause instanceof Error ? cause.message : String(cause)
}

try {
  await serve(port)
  process.stdout.write(`Installation en marche : http://localhost:${port}\n`)
} catch (cause) {
  process.stderr.write(`${complain(cause)}\n`)
  process.exit(1)
}
