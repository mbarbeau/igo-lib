import olFeature from 'ol/Feature';
import { Feature } from '../feature/shared/feature.interfaces';

export interface FeatureCommonVectorStyleOptions extends CommonVectorStyleOptions {
  feature: Feature | olFeature;
}

export interface CommonVectorStyleOptions {
  markerColor?: string | number[];        // marker fill
  markerOpacity?: number;                 // marker opacity, not applied if a rgba is provided
  markerOutlineColor?: string | number[]; // marker contour
  fillColor?: string | number[];          // poly
  fillOpacity?: number;                   // poly fill opacity, not applied if a rgba is provided
  strokeColor?: string | number[];        // line and poly
  strokeOpacity?: number;                 // line and poly, not applied if a rgba is provided
  strokeWidth?: number;                   // line and poly
}
