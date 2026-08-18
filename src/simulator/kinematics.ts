export type Motion = {
  readonly position: number
  readonly speed: number
}

export type Limits = {
  readonly maxSpeed: number
  readonly acceleration: number
}

export const atRest = (position: number): Motion => ({ position, speed: 0 })

export const arrived = (motion: Motion, target: number): boolean =>
  Math.abs(motion.position - target) < 1e-6 && motion.speed === 0

export const advance = (
  motion: Motion,
  target: number,
  limits: Limits,
  seconds: number,
): Motion => {
  const remaining = target - motion.position
  if (remaining === 0 && motion.speed === 0) return motion

  const heading = remaining !== 0 ? Math.sign(remaining) : Math.sign(motion.speed)
  const along = motion.speed * heading
  const braking = (along * along) / (2 * limits.acceleration)

  const raw =
    Math.abs(remaining) <= braking
      ? along - limits.acceleration * seconds
      : Math.min(limits.maxSpeed, along + limits.acceleration * seconds)
  const chosen = Math.max(limits.acceleration * seconds * 0.05, raw)

  const stride = chosen * seconds
  if (stride >= Math.abs(remaining)) return { position: target, speed: 0 }
  return { position: motion.position + stride * heading, speed: chosen * heading }
}

export const travelSeconds = (distance: number, limits: Limits): number => {
  const span = Math.abs(distance)
  const rampDistance = (limits.maxSpeed * limits.maxSpeed) / limits.acceleration
  if (span <= rampDistance) return 2 * Math.sqrt(span / limits.acceleration)
  return limits.maxSpeed / limits.acceleration + span / limits.maxSpeed
}
