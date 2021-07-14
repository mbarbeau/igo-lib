import olSourceVector from 'ol/source/Vector';
import * as OlLoadingStrategy from 'ol/loadingstrategy';
import olProjection from 'ol/proj/Projection';
import * as olproj from 'ol/proj';

import { DataSource } from './datasource';
import { WFSDataSourceOptions } from './wfs-datasource.interface';
import { WFSService } from './wfs.service';

import { OgcFilterWriter } from '../../../filter/shared/ogc-filter';
import { OgcFilterableDataSourceOptions, OgcFiltersOptions } from '../../../filter/shared/ogc-filter.interface';
import {
  formatWFSQueryString,
  defaultFieldNameGeometry,
  checkWfsParams,
  getFormatFromOptions,
  defaultMaxFeatures
} from './wms-wfs.utils';
import { BehaviorSubject } from 'rxjs';
import { AuthInterceptor } from '@igo2/auth';

export class WFSDataSource extends DataSource {
  public ol: olSourceVector;

  set ogcFilters(value: OgcFiltersOptions) {
    (this.options as OgcFilterableDataSourceOptions).ogcFilters = value;
  }
  get ogcFilters(): OgcFiltersOptions {
    return (this.options as OgcFilterableDataSourceOptions).ogcFilters;
  }

  readonly ogcFilters$: BehaviorSubject<OgcFiltersOptions> = new BehaviorSubject(undefined);

  constructor(
    public options: WFSDataSourceOptions,
    protected wfsService: WFSService,
    private authInterceptor?: AuthInterceptor
  ) {
    super(checkWfsParams(options, 'wfs'));

    const ogcFilters = (this.options as OgcFilterableDataSourceOptions).ogcFilters;
    const fieldNameGeometry = this.options.paramsWFS.fieldNameGeometry || defaultFieldNameGeometry;
    const ogcFilterWriter = new OgcFilterWriter();
    (this.options as OgcFilterableDataSourceOptions).ogcFilters =
      ogcFilterWriter.defineOgcFiltersDefaultOptions(ogcFilters, fieldNameGeometry);
    if (
      (this.options as OgcFilterableDataSourceOptions).ogcFilters.enabled &&
      (this.options as OgcFilterableDataSourceOptions).ogcFilters.editable &&
      (options.sourceFields || []).filter(sf => !sf.values).length > 0
    ) {
      this.wfsService.getSourceFieldsFromWFS(this.options);
    }

    if (ogcFilters?.pushButtons){
      ogcFilters.pushButtons.selectorType = 'pushButton';
    }
    if (ogcFilters?.checkboxes){
      ogcFilters.checkboxes.selectorType = 'checkbox';
    }
    if (ogcFilters?.radioButtons){
      ogcFilters.radioButtons.selectorType = 'radioButton';
    }
    if (ogcFilters?.select){
      ogcFilters.select.selectorType = 'select';
    }

    this.setOgcFilters((this.options as OgcFilterableDataSourceOptions).ogcFilters, true);
  }

  protected createOlSource(): olSourceVector {
    const vectorSource = new olSourceVector({
      format: getFormatFromOptions(this.options),
      loader: (extent, resolution, proj: olProjection) => {
        vectorSource.dispatchEvent({ type: 'vectorloading' });
        const paramsWFS = this.options.paramsWFS;
        const wfsProj = paramsWFS.srsName ? new olProjection({ code: paramsWFS.srsName }) : proj;

        const currentExtent = olproj.transformExtent(
          extent,
          proj,
          wfsProj
        );

        paramsWFS.srsName = paramsWFS.srsName || proj.getCode();
        const url = this.buildUrl(
          currentExtent,
          wfsProj,
          (this.options as OgcFilterableDataSourceOptions).ogcFilters);
        let startIndex = 0;
        if (paramsWFS.version === '2.0.0' && paramsWFS.maxFeatures > defaultMaxFeatures) {
          const nbOfFeature = 1000;
          while (startIndex < paramsWFS.maxFeatures) {
            let alteredUrl = url.replace('count=' + paramsWFS.maxFeatures, 'count=' + nbOfFeature);
            alteredUrl = alteredUrl.replace('startIndex=0', '0');
            alteredUrl += '&startIndex=' + startIndex;
            alteredUrl.replace(/&&/g, '&');
            this.getFeatures(vectorSource, currentExtent, wfsProj, proj, alteredUrl, nbOfFeature);
            startIndex += nbOfFeature;
          }
        } else {
          this.getFeatures(vectorSource, currentExtent, wfsProj, proj, url, paramsWFS.maxFeatures);
        }


      },
      strategy: OlLoadingStrategy.bbox
    });
    vectorSource.addEventListener('vectorloading');
    vectorSource.addEventListener('vectorloaded');
    vectorSource.addEventListener('vectorloaderror');
    return vectorSource;
  }

  private getFeatures(vectorSource: olSourceVector, extent, dataProjection, featureProjection, url: string, threshold: number) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    if (this.authInterceptor) {
      this.authInterceptor.interceptXhr(xhr, url);
    }
    const onError = () => {
      vectorSource.dispatchEvent({ type: 'vectorloaderror' });
      vectorSource.removeLoadedExtent(extent);
    };
    xhr.onerror = onError;
    xhr.onload = () => {
      if (xhr.status === 200 && xhr.responseText.length > 0) {
        const features = vectorSource.getFormat().readFeatures(xhr.responseText, {dataProjection, featureProjection});
        // TODO Manage "More feature"
        /*if (features.length === 0 || features.length < threshold ) {
          console.log('No more data to download at this resolution');
        }*/
        vectorSource.addFeatures(features);
        vectorSource.dispatchEvent({ type: 'vectorloaded' });
      } else {
        onError();
      }
    };
    xhr.send();
  }

  setOgcFilters(ogcFilters: OgcFiltersOptions, triggerEvent: boolean = false) {
    this.ogcFilters = ogcFilters;
    if (triggerEvent) {
      this.ogcFilters$.next(this.ogcFilters);
    }
  }

  private buildUrl(extent, proj: olProjection, ogcFilters: OgcFiltersOptions): string {
    const paramsWFS = this.options.paramsWFS;
    const queryStringValues = formatWFSQueryString(this.options, undefined, this.options.paramsWFS.srsName);
    let igoFilters;
    if (ogcFilters && ogcFilters.enabled) {
      igoFilters = ogcFilters.filters;
    }
    const ogcFilterWriter = new OgcFilterWriter();
    const filterOrBox = ogcFilterWriter.buildFilter(igoFilters, extent, proj, ogcFilters.geometryName, this.options);
    let filterOrPush = ogcFilterWriter.handleOgcFiltersAppliedValue(this.options, ogcFilters.geometryName, extent, proj);

    let prefix = 'filter';
    if (!filterOrPush) {
      prefix = 'bbox';
      filterOrPush = extent.join(',') + ',' + proj.getCode();
    }

    paramsWFS.xmlFilter = ogcFilters.advancedOgcFilters ? filterOrBox : `${prefix}=${filterOrPush}`;
    let baseUrl = queryStringValues.find(f => f.name === 'getfeature').value;
    const patternFilter = /(filter|bbox)=.*/gi;
    baseUrl = patternFilter.test(paramsWFS.xmlFilter) ? `${baseUrl}&${paramsWFS.xmlFilter}` : baseUrl;
    this.options.download = Object.assign({}, this.options.download, { dynamicUrl: baseUrl });
    return baseUrl.replace(/&&/g, '&');
  }

  public onUnwatch() { }
}
