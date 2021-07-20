import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams
} from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Cacheable } from 'ngx-cacheable';

import { WMSCapabilities, WMTSCapabilities, EsriJSON } from 'ol/format';
import { optionsFromCapabilities } from 'ol/source/WMTS.js';
import olAttribution from 'ol/control/Attribution';

import { ObjectUtils } from '@igo2/utils';
import { MapService } from '../../map/shared/map.service';
import { getResolutionFromScale } from '../../map/shared/map.utils';
import { EsriStyleGenerator } from '../utils/esri-style-generator';
import {
  QueryFormat,
  QueryFormatMimeType
} from '../../query/shared/query.enums';

import {
  WMTSDataSourceOptions,
  WMSDataSourceOptions,
  CartoDataSourceOptions,
  ArcGISRestDataSourceOptions,
  TileArcGISRestDataSourceOptions,
  ArcGISRestImageDataSourceOptions
} from './datasources';
import {
  LegendOptions,
  ItemStyleOptions
} from '../../layer/shared/layers/layer.interface';
import {
  TimeFilterType,
  TimeFilterStyle
} from '../../filter/shared/time-filter.enum';
import * as olproj from 'ol/proj';

export enum TypeCapabilities {
  wms = 'wms',
  wmts = 'wmts',
  arcgisrest = 'esriJSON',
  imagearcgisrest = 'esriJSON',
  tilearcgisrest = 'esriJSON'
}

export type TypeCapabilitiesStrings = keyof typeof TypeCapabilities;

@Injectable({
  providedIn: 'root'
})
export class CapabilitiesService {
  private parsers = {
    wms: new WMSCapabilities(),
    wmts: new WMTSCapabilities(),
    esriJSON: new EsriJSON()
  };

  constructor(private http: HttpClient, private mapService: MapService) {}

  getWMSOptions(
    baseOptions: WMSDataSourceOptions
  ): Observable<WMSDataSourceOptions> {
    const url = baseOptions.url;
    const version = (baseOptions.params as any).VERSION;

    return this.getCapabilities('wms', url, version).pipe(
      map((capabilities: any) => {
        return capabilities
          ? this.parseWMSOptions(baseOptions, capabilities)
          : undefined;
      })
    );
  }

  getWMTSOptions(
    baseOptions: WMTSDataSourceOptions
  ): Observable<WMTSDataSourceOptions> {
    const url = baseOptions.url;
    const version = baseOptions.version;

    const options = this.getCapabilities('wmts', url, version).pipe(
      map((capabilities: any) => {
        return capabilities
          ? this.parseWMTSOptions(baseOptions, capabilities)
          : undefined;
      })
    );
    return options;
  }

  getCartoOptions(
    baseOptions: CartoDataSourceOptions
  ): Observable<CartoDataSourceOptions> {
    const baseUrl =
      'https://' +
      baseOptions.account +
      '.carto.com/api/v2/viz/' +
      baseOptions.mapId +
      '/viz.json';

    return this.http
      .jsonp(baseUrl, 'callback')
      .pipe(
        map((cartoOptions: any) =>
          this.parseCartoOptions(baseOptions, cartoOptions)
        )
      );
  }

  getArcgisOptions(
    baseOptions: ArcGISRestDataSourceOptions
  ): Observable<ArcGISRestDataSourceOptions> {
    const baseUrl = baseOptions.url + '/' + baseOptions.layer + '?f=json';
    const modifiedUrl = baseOptions.url.replace('FeatureServer', 'MapServer');
    const legendUrl = modifiedUrl + '/legend?f=json';
    const serviceCapabilities = this.getCapabilities('arcgisrest', baseOptions.url);
    const arcgisOptions = this.http.get(baseUrl);
    const legend = this.http.get(legendUrl).pipe(
      map((res: any) => res),
      catchError((err) => {
        console.log('No legend associated with this Feature Service');
        return of(err);
      })
    );
    return forkJoin([arcgisOptions, legend, serviceCapabilities]).pipe(
      map((res: any) => {
        return this.parseArcgisOptions(baseOptions, res[0], res[1], res[2]);
      })
    );
  }

  getImageArcgisOptions(
    baseOptions: ArcGISRestImageDataSourceOptions
  ): Observable<ArcGISRestImageDataSourceOptions> {
    const baseUrl = baseOptions.url + '/' + baseOptions.layer + '?f=json';
    const modifiedUrl = baseOptions.url.replace('FeatureServer', 'MapServer');
    const legendUrl = modifiedUrl + '/legend?f=json';
    const serviceCapabilities = this.getCapabilities('imagearcgisrest', baseOptions.url);
    const arcgisOptions = this.http.get(baseUrl);
    const legend = this.http.get(legendUrl).pipe(
      map((res: any) => res),
      catchError((err) => {
        console.log('No legend associated with this Image Service');
        return of(err);
      })
    );
    return forkJoin([arcgisOptions, legend, serviceCapabilities]).pipe(
      map((res: any) => {
        return this.parseTileOrImageArcgisOptions(baseOptions, res[0], res[1], res[2]);
      })
    );
  }

  getTileArcgisOptions(
    baseOptions: TileArcGISRestDataSourceOptions
  ): Observable<TileArcGISRestDataSourceOptions> {
    const baseUrl = baseOptions.url + '/' + baseOptions.layer + '?f=json';
    const legendUrl = baseOptions.url + '/legend?f=json';
    const serviceCapabilities = this.getCapabilities('tilearcgisrest', baseOptions.url);
    const arcgisOptions = this.http.get(baseUrl);
    const legendInfo = this.http.get(legendUrl).pipe(
      map((res: any) => res),
      catchError((err) => {
        console.log('No legend associated with this Tile Service');
        return of(err);
      })
    );
    return forkJoin([arcgisOptions, legendInfo, serviceCapabilities]).pipe(
      map((res: any) =>
        this.parseTileOrImageArcgisOptions(baseOptions, res[0], res[1], res[2])
      )
    );
  }

  @Cacheable({
    maxCacheCount: 20
  })
  getCapabilities(
    service: TypeCapabilitiesStrings,
    baseUrl: string,
    version?: string
  ): Observable<any> {
    const params = new HttpParams({
      fromObject: {
        request: 'GetCapabilities',
        service: service.toUpperCase(),
        version: version || '1.3.0',
        _i: 'true'
      }
    });

    let request;
    if (TypeCapabilities[service] === 'esriJSON') {
      request = this.http.get(baseUrl + '?f=json');
    } else {
      request = this.http.get(baseUrl, {
        params,
        responseType: 'text'
      });
    }

    return request.pipe(
      map((res) => {
        if (TypeCapabilities[service] === 'esriJSON') {
          return res as object;
        }
        if (
          String(res).toLowerCase().includes('serviceexception') &&
          String(res).toLowerCase().includes('access denied')
        ) {
          throw {
            error: {
              message: 'Service error getCapabilities: Access is denied'
            }
          };
        } else {
          return this.parsers[service].read(res);
        }
      }),
      catchError((e) => {
        if (typeof e.error !== 'undefined') {
          e.error.caught = true;
        }
        throw e;
      })
    );
  }

  private parseWMSOptions(
    baseOptions: WMSDataSourceOptions,
    capabilities: any
  ): WMSDataSourceOptions {
    const layers = (baseOptions.params as any).LAYERS;
    const layer = this.findDataSourceInCapabilities(
      capabilities.Capability.Layer,
      layers
    );

    if (!layer) {
      throw {
        error: {
          message: 'Layer not found'
        }
      };
    }
    const metadata = layer.DataURL ? layer.DataURL[0] : undefined;
    const abstract = layer.Abstract ? layer.Abstract : undefined;
    const keywordList = layer.KeywordList ? layer.KeywordList : undefined;
    let queryable = layer.queryable;
    const timeFilter = this.getTimeFilter(layer);
    const timeFilterable = timeFilter && Object.keys(timeFilter).length > 0;
    const legendOptions = layer.Style ? this.getStyle(layer.Style) : undefined;
    let isExtentInGeographic = true;
    if (layer.EX_GeographicBoundingBox) {
      layer.EX_GeographicBoundingBox.forEach((coord, index) => {
        if (index < 2 && (coord > 180 || coord < -180)) {
          isExtentInGeographic = false;
        }
        if (index >= 2 && (coord > 90 || coord < -90)) {
          isExtentInGeographic = false;
        }
      });
    } else {
      isExtentInGeographic = false;
    }

    const extent = isExtentInGeographic ?
        olproj.transformExtent(layer.EX_GeographicBoundingBox, 'EPSG:4326', this.mapService.getMap().projection) :
        undefined;

    let queryFormat: QueryFormat;
    const queryFormatMimeTypePriority = [
      QueryFormatMimeType.GEOJSON,
      QueryFormatMimeType.GEOJSON2,
      QueryFormatMimeType.GML3,
      QueryFormatMimeType.GML2,
      QueryFormatMimeType.JSON,
      QueryFormatMimeType.HTML
    ];

    for (const mimeType of queryFormatMimeTypePriority) {
      if (
        capabilities.Capability.Request.GetFeatureInfo.Format.indexOf(
          mimeType
        ) !== -1
      ) {
        const keyEnum = Object.keys(QueryFormatMimeType).find(
          (key) => QueryFormatMimeType[key] === mimeType
        );
        queryFormat = QueryFormat[keyEnum];
        break;
      }
    }
    if (!queryFormat) {
      queryable = false;
    }

    const options: WMSDataSourceOptions = ObjectUtils.removeUndefined({
      _layerOptionsFromSource: {
        title: layer.Title,
        maxResolution: getResolutionFromScale(layer.MaxScaleDenominator),
        minResolution: getResolutionFromScale(layer.MinScaleDenominator),
        extent,
        metadata: {
          url: metadata ? metadata.OnlineResource : undefined,
          extern: metadata ? true : undefined,
          abstract,
          keywordList
        },
        legendOptions
      },
      queryable,
      queryFormat,
      timeFilter: timeFilterable ? timeFilter : undefined,
      timeFilterable: timeFilterable ? true : undefined,
      minDate: timeFilterable ? timeFilter.min : undefined,
      maxDate: timeFilterable ? timeFilter.max : undefined,
      stepDate: timeFilterable ? timeFilter.step : undefined
    });

    return ObjectUtils.mergeDeep(options, baseOptions);
  }

  private parseWMTSOptions(
    baseOptions: WMTSDataSourceOptions,
    capabilities: any
  ): WMTSDataSourceOptions {
    // Put Title source in _layerOptionsFromSource. (For source & catalog in _layerOptionsFromSource, if not already on config)
    const layer = capabilities.Contents.Layer.find(
      (el) => el.Identifier === baseOptions.layer
    );

    const options = optionsFromCapabilities(capabilities, baseOptions);

    const ouputOptions = Object.assign(options, baseOptions);
    const sourceOptions = ObjectUtils.removeUndefined({
      _layerOptionsFromSource: {
        title: layer.Title
      }
    });

    return ObjectUtils.mergeDeep(sourceOptions, ouputOptions);
  }

  private parseCartoOptions(
    baseOptions: CartoDataSourceOptions,
    cartoOptions: any
  ): CartoDataSourceOptions {
    const layers = [];
    const params = cartoOptions.layers[1].options.layer_definition;
    params.layers.forEach((element) => {
      layers.push({
        type: element.type.toLowerCase(),
        options: element.options,
        legend: element.legend
      });
    });
    const options = ObjectUtils.removeUndefined({
      config: {
        version: params.version,
        layers
      }
    });
    return ObjectUtils.mergeDeep(options, baseOptions);
  }

  private parseArcgisOptions(
    baseOptions: ArcGISRestDataSourceOptions,
    arcgisOptions: any,
    serviceCapabilities: any,
    legend?: any
  ): ArcGISRestDataSourceOptions {
    const title = arcgisOptions.name;
    const legendInfo = legend.layers ? legend : undefined;
    const styleGenerator = new EsriStyleGenerator();
    const units = arcgisOptions.units === 'esriMeters' ? 'm' : 'degrees';
    const style = styleGenerator.generateStyle(arcgisOptions, units);
    const attributions = new olAttribution({
      html: arcgisOptions.copyrightText
    });
    let timeExtent;
    let timeFilter;
    if (arcgisOptions.timeInfo) {
      const time = arcgisOptions.timeInfo.timeExtent;
      timeExtent = time[0] + ',' + time[1];
      const min = new Date();
      min.setTime(time[0]);
      const max = new Date();
      max.setTime(time[1]);
      timeFilter = {
        min: min.toUTCString(),
        max: max.toUTCString(),
        range: true,
        type: TimeFilterType.DATETIME,
        style: TimeFilterStyle.CALENDAR
      };
    }
    const params = Object.assign(
      {},
      {
        legendInfo,
        style,
        timeFilter,
        timeExtent,
        attributions
      }
    );
    const options = ObjectUtils.removeUndefined({
      params,
      _layerOptionsFromSource: {
        title,
        minResolution: getResolutionFromScale(arcgisOptions.maxScale),
        maxResolution: getResolutionFromScale(arcgisOptions.minScale),
        metadata: {
          extern: false,
          abstract: arcgisOptions.description || serviceCapabilities.serviceDescription
        },
      },
      sourceFields: arcgisOptions.fields,
      queryTitle: arcgisOptions.displayField
    });
    return ObjectUtils.mergeDeep(options, baseOptions);
  }

  private parseTileOrImageArcgisOptions(
    baseOptions: TileArcGISRestDataSourceOptions | ArcGISRestImageDataSourceOptions,
    arcgisOptions: any,
    legend: any,
    serviceCapabilities: any
  ): TileArcGISRestDataSourceOptions | ArcGISRestImageDataSourceOptions {
    const title = arcgisOptions.name;
    const legendInfo = legend.layers ? legend : undefined;
    const attributions = new olAttribution({
      html: arcgisOptions.copyrightText
    });
    let timeExtent;
    let timeFilter;
    if (arcgisOptions.timeInfo) {
      const time = arcgisOptions.timeInfo.timeExtent;
      timeExtent = time[0] + ',' + time[1];
      const min = new Date();
      min.setTime(time[0]);
      const max = new Date();
      max.setTime(time[1]);
      timeFilter = {
        min: min.toUTCString(),
        max: max.toUTCString(),
        range: true,
        type: TimeFilterType.DATETIME,
        style: TimeFilterStyle.CALENDAR
      };
    }
    const params = Object.assign(
      {},
      {
        LAYERS: baseOptions.layer ? 'show:' + baseOptions.layer : undefined,
        time: timeExtent
      }
    );
    const options = ObjectUtils.removeUndefined({
      params,
      _layerOptionsFromSource: {
        title,
        minResolution: getResolutionFromScale(arcgisOptions.maxScale),
        maxResolution: getResolutionFromScale(arcgisOptions.minScale),
        metadata: {
          extern: false,
          abstract: arcgisOptions.description || serviceCapabilities.serviceDescription
        },
      },
      legendInfo,
      timeFilter,
      attributions,
      sourceFields: arcgisOptions.fields,
      queryTitle: arcgisOptions.displayField
    });
    return ObjectUtils.mergeDeep(options, baseOptions);
  }

  private findDataSourceInCapabilities(layerArray, name): any {
    if (Array.isArray(layerArray)) {
      let layer;
      layerArray.find((value) => {
        layer = this.findDataSourceInCapabilities(value, name);
        return layer !== undefined;
      }, this);

      return layer;
    } else if (layerArray.Layer) {
      return this.findDataSourceInCapabilities(layerArray.Layer, name);
    } else {
      if (layerArray.Name && layerArray.Name === name) {
        return layerArray;
      }
      return undefined;
    }
  }

  getTimeFilter(layer) {
    let dimension;

    if (layer.Dimension) {
      const timeFilter: any = {};
      dimension = layer.Dimension[0];

      if (dimension.values) {
        const minMaxDim = dimension.values.split('/');
        timeFilter.min = minMaxDim[0] !== undefined ? minMaxDim[0] : undefined;
        timeFilter.max = minMaxDim[1] !== undefined ? minMaxDim[1] : undefined;
        timeFilter.step = minMaxDim[2] !== undefined ? minMaxDim[2] : undefined;
      }

      if (dimension.default) {
        timeFilter.value = dimension.default;
      }
      return timeFilter;
    }
  }

  getStyle(Style): LegendOptions {
    const styleOptions: ItemStyleOptions[] = Style.map((style) => {
      return {
        name: style.Name,
        title: style.Title
      };
    })
      // Handle repeat the style "default" in output  (MapServer or OpenLayer)
      .filter(
        (item, index, self) =>
          self.findIndex((i: ItemStyleOptions) => i.name === item.name) ===
          index
      );

    const legendOptions: LegendOptions = {
      stylesAvailable: styleOptions
    } as LegendOptions;

    return legendOptions;
  }
}
