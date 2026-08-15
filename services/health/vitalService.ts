import {
    getSdkStatus,
    initialize,
    readRecords,
    requestPermission,
    SdkAvailabilityStatus,
} from 'react-native-health-connect';


import { Platform } from 'react-native';

export type LiveVitals = {
    heartRate: number | null;
    bloodOxygen: number | null;
    connected: boolean;
    source: string | null;
    timestamp: Date | null;
};

export async function getLiveVitals(): Promise<LiveVitals> {
    // ---------------------------------------------------------
    // ANDROID — HEALTH CONNECT
    // ---------------------------------------------------------
    if (Platform.OS === 'android') {
        try {
            const sdkStatus = await getSdkStatus();

            if (sdkStatus !== SdkAvailabilityStatus.SDK_AVAILABLE) {
                console.log('Health Connect is not available');

                return {
                    heartRate: null,
                    bloodOxygen: null,
                    connected: false,
                    source: 'Health Connect',
                    timestamp: null,
                };
            }

            const initialized = await initialize();

            if (!initialized) {
                console.log('Health Connect initialization failed');

                return {
                    heartRate: null,
                    bloodOxygen: null,
                    connected: false,
                    source: 'Health Connect',
                    timestamp: null,
                };
            }

            // Ask user for permission to read health data.
            const permissions = await requestPermission([
                {
                    accessType: 'read',
                    recordType: 'HeartRate',
                },
                {
                    accessType: 'read',
                    recordType: 'OxygenSaturation',
                },
            ]);

            console.log('Health Connect permissions:', permissions);

            const hasHeartRatePermission = permissions.some(
                (permission) =>
                    permission.accessType === 'read' &&
                    permission.recordType === 'HeartRate'
            );

            const hasOxygenPermission = permissions.some(
                (permission) =>
                    permission.accessType === 'read' &&
                    permission.recordType === 'OxygenSaturation'
            );

            console.log('Heart Rate permission:', hasHeartRatePermission);
            console.log(
                'Oxygen Saturation permission:',
                hasOxygenPermission
            );

            // -----------------------------------------------------
            // HEART RATE
            // -----------------------------------------------------

            let heartRateResult = { records: [] as any[] };

            if (hasHeartRatePermission) {
                heartRateResult = await readRecords('HeartRate', {
                    timeRangeFilter: {
                        operator: 'after',
                        startTime: new Date(
                            Date.now() - 24 * 60 * 60 * 1000
                        ).toISOString(),
                    },
                });
            }

            // -----------------------------------------------------
            // BLOOD OXYGEN
            // -----------------------------------------------------

            let oxygenResult = { records: [] as any[] };

            if (hasOxygenPermission) {
                oxygenResult = await readRecords('OxygenSaturation', {
                    timeRangeFilter: {
                        operator: 'after',
                        startTime: new Date(
                            Date.now() - 24 * 60 * 60 * 1000
                        ).toISOString(),
                    },
                });
            }
            console.log('Heart rate records:', heartRateResult);
            console.log('Oxygen records:', oxygenResult);

            // -----------------------------------------------------
            // FIND LATEST HEART RATE
            // -----------------------------------------------------

            let heartRate: number | null = null;
            let heartRateTimestamp: Date | null = null;

            if (heartRateResult.records?.length) {
                const latestRecord =
                    heartRateResult.records[
                    heartRateResult.records.length - 1
                    ];

                if (latestRecord.samples?.length) {
                    const latestSample =
                        latestRecord.samples[
                        latestRecord.samples.length - 1
                        ];

                    heartRate = latestSample.beatsPerMinute;

                    heartRateTimestamp = new Date(
                        latestRecord.endTime,
                    );
                }
            }

            // -----------------------------------------------------
            // FIND LATEST BLOOD OXYGEN
            // -----------------------------------------------------

            let bloodOxygen: number | null = null;

            if (oxygenResult.records?.length) {
                const latestRecord =
                    oxygenResult.records[
                    oxygenResult.records.length - 1
                    ];

                if (
                    latestRecord.percentage != null
                ) {
                    bloodOxygen =
                        latestRecord.percentage * 100;
                }
            }

            const latestOxygenRecord = oxygenResult.records?.length
                ? oxygenResult.records[oxygenResult.records.length - 1]
                : null;

            const timestamp =
                heartRateTimestamp ??
                (latestOxygenRecord
                    ? new Date(latestOxygenRecord.endTime)
                    : null);

            return {
                heartRate,
                bloodOxygen,
                connected:
                    heartRate !== null ||
                    bloodOxygen !== null,
                source: 'Health Connect',
                timestamp,
            };
        } catch (error) {
            console.error(
                'Health Connect error:',
                error,
            );

            return {
                heartRate: null,
                bloodOxygen: null,
                connected: false,
                source: 'Health Connect',
                timestamp: null,
            };
        }
    }

    // ---------------------------------------------------------
    // IOS — HEALTHKIT
    // ---------------------------------------------------------

    if (Platform.OS === 'ios') {
        // We'll implement this when testing on a Mac/iPhone.
        return {
            heartRate: null,
            bloodOxygen: null,
            connected: false,
            source: 'Apple Health',
            timestamp: null,
        };
    }

    // ---------------------------------------------------------
    // WEB / OTHER
    // ---------------------------------------------------------

    return {
        heartRate: null,
        bloodOxygen: null,
        connected: false,
        source: null,
        timestamp: null,
    };
}