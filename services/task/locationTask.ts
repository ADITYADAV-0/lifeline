import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

export const LOCATION_TASK_NAME = 'lifeline-sos-location';

function getApiUrl(path: string) {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!baseUrl) {
    return null;
  }

  return `${baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')}/api${path}`;
}

TaskManager.defineTask(
  LOCATION_TASK_NAME,
  async ({ data, error }) => {
    if (error) {
      console.error('Background location error:', error);
      return;
    }

    if (!data) {
      return;
    }

    const { locations } = data as {
      locations: Location.LocationObject[];
    };

    for (const location of locations) {
      const { latitude, longitude, accuracy } = location.coords;

      console.log('SOS background location:', {
        latitude,
        longitude,
        accuracy,
      });

      try {
        const apiUrl = getApiUrl('/location');
        console.log('SOS API URL:', apiUrl);

        if (!apiUrl) {
          console.error(
            'EXPO_PUBLIC_API_URL is not configured'
          );
          return;
        }
        
        const response = await fetch(
          apiUrl,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              latitude,
              longitude,
              accuracy,
            }),
          }
        );

        if (!response.ok) {
          console.error(
            'Location upload failed:',
            response.status
          );
        }
      } catch (uploadError) {
        console.error(
          'Failed to upload SOS location:',
          uploadError
        );
      }
    }
  }
);
