import { Pipe, PipeTransform } from '@angular/core';

import { Layer } from '../../layer/shared/layers/layer';
import { DataSource } from '../../datasource/shared/datasources/datasource';

import { OgcFilterableDataSource } from './ogc-filter.interface';
import { TimeFilterableDataSource } from './time-filter.interface';

@Pipe({
  name: 'filterableDataSource'
})
export class FilterableDataSourcePipe implements PipeTransform {
  transform(value: Layer[], arg: string): Layer[] {
    let layers;

    if (arg === 'time') {
      layers = value.filter((layer: Layer) => {
        const datasource = layer.dataSource as TimeFilterableDataSource;
        return (
          this.isTimeFilterable(datasource) &&
          datasource.options.timeFilter !== undefined &&
          Object.keys(datasource.options.timeFilter).length
        );
      });
    }
    if (arg === 'ogc') {
      layers = value.filter((layer: Layer) => {
        const datasource = layer.dataSource as OgcFilterableDataSource;
        return this.isOgcFilterable(datasource);
      });
    }
    return layers;
  }

  private isTimeFilterable(dataSource: TimeFilterableDataSource) {
    if (dataSource.options.type !== 'wms') {
      return false;
    }
    return dataSource.options.timeFilterable;
  }

  private isOgcFilterable(dataSource: OgcFilterableDataSource): boolean {
    let isOgcFilterable = false;
    if (
      dataSource.options.ogcFilters &&
      dataSource.options.ogcFilters.enabled &&
      dataSource.options.ogcFilters.editable
    ) {
      isOgcFilterable = true;
    }
    if (
      dataSource.options.ogcFilters &&
      dataSource.options.ogcFilters.enabled &&
      (
        dataSource.options.ogcFilters.pushButtons ||
        dataSource.options.ogcFilters.checkboxes ||
        dataSource.options.ogcFilters.radioButtons ||
        dataSource.options.ogcFilters.select)) {
        isOgcFilterable = true;
    }
    return isOgcFilterable;
  }
}
