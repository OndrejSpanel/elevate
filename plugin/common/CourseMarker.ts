import * as _ from 'lodash';
import {IActivityStream} from '../core/scripts/interfaces/IActivityData';
import {Helper} from '../core/scripts/Helper';

export interface ICourseBounds {
    start: number;
    end: number;
}

export class CourseMaker {

    public createGpx(courseName: string, activityStream: IActivityStream, bounds?: ICourseBounds): string {

        if (bounds) {
            activityStream = this.cutStreamsAlongBounds(activityStream, bounds);
        }

        let gpxString: string = '<?xml version="1.0" encoding="UTF-8"?>\n' +
            '<gpx creator="StravistiX" version="1.1" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/GpxExtensions/v3 http://www.garmin.com/xmlschemas/GpxExtensionsv3.xsd http://www.garmin.com/xmlschemas/TrackPointExtension/v1 http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1" xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3">\n' +
            '<metadata>\n' +
            '<author>\n' +
            '<name>StravistiX</name>\n' +
            '<link href="http://thomaschampagne.github.io/stravistix/"/>\n' +
            '</author>\n' +
            '</metadata>\n' +
            '<trk>\n' +
            '<name>' + courseName + '</name>\n' +
            '<trkseg>\n';

        for (let i: number = 0; i < activityStream.latlng.length; i++) {

            // Position
            gpxString += '<trkpt lat="' + activityStream.latlng[i][0] + '" lon="' + activityStream.latlng[i][1] + '">\n';

            // Altitude
            if (activityStream.altitude && _.isNumber(activityStream.altitude[i])) {
                gpxString += '<ele>' + activityStream.altitude[i] + '</ele>\n';
            }

            // Time
            gpxString += '<time>' + (new Date(activityStream.time[i] * 1000)).toISOString() + '</time>\n';

            if (activityStream.heartrate || activityStream.cadence) {

                gpxString += '<extensions>\n';

                if (activityStream.watts && _.isNumber(activityStream.watts[i])) {
                    gpxString += '<power>' + activityStream.watts[i] + '</power>\n';
                }

                gpxString += '<gpxtpx:TrackPointExtension>\n';

                if (activityStream.heartrate && _.isNumber(activityStream.heartrate[i])) {
                    gpxString += '<gpxtpx:hr>' + activityStream.heartrate[i] + '</gpxtpx:hr>\n';
                }
                if (activityStream.cadence && _.isNumber(activityStream.cadence[i])) {
                    gpxString += '<gpxtpx:cad>' + activityStream.cadence[i] + '</gpxtpx:cad>\n';
                }

                gpxString += '</gpxtpx:TrackPointExtension>\n';
                gpxString += '</extensions>\n';
            }

            gpxString += '</trkpt>\n';
        }

        gpxString += '</trkseg>\n';
        gpxString += '</trk>\n';
        gpxString += '</gpx>';

        return gpxString;
    }

    public createTcx(courseName: string, activityStream: IActivityStream, bounds?: ICourseBounds): string {

        if (bounds) {
            activityStream = this.cutStreamsAlongBounds(activityStream, bounds);
        }

        const startTime: string = (new Date(activityStream.time[0])).toISOString();

        let TotalTimeSeconds = 0;
        _.forEach(activityStream.time, (value: number, index: number, list) => {
            let previous = (list[index - 1]) ? list[index - 1] : 0;
            TotalTimeSeconds += list[index] - previous;
        });

        let DistanceMeters = 0;
        _.forEach(activityStream.distance, (value: number, index: number, list) => {
            let previous = (list[index - 1]) ? list[index - 1] : 0;
            DistanceMeters += list[index] - previous;
        });

        let tcxString: string = '<?xml version="1.0" encoding="UTF-8"?>\n' +
            '<TrainingCenterDatabase xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd" xmlns:ns5="http://www.garmin.com/xmlschemas/ActivityGoals/v1" xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2" xmlns:ns2="http://www.garmin.com/xmlschemas/UserProfile/v2" xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
            '<Activities>\n' +
            '<Activity Sport="Other">\n' +
            '<Id>' + courseName + '</Id>\n' +
            '<Lap StartTime="' + startTime + '">\n' +
            '<TotalTimeSeconds>' + TotalTimeSeconds + '</TotalTimeSeconds>\n' +
            '<DistanceMeters>' + DistanceMeters + '</DistanceMeters>\n' +
            '<MaximumSpeed>' + (Helper.convertMetersPerSecondsToKph(_.max(activityStream.velocity_smooth)) * 1000) + '</MaximumSpeed>\n' +
            '<Calories>' + 0 + '</Calories>\n';

        if (activityStream.heartrate && activityStream.heartrate.length > 0) {
            tcxString += '<AverageHeartRateBpm>\n';
            tcxString += '<Value>' + Math.round(_.sum(activityStream.heartrate) / activityStream.heartrate.length) + '</Value>\n';
            tcxString += '</AverageHeartRateBpm>\n';
            tcxString += '<MaximumHeartRateBpm>\n';
            tcxString += '<Value>' + _.max(activityStream.heartrate) + '</Value>\n';
            tcxString += '</MaximumHeartRateBpm>\n';
        }

        tcxString += '<Intensity>Active</Intensity>\n';

        if (activityStream.cadence && activityStream.cadence.length > 0) {
            tcxString += '<Cadence>' + Math.round(_.sum(activityStream.cadence) / activityStream.cadence.length) + '</Cadence>\n';
        }

        tcxString += '<TriggerMethod>Manual</TriggerMethod>\n';
        tcxString += '<Track>\n';

        for (let i: number = 0; i < activityStream.latlng.length; i++) {

            tcxString += '<Trackpoint>\n';

            tcxString += '<Time>' + (new Date(activityStream.time[i] * 1000)).toISOString() + '</Time>\n';

            tcxString += '<Position>\n';
            tcxString += '<LatitudeDegrees>' + activityStream.latlng[i][0] + '</LatitudeDegrees>\n';
            tcxString += '<LongitudeDegrees>' + activityStream.latlng[i][1] + '</LongitudeDegrees>\n';
            tcxString += '</Position>\n';

            if (activityStream.altitude && _.isNumber(activityStream.altitude[i])) {
                tcxString += '<AltitudeMeters>' + activityStream.altitude[i] + '</AltitudeMeters>\n';
            }

            tcxString += '<DistanceMeters>' + activityStream.distance[i] + '</DistanceMeters>\n';

            if (activityStream.cadence && _.isNumber(activityStream.cadence[i])) {
                tcxString += '<Cadence>' + activityStream.cadence[i] + '</Cadence>\n';
            }

            if (activityStream.heartrate && _.isNumber(activityStream.heartrate[i])) {
                tcxString += '<HeartRateBpm>\n';
                tcxString += '<Value>' + activityStream.heartrate[i] + '</Value>\n';
                tcxString += '</HeartRateBpm>\n';
            }

            tcxString += '<Extensions>\n';
            tcxString += '<TPX xmlns="http://www.garmin.com/xmlschemas/ActivityExtension/v2">\n';
            tcxString += '<Speed>' + activityStream.velocity_smooth[i] + '</Speed>\n';

            if (activityStream.watts && _.isNumber(activityStream.watts[i])) {
                tcxString += '<Watts>' + activityStream.watts[i] + '</Watts>\n';
            }

            tcxString += '</TPX>\n';
            tcxString += '</Extensions>\n';
            tcxString += '</Trackpoint>\n';
        }

        tcxString += '</Track>\n';
        tcxString += '</Lap>\n';
        tcxString += '</Activity>\n';
        tcxString += '</Activities>\n';
        tcxString += '</TrainingCenterDatabase>\n';

        return tcxString;
    }

    protected cutStreamsAlongBounds(activityStream: IActivityStream, bounds: ICourseBounds): IActivityStream {

        if (!_.isEmpty(activityStream.velocity_smooth)) {
            activityStream.velocity_smooth = activityStream.velocity_smooth.slice(bounds.start, bounds.end);
        }

        if (!_.isEmpty(activityStream.time)) {
            activityStream.time = activityStream.time.slice(bounds.start, bounds.end);
        }

        if (!_.isEmpty(activityStream.latlng)) {
            activityStream.latlng = activityStream.latlng.slice(bounds.start, bounds.end);
        }

        if (!_.isEmpty(activityStream.heartrate)) {
            activityStream.heartrate = activityStream.heartrate.slice(bounds.start, bounds.end);
        }

        if (!_.isEmpty(activityStream.watts)) {
            activityStream.watts = activityStream.watts.slice(bounds.start, bounds.end);
        }

        if (!_.isEmpty(activityStream.watts_calc)) {
            activityStream.watts_calc = activityStream.watts_calc.slice(bounds.start, bounds.end);
        }

        if (!_.isEmpty(activityStream.cadence)) {
            activityStream.cadence = activityStream.cadence.slice(bounds.start, bounds.end);
        }

        if (!_.isEmpty(activityStream.grade_smooth)) {
            activityStream.grade_smooth = activityStream.grade_smooth.slice(bounds.start, bounds.end);
        }

        if (!_.isEmpty(activityStream.altitude)) {
            activityStream.altitude = activityStream.altitude.slice(bounds.start, bounds.end);
        }

        if (!_.isEmpty(activityStream.distance)) {
            activityStream.distance = activityStream.distance.slice(bounds.start, bounds.end);
        }

        if (!_.isEmpty(activityStream.altitude_smooth)) {
            activityStream.altitude_smooth = activityStream.altitude_smooth.slice(bounds.start, bounds.end);
        }

        return activityStream;
    }

}
