import * as Location from 'expo-location';
import { LOCATION_TASK_NAME } from './locationTask';

export async function startSOSLocationTracking() {
  try {
    // -----------------------------------------
    // 1. CHECK FOREGROUND PERMISSION
    // -----------------------------------------
    let foreground =
      await Location.getForegroundPermissionsAsync();

    if (foreground.status !== 'granted') {
      foreground =
        await Location.requestForegroundPermissionsAsync();
    }

    if (foreground.status !== 'granted') {
      throw new Error(
        'Foreground location permission was not granted.'
      );
    }

    console.log('Foreground location permission: granted');

    // -----------------------------------------
    // 2. CHECK BACKGROUND PERMISSION
    // -----------------------------------------
    let background =
      await Location.getBackgroundPermissionsAsync();

    console.log(
      'Background location permission:',
      background.status
    );

    if (background.status !== 'granted') {
      background =
        await Location.requestBackgroundPermissionsAsync();
    }

    if (background.status !== 'granted') {
      throw new Error(
        'Background location permission was not granted. Please enable "Allow all the time" in Android settings.'
      );
    }

    console.log('Background location permission: granted');

    // -----------------------------------------
    // 3. CHECK IF TASK IS ALREADY RUNNING
    // -----------------------------------------
    const alreadyRunning =
      await Location.hasStartedLocationUpdatesAsync(
        LOCATION_TASK_NAME
      );

    if (alreadyRunning) {
      console.log(
        'SOS location tracking is already running'
      );
      return;
    }

    // -----------------------------------------
    // 4. START BACKGROUND TRACKING
    // -----------------------------------------
    await Location.startLocationUpdatesAsync(
      LOCATION_TASK_NAME,
      {
        accuracy: Location.Accuracy.High,

        distanceInterval: 10,

        timeInterval: 5000,

        showsBackgroundLocationIndicator: true,

        foregroundService: {
          notificationTitle:
            'Lifeline Emergency Tracking',

          notificationBody:
            'Your location is being shared during an active emergency.',

          notificationColor: '#FF0000',
        },
      }
    );

    console.log(
      'SOS background location tracking STARTED'
    );
  } catch (error) {
    console.error(
      'SOS location error:',
      error
    );

    throw error;
  }
}

export async function stopSOSLocationTracking() {
  try {
    const isRunning =
      await Location.hasStartedLocationUpdatesAsync(
        LOCATION_TASK_NAME
      );

    if (!isRunning) {
      console.log(
        'SOS location tracking is not running'
      );
      return;
    }

    await Location.stopLocationUpdatesAsync(
      LOCATION_TASK_NAME
    );

    console.log(
      'SOS background location tracking STOPPED'
    );
  } catch (error) {
    console.error(
      'Failed to stop SOS location tracking:',
      error
    );
  }
}