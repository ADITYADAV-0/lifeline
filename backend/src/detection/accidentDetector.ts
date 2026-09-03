import {
    AccidentStatus,
    DetectionResult,
    SensorReading,
} from '../types';

function magnitude(x: number, y: number, z: number) {
  return Math.sqrt(x * x + y * y + z * z);
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function detectAccident(
  current: SensorReading,
  previous?: SensorReading,
): DetectionResult {
  let score = 0;

  const factors: string[] = [];

  /*
   * ACCELEROMETER
   *
   * Acceleration magnitude is measured in m/s².
   *
   * Normal gravity ≈ 9.81 m/s².
   * Normal movement: 9.8 - 15 m/s² (1 - 1.5G)
   * Sudden impact / hard brake: > 20 m/s² (~2.0G+)
   * Severe impact / crash: > 25 m/s² (~2.5G+)
   */

  const accelerationMagnitude = magnitude(
    current.accelerometer.x,
    current.accelerometer.y,
    current.accelerometer.z,
  );

  if (accelerationMagnitude > 22) {
    score += 40;
    factors.push('HIGH_ACCELERATION');
  } else if (accelerationMagnitude > 16) {
    score += 25;
    factors.push('ABNORMAL_ACCELERATION');
  }

  /*
   * GYROSCOPE
   */

  const rotationMagnitude = magnitude(
    current.gyroscope.x,
    current.gyroscope.y,
    current.gyroscope.z,
  );

  if (rotationMagnitude > 8) {
    score += 20;
    factors.push('HIGH_ROTATION');
  } else if (rotationMagnitude > 5) {
    score += 10;
    factors.push('ABNORMAL_ROTATION');
  }

  /*
   * SPEED CHANGE
   */

  const currentSpeed = current.gps.speed ?? 0;

  if (previous) {
    const previousSpeed = previous.gps.speed ?? 0;

    const speedDrop = previousSpeed - currentSpeed;

    if (speedDrop > 15) {
      score += 25;
      factors.push('SUDDEN_SPEED_DROP');
    } else if (speedDrop > 8) {
      score += 10;
      factors.push('RAPID_DECELERATION');
    }

    /*
     * GPS movement check.
     */

    const distance = calculateDistance(
      previous.gps.latitude,
      previous.gps.longitude,
      current.gps.latitude,
      current.gps.longitude,
    );

    /*
     * If the vehicle was moving and suddenly stops,
     * this contributes to the score.
     */

    if (
      previousSpeed > 10 &&
      distance < 0.005 &&
      currentSpeed < 1
    ) {
      score += 15;
      factors.push('SUDDEN_STOP');
    }
  }

  let status: AccidentStatus = 'NORMAL';

  if (score >= 70) {
    status = 'EMERGENCY';
  } else if (score >= 40) {
    status = 'POSSIBLE_ACCIDENT';
  }

  return {
    score,
    status,
    factors,
    accelerationMagnitude,
    rotationMagnitude,
    speed: currentSpeed,
  };
}