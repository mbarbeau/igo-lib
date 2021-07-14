import olSourceImageWMS from 'ol/source/ImageWMS';

import { DataSource } from './datasource';
import { Legend } from './datasource.interface';
import { WMSDataSourceOptions } from './wms-datasource.interface';
import { WFSService } from './wfs.service';

import { OgcFilterWriter } from '../../../filter/shared/ogc-filter';
import { OgcFilterableDataSourceOptions, OgcFiltersOptions } from '../../../filter/shared/ogc-filter.interface';
import { QueryHtmlTarget } from '../../../query/shared/query.enums';
import {
  formatWFSQueryString,
  checkWfsParams,
  defaultFieldNameGeometry
} from './wms-wfs.utils';

import { ObjectUtils } from '@igo2/utils';
import { LegendMapViewOptions } from '../../../layer/shared/layers/layer.interface';
import { BehaviorSubject } from 'rxjs';
import { TimeFilterableDataSourceOptions, TimeFilterOptions } from '../../../filter/shared/time-filter.interface';

export class WMSDataSource extends DataSource {
  public ol: olSourceImageWMS;

  get params(): any {
    return this.options.params as any;
  }

  get queryTitle(): string {
    return (this.options as any).queryTitle
      ? (this.options as any).queryTitle
      : 'title';
  }

  get mapLabel(): string {
    return (this.options as any).mapLabel;
  }

  get queryHtmlTarget(): string {
    return (this.options as any).queryHtmlTarget
      ? (this.options as any).queryHtmlTarget
      : QueryHtmlTarget.BLANK;
  }

  set ogcFilters(value: OgcFiltersOptions) {
    (this.options as OgcFilterableDataSourceOptions).ogcFilters = value;
  }
  get ogcFilters(): OgcFiltersOptions {
    return (this.options as OgcFilterableDataSourceOptions).ogcFilters;
  }

  readonly ogcFilters$: BehaviorSubject<OgcFiltersOptions> = new BehaviorSubject(undefined);

  set timeFilter(value: TimeFilterOptions ) {
    (this.options as TimeFilterableDataSourceOptions).timeFilter = value;
  }
  get timeFilter(): TimeFilterOptions {
    return (this.options as TimeFilterableDataSourceOptions).timeFilter;
  }
  readonly timeFilter$: BehaviorSubject<TimeFilterOptions> = new BehaviorSubject(undefined);

  constructor(
    public options: WMSDataSourceOptions,
    protected wfsService: WFSService
  ) {
    super(options);
    const sourceParams: any = options.params;

    const dpi = sourceParams.DPI || 96;
    sourceParams.DPI = dpi;
    sourceParams.MAP_RESOLUTION = dpi;
    sourceParams.FORMAT_OPTIONS = 'dpi:' + dpi;

    if (options.refreshIntervalSec && options.refreshIntervalSec > 0) {
      setInterval(() => {
        this.refresh();
      }, options.refreshIntervalSec * 1000); // Convert seconds to MS
    }

    let fieldNameGeometry = defaultFieldNameGeometry;

    // ####   START if paramsWFS
    if (options.paramsWFS) {
      const wfsCheckup = checkWfsParams(options, 'wms');
      ObjectUtils.mergeDeep(options.paramsWFS, wfsCheckup.paramsWFS);

      fieldNameGeometry =
        options.paramsWFS.fieldNameGeometry || fieldNameGeometry;

      options.download = Object.assign({}, options.download, {
        dynamicUrl: this.buildDynamicDownloadUrlFromParamsWFS(options)
      });
    } //  ####   END  if paramsWFS

    if (!options.sourceFields || options.sourceFields.length === 0) {
      options.sourceFields = [];
    } else {
      options.sourceFields.forEach(sourceField => {
        sourceField.alias = sourceField.alias
          ? sourceField.alias
          : sourceField.name;
        // to allow only a list of sourcefield with names
      });
    }
    const initOgcFilters = (options as OgcFilterableDataSourceOptions)
      .ogcFilters;
    const ogcFilterWriter = new OgcFilterWriter();

    if (!initOgcFilters) {
      (options as OgcFilterableDataSourceOptions).ogcFilters = ogcFilterWriter.defineOgcFiltersDefaultOptions(
        initOgcFilters,
        fieldNameGeometry,
        'wms'
      );
    } else {
      initOgcFilters.advancedOgcFilters = (initOgcFilters.pushButtons || initOgcFilters.checkboxes
        || initOgcFilters.radioButtons || initOgcFilters.select)
        ? false
        : true;
      if (initOgcFilters.pushButtons){
        initOgcFilters.pushButtons.selectorType = 'pushButton';
      }
      if (initOgcFilters.checkboxes){
        initOgcFilters.checkboxes.selectorType = 'checkbox';
      }
      if (initOgcFilters.radioButtons){
        initOgcFilters.radioButtons.selectorType = 'radioButton';
      }
      if (initOgcFilters.select){
        initOgcFilters.select.selectorType = 'select';
      }
    }

    if (
      sourceParams.LAYERS.split(',').length > 1 &&
      initOgcFilters &&
      initOgcFilters.enabled
    ) {
      console.log('*******************************');
      console.log(
        'BE CAREFULL, YOUR WMS LAYERS (' +
          sourceParams.LAYERS +
          ') MUST SHARE THE SAME FIELDS TO ALLOW ogcFilters TO WORK !! '
      );
      console.log('*******************************');
    }

    if (
      options.paramsWFS &&
      initOgcFilters &&
      initOgcFilters.enabled &&
      initOgcFilters.editable &&
      (options.sourceFields || []).filter(sf => !sf.values).length > 0) {
      this.wfsService.getSourceFieldsFromWFS(options);
    }

    const filterQueryString = ogcFilterWriter.handleOgcFiltersAppliedValue(
      options,
      fieldNameGeometry
    );
    sourceParams.FILTER = filterQueryString;
    this.setOgcFilters(initOgcFilters, true);

    const timeFilterableDataSourceOptions = (options as TimeFilterableDataSourceOptions);
    if (
      timeFilterableDataSourceOptions?.timeFilterable &&
      timeFilterableDataSourceOptions?.timeFilter) {
      this.setTimeFilter(timeFilterableDataSourceOptions.timeFilter, true);
    }
  }

  refresh() {
    this.ol.updateParams({ igoRefresh: Math.random() });
  }

  private buildDynamicDownloadUrlFromParamsWFS(asWFSDataSourceOptions) {
    const queryStringValues = formatWFSQueryString(asWFSDataSourceOptions);
    const downloadUrl = queryStringValues.find(f => f.name === 'getfeature')
      .value;
    return downloadUrl;
  }

  protected createOlSource(): olSourceImageWMS {
    return new olSourceImageWMS(Object.assign({ratio: 1}, this.options));
  }

  setOgcFilters(ogcFilters: OgcFiltersOptions, triggerEvent: boolean = false) {
    this.ogcFilters = ogcFilters;
    if (triggerEvent) {
      this.ogcFilters$.next(this.ogcFilters);
    }
  }

  setTimeFilter(timeFilter: TimeFilterOptions, triggerEvent: boolean = false) {
    this.timeFilter = timeFilter;
    if (triggerEvent) {
      this.timeFilter$.next(this.timeFilter);
    }
  }

  getLegend(style?: string, view?: LegendMapViewOptions): Legend[] {
    let legend = super.getLegend();
    if (legend.length > 0 && (style === undefined && !view?.scale)) {
      return legend;
    }

    let contentDependent = false;
    let projParam;

    if (view?.size && view?.extent && view?.projection && this.options.contentDependentLegend) {
      projParam = this.params.VERSION === '1.3.0' || this.params.VERSION === undefined ? 'CRS' : 'SRS';
      contentDependent = true;
    }

    const sourceParams = this.params;

    let layers = [];
    if (sourceParams.LAYERS !== undefined) {
      layers = sourceParams.LAYERS.split(',');
    }

    const baseUrl = this.options.url.replace(/\?$/, '');
    const params = [
      'REQUEST=GetLegendGraphic',
      'SERVICE=WMS',
      'FORMAT=image/png',
      'SLD_VERSION=1.1.0',
      `VERSION=${sourceParams.VERSION || '1.3.0'}`
    ];
    if (style !== undefined) {
      params.push(`STYLE=${style}`);
    }
    if (view?.scale !== undefined) {
      params.push(`SCALE=${view.scale}`);
    }
    if (contentDependent) {
      params.push(`WIDTH=${view.size[0]}`);
      params.push(`HEIGHT=${view.size[1]}`);
      params.push(`BBOX=${view.extent.join(',')}`);
      params.push(`${projParam}=${view.projection}`);
    }

    legend = layers.map((layer: string) => {
      const separator = baseUrl.match(/\?/) ? '&' : '?';
      return {
        url: `${baseUrl}${separator}${params.join('&')}&LAYER=${layer}`,
        title: layers.length > 1 ? layer : undefined,
        currentStyle: style === undefined ? undefined : style as string
      };
    });

    return legend;
  }

  public onUnwatch() {}
}
