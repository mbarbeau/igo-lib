import { Injectable } from '@angular/core';

import olProjection from 'ol/proj/Projection';
import * as olproj from 'ol/proj';

import { MessageService, LanguageService } from '@igo2/core';

import { Layer } from '../../layer/shared';
import { OgcFilterWriter, OgcFilterableDataSourceOptions } from '../../filter/shared';

import { DataSourceOptions } from '../../datasource/shared/datasources/datasource.interface';

@Injectable({
  providedIn: 'root'
})
export class DownloadService {

  constructor(
    private messageService: MessageService,
    private languageService: LanguageService
  ) {}

  open(layer: Layer) {
    const translate = this.languageService.translate;
    const title = translate.instant('igo.geo.download.title');
    this.messageService.success(
      translate.instant('igo.geo.download.start'),
      title
    );

    const DSOptions: DataSourceOptions = layer.dataSource.options;
    if (Object.keys(DSOptions.download).length > 0) {
      if (
        DSOptions.download.dynamicUrl &&
        DSOptions.download.url === undefined
      ) {
        let wfsOptions;
        let currentProj = new olProjection({ code: layer.map.projection });
        const paramsWFS = (layer.dataSource.options as any).paramsWFS;
        if (paramsWFS && Object.keys(paramsWFS).length > 0
        ) {
          currentProj = paramsWFS.srsName ? new olProjection({ code: paramsWFS.srsName }) : currentProj;
          wfsOptions = (layer.dataSource.options as any).paramsWFS;
        } else {
          wfsOptions = (layer.dataSource.options as any).params;
        }

        const currentExtent = olproj.transformExtent(
          layer.map.viewController.getExtent(),
          new olProjection({ code: layer.map.projection }),
          currentProj
        );
        const outputFormatDownload =
          wfsOptions.outputFormatDownload === undefined
            ? wfsOptions.outputFormat === undefined  ? '' : 'outputformat=' + wfsOptions.outputFormat
            : 'outputformat=' + wfsOptions.outputFormatDownload;

        const baseurl = DSOptions.download.dynamicUrl
          .replace(/&?outputformat=[^&]*/gi, '')
          .replace(/&?filter=[^&]*/gi, '')
          .replace(/&?bbox=[^&]*/gi, '');

        const ogcFilters = (layer.dataSource.options as OgcFilterableDataSourceOptions).ogcFilters;

        let filterQueryString;
        filterQueryString = new OgcFilterWriter()
        .handleOgcFiltersAppliedValue(
          layer.dataSource.options,
          ogcFilters.geometryName,
          currentExtent,
          currentProj);
        if (!filterQueryString) {
          // Prevent getting all the features for empty filter
            filterQueryString = new OgcFilterWriter().buildFilter(
            undefined,
            currentExtent,
            currentProj,
            ogcFilters.geometryName
          );
        } else {
          filterQueryString = 'filter=' + encodeURIComponent(filterQueryString);
        }
        window.open(
          `${baseurl}&${filterQueryString}&${outputFormatDownload}`,
          '_blank'
        );
      } else if (DSOptions.download) {
        window.open(DSOptions.download.url, '_blank');
      }
    }
  }
}
