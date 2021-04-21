import { GeoJsonGeometryTypes } from 'geojson';
import { DirectionsFormat, SourceDirectionsType } from './directions.enum';

export interface DirectionsOptions {
  overview?: boolean;
  steps?: boolean;
  geometries?: string;
  alternatives?: boolean;
}

export interface Stop {
  stopPoint?: string;
  stopProposals?: [];
  directionsText?: string;
  stopCoordinates?: [number, number];
}

export interface Directions {
  id: string;
  source: string;
  sourceType?: SourceDirectionsType;
  order?: number;
  title?: string;
  format?: DirectionsFormat;
  icon?: string;
  projection?: string;
  waypoints?: any;
  distance?: number;
  duration?: number;
  geometry?: DirectionsGeometry;
  legs?: OsrmLeg[];
  steps?: IgoStep[];
  weight?: number;
  weight_name?: string;
}
export interface DirectionsGeometry {
  type: GeoJsonGeometryTypes;
  coordinates: [any];
}
export interface OsrmLeg {
  distance?: number;
  duration?: number;
  steps?: OsrmStep[];
  summary: string;
  weight?: number;
}
export interface IgoStep {
  // REFER TO THIS INTERFACE FOR VARIOUS SOURCE
  distance?: number;
  driving_side?: string;
  duration?: number;
  geometry?: DirectionsGeometry;
  intersections?: OsrmIntersection[];
  maneuver?: OsrmManeuver;
  mode?: string;
  name?: string;
}
export interface OsrmStep {
  distance?: number;
  driving_side?: string;
  duration?: number;
  geometry?: DirectionsGeometry;
  intersections?: OsrmIntersection[];
  maneuver?: OsrmManeuver;
  mode?: string;
  name?: string;
}
export interface OsrmIntersection {
  bearing?: [any];
  entry?: [boolean];
  location?: [number, number];
  out?: number;
}
export interface OsrmManeuver {
  bearing_after?: number;
  bearing_before?: number;
  location?: [number, number];
  modifier?: string;
  type?: string;
}
