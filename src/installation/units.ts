export type TransportUnit = {
  readonly id: string
  readonly barcode: string
  readonly article: string
  readonly lengthMm: number
  readonly widthMm: number
  readonly heightMm: number
  readonly weightKg: number
}

const ARTICLES: readonly string[] = [
  'FRITES-9MM-CTN',
  'FRITES-7MM-CTN',
  'POMMES-NOISETTE',
  'ROSTI-PLAQUE',
  'PUREE-SURGELEE',
  'WEDGES-EPICES',
]

const scramble = (seed: number): number => {
  const mixed = (seed * 1103515245 + 12345) % 2147483648
  return mixed < 0 ? mixed + 2147483648 : mixed
}

const between = (seed: number, low: number, high: number): number =>
  low + (scramble(seed) % (high - low + 1))

const checksum = (digits: string): number => {
  const total = digits.split('').reduce((sum, digit, index) => {
    const value = Number(digit)
    return sum + (index % 2 === 0 ? value : value * 3)
  }, 0)
  return (10 - (total % 10)) % 10
}

export const makeTransportUnit = (serial: number): TransportUnit => {
  const body = `54012${String(serial).padStart(7, '0')}`
  const article = ARTICLES[scramble(serial + 7) % ARTICLES.length] ?? 'FRITES-9MM-CTN'
  return {
    id: `TU${String(serial).padStart(6, '0')}`,
    barcode: `${body}${checksum(body)}`,
    article,
    lengthMm: 1200,
    widthMm: 800,
    heightMm: between(serial + 11, 1150, 1780),
    weightKg: between(serial + 23, 412, 968),
  }
}
