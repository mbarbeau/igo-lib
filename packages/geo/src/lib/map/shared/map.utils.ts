import * as olproj from 'ol/proj';
import { MapBrowserPointerEvent as OlMapBrowserPointerEvent } from 'ol/MapBrowserEvent';
import { MAC } from 'ol/has';

import { MapViewState } from './map.interface';
import { Projection } from './projection.interfaces';

/**
 * This method extracts a coordinate tuple from a string.
 * @param str Any string
 * @param mapProjection string Map Projection
 * @param opts.forceNA boolean Force North America Zone
 * @returns object:
 *             lonLat: Coordinate,
 *             message: Message of error,
 *             radius: radius of the confience of coordinate,
 *             conf: confidence of the coordinate}
 */
export function stringToLonLat(
  str: string,
  mapProjection: string,
  opts: { forceNA?: boolean } = {}
): {
  lonLat: [number, number] | undefined;
  message: string;
  radius: number | undefined;
  conf: number | undefined;
} {
  let lonLat: [number, number];
  let coordStr: string;
  let negativeLon: string;
  let degreesLon: string;
  let minutesLon: string;
  let secondsLon: string;
  let directionLon: string;
  let decimalLon: string;
  let negativeLat: string;
  let degreesLat: string;
  let minutesLat: string;
  let secondsLat: string;
  let directionLat: string;
  let decimalLat: string;
  let zone: string;
  let radius: string;
  let conf: string;
  let lon: any;
  let lat: any;

  const projectionPattern = '(\\s*;\\s*[\\d]{4,6})';
  const toProjection = '4326';
  let projectionStr: string;
  const projectionRegex = new RegExp(projectionPattern, 'g');

  const lonlatCoord = '([-+])?([\\d]{1,3})([,.](\\d+))?';
  const lonLatPattern = `${lonlatCoord}[\\s,]+${lonlatCoord}`;
  const lonLatRegex = new RegExp(`^${lonLatPattern}$`, 'g');

  const dmsCoord =
    '([0-9]{1,2})[:|°]?\\s*([0-9]{1,2})?[:|\'|′|’]?\\s*([0-9]{1,2}(?:.[0-9]+){0,1})?\\s*["|″|”]?\\s*';
  const dmsCoordPattern = `${dmsCoord}([N|S|E|W|O]),?\\s*${dmsCoord}([N|S|E|W|O])`;
  const dmsRegex = new RegExp(`^${dmsCoordPattern}$`, 'gi');

  const patternUtm =
    '(UTM)-?(\\d{1,2})[\\s,]*(\\d+[.,]?\\d+)[\\s,]+(\\d+[.,]?\\d+)';
  const utmRegex = new RegExp(`^${patternUtm}`, 'gi');

  const patternMtm =
    '(MTM)-?(\\d{1,2})[\\s,]*(\\d+[.,]?\\d+)[\\s,]+(\\d+[.,]?\\d+)';
  const mtmRegex = new RegExp(`^${patternMtm}`, 'gi');

  const ddCoord = '([-+])?(\\d{1,3})[,.](\\d+)';
  const patternDd = `${ddCoord}\\s*[,]?\\s*${ddCoord}`;
  const ddRegex = new RegExp(`^${patternDd}`, 'g');

  const dmdCoord =
    '([-+])?(\\d{1,3})[\\s,.]{1}(\\d{1,2})[\\s,.]{1}(\\d{1,2})[.,]?(\\d{1,5})?';
  const patternDmd = `${dmdCoord}\\s*[,.]?\\s*${dmdCoord}`;
  const dmdRegex = new RegExp(`^${patternDmd}`, 'g');

  // tslint:disable:max-line-length
  const patternBELL =
    'LAT\\s*[\\s:]*\\s*([-+])?(\\d{1,2})[\\s.,]?(\\d+)?[\\s.,]?\\s*(\\d{1,2}([.,]\\d+)?)?\\s*(N|S|E|W)?\\s*LONG\\s*[\\s:]*\\s*([-+])?(\\d{1,3})[\\s.,]?(\\d+)?[\\s.,]?\\s*(\\d{1,2}([.,]\\d+)?)?\\s*(N|S|E|W)?\\s*UNC\\s*[\\s:]?\\s*(\\d+)\\s*CONF\\s*[\\s:]?\\s*(\\d{1,3})';
  const bellRegex = new RegExp(`^${patternBELL}?`, 'gi');

  const mmCoord = '([-+]?\\d+)[,.]?(\\d+)?';
  const mmPattern = `${mmCoord}[\\s,]+${mmCoord}`;
  const mmRegex = new RegExp(`^${mmPattern}$`, 'g');

  let isXYCoords = false;

  str = str.toLocaleUpperCase().trim();

  // Extract projection
  if (projectionRegex.test(str)) {
    [coordStr, projectionStr] = str.split(';').map(s => s.trim());
  } else {
    coordStr = str;
  }
  if (lonLatRegex.test(coordStr)) {
    [
      ,
      negativeLon,
      lon,
      ,
      decimalLon,
      negativeLat,
      lat,
      ,
      decimalLat
    ] = coordStr.match(lonLatPattern);

    lon = parseFloat((negativeLon ? negativeLon : '') + lon + '.' + decimalLon);
    lat = parseFloat((negativeLat ? negativeLat : '') + lat + '.' + decimalLat);
  } else if (dmsRegex.test(coordStr)) {
    [
      ,
      degreesLon,
      minutesLon,
      secondsLon,
      directionLon,
      degreesLat,
      minutesLat,
      secondsLat,
      directionLat
    ] = coordStr.match(dmsCoordPattern);

    if (directionLon === 'S' || directionLon === 'N') {
      degreesLon = [degreesLat, (degreesLat = degreesLon)][0];
      minutesLon = [minutesLat, (minutesLat = minutesLon)][0];
      secondsLon = [secondsLat, (secondsLat = secondsLon)][0];
      directionLon = [directionLat, (directionLat = directionLon)][0];
    }

    lon = convertDMSToDD(
      parseFloat(degreesLon),
      parseFloat(minutesLon),
      parseFloat(secondsLon),
      directionLon
    );
    lat = convertDMSToDD(
      parseFloat(degreesLat),
      parseFloat(minutesLat),
      parseFloat(secondsLat),
      directionLat
    );
  } else if (utmRegex.test(coordStr)) {
    isXYCoords = true;
    [, , zone, lon, lat] = coordStr.match(patternUtm);
    const epsgUtm = Number(zone) < 10 ? `EPSG:3260${zone}` : `EPSG:326${zone}`;
    [lon, lat] = olproj.transform(
      [parseFloat(lon), parseFloat(lat)],
      epsgUtm,
      'EPSG:4326'
    );
  } else if (mtmRegex.test(coordStr)) {
    isXYCoords = true;
    [, , zone, lon, lat] = coordStr.match(patternMtm);
    const epsgMtm =
      Number(zone) < 10 ? `EPSG:3218${zone}` : `EPSG:321${80 + Number(zone)}`;
    [lon, lat] = olproj.transform(
      [parseFloat(lon), parseFloat(lat)],
      epsgMtm,
      'EPSG:4326'
    );
  } else if (dmdRegex.test(coordStr)) {
    [
      ,
      negativeLon,
      degreesLon,
      minutesLon,
      secondsLon,
      decimalLon,
      negativeLat,
      degreesLat,
      minutesLat,
      secondsLat,
      decimalLat
    ] = coordStr.match(patternDmd);

    lon = convertDMSToDD(
      parseFloat((negativeLon ? negativeLon : '') + degreesLon),
      parseFloat(minutesLon),
      parseFloat(secondsLon),
      directionLon
    );
    lat = convertDMSToDD(
      parseFloat((negativeLat ? negativeLat : '') + degreesLat),
      parseFloat(minutesLat),
      parseFloat(secondsLat),
      directionLat
    );
  } else if (ddRegex.test(coordStr)) {
    [
      ,
      negativeLon,
      degreesLon,
      decimalLon,
      negativeLat,
      degreesLat,
      decimalLat
    ] = coordStr.match(patternDd);

    lon = convertDMSToDD(
      parseFloat((negativeLon ? negativeLon : '') + degreesLon),
      parseFloat(minutesLon),
      parseFloat(secondsLon),
      directionLon
    );
    lat = convertDMSToDD(
      parseFloat((negativeLat ? negativeLat : '') + degreesLat),
      parseFloat(minutesLat),
      parseFloat(secondsLat),
      directionLat
    );
  } else if (bellRegex.test(coordStr)) {
    [
      ,
      negativeLat,
      degreesLat,
      minutesLat,
      secondsLat,
      ,
      directionLat,
      negativeLon,
      degreesLon,
      minutesLon,
      secondsLon,
      ,
      directionLon,
      radius,
      conf
    ] = coordStr.match(patternBELL);

    // Set default value for North America
    if (!directionLon) {
      directionLon = 'W';
    }

    // Check if real minutes or decimals
    if (minutesLon && minutesLon.length > 2) {
      lon = parseFloat(
        (negativeLon ? negativeLon : '') + degreesLon + '.' + minutesLon
      );
    } else {
      lon = convertDMSToDD(
        parseFloat(degreesLon),
        parseFloat(minutesLon),
        parseFloat(secondsLon),
        directionLon
      );
    }

    if (minutesLat && minutesLat.length > 2) {
      lat = parseFloat(
        (negativeLat ? negativeLat : '') + degreesLat + '.' + minutesLat
      );
    } else {
      lat = convertDMSToDD(
        parseFloat(degreesLat),
        parseFloat(minutesLat),
        parseFloat(secondsLat),
        directionLat
      );
    }
  } else if (mmRegex.test(coordStr)) {
    isXYCoords = true;
    [, lon, decimalLon, lat, decimalLat] = coordStr.match(mmPattern);

    if (decimalLon) {
      lon = parseFloat(lon + '.' + decimalLon);
    }

    if (decimalLat) {
      lat = parseFloat(lat + '.' + decimalLat);
    }
  } else {
    return {
      lonLat: undefined,
      message: '',
      radius: undefined,
      conf: undefined
    };
  }

  if (opts.forceNA && !isXYCoords) {
    // Set a negative coordinate for North America zone
    if (lon > 0 && lat > 0) {
      if (lon > lat) {
        lon = -lon;
      } else {
        lat = -lat;
      }
    }

    // Reverse coordinate to respect lonLat convention
    if (lon > lat) {
      lon = [lat, (lat = lon)][0];
    }
  }

  lonLat = [Number(lon), Number(lat)] as [number, number];

  // Reproject the coordinate if projection parameter have been set and coord is not 4326
  if (
    (projectionStr !== undefined && projectionStr !== toProjection) ||
    (lonLat[0] > 180 || lonLat[0] < -180) ||
    (lonLat[1] > 90 || lonLat[1] < -90)
  ) {
    const source = projectionStr ? 'EPSG:' + projectionStr : mapProjection;
    const dest = 'EPSG:' + toProjection;

    try {
      lonLat = olproj.transform(lonLat, source, dest);
    } catch (e) {
      return {
        lonLat: undefined,
        message: 'Projection ' + source + ' not supported',
        radius: undefined,
        conf: undefined
      };
    }
  }
  if (Math.abs(lonLat[0]) <= 180 && Math.abs(lonLat[1]) <= 90) {
    return {
      lonLat,
      message: '',
      radius: radius ? parseInt(radius, 10) : undefined,
      conf: conf ? parseInt(conf, 10) : undefined
    };
  } else {
    return {
      lonLat: undefined,
      message: 'Coordinate out of Longitude/Latitude bounds',
      radius: undefined,
      conf: undefined
    };
  }
}

/**
 * Convert degrees minutes seconds to dd
 * @param degrees Degrees
 * @param minutes Minutes
 * @param seconds Seconds
 * @param direction Direction
 */
function convertDMSToDD(
  degrees: number,
  minutes: number,
  seconds: number,
  direction: string
) {
  minutes = minutes || 0;
  seconds = seconds || 0;

  const neg = degrees < 0;
  let dd = Math.abs(degrees) + minutes / 60 + seconds / 3600;

  if (neg || direction === 'S' || direction === 'W') {
    dd = -dd;
  } // Don't do anything for N or E
  return dd;
}

/**
 * Convert dd to degrees minutes seconds
 * @param lonLatDD longitude and latitude in dd
 * @param decimal number of decimals for seconds
 * @returns longitude and latitude in dms
 */
export function convertDDToDMS(
  lonLatDD: [number, number], decimal: number = 3
): string[] {
  const lonLatDMS = [];

  lonLatDD.forEach(dd => {
    const degrees = dd < 0 ? Math.ceil(dd) : Math.floor(dd);
    const int = dd < 0 ? (degrees - dd) * 60 : (dd - degrees) * 60;
    const minutes =  Math.floor(int);
    const seconds = ((int - minutes) * 60).toFixed(decimal);

    lonLatDMS.push(`${degrees}° ${minutes}' ${seconds}"`);
  });
  return lonLatDMS;
}

/**
 * Return true of two view states are equal.
 * @param state1 View state
 * @param state2 View state
 * @returns True if the view states are equal
 */
export function viewStatesAreEqual(
  state1: MapViewState,
  state2: MapViewState
): boolean {
  if (state1 === undefined || state2 === undefined) {
    return false;
  }

  const tolerance = 1 / 10000;
  return (
    state1.zoom === state2.zoom &&
    Math.trunc(state1.center[0] / tolerance) ===
      Math.trunc(state2.center[0] / tolerance) &&
    Math.trunc(state1.center[1] / tolerance) ===
      Math.trunc(state2.center[1] / tolerance)
  );
}

/**
 * Format the scale to a human readable text
 * @param Scale of the map
 * @returns Human readable scale text
 */
export function formatScale(scale) {
  scale = Math.round(scale);
  if (scale < 10000) {
    return scale + '';
  }

  scale = Math.round(scale / 1000);
  if (scale < 1000) {
    return scale + 'K';
  }

  scale = Math.round(scale / 1000);
  return scale + 'M';
}

/**
 * Return the resolution from a scale denom
 * @param scale Scale denom
 * @param dpi DPI
 * @returns Resolution
 */
export function getResolutionFromScale(
  scale: number,
  dpi: number = 96
): number {
  const inchesPerMeter = 39.3701;
  return scale / (inchesPerMeter * dpi);
}

/**
 * Return the resolution from a scale denom
 * @param Scale denom
 * @returns Resolution
 */
export function getScaleFromResolution(
  resolution: number,
  unit: string = 'm',
  dpi: number = 96
): number {
  const inchesPerMeter = 39.3701;
  return resolution * olproj.METERS_PER_UNIT[unit] * inchesPerMeter * dpi;
}

/**
 * Returns true if the CTRL key is pushed during an Ol MapBrowserPointerEvent
 * @param event OL MapBrowserPointerEvent
 * @returns Whether the CTRL key is pushed
 */
export function ctrlKeyDown(event: OlMapBrowserPointerEvent): boolean {
  const originalEvent = event.originalEvent;
  return (
    !originalEvent.altKey &&
    (MAC ? originalEvent.metaKey : originalEvent.ctrlKey) &&
    !originalEvent.shiftKey
  );
}

export function roundCoordTo(coord: [number, number], decimal: number = 3) {
  return [coord[0].toFixed(decimal), coord[1].toFixed(decimal)];
}

/**
 * Returns an array of converted coordinates.
 * Conversion is done for every configured projections
 * and for the current UTM zone and MTM zone.
 * @param lonLat [number, number] array of the coordinate to transform.
 * @param projections  Projection[] Array of destination projection.
 * @returns Returns an array of converted coordinates.
 */
export function lonLatConversion(
  lonLat: [number, number],
  projections: Projection[]
): {
  code: string;
  alias: string;
  coord: [number, number];
  igo2CoordFormat: string;
}[] {
  const rawCoord3857 = olproj.transform(lonLat, 'EPSG:4326', 'EPSG:3857');
  const convertedLonLat = [
    {
      code: 'EPSG:3857',
      alias: 'Web Mercator',
      coord: rawCoord3857,
      igo2CoordFormat: `${roundCoordTo(rawCoord3857).join(', ')} ; 3857`
    }
  ];

  // detect the current utm zone.
  const utmZone = utmZoneFromLonLat(lonLat);
  const epsgUtm = utmZone < 10 ? `EPSG:3260${utmZone}` : `EPSG:326${utmZone}`;
  const utmName = `UTM-${utmZone}`;
  const rawCoordUtm = olproj.transform(lonLat, 'EPSG:4326', epsgUtm);
  convertedLonLat.push({
    code: epsgUtm,
    alias: 'UTM',
    coord: rawCoordUtm,
    igo2CoordFormat: `${utmName} ${roundCoordTo(rawCoordUtm).join(', ')}`
  });

  // detect the current mtm zone.
  const mtmZone = mtmZoneFromLonLat(lonLat);
  if (mtmZone) {
    const epsgMtm =
      mtmZone < 10 ? `EPSG:3218${mtmZone}` : `EPSG:321${80 + mtmZone}`;
    const mtmName = `MTM-${mtmZone}`;
    const rawCoordMtm = olproj.transform(lonLat, 'EPSG:4326', epsgMtm);
    convertedLonLat.push({
      code: epsgMtm,
      alias: 'MTM',
      coord: rawCoordMtm,
      igo2CoordFormat: `${mtmName} ${roundCoordTo(rawCoordMtm).join(', ')}`
    });
  }

  projections.forEach(projection => {
    const rawCoord = olproj.transform(lonLat, 'EPSG:4326', projection.code);
    const numericEpsgCode = projection.code.split(':')[1];
    convertedLonLat.push({
      code: projection.code,
      alias: projection.alias || projection.code,
      coord: rawCoord,
      igo2CoordFormat: `${roundCoordTo(rawCoord).join(
        ', '
      )} ; ${numericEpsgCode}`
    });
  });

  return convertedLonLat;
}

/**
 * Detect the current utm zone of the lon/lat coordinate.
 * @param lonLat [number, number] array of the coordinate to detect the UTM zone.
 * @returns number The UTM zone.
 */
export function utmZoneFromLonLat(lonLat: [number, number]) {
  return Math.ceil((lonLat[0] + 180) / 6);
}

/**
 * Detect the current mtm zone of the lon/lat coordinate.
 * @param lonLat [number, number] array of the coordinate to detect the MTM zone.
 * @returns number The MTM zone. Undefined if outside of the mtm application zone.
 */
export function mtmZoneFromLonLat(lonLat: [number, number]) {
  const long = lonLat[0];
  let mtmZone;
  if (long < -51 && long > -54) {
    mtmZone = 1;
  }
  if (long < -54 && long > -57) {
    mtmZone = 2;
  }
  if (long < -57 && long > -60) {
    mtmZone = 3;
  }
  if (long < -60 && long > -63) {
    mtmZone = 4;
  }
  if (long < -63 && long > -66) {
    mtmZone = 5;
  }
  if (long < -66 && long > -69) {
    mtmZone = 6;
  }
  if (long < -69 && long > -72) {
    mtmZone = 7;
  }
  if (long < -72 && long > -75) {
    mtmZone = 8;
  }
  if (long < -75 && long > -78) {
    mtmZone = 9;
  }
  if (long < -78 && long > -81) {
    mtmZone = 10;
  }
  return mtmZone;
}
