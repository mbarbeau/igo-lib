import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { Observable, BehaviorSubject, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { LanguageService, StorageService } from '@igo2/core';
import { ObjectUtils } from '@igo2/utils';

import { getResolutionFromScale } from '../../../map/shared/map.utils';
import { LAYER } from '../../../layer';
import { QueryableDataSourceOptions, QueryFormat } from '../../../query';
import { QueryHtmlTarget } from './../../../query/shared/query.enums';

import { SearchResult } from '../search.interfaces';
import { SearchSource, TextSearch } from './source';
import { TextSearchOptions } from './source.interfaces';
import {
  ILayerSearchSourceOptions,
  ILayerData,
  ILayerItemResponse,
  ILayerServiceResponse,
  ILayerDataSource
} from './ilayer.interfaces';
import { computeTermSimilarity } from '../search.utils';

@Injectable()
export class ILayerSearchResultFormatter {
  constructor(private languageService: LanguageService) {}

  formatResult(data: ILayerData): ILayerData {
    const allowedKey = [
      'title',
      'abstract',
      'groupTitle',
      'metadataUrl',
      'downloadUrl',
      'urlInfo',
      'name'
    ];

    const property = Object.entries(data.properties)
      .filter(([key]) => allowedKey.indexOf(key) !== -1)
      .reduce((out: { [key: string]: any }, entries: [string, any]) => {
        const [key, value] = entries;
        let newKey;
        try {
          newKey = this.languageService.translate.instant(
            'igo.geo.search.ilayer.properties.' + key
          );
        } catch (e) {
          newKey = key;
        }
        out[newKey] = value ? value : '';
        return out;
      }, {});

    const dataR = Object.assign({}, data);
    dataR.properties = property as ILayerDataSource;

    return dataR;
  }
}

/**
 * ILayer search source
 */
@Injectable()
export class ILayerSearchSource extends SearchSource implements TextSearch {
  static id = 'ilayer';
  static type = LAYER;

  title$: BehaviorSubject<string> = new BehaviorSubject<string>('');

  get title(): string {
    return this.title$.getValue();
  }

  constructor(
    private http: HttpClient,
    private languageService: LanguageService,
    storageService: StorageService,
    @Inject('options') options: ILayerSearchSourceOptions,
    @Inject(ILayerSearchResultFormatter)
    private formatter: ILayerSearchResultFormatter
  ) {
    super(options, storageService);
    this.languageService.translate
      .get(this.options.title)
      .subscribe(title => this.title$.next(title));
  }

  getId(): string {
    return ILayerSearchSource.id;
  }

  getType(): string {
    return ILayerSearchSource.type;
  }

  protected getDefaultOptions(): ILayerSearchSourceOptions {
    const limit =
      this.options.params && this.options.params.limit
        ? Number(this.options.params.limit)
        : undefined;
    const ecmax =
      this.options.params && this.options.params.ecmax
        ? Number(this.options.params.ecmax)
        : undefined;
    return {
      title: 'igo.geo.search.ilayer.name',
      searchUrl: 'https://geoegl.msp.gouv.qc.ca/apis/layers/search',
      settings: [
        {
          type: 'checkbox',
          title: 'results type',
          name: 'type',
          values: [
            {
              title: 'igo.geo.search.ilayer.type.layer',
              value: 'layer',
              enabled: true,
              hashtags: ['layer', 'layers', 'couche', 'couches']
            },
            {
              title: 'igo.geo.search.ilayer.type.groupLayer',
              value: 'group',
              enabled: false,
              hashtags: ['gr-layer', 'gr-layers', 'gr-couche', 'gr-couches']
            }
          ]
        },
        {
          type: 'radiobutton',
          title: 'results limit',
          name: 'limit',
          values: [
            {
              title: '1',
              value: 1,
              enabled: limit === 1
            },
            {
              title: '5',
              value: 5,
              enabled: limit === 5 || !limit
            },
            {
              title: '10',
              value: 10,
              enabled: limit === 10
            },
            {
              title: '25',
              value: 25,
              enabled: limit === 25
            },
            {
              title: '50',
              value: 50,
              enabled: limit === 50
            }
          ]
        },
        {
          type: 'radiobutton',
          title: 'ecmax',
          name: 'ecmax',
          values: [
            {
              title: '10 %',
              value: 10,
              enabled: ecmax === 10
            },
            {
              title: '30 %',
              value: 30,
              enabled: ecmax === 30
            },
            {
              title: '50 %',
              value: 50,
              enabled: ecmax === 50 || !ecmax
            },
            {
              title: '75 %',
              value: 75,
              enabled: ecmax === 75
            },
            {
              title: '100 %',
              value: 100,
              enabled: ecmax === 100
            }
          ]
        }
      ]
    };
  }

  /**
   * Search a layer by name or keyword
   * @param term Layer name or keyword
   * @returns Observable of <SearchResult<LayerOptions>[]
   */
  search(
    term: string | undefined,
    options?: TextSearchOptions
  ): Observable<SearchResult<ILayerItemResponse>[]> {
    const params = this.computeSearchRequestParams(term, options || {});
    if (!params.get('q') || !params.get('type')) {
      return of([]);
    }
    this.options.params.page = params.get('page') || '1';

    return this.http
      .get(this.searchUrl, { params })
      .pipe(
        map((response: ILayerServiceResponse) => this.extractResults(response, term))
      );
  }

  private computeSearchRequestParams(
    term: string,
    options: TextSearchOptions
  ): HttpParams {
    return new HttpParams({
      fromObject: ObjectUtils.removeUndefined(
        Object.assign(
          {
            q: this.computeTerm(term)
          },
          this.params,
          this.computeOptionsParam(term, options || {}).params,
          {
            page: options.page
          }
        )
      )
    });
  }

  /**
   * Remove hashtag from query
   * @param term Query with hashtag
   */
  private computeTerm(term: string): string {
    return term.replace(/(#[^\s]*)/g, '').replace(/[^\wÀ-ÿ !\-\(\),'#]+/g, '');
  }

  /**
   * Add hashtag to param if valid
   * @param term Query with hashtag
   * @param options TextSearchOptions
   */
  private computeOptionsParam(
    term: string,
    options: TextSearchOptions
  ): TextSearchOptions {
    const hashtags = super.getHashtagsValid(term, 'type');
    if (hashtags) {
      options.params = Object.assign(options.params || {}, {
        type: hashtags.join(',')
      });
    }

    return options;
  }

  private extractResults(
    response: ILayerServiceResponse, term: string
  ): SearchResult<ILayerItemResponse>[] {
    return response.items.map((data: ILayerData) =>
    this.dataToResult(data, term, response)
    );
  }

  private dataToResult(
    data: ILayerData,
    term: string,
    response?: ILayerServiceResponse
  ): SearchResult<ILayerItemResponse> {
    const layerOptions = this.computeLayerOptions(data);

    const titleHtml = data.highlight.title || data.properties.title;
    const groupTitle = data.highlight.groupTitle || data.properties.groupTitle;
    const subtitleHtml = groupTitle
      ? ' <small style="color: #6f6969"> ' + groupTitle + '</small>'
      : '';

    return {
      source: this,
      meta: {
        dataType: LAYER,
        id: [this.getId(), data.properties.id].join('.'),
        title: data.properties.title,
        titleHtml: titleHtml + subtitleHtml,
        icon: data.properties.type === 'Layer' ? 'layers' : 'map',
        score: data.score || computeTermSimilarity(term.trim(), data.properties.name),
        nextPage:
          response.items.length % +this.options.params.limit === 0 &&
          +this.options.params.page < 10
      },
      data: layerOptions
    };
  }

  private computeLayerOptions(data: ILayerData): ILayerItemResponse {
    const url = data.properties.url;
    const queryParams: QueryableDataSourceOptions = this.extractQueryParamsFromSourceUrl(
      url
    );
    return ObjectUtils.removeUndefined({
      sourceOptions: {
        id: data.properties.id,
        type: data.properties.format,
        url,
        queryFormat: queryParams.queryFormat,
        queryHtmlTarget: queryParams.queryHtmlTarget,
        params: data.properties.format === 'wms' ? {LAYERS: data.properties.name} : undefined,
        layer: data.properties.format === 'wms' ? undefined : data.properties.name,
        optionsFromCapabilities: true,
        crossOrigin: 'anonymous'
      },
      title: data.properties.title,
      maxResolution: getResolutionFromScale(
        Number(data.properties.maxScaleDenom)
      ),
      minResolution: getResolutionFromScale(
        Number(data.properties.minScaleDenom)
      ),
      metadata: {
        url: data.properties.metadataUrl,
        extern: data.properties.metadataUrl ? true : undefined,
        abstract: data.properties.abstract || undefined
      },
      properties: this.formatter.formatResult(data).properties
    });
  }

  private extractQueryParamsFromSourceUrl(
    url: string
  ): { queryFormat: QueryFormat; queryHtmlTarget: QueryHtmlTarget } {
    let queryFormat;
    let queryHtmlTarget;
    const formatOpt = (this.options as ILayerSearchSourceOptions).queryFormat;
    if (formatOpt) {
      for (const key of Object.keys(formatOpt)) {
        const value = formatOpt[key];
        if (value === '*') {
          queryFormat = QueryFormat[key.toUpperCase()];
          break;
        }

        const urls = ((value as any) as { urls: string[] }).urls;
        if (Array.isArray(urls)) {
          urls.forEach(urlOpt => {
            if (url.indexOf(urlOpt) !== -1) {
              queryFormat = QueryFormat[key.toUpperCase()];
            }
          });
          break;
        }
      }

      if (
        queryFormat === QueryFormat.HTML ||
        queryFormat === QueryFormat.HTMLGML2
      ) {
        queryHtmlTarget = 'iframe';
      }
    }

    return {
      queryFormat,
      queryHtmlTarget
    };
  }
}
