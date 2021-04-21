import olSourceTileArcGISRest from 'ol/source/TileArcGISRest';
import olAttribution from 'ol/control/Attribution';

import { DataSourceOptions } from './datasource.interface';

export interface TileArcGISRestDataSourceOptions extends DataSourceOptions {
  // type?: 'tilearcgisrest';
  queryPrecision?: number;
  layer?: string;
  legendInfo?: any;

  params?: any;
  attributions?: olAttribution;
  projection?: string;
  url?: string;
  urls?: string[];

  ol?: olSourceTileArcGISRest;
  idColumn?: string;
}
