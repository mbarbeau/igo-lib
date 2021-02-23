import olSource from 'ol/source/Source';
import { DownloadOptions } from '../../../download/shared/download.interface';
import { OgcFilterOperatorType } from '../../../filter/shared/ogc-filter.enum';

export interface DataSourceOptions {
  type?:
    | 'wms'
    | 'wfs'
    | 'vector'
    | 'wmts'
    | 'xyz'
    | 'osm'
    | 'tiledebug'
    | 'carto'
    | 'arcgisrest'
    | 'imagearcgisrest'
    | 'tilearcgisrest'
    | 'websocket'
    | 'mvt'
    | 'cluster';
  optionsFromCapabilities?: boolean;
  optionsFromApi?: boolean;
  _layerOptionsFromSource?: { [key: string]: string };
  id?: string;
  ol?: olSource;
  minZoom?: number;
  maxZoom?: number;
  minDate?: string;
  maxDate?: string;
  stepDate?: string;
  // TODO: Should those options really belong here?
  sourceFields?: SourceFieldsOptionsParams[];
  download?: DownloadOptions;
}

export interface SourceFieldsOptionsParams {
  name: any;
  alias?: any;
  values?: any;
  excludeFromOgcFilters?: boolean;
  allowedOperatorsType?: OgcFilterOperatorType;
}

export interface Legend {
  collapsed?: boolean;
  display?: boolean;
  url?: string;
  html?: string;
  style?: { [key: string]: string | number };
  title?: string;
  currentStyle?: string;
}

// refer to https://openlayers.org/en/latest/apidoc/module-ol_tilegrid_TileGrid-TileGrid.html
export interface TileGridOptions {
  extent: [number, number, number, number];
  minZoom?: number;
  origin?: [number, number];
  origins?: [number, number][];
  resolutions?: number[];
  sizes?: [number, number][];
  tileSize?: [number, number];
  tileSizes?: [number, number][];
}
