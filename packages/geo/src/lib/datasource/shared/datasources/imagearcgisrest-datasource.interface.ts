import ImageArcGISRest from 'ol/source/ImageArcGISRest';
import olAttribution from 'ol/control/Attribution';

import { DataSourceOptions } from './datasource.interface';

export interface ArcGISRestImageDataSourceOptions extends DataSourceOptions {
  // type?: 'imagearcgisrest';
  queryPrecision?: number;
  layer?: string;
  legendInfo?: any;
  params?: any;
  attributions?: olAttribution;
  projection?: string;
  url?: string;
  ol?: ImageArcGISRest;
  idColumn?: string;
  options?: any;
}
