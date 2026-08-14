export interface MotionProfile {
  readonly maxSpeed: number;
  readonly acceleration: number;
}

export interface Axis {
  readonly profile: MotionProfile;
  readonly distance: number;
}

export function rampDistance(profile: MotionProfile): number {
  return (profile.maxSpeed * profile.maxSpeed) / profile.acceleration;
}

export function travelTime(profile: MotionProfile, distance: number): number {
  if (distance <= 0) {
    return 0;
  }

  if (distance < rampDistance(profile)) {
    return 2 * Math.sqrt(distance / profile.acceleration);
  }

  const rampTime = (2 * profile.maxSpeed) / profile.acceleration;

  return rampTime + (distance - rampDistance(profile)) / profile.maxSpeed;
}

export function simultaneousTravelTime(axes: readonly Axis[]): number {
  const times = axes.map((axis) => travelTime(axis.profile, axis.distance));

  return times.reduce((slowest, time) => Math.max(slowest, time), 0);
}
