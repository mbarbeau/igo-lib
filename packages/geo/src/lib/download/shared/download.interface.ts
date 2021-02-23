import { DataSourceOptions } from '../../datasource/shared/datasources/datasource.interface';
import { ExportFormat } from '../../import-export/shared/export.type';

export interface DownloadOptions {
  url: string;
  dynamicUrl?: string;
  extern?: boolean;
  allowedFormats?: ExportFormat[];
}

export interface DownloadDataSourceOptions {
  download?: DownloadOptions;
}
