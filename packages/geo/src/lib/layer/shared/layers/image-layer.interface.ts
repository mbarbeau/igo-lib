import olLayerImage from 'ol/layer/Image';

import { LayerOptions } from './layer.interface';

import { WMSDataSource } from '../../../datasource/shared/datasources/wms-datasource';
import { WMSDataSourceOptions } from '../../../datasource/shared/datasources/wms-datasource.interface';
import { ImageArcGISRestDataSource } from '../../../datasource/shared/datasources/imagearcgisrest-datasource';
import { ArcGISRestImageDataSourceOptions } from '../../../datasource/shared/datasources/imagearcgisrest-datasource.interface';


export interface ImageLayerOptions extends LayerOptions {
  source?:
    | WMSDataSource
    | ImageArcGISRestDataSource;
  sourceOptions?:
    | WMSDataSourceOptions
    | ArcGISRestImageDataSourceOptions;
  tokenKey?: string;
  ol?: olLayerImage;
  metadata?: {
    url?: string;
    extern?: boolean;
    abstract?: string;
    keywordList?: string[];
  };
}
