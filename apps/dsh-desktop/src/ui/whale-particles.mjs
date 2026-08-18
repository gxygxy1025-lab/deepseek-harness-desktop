const MASK_WIDTH = 720
const MASK_HEIGHT = 720

function createRandom(seed = 0x5d51) {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 0x100000000
  }
}

// official DeepSeek whale silhouette (website/official-whale.svg, viewBox 0 0 50 50)
export const OFFICIAL_WHALE_PATH = 'M48.8354 10.0479C48.3232 9.79199 48.1025 10.2798 47.8032 10.5278C47.7007 10.6079 47.6143 10.7119 47.5273 10.8076C46.7793 11.624 45.9048 12.1597 44.7622 12.0957C43.0923 12 41.666 12.5356 40.4058 13.8398C40.1377 12.2319 39.2476 11.272 37.8926 10.6558C37.1836 10.3359 36.4668 10.0156 35.9702 9.31982C35.6235 8.82373 35.5293 8.27197 35.356 7.72754C35.2456 7.3999 35.1353 7.06396 34.7651 7.00781C34.3633 6.94385 34.2056 7.2876 34.0479 7.57568C33.418 8.75195 33.1733 10.0479 33.1973 11.3599C33.2524 14.312 34.4736 16.6641 36.8999 18.3359C37.1758 18.5278 37.2466 18.7197 37.1597 19C36.9946 19.5757 36.7974 20.1357 36.624 20.7119C36.5137 21.0801 36.3486 21.1597 35.9624 21C34.6309 20.4321 33.481 19.5918 32.4644 18.5757C30.7393 16.8721 29.1792 14.9917 27.2334 13.52C26.7764 13.1758 26.3193 12.856 25.8467 12.5518C23.8618 10.584 26.1069 8.96777 26.627 8.77588C27.1704 8.57568 26.8159 7.8877 25.0591 7.896C23.3022 7.90381 21.6953 8.50391 19.647 9.30371C19.3477 9.42383 19.0322 9.51172 18.7095 9.58398C16.8501 9.22363 14.9199 9.14355 12.9033 9.37598C9.10596 9.80762 6.07275 11.6396 3.84326 14.7681C1.16455 18.5278 0.53418 22.7998 1.30664 27.2559C2.11768 31.9521 4.46582 35.8398 8.07373 38.8799C11.8159 42.0322 16.1255 43.5762 21.041 43.2803C24.0269 43.104 27.3516 42.6963 31.1016 39.4561C32.0469 39.936 33.0396 40.1279 34.686 40.272C35.9546 40.3921 37.1758 40.208 38.1211 40.0078C39.6021 39.688 39.4995 38.2881 38.9639 38.0322C34.623 35.9678 35.5762 36.8081 34.71 36.1279C36.9155 33.4639 40.2402 30.6958 41.54 21.728C41.6426 21.0161 41.5557 20.5679 41.54 19.9917C41.5322 19.6396 41.6108 19.5039 42.0049 19.4639C43.0923 19.3359 44.1479 19.0317 45.1167 18.4878C47.9292 16.9199 49.064 14.3438 49.3315 11.2559C49.3711 10.7837 49.3237 10.2959 48.8354 10.0479ZM24.3262 37.8398C20.1196 34.4639 18.0791 33.3521 17.2358 33.3999C16.4482 33.4482 16.5898 34.3682 16.7632 34.9678C16.9443 35.5601 17.1812 35.9683 17.5117 36.4878C17.7402 36.832 17.8979 37.3442 17.2832 37.728C15.9282 38.584 13.5728 37.4399 13.4624 37.3838C10.7207 35.7358 8.42822 33.5601 6.81348 30.584C5.25342 27.7197 4.34766 24.6479 4.19775 21.3677C4.1582 20.5757 4.38672 20.2959 5.15869 20.1519C6.17529 19.96 7.22314 19.9199 8.23926 20.0718C12.5327 20.7119 16.1885 22.6719 19.2529 25.7759C21.002 27.5439 22.3252 29.6558 23.6885 31.7202C25.1377 33.9121 26.6978 36 28.6831 37.7119C29.3843 38.312 29.9434 38.7681 30.479 39.104C28.8643 39.2881 26.1699 39.3281 24.3262 37.8398ZM26.3433 24.6001C26.3433 24.248 26.6191 23.9678 26.9658 23.9678C27.0444 23.9678 27.1152 23.9839 27.1782 24.0078C27.2651 24.04 27.3438 24.0879 27.4067 24.1602C27.5171 24.272 27.5801 24.4321 27.5801 24.6001C27.5801 24.9521 27.3042 25.2319 26.9575 25.2319C26.6108 25.2319 26.3433 24.9521 26.3433 24.6001ZM32.6064 27.8799C32.2046 28.0479 31.8027 28.1919 31.4165 28.208C30.8179 28.2397 30.1641 27.9922 29.8096 27.688C29.2583 27.2158 28.8643 26.9521 28.6987 26.1279C28.6279 25.7759 28.6675 25.2319 28.7305 24.9199C28.8721 24.248 28.7144 23.8159 28.2495 23.4238C27.8716 23.104 27.3911 23.0161 26.8633 23.0161C26.666 23.0161 26.4849 22.9277 26.3511 22.856C26.1304 22.7441 25.9492 22.4639 26.1226 22.1201C26.1777 22.0078 26.4458 21.7358 26.5088 21.688C27.2256 21.272 28.0527 21.4077 28.8169 21.7197C29.5259 22.0161 30.0615 22.5601 30.834 23.3281C31.6216 24.2559 31.7632 24.5117 32.2124 25.208C32.5669 25.752 32.8901 26.312 33.1104 26.9521C33.2446 27.3521 33.0713 27.6802 32.6064 27.8799Z'

function traceWhale(context) {
  const scale = MASK_WIDTH / 50
  context.save()
  context.scale(scale, scale)
  context.fill(new Path2D(OFFICIAL_WHALE_PATH))
  context.restore()
}

function createParticleField() {
  const mask = document.createElement('canvas')
  mask.width = MASK_WIDTH
  mask.height = MASK_HEIGHT
  const context = mask.getContext('2d', { willReadFrequently: true })
  context.fillStyle = '#fff'
  traceWhale(context)
  const pixels = context.getImageData(0, 0, MASK_WIDTH, MASK_HEIGHT).data
  const random = createRandom()
  const particles = []
  const step = 5
  for (let y = 0; y < MASK_HEIGHT; y += step) {
    for (let x = 0; x < MASK_WIDTH; x += step) {
      const sampleX = Math.max(0, Math.min(MASK_WIDTH - 1, Math.round(x + (random() - 0.5) * step * 0.7)))
      const sampleY = Math.max(0, Math.min(MASK_HEIGHT - 1, Math.round(y + (random() - 0.5) * step * 0.7)))
      if (pixels[(sampleY * MASK_WIDTH + sampleX) * 4 + 3] < 40 || random() < 0.12) continue
      const maskAt = (px, py) => pixels[(py * MASK_WIDTH + px) * 4 + 3]
      const edge = maskAt(Math.max(0, sampleX - step), sampleY) < 40
        || maskAt(Math.min(MASK_WIDTH - 1, sampleX + step), sampleY) < 40
        || maskAt(sampleX, Math.max(0, sampleY - step)) < 40
        || maskAt(sampleX, Math.min(MASK_HEIGHT - 1, sampleY + step)) < 40
      const tailWeight = Math.max(0, Math.min(1, (sampleX - 470) / 170))
      const tailGlow = Math.max(0, (sampleX - 500) / 220)
      const spark = random() < 0.07
      particles.push({
        x: sampleX,
        y: sampleY,
        size: edge ? 0.5 + random() * 0.72 : 0.42 + random() * 1.08,
        alpha: edge ? 0.58 + random() * 0.34 : 0.3 + random() * 0.34,
        spark,
        colorKey: spark ? 6 : Math.min(5, Math.floor(tailGlow * 4) + (edge ? 2 : 0)),
        tailWeight,
        finWeight: Math.max(0, 1 - Math.abs(sampleX - 302) / 88) * Math.max(0, Math.min(1, (sampleY - 258) / 78)),
        phase: random() * Math.PI * 2,
        delay: random() * 0.7,
        ox: 0,
        oy: 0,
        drawX: 0,
        drawY: 0,
        drawRadius: 0,
      })
    }
  }
  return particles
}

function easeOut(value) {
  const bounded = Math.max(0, Math.min(1, value))
  return 1 - (1 - bounded) ** 3
}

export function computeWhalePose(elapsed, width, height, reducedMotion = false) {
  if (reducedMotion) {
    return {
      centerX: width * 0.75,
      centerY: height * 0.42,
      heading: 0,
      tailPhase: 0,
      finPhase: 0,
      breathe: 1,
    }
  }

  const pathPhase = elapsed * 0.09
  return {
    centerX: width * (0.765 + Math.sin(pathPhase) * 0.035 + Math.sin(pathPhase * 0.47 + 1.2) * 0.008),
    centerY: height * (0.415 + Math.sin(pathPhase * 1.3 + 0.6) * 0.052 + Math.sin(elapsed * 0.31) * 0.008),
    heading: Math.cos(pathPhase) * 0.038 + Math.sin(elapsed * 0.2 + 0.4) * 0.007,
    tailPhase: elapsed * 1.65,
    finPhase: elapsed * 1.08,
    breathe: 1 + Math.sin(elapsed * 0.72) * 0.01,
  }
}

function projectWhalePoint(x, y, pose, scale, extraY = 0) {
  const localX = (x - MASK_WIDTH / 2) * scale
  const tailWeight = Math.max(0, Math.min(1, (x - 470) / 170))
  const bodyWave = Math.sin(pose.tailPhase * 0.48 + x * 0.014) * 2.4 * scale * (0.18 + tailWeight * 0.82)
  const tailWave = Math.sin(pose.tailPhase + x * 0.018) * 14 * scale * tailWeight
  const finXWeight = Math.max(0, 1 - Math.abs(x - 302) / 88)
  const finYWeight = Math.max(0, Math.min(1, (y - 258) / 78))
  const finWave = Math.sin(pose.finPhase) * 10 * scale * finXWeight * finYWeight
  const localY = (y - MASK_HEIGHT / 2) * scale * pose.breathe + bodyWave + tailWave + finWave + extraY
  const cosine = Math.cos(pose.heading)
  const sine = Math.sin(pose.heading)
  return {
    x: pose.centerX + localX * cosine - localY * sine,
    y: pose.centerY + localX * sine + localY * cosine,
  }
}

export function mountParticleWhale(canvas) {
  if (!(canvas instanceof HTMLCanvasElement)) return () => {}
  const context = canvas.getContext('2d')
  if (!context) return () => {}
  const particles = createParticleField()
  const BUCKET_COLORS = []
  for (let bucket = 0; bucket < 6; bucket += 1) {
    const glow = (bucket + 0.5) / 6
    BUCKET_COLORS.push(`rgb(${104 + Math.round(glow * 58)}, ${193 + Math.round(glow * 35)}, 242)`)
  }
  BUCKET_COLORS.push('rgb(196, 238, 252)')
  const buckets = Array.from({ length: BUCKET_COLORS.length * 8 }, () => [])
  const strokeSegments = []
  const random = createRandom(0x1eaf)
  const ambient = Array.from({ length: 96 }, () => ({
    x: random(),
    y: random(),
    size: 0.4 + random() * 1.2,
    speed: 0.08 + random() * 0.18,
    phase: random() * Math.PI * 2,
  }))
  const breathBubbles = Array.from({ length: 11 }, () => ({
    delay: random(),
    drift: 0.55 + random() * 0.9,
    size: 0.55 + random() * 1.35,
    phase: random() * Math.PI * 2,
  }))
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let width = 0
  let height = 0
  let frame
  let stopped = false
  const startedAt = performance.now()

  const pointer = { x: 0, y: 0, vx: 0, vy: 0, active: false }
  const parallax = { x: 0, y: 0 }
  const ripples = []
  const elapsedNow = () => (performance.now() - startedAt) / 1000
  const onPointerMove = (event) => {
    if (pointer.active) {
      pointer.vx = pointer.vx * 0.5 + (event.clientX - pointer.x) * 0.5
      pointer.vy = pointer.vy * 0.5 + (event.clientY - pointer.y) * 0.5
    }
    pointer.x = event.clientX
    pointer.y = event.clientY
    pointer.active = true
  }
  const onPointerDown = (event) => {
    if (reducedMotion) return
    ripples.push({ x: event.clientX, y: event.clientY, at: elapsedNow() })
    if (ripples.length > 6) ripples.shift()
  }
  const onPointerOut = (event) => {
    if (!event.relatedTarget) pointer.active = false
  }

  const scheduleFrame = () => {
    if (stopped || document.hidden || frame !== undefined) return
    frame = window.requestAnimationFrame(draw)
  }

  const resize = () => {
    const ratio = Math.min(1.5, window.devicePixelRatio || 1)
    width = canvas.clientWidth
    height = canvas.clientHeight
    canvas.width = Math.max(1, Math.round(width * ratio))
    canvas.height = Math.max(1, Math.round(height * ratio))
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    if (reducedMotion) scheduleFrame()
  }

  const draw = (now) => {
    frame = undefined
    if (stopped) return
    const elapsed = (now - startedAt) / 1000
    context.clearRect(0, 0, width, height)
    while (ripples.length && elapsed - ripples[0].at > 1.2) ripples.shift()
    if (!parallax.x && !parallax.y) {
      parallax.x = width * 0.765
      parallax.y = height * 0.415
    }
    const restX = width * 0.765
    const restY = height * 0.415
    const followX = pointer.active && !reducedMotion ? pointer.x : restX
    const followY = pointer.active && !reducedMotion ? pointer.y : restY
    parallax.x += (followX - parallax.x) * 0.075
    parallax.y += (followY - parallax.y) * 0.075
    const driftX = parallax.x - restX
    const driftY = parallax.y - restY
    pointer.vx *= 0.88
    pointer.vy *= 0.88
    context.globalCompositeOperation = 'lighter'

    context.fillStyle = 'rgb(77, 164, 218)'
    context.globalAlpha = 0.08
    context.beginPath()
    for (const mote of ambient) {
      const x = mote.x * width + Math.sin(elapsed * mote.speed + mote.phase) * 14 + driftX * 0.5
      const y = (mote.y * height - elapsed * 3 * mote.speed + height) % height + driftY * 0.5
      context.moveTo(x + mote.size, y)
      context.arc(x, y, mote.size, 0, Math.PI * 2)
    }
    context.fill()
    context.globalAlpha = 1

    const whaleWidth = Math.min(width * 0.4, height * 0.62, 640)
    const scale = whaleWidth / MASK_WIDTH
    const pose = computeWhalePose(elapsed, width, height, reducedMotion)
    if (!reducedMotion) {
      pose.centerX += driftX * 0.1
      pose.centerY += driftY * 0.1
      pose.heading += Math.max(-0.03, Math.min(0.03, (driftY / Math.max(1, height)) * 1.0))
    }
    const reveal = reducedMotion ? 1 : easeOut(elapsed / 1.7)
    const headingCos = Math.cos(pose.heading)
    const headingSin = Math.sin(pose.heading)
    const bodyPhase = pose.tailPhase * 0.48
    const finWaveAmp = Math.sin(pose.finPhase) * 10 * scale
    const wavePhase = elapsed * 0.82
    const pulsePhase = elapsed * 1.1
    const revealAngleBase = elapsed * 0.54

    for (let index = 0; index < particles.length; index += 1) {
      const particle = particles[index]
      const localReveal = easeOut((reveal - particle.delay * 0.25) / 0.82)
      if (localReveal <= 0) continue
      const wave = reducedMotion ? 0 : Math.sin(wavePhase + particle.phase + particle.x * 0.012) * 1.4
      const localX = (particle.x - MASK_WIDTH / 2) * scale
      const bodyWave = Math.sin(bodyPhase + particle.x * 0.014) * 2.4 * scale * (0.18 + particle.tailWeight * 0.82)
      const tailWave = Math.sin(pose.tailPhase + particle.x * 0.018) * 14 * scale * particle.tailWeight
      const finWave = finWaveAmp * particle.finWeight
      const localY = (particle.y - MASK_HEIGHT / 2) * scale * pose.breathe + bodyWave + tailWave + finWave + wave
      const dispersion = (1 - localReveal) ** 2
      const spiral = (20 + particle.delay * 42) * scale * dispersion
      const revealAngle = particle.phase + revealAngleBase
      let x = pose.centerX + localX * headingCos - localY * headingSin + Math.cos(revealAngle) * spiral + dispersion * 16 * scale
      let y = pose.centerY + localX * headingSin + localY * headingCos + Math.sin(revealAngle) * spiral
      let excitement = 0
      if (!reducedMotion) {
        let pushX = 0
        let pushY = 0
        if (pointer.active) {
          const dx = x - pointer.x
          const dy = y - pointer.y
          const distSq = dx * dx + dy * dy
          if (distSq > 0.01 && distSq < 25600) {
            const dist = Math.sqrt(distSq)
            const fall = 1 - dist / 160
            const force = fall * fall * 44
            const swirl = fall * 20
            const wake = fall * 0.55
            pushX += (dx / dist) * force - (dy / dist) * swirl + pointer.vx * wake
            pushY += (dy / dist) * force + (dx / dist) * swirl + pointer.vy * wake
            excitement = fall
          }
        }
        for (const ripple of ripples) {
          const age = elapsed - ripple.at
          const ring = age * 320
          const dx = x - ripple.x
          const dy = y - ripple.y
          const distSq = dx * dx + dy * dy
          const outer = ring + 80
          if (distSq > outer * outer) continue
          const dist = Math.sqrt(distSq) || 1
          const band = Math.abs(dist - ring)
          if (band < 80) {
            const force = (1 - band / 80) * Math.max(0, 1 - age / 1.1) * 40
            pushX += (dx / dist) * force
            pushY += (dy / dist) * force
          }
        }
        particle.ox += (pushX - particle.ox) * 0.18
        particle.oy += (pushY - particle.oy) * 0.18
        x += particle.ox
        y += particle.oy
      }
      const pulse = reducedMotion ? 1 : 0.82 + Math.sin(pulsePhase + particle.phase) * 0.18
      particle.drawX = x
      particle.drawY = y
      particle.drawRadius = Math.max(0.35, particle.size * scale * pulse)
      const alpha = Math.min(1, particle.alpha * localReveal * (particle.spark ? 1.65 : 1) * (1 + excitement * 0.7))
      const alphaKey = Math.min(7, (alpha * 8) | 0)
      buckets[particle.colorKey * 8 + alphaKey].push(index)

      if (index % 23 === 0 && localReveal > 0.75) {
        strokeSegments.push(x, y, x - 9 * scale, y + Math.sin(particle.phase) * 5 * scale)
      }
    }

    for (let colorKey = 0; colorKey < BUCKET_COLORS.length; colorKey += 1) {
      context.fillStyle = BUCKET_COLORS[colorKey]
      for (let alphaKey = 0; alphaKey < 8; alphaKey += 1) {
        const bucket = buckets[colorKey * 8 + alphaKey]
        if (bucket.length === 0) continue
        context.globalAlpha = (alphaKey + 0.5) / 8
        context.beginPath()
        for (let entry = 0; entry < bucket.length; entry += 1) {
          const particle = particles[bucket[entry]]
          context.moveTo(particle.drawX + particle.drawRadius, particle.drawY)
          context.arc(particle.drawX, particle.drawY, particle.drawRadius, 0, Math.PI * 2)
        }
        context.fill()
        bucket.length = 0
      }
    }
    context.globalAlpha = 1

    if (strokeSegments.length > 0) {
      context.strokeStyle = 'rgb(83, 177, 226)'
      context.globalAlpha = 0.08
      context.lineWidth = 0.45
      context.beginPath()
      for (let index = 0; index < strokeSegments.length; index += 4) {
        context.moveTo(strokeSegments[index], strokeSegments[index + 1])
        context.lineTo(strokeSegments[index + 2], strokeSegments[index + 3])
      }
      context.stroke()
      context.globalAlpha = 1
      strokeSegments.length = 0
    }

    for (const ripple of ripples) {
      const age = elapsed - ripple.at
      const fade = Math.max(0, 1 - age / 1.1)
      context.strokeStyle = `rgba(147, 224, 248, ${0.22 * fade})`
      context.lineWidth = 1
      context.beginPath()
      context.arc(ripple.x, ripple.y, Math.max(1, age * 320), 0, Math.PI * 2)
      context.stroke()
    }

    const eye = projectWhalePoint(388, 354, pose, scale)
    context.shadowColor = 'rgba(188, 244, 255, 0.9)'
    context.shadowBlur = 14
    context.fillStyle = `rgba(220, 251, 255, ${0.76 * reveal})`
    context.beginPath()
    context.arc(eye.x, eye.y, Math.max(1.1, 1.8 * scale), 0, Math.PI * 2)
    context.fill()
    context.shadowBlur = 0

    const bubbleOrigin = projectWhalePoint(245, 104, pose, scale)
    for (const bubble of breathBubbles) {
      const bubbleProgress = (elapsed * 0.17 + bubble.delay) % 1
      const bubbleAlpha = Math.sin(bubbleProgress * Math.PI) * 0.24 * reveal
      const bubbleX = bubbleOrigin.x + Math.sin(bubble.phase + bubbleProgress * 5) * 8 * bubble.drift * scale - bubbleProgress * 13 * scale
      const bubbleY = bubbleOrigin.y - bubbleProgress * 92 * scale
      context.strokeStyle = `rgba(147, 224, 248, ${bubbleAlpha})`
      context.lineWidth = Math.max(0.45, 0.7 * scale)
      context.beginPath()
      context.arc(bubbleX, bubbleY, Math.max(0.6, bubble.size * scale), 0, Math.PI * 2)
      context.stroke()
    }

    context.globalCompositeOperation = 'source-over'
    if (!reducedMotion) scheduleFrame()
  }

  const onVisibilityChange = () => {
    if (document.hidden) {
      if (frame !== undefined) window.cancelAnimationFrame(frame)
      frame = undefined
      return
    }
    scheduleFrame()
  }

  resize()
  window.addEventListener('resize', resize)
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerdown', onPointerDown, { passive: true })
  document.addEventListener('pointerout', onPointerOut)
  document.addEventListener('visibilitychange', onVisibilityChange)
  scheduleFrame()
  return () => {
    stopped = true
    if (frame !== undefined) window.cancelAnimationFrame(frame)
    window.removeEventListener('resize', resize)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerdown', onPointerDown)
    document.removeEventListener('pointerout', onPointerOut)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}
