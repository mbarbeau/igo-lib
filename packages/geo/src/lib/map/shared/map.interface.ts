export type MapExtent = [number, number, number, number];

export interface MapViewOptions {
  projection?: string;
  center?: [number, number];
  maxZoomOnExtent?: number;
  geolocate?: boolean;
  buffer?: Buffer;
  alwaysTracking?: boolean;
  constrainRotation?: boolean | number;
  enableRotation?: boolean;
  extent?: MapExtent;
  maxLayerZoomExtent?: MapExtent;
  maxResolution?: number;
  minResolution?: number;
  maxZoom?: number;
  minZoom?: number;
  resolution?: number;
  resolutions?: number[];
  rotation?: number;
  zoom?: number;
  zoomFactor?: number;
}

export interface MapViewState {
  resolution: number;
  center: [number, number];
  zoom: number;
}

export interface MapOptions {
  view?: MapViewOptions;
  controls?: MapControlsOptions;
  overlay?: boolean;
  interactions?: boolean;
}

export interface MapControlsOptions {
  attribution?: boolean | MapAttributionOptions;
  scaleLine?: boolean | MapScaleLineOptions;
}

export interface MapScaleLineOptions {
  className?: string;
  minWidth?: number;
  target?: Element;
  units?: string;
  bar?: boolean;
  steps?: number;
  text?: boolean;
}

export interface MapAttributionOptions {
  html?: string;
  collapsed: boolean;
}

export interface Buffer {
  bufferRadius?: number;
  bufferStroke?: [number, number, number, number];
  bufferFill?: [number, number, number, number];
  showBufferRadius?: boolean;
}
