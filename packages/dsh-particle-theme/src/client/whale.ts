import {
  AdaptiveFrameBudget,
  type ParticleRuntimeState,
  type ParticleThemeDefinition,
  type ParticleThemeScene,
} from './theme.ts'

interface WhalePoint {
  x: number
  y: number
  size: number
  alpha: number
  phase: number
  tail: number
}

interface AmbientPoint {
  x: number
  y: number
  size: number
  phase: number
  speed: number
}

function randomSource(seed = 0x5d51): () => number {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 0x100000000
  }
}

function insideWhale(x: number, y: number): boolean {
  const body = ((x - 0.43) / 0.35) ** 2 + ((y - 0.52) / 0.205) ** 2 <= 1
  const head = ((x - 0.2) / 0.18) ** 2 + ((y - 0.5) / 0.18) ** 2 <= 1
  const tailTop = x >= 0.69 && x <= 0.98 && y >= 0.2 && y <= 0.52 && y >= 0.2 + (x - 0.69) * 0.35
  const tailBottom = x >= 0.69 && x <= 0.98 && y >= 0.52 && y <= 0.82 && y <= 0.82 - (x - 0.69) * 0.35
  const fin = ((x - 0.43) / 0.19) ** 2 + ((y - 0.69) / 0.13) ** 2 <= 1 && y > 0.64
  return body || head || tailTop || tailBottom || fin
}

export function createWhaleParticleField(count: number, seed = 0x5d51): WhalePoint[] {
  const random = randomSource(seed)
  const points: WhalePoint[] = []
  const target = Math.max(32, Math.round(count))
  for (let attempts = 0; points.length < target && attempts < target * 40; attempts += 1) {
    const x = random()
    const y = 0.12 + random() * 0.76
    if (!insideWhale(x, y)) continue
    points.push({
      x,
      y,
      size: 0.55 + random() * 1.25,
      alpha: 0.46 + random() * 0.48,
      phase: random() * Math.PI * 2,
      tail: Math.max(0, Math.min(1, (x - 0.62) / 0.28)),
    })
  }
  return points
}

function darkPage(document: Document): boolean {
  if (document.body?.hasAttribute('data-ds-dark-theme')) return true
  const scheme = document.defaultView?.getComputedStyle(document.documentElement).colorScheme
  return scheme?.includes('dark') === true
}

class WhaleParticleScene implements ParticleThemeScene {
  private readonly context: CanvasRenderingContext2D
  private readonly budget = new AdaptiveFrameBudget()
  private whale: WhalePoint[] = []
  private ambient: AmbientPoint[] = []
  private state: ParticleRuntimeState | undefined
  private frame: number | undefined
  private lastFrame = 0
  private stopped = false
  private targetCount = 0

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly document: Document,
    private readonly window: Window,
    context: CanvasRenderingContext2D,
  ) {
    this.context = context
  }

  update(state: ParticleRuntimeState): void {
    this.state = state
    if (state.mode === 'hidden') {
      if (this.frame !== undefined) this.window.cancelAnimationFrame(this.frame)
      this.frame = undefined
      return
    }
    this.schedule()
  }

  dispose(): void {
    this.stopped = true
    if (this.frame !== undefined) this.window.cancelAnimationFrame(this.frame)
    this.frame = undefined
  }

  private schedule(): void {
    if (this.stopped || this.frame !== undefined) return
    this.frame = this.window.requestAnimationFrame((now) => { this.draw(now) })
  }

  private resize(): { width: number; height: number } {
    const width = Math.max(1, this.canvas.clientWidth || this.window.innerWidth)
    const height = Math.max(1, this.canvas.clientHeight || this.window.innerHeight)
    const ratio = Math.min(1.5, this.window.devicePixelRatio || 1)
    const pixelWidth = Math.max(1, Math.round(width * ratio))
    const pixelHeight = Math.max(1, Math.round(height * ratio))
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth
      this.canvas.height = pixelHeight
      this.context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }
    return { width, height }
  }

  private ensureParticles(width: number, height: number, state: ParticleRuntimeState): void {
    const areaCount = Math.max(260, Math.min(780, Math.round((width * height) / 3_200)))
    const nextTarget = Math.max(40, Math.round(areaCount * state.settings.density * state.profile.density * this.budget.quality))
    if (Math.abs(nextTarget - this.targetCount) < Math.max(20, this.targetCount * 0.12)) return
    this.targetCount = nextTarget
    this.whale = createWhaleParticleField(Math.round(nextTarget * 0.76))
    const random = randomSource(0x1eaf + nextTarget)
    this.ambient = Array.from({ length: Math.max(18, nextTarget - this.whale.length) }, () => ({
      x: random(),
      y: random(),
      size: 0.45 + random() * 1.15,
      phase: random() * Math.PI * 2,
      speed: 0.08 + random() * 0.18,
    }))
  }

  private draw(now: number): void {
    this.frame = undefined
    const state = this.state
    if (this.stopped || !state || state.mode === 'hidden') return
    if (this.lastFrame > 0) this.budget.record(now - this.lastFrame)
    this.lastFrame = now
    const { width, height } = this.resize()
    this.ensureParticles(width, height, state)
    this.context.clearRect(0, 0, width, height)
    const elapsed = now / 1_000 * state.settings.speed * state.profile.speed
    const opacity = state.settings.opacity * state.profile.opacity
    const dark = darkPage(this.document)
    const whaleColor = dark ? 'rgb(111, 211, 242)' : 'rgb(31, 132, 177)'
    const ambientColor = dark ? 'rgb(77, 164, 218)' : 'rgb(52, 142, 182)'

    this.context.save()
    this.context.fillStyle = ambientColor
    this.context.globalAlpha = opacity * 0.32
    this.context.beginPath()
    for (const mote of this.ambient) {
      const x = mote.x * width + Math.sin(elapsed * mote.speed + mote.phase) * 12
      const y = (mote.y * height - elapsed * 3 * mote.speed + height) % height
      this.context.moveTo(x + mote.size, y)
      this.context.arc(x, y, mote.size, 0, Math.PI * 2)
    }
    this.context.fill()

    const whaleWidth = Math.min(width * 0.43, height * 0.62, 540)
    const whaleHeight = whaleWidth * 0.56
    const originX = width * (0.56 + Math.sin(elapsed * 0.08) * 0.018)
    const originY = height * (0.1 + Math.sin(elapsed * 0.11 + 0.7) * 0.018)
    this.context.fillStyle = whaleColor
    this.context.globalAlpha = opacity
    this.context.beginPath()
    for (const point of this.whale) {
      const tailWave = Math.sin(elapsed * 1.4 + point.phase + point.x * 8) * whaleHeight * 0.045 * point.tail
      const breathe = Math.sin(elapsed * 0.55 + point.phase) * 0.9
      const x = originX + point.x * whaleWidth
      const y = originY + point.y * whaleHeight + tailWave + breathe
      const radius = point.size * (0.72 + this.budget.quality * 0.28)
      this.context.moveTo(x + radius, y)
      this.context.arc(x, y, radius, 0, Math.PI * 2)
    }
    this.context.fill()

    const eyeX = originX + whaleWidth * 0.2
    const eyeY = originY + whaleHeight * 0.47
    this.context.fillStyle = dark ? 'rgb(220, 251, 255)' : 'rgb(12, 83, 117)'
    this.context.globalAlpha = Math.min(0.8, opacity * 1.8)
    this.context.beginPath()
    this.context.arc(eyeX, eyeY, 1.6, 0, Math.PI * 2)
    this.context.fill()
    this.context.restore()

    if (state.profile.speed > 0) this.schedule()
  }
}

export const WHALE_THEME_DEFINITION: ParticleThemeDefinition = {
  id: 'whale',
  create(createContext) {
    const { canvas, document, window } = createContext
    const drawingContext = canvas.getContext('2d')
    if (!drawingContext) return { update: () => {}, dispose: () => {} }
    return new WhaleParticleScene(canvas, document, window, drawingContext)
  },
}
