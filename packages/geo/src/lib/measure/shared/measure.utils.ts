import { LanguageService } from '@igo2/core';
import * as olstyle from 'ol/style';
import OlGeometry from 'ol/geom/Geometry';
import OlPoint from 'ol/geom/Point';
import OlLineString from 'ol/geom/LineString';
import OlPolygon from 'ol/geom/Polygon';
import OlCircle from 'ol/geom/Circle';
import OlOverlay from 'ol/Overlay';
import { getCenter as olGetCenter } from 'ol/extent';
import {
  getLength as olGetLength,
  getArea as olGetArea
} from 'ol/sphere';

import { Measure } from './measure.interfaces';
import {
  MeasureAreaUnit,
  MeasureAreaUnitAbbreviation,
  MeasureLengthUnit,
  MeasureLengthUnitAbbreviation
} from './measure.enum';

/**
 * Convert value from meters to kilometers
 * @param value Value in meters
 * @returns Value in kilometers
 */
export function metersToKilometers(value: number): number {
  return value * 0.001;
}

/**
 * Convert value from meters to feet
 * @param value Value in meters
 * @returns Value in feet
 */
export function metersToFeet(value: number): number {
  return value * 3.2808;
}

/**
 * Convert value from meters to miles
 * @param value Value in meters
 * @returns Value in miles
 */
export function metersToMiles(value: number): number {
  return value * 0.000621;
}

/**
 * Convert value from square meters to square kilometers
 * @param value Value in square meters
 * @returns Value in square kilometers
 */
export function squareMetersToSquareKilometers(value: number): number {
  return value * 0.000001;
}

/**
 * Convert value from square meters to square miles
 * @param value Value in square meters
 * @returns Value in square miles
 */
export function squareMetersToSquareMiles(value: number): number {
  return value * 0.0000003861;
}

/**
 * Convert value from square meters to square feet
 * @param value Value in square meters
 * @returns Value in square feet
 */
export function squareMetersToSquareFeet(value: number): number {
  return value * 10.764;
}

/**
 * Convert value from square meters to hectares
 * @param value Value in square meters
 * @returns Value in hectares
 */
export function squareMetersToHectares(value: number): number {
  return value * 0.0001;
}

/**
 * Convert value from square meters to acres
 * @param value Value in square meters
 * @returns Value in acres
 */
export function squareMetersToAcres(value: number): number {
  return value * 0.00024711;
}

/**
 * Convert value from meters to the specified length unit
 * @param value Value in meters
 * @param unit Length unit
 * @returns Value in unit
 */
export function metersToUnit(value: number, unit: MeasureLengthUnit): number | undefined {
  const conversionMapper = new Map([
    [MeasureLengthUnit.Meters, (val: number) => val],
    [MeasureLengthUnit.Kilometers, metersToKilometers],
    [MeasureLengthUnit.Miles, metersToMiles],
    [MeasureLengthUnit.Feet, metersToFeet],
  ]);
  const conversion = conversionMapper.get(unit);

  return conversion ? conversion(value) : undefined;
}

/**
 * Convert value from square meters to the specified area unit
 * @param value Value in meters
 * @param unit Area unit
 * @returns Value in unit
 */
export function squareMetersToUnit(value: number, unit: MeasureAreaUnit): number | undefined {
  const conversionMapper = new Map([
    [MeasureAreaUnit.SquareMeters, (val: number) => val],
    [MeasureAreaUnit.SquareKilometers, squareMetersToSquareKilometers],
    [MeasureAreaUnit.SquareMiles, squareMetersToSquareMiles],
    [MeasureAreaUnit.SquareFeet, squareMetersToSquareFeet],
    [MeasureAreaUnit.Hectares, squareMetersToHectares],
    [MeasureAreaUnit.Acres, squareMetersToAcres],
  ]);
  const conversion = conversionMapper.get(unit);

  return conversion ? conversion(value) : undefined;
}

/**
 * This method format a measure to a readable format
 * @param measure Measure
 * @param options Formatting options
 * @returns Formatted measure
 */
export function formatMeasure(
  measure: number,
  options?: {
    decimal?: number;
    unit?: MeasureAreaUnit | MeasureLengthUnit;
    unitAbbr?: boolean;
    locale?: string;
  },
  languageService?: LanguageService) {
  let decimal = options.decimal;
  if (decimal === undefined || decimal < 0) {
    decimal = 1;
  }

  const parts = [];
  if (options.locale !== undefined) {
    parts.push(measure.toLocaleString(options.locale, {
      minimumFractionDigits: decimal,
      maximumFractionDigits: decimal
    }));
  } else {
    parts.push(measure.toFixed(decimal).toString());
  }

  if (options.unit !== undefined && options.unitAbbr === true) {
    if (languageService) {
      parts.push(
        MeasureLengthUnitAbbreviation[options.unit] ?
          languageService.translate.instant('igo.geo.measure.' + MeasureLengthUnitAbbreviation[options.unit]) :
          languageService.translate.instant('igo.geo.measure.' + MeasureAreaUnitAbbreviation[options.unit])
      );
    } else {
      parts.push(
        MeasureLengthUnitAbbreviation[options.unit] || MeasureAreaUnitAbbreviation[options.unit]
      );
    }
  }

  return parts.filter(p => p !== undefined).join(' ');
}

/**
 * Compute best length measure unit for a given measure in meters
 * @param value Value in meters
 * @returns Measure unit
 */
export function computeBestLengthUnit(value: number): MeasureLengthUnit {
  let unit = MeasureLengthUnit.Meters;
  let converted = value;
  const possibleUnits = [MeasureLengthUnit.Kilometers];
  while (converted > 1000 && possibleUnits.length > 0) {
    unit = possibleUnits.pop();
    converted = metersToUnit(value, unit);
  }
  return unit;
}

/**
 * Compute best length measure unit for a given measure in square meters
 * @param value Value in meters
 * @returns Measure unit
 */
export function computeBestAreaUnit(value: number): MeasureAreaUnit {
  let unit = MeasureAreaUnit.SquareMeters;
  let converted = value;
  const possibleUnits = [MeasureAreaUnit.SquareKilometers];
  while (converted > 1000000 && possibleUnits.length > 0) {
    unit = possibleUnits.pop();
    converted = squareMetersToUnit(value, unit);
  }
  return unit;
}

/**
 * Create a default style for a measure interaction
 * @returns OL style
 */
export function createMeasureInteractionStyle(): olstyle.Style {
  return new olstyle.Style({
    stroke: new olstyle.Stroke({
      color: '#ffcc33',
      lineDash: [10, 10],
      width: 2
    }),
    fill:  new olstyle.Fill({
      color: 'rgba(255, 255, 255, 0.2)'
    }),
    image: new olstyle.Circle({
      radius: 5,
      stroke: new olstyle.Stroke({
        color: '#ffcc33',
      }),
      fill: new olstyle.Fill({
        color: 'rgba(255, 255, 255, 0.2)'
      })
    })
  });
}

/**
 * Create a default style for a measure layer
 * @returns OL style
 */
export function createMeasureLayerStyle(): olstyle.Style {
  return new olstyle.Style({
    stroke: new olstyle.Stroke({
      color: '#ffcc33',
      width: 2
    }),
    fill:  new olstyle.Fill({
      color: 'rgba(255, 255, 255, 0.2)'
    })
  });
}

/**
 * Compute the length in meters of an OL geometry with a given projection
 * @param olGeometry Ol geometry
 * @param projection olGeometry's projection
 * @returns Length in meters
 */
export function measureOlGeometryLength(olGeometry: OlGeometry, projection: string): number | undefined {
  if (olGeometry instanceof OlPoint) {
    return undefined;
  }
  if (olGeometry.getFlatCoordinates().length === 0) {
    return undefined;
  }
  return olGetLength(olGeometry, {projection});
}

/**
 * Compute the area in square meters of an OL geometry with a given projection
 * @param olGeometry Ol geometry
 * @param projection olGeometry's projection
 * @returns Area in square meters
 */
export function measureOlGeometryArea(olGeometry: OlGeometry, projection: string): number | undefined {
  if (olGeometry instanceof OlPoint || olGeometry instanceof OlLineString) {
    return undefined;
  }
  if (olGeometry.getFlatCoordinates().length === 0) {
    return undefined;
  }
  return olGetArea(olGeometry, {projection});
}

/**
 * Compute the area (square meters), length (meters) and last length (meters)
 * of an OL geometry with a given projection.
 * @param olGeometry Ol geometry
 * @param projection olGeometry's projection
 * @returns Computed measure
 */
export function measureOlGeometry(olGeometry: OlGeometry, projection: string): Measure {
  const length = measureOlGeometryLength(olGeometry, projection);
  const area = measureOlGeometryArea(olGeometry, projection);

  const lengths = [];
  const coordinates = olGeometry.flatCoordinates;
  const coordinatesLength = coordinates.length;
  for (let i = 0; i <= coordinatesLength - 4; i += 2) {
    const olSegment = new OlLineString([
      [coordinates[i], coordinates[i + 1]],
      [coordinates[i + 2], coordinates[i + 3]]
    ]);

    lengths.push(measureOlGeometryLength(olSegment, projection));
  }

  return {
    area,
    length,
    lengths
  };
}

/**
 * Update an OL geometry midpoints and return an array of those points
 * @param olGeometry OL Geometry
 * @returns OL points
 */
export function updateOlGeometryMidpoints(olGeometry: OlPoint | OlLineString | OlPolygon | OlCircle): OlPoint[] {
  let olMidpoints;
  if (olGeometry instanceof OlPoint) {
    const olMidpointPoint = new OlPoint(olGeometry.flatCoordinates);
    olMidpoints = new Array(1);
    olMidpoints[0] = olMidpointPoint;
  } else  {
    olMidpoints = getOlGeometryMidpoints(olGeometry);
    // TODO: handle multi geometries
    const coordinates = olGeometry.flatCoordinates;
    const midpointsLength = olMidpoints.length;
    for (let i = 0; i < midpointsLength; i++) {
      const j = i * 2;
      const olSegment = new OlLineString([
        [coordinates[j], coordinates[j + 1]],
        [coordinates[j + 2], coordinates[j + 3]]
      ]);

      const midpointCoordinate = olSegment.getCoordinateAt(0.5);
      const olMidpoint = olMidpoints[i];
      if (olMidpoint !== undefined) {
        olMidpoint.setCoordinates(midpointCoordinate);
      } else {
        olMidpoints[i] = new OlPoint(midpointCoordinate);
      }
    }
  }
  return olMidpoints;
}

/**
 * Clear an OL geometry midpoints and return an array of those points
 * @param olGeometry OL Geometry
 */
export function clearOlGeometryMidpoints(olGeometry: OlPoint | OlLineString | OlPolygon | OlCircle) {
  const olMidpoints = olGeometry.get('_midpoints') || [];
  const midpointsLength = olMidpoints.length;
  for (let i = 0; i < midpointsLength; i++) {
    const olMidpoint = olMidpoints[i];
    if (olMidpoint !== undefined) {
      if (olMidpoint !== undefined) {
        clearOlMidpointTooltip(olMidpoint);
      }
    }
  }

  olGeometry.set('_midpoints', undefined, true);

  return olMidpoints;
}

/**
 * Return an array of  OL geometry midpoints, if any
 * @param olGeometry OL Geometry
 * @returns OL points
 */
function getOlGeometryMidpoints(olGeometry: OlPoint | OlLineString | OlPolygon | OlCircle): OlPoint[] {
  let expectedNumber;
  if (olGeometry instanceof OlCircle) {
    expectedNumber = 0;
  } else {
    expectedNumber = Math.max((olGeometry.flatCoordinates.length / 2) - 1, 0);
  }
  // TODO: This works but it's quite messy. If time permits,
  // clean this. Maybe a Tooltip class could handle that
  let olMidpoints = olGeometry.get('_midpoints');

  if (olMidpoints === undefined) {
    if (olGeometry instanceof OlPoint) {
      olMidpoints = new Array(1);
    } else {
      olMidpoints = new Array(expectedNumber);
    }
    olGeometry.set('_midpoints', olMidpoints, true);
    return olMidpoints;
  }

  if (expectedNumber === 0) {
    return olMidpoints;
  }

  if (expectedNumber === olMidpoints.length) {
    return olMidpoints;
  }

  if (expectedNumber > olMidpoints.length) {
    olMidpoints.push(...new Array(expectedNumber - olMidpoints.length));
    return olMidpoints;
  }

  for (let i = expectedNumber; i < olMidpoints.length; i++) {
    const olMidpoint = olMidpoints[expectedNumber];
    if (olMidpoint !== undefined) {
      clearOlMidpointTooltip(olMidpoint);
    }
  }
  olMidpoints.splice(expectedNumber);

  return olMidpoints;
}

/**
 * Remove an OL midpoint's tooltip from the map
 * @param olMidpoint OL Point
 */
function clearOlMidpointTooltip(olMidpoint: OlPoint) {
  const olTooltip = olMidpoint.get('_tooltip');
  if (olTooltip !== undefined) {
    const olMap = olTooltip.getMap();
    if (olMap !== undefined) {
      olMap.removeOverlay(olTooltip);
    }
  }
}

/**
 * Add an OL overlay at each midpoint and return an array of those overlays
 * @param olGeometry OL Geometry
 * @returns OL overlays
 */
export function updateOlTooltipsAtMidpoints(olGeometry: OlPoint | OlLineString | OlPolygon | OlCircle): OlOverlay[] {
  const olMidpoints = updateOlGeometryMidpoints(olGeometry);
  let typeGeom = '';
  if (olGeometry instanceof OlLineString) {
  typeGeom = 'line-';
  } else if (olGeometry instanceof OlPolygon) {
    typeGeom = 'polygone-';
    }
  const olTooltips = olMidpoints.map((olMidpoint: OlPoint) => {
    let olTooltip = olMidpoint.get('_tooltip');
    if (olTooltip === undefined) {
      olTooltip = createOlTooltipAtPoint(olMidpoint, false, typeGeom);
    } else {
      olTooltip.setPosition(olMidpoint.flatCoordinates);
    }
    return olTooltip;
  });
  return olTooltips;
}

/**
 * Return an array of OL overlay at midspoints, if any
 * @param olGeometry OL Geometry
 * @returns OL overlays
 */
export function getOlTooltipsAtMidpoints(olGeometry: OlPoint | OlLineString | OlPolygon | OlCircle): OlOverlay[] {
  const olMidpoints = getOlGeometryMidpoints(olGeometry);
  return olMidpoints.map((olMidpoint: OlPoint) => {
    return olMidpoint ? olMidpoint.get('_tooltip') : undefined;
  });
}

/**
 * Update an OL geometry center and return it
 * @param olGeometry OL Geometry
 * @returns OL point
 */
export function updateOlGeometryCenter(olGeometry: OlPoint | OlLineString | OlPolygon | OlCircle): OlPoint {
  let olCenter = olGeometry.get('_center');
  const centerCoordinate = olGetCenter(olGeometry.getExtent());
  if (olCenter !== undefined) {
    olCenter.setCoordinates(centerCoordinate);
  } else {
    olCenter = new OlPoint(centerCoordinate);
    olGeometry.set('_center', olCenter);
  }

  return olCenter;
}

/**
 * Add an OL overlay at the center of a geometry and return that overlay
 * @param olGeometry OL Geometry
 * @returns OL overlay
 */
export function updateOlTooltipAtCenter(olGeometry: OlPoint | OlLineString | OlPolygon | OlCircle): OlOverlay {
  const olCenter = updateOlGeometryCenter(olGeometry);
  let olTooltip = olCenter.get('_tooltip');
  if (olTooltip === undefined) {
    olTooltip = createOlTooltipAtPoint(olCenter, true);
  } else {
    olTooltip.setPosition(olCenter.flatCoordinates);
  }
  return olTooltip;
}

/**
 * Return an array of OL overlay at midspoints, if any
 * @param olGeometry OL Geometry
 * @returns OL overlays
 */
export function getOlTooltipAtCenter(olGeometry: OlPoint | OlLineString | OlPolygon | OlCircle): OlOverlay {
  const olCenter = olGeometry.get('_center');
  return olCenter ? olCenter.get('_tooltip') : undefined;
}

/**
 * Get all the tooltips of an OL geometry
 * @param olGeometry OL Geometry
 * @returns OL overlays
 */
export function getTooltipsOfOlGeometry(olGeometry: OlPoint | OlLineString | OlPolygon | OlCircle): OlOverlay[] {
  const olTooltips = [].concat(getOlTooltipsAtMidpoints(olGeometry) || []);
  const olCenterTooltip = getOlTooltipAtCenter(olGeometry);
  if (olCenterTooltip !== undefined) {
    olTooltips.push(olCenterTooltip);
  }
  return olTooltips;
}

/**
 * Create an OL overlay at a point and bind the overlay to the point
 * @param olPoint OL Point
 * @returns OL overlay
 */
export function createOlTooltipAtPoint(olPoint: OlPoint, center: boolean = false, srcGeomType: string= ''): OlOverlay {
  const olTooltip = new OlOverlay({
    element: document.createElement('div'),
    offset: [-30, -10],
    className: (center ?
    [ 'igo-map-tooltip',
      'igo-map-tooltip-measure', 'igo-map-tooltip-measure-area'] : ['igo-map-tooltip', 'igo-map-tooltip-measure',
      `igo-map-tooltip-measure-${srcGeomType}segments`]).join(' '),
    stopEvent: false
  });
  olTooltip.setPosition(olPoint.flatCoordinates);
  olPoint.set('_tooltip', olTooltip);

  return olTooltip;
}
