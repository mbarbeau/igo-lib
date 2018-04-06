import { DataSourceContext,
         TimeFilterableDataSourceOptions,
         QueryableDataSourceOptions } from './datasource.interface';

export interface WMSDataSourceOptions extends ol.olx.source.ImageWMSOptions,
    TimeFilterableDataSourceOptions, QueryableDataSourceOptions {

  optionsFromCapabilities?: boolean;
}

export interface WMSDataSourceContext extends DataSourceContext, WMSDataSourceOptions {}
