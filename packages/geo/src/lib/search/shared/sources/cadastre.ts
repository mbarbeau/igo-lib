import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import olWKT from 'ol/format/WKT';

import { FEATURE, Feature, FeatureGeometry } from '../../../feature';

import { SearchResult } from '../search.interfaces';
import { SearchSource, TextSearch } from './source';
import { SearchSourceOptions, TextSearchOptions } from './source.interfaces';

import { LanguageService, StorageService } from '@igo2/core';
import { computeTermSimilarity } from '../search.utils';
/**
 * Cadastre search source
 */
@Injectable()
export class CadastreSearchSource extends SearchSource implements TextSearch {
  static id = 'cadastre';
  static type = FEATURE;

  constructor(
    private http: HttpClient,
    private languageService: LanguageService,
    storageService: StorageService,
    @Inject('options') options: SearchSourceOptions
  ) {
    super(options, storageService);
  }

  getId(): string {
    return CadastreSearchSource.id;
  }

  getType(): string {
    return CadastreSearchSource.type;
  }

  /*
   * Source : https://wiki.openstreetmap.org/wiki/Key:amenity
   */
  protected getDefaultOptions(): SearchSourceOptions {
    return {
      title: 'Cadastre (Québec)',
      searchUrl: 'https://carto.cptaq.gouv.qc.ca/php/find_lot_v1.php?'
    };
  }

  /**
   * Search a place by name
   * @param term Place name
   * @returns Observable of <SearchResult<Feature>[]
   */
  search(
    term: string | undefined,
    options?: TextSearchOptions
  ): Observable<SearchResult<Feature>[]> {
    term = term.endsWith(',') ? term.slice(0, -1) : term;
    term = term.startsWith(',') ? term.substr(1) : term;
    term = term.replace(/ /g, '');

    const params = this.computeSearchRequestParams(term, options || {});
    if (!params.get('numero') || !params.get('numero').match(/^[0-9,]+$/g)) {
      return of([]);
    }
    return this.http
      .get(this.searchUrl, { params, responseType: 'text' })
      .pipe(map((response: string) => this.extractResults(response, term)));
  }

  private computeSearchRequestParams(
    term: string,
    options: TextSearchOptions
  ): HttpParams {
    return new HttpParams({
      fromObject: Object.assign(
        {
          numero: term,
          epsg: '4326'
        },
        this.params,
        options.params || {}
      )
    });
  }

  private extractResults(response: string, term: string): SearchResult<Feature>[] {
    return response
      .split('<br />')
      .filter((lot: string) => lot.length > 0)
      .map((lot: string) => this.dataToResult(lot, term));
  }

  private dataToResult(data: string, term: string): SearchResult<Feature> {
    const lot = data.split(';');
    const numero = lot[0];
    const wkt = lot[7];
    const geometry = this.computeGeometry(wkt);

    const properties = {
      NoLot: numero,
      Route: '<span class="routing"> <u>' + this.languageService.translate.instant('igo.geo.seeRouting') + '</u> </span>'
    };
    const id = [this.getId(), 'cadastre', numero].join('.');

    return {
      source: this,
      meta: {
        dataType: FEATURE,
        id,
        title: numero,
        score: computeTermSimilarity(term.trim(), numero),
        icon: 'map-marker'
      },
      data: {
        type: FEATURE,
        projection: 'EPSG:4326',
        geometry,
        properties,
        meta: {
          id,
          title: numero
        }
      }
    };
  }

  private computeGeometry(wkt: string): FeatureGeometry {
    const feature = new olWKT().readFeature(wkt, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:4326'
    });
    return {
      type: feature.getGeometry().getType(),
      coordinates: feature.getGeometry().getCoordinates()
    };
  }
}
