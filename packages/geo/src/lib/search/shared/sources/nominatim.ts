import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { FEATURE, Feature, FeatureGeometry } from '../../../feature';

import { StorageService } from '@igo2/core';
import { SearchResult } from '../search.interfaces';
import { SearchSource, TextSearch } from './source';
import { SearchSourceOptions, TextSearchOptions } from './source.interfaces';
import { NominatimData } from './nominatim.interfaces';
import { computeTermSimilarity } from '../search.utils';

/**
 * Nominatim search source
 */
@Injectable()
export class NominatimSearchSource extends SearchSource implements TextSearch {
  static id = 'nominatim';
  static type = FEATURE;

  constructor(
    private http: HttpClient,
    @Inject('options') options: SearchSourceOptions,
    storageService: StorageService
  ) {
    super(options, storageService);
  }

  getId(): string {
    return NominatimSearchSource.id;
  }

  getType(): string {
    return NominatimSearchSource.type;
  }

  /*
   * Source : https://wiki.openstreetmap.org/wiki/Key:amenity
   */
  protected getDefaultOptions(): SearchSourceOptions {
    return {
      title: 'Nominatim (OSM)',
      searchUrl: 'https://nominatim.openstreetmap.org/search',
      settings: [
        {
          type: 'checkbox',
          title: 'results type',
          name: 'amenity',
          values: [
            {
              title: 'igo.geo.search.nominatim.type.food',
              value:
                'bar,bbq,biergaten,cafe,drinking_water,fast_food,food_court,ice_cream,pub,restaurant',
              enabled: false
            },
            {
              title: 'igo.geo.search.nominatim.type.health',
              value:
                'baby_hatch,clinic,dentist,doctors,hospital,nursing_home,pharmacy,social_facility,veterinary',
              enabled: false
            },
            {
              title: 'igo.geo.search.nominatim.type.entertainment',
              value:
                'arts_centre,brothel,casino,cinema,community_center_fountain,gambling,nightclub,planetarium \
                          ,public_bookcase,social_centre,stripclub,studio,swingerclub,theatre,internet_cafe',
              enabled: false
            },
            {
              title: 'igo.geo.search.nominatim.type.finance',
              value: 'atm,bank,bureau_de_change',
              enabled: false
            }
          ]
        },
        {
          type: 'radiobutton',
          title: 'results limit',
          name: 'limit',
          values: [
            {
              title: '10',
              value: 10,
              enabled: true
            },
            {
              title: '20',
              value: 20,
              enabled: false
            },
            {
              title: '50',
              value: 50,
              enabled: false
            }
          ]
        },
        {
          type: 'radiobutton',
          title: 'restrictExtent',
          name: 'countrycodes',
          values: [
            {
              title: 'igo.geo.search.nominatim.country.canada',
              value: 'CA',
              enabled: true
            },
            {
              title: 'igo.geo.search.nominatim.country.all',
              value: null,
              enabled: false
            }
          ]
        },
        {
          type: 'radiobutton',
          title: 'multiple object',
          name: 'dedupe',
          values: [
            {
              title: 'igo.geo.search.searchSources.settings.true',
              value: 0,
              enabled: false
            },
            {
              title: 'igo.geo.search.searchSources.settings.false',
              value: 1,
              enabled: true
            }
          ]
        }
      ]
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
    const params = this.computeSearchRequestParams(term, options || {});
    if (!params.get('q')) {
      return of([]);
    }
    return this.http
      .get(this.searchUrl, { params })
      .pipe(map((response: NominatimData[]) => this.extractResults(response, term)));
  }

  private computeSearchRequestParams(
    term: string,
    options: TextSearchOptions
  ): HttpParams {
    return new HttpParams({
      fromObject: Object.assign(
        {
          q: this.computeTerm(term),
          format: 'json'
        },
        this.params,
        options.params || {}
      )
    });
  }

  private extractResults(response: NominatimData[], term: string): SearchResult<Feature>[] {
    return response.map((data: NominatimData) => this.dataToResult(data, term));
  }

  private dataToResult(data: NominatimData, term: string): SearchResult<Feature> {
    const properties = this.computeProperties(data);
    const geometry = this.computeGeometry(data);
    const extent = this.computeExtent(data);
    const id = [this.getId(), 'place', data.place_id].join('.');

    return {
      source: this,
      meta: {
        dataType: FEATURE,
        id,
        title: data.display_name,
        icon: 'map-marker',
        score: computeTermSimilarity(term.trim(), data.display_name)
      },
      data: {
        type: FEATURE,
        projection: 'EPSG:4326',
        geometry,
        extent,
        properties,
        meta: {
          id,
          title: data.display_name
        }
      }
    };
  }

  private computeProperties(data: NominatimData): { [key: string]: any } {
    return {
      display_name: data.display_name,
      place_id: data.place_id,
      osm_type: data.osm_type,
      class: data.class,
      type: data.type
    };
  }

  private computeGeometry(data: NominatimData): FeatureGeometry {
    return {
      type: 'Point',
      coordinates: [parseFloat(data.lon), parseFloat(data.lat)]
    };
  }

  private computeExtent(data: NominatimData): [number, number, number, number] {
    return [
      parseFloat(data.boundingbox[2]),
      parseFloat(data.boundingbox[0]),
      parseFloat(data.boundingbox[3]),
      parseFloat(data.boundingbox[1])
    ];
  }

  private computeTerm(term: string): string {
    return this.computeTermTags(term);
  }

  /**
   * Add hashtag from query in Nominatim's format (+[])
   * @param term Query with hashtag
   */
  private computeTermTags(term: string): string {
    const hashtags = super.getHashtagsValid(term, 'amenity');
    if (!hashtags) {
      return this.computeTermSettings(term);
    }

    if (!hashtags.length) {
      return null;
    }

    term = term.replace(/(#[^\s]*)/g, '');
    hashtags.forEach(tag => {
      term += '+[' + tag + ']';
    });

    return term;
  }

  /**
   * Add hashtag from settings in Nominatim's format (+[])
   * @param term Query
   */
  private computeTermSettings(term: string): string {
    this.options.settings.forEach(settings => {
      if (settings.name === 'amenity') {
        settings.values.forEach(conf => {
          if (conf.enabled && typeof conf.value === 'string') {
            const splitted = conf.value.split(',');
            splitted.forEach(value => {
              term += '+[' + value + ']';
            });
          }
        });
      }
    });
    return term;
  }
}
