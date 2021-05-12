import { Injectable } from '@angular/core';

import { stringToLonLat } from '../../map';
import { MapService } from '../../map/shared/map.service';

import { SearchSource, TextSearch, ReverseSearch } from './sources/source';
import {
  TextSearchOptions,
  ReverseSearchOptions
} from './sources/source.interfaces';
import { SearchSourceService } from './search-source.service';
import { Research } from './search.interfaces';
import {
  sourceCanSearch,
  sourceCanReverseSearch,
  sourceCanReverseSearchAsSummary
} from './search.utils';

/**
 * This service perform researches in all the search sources enabled.
 * It returns Research objects who's 'request' property needs to be
 * subscribed to in order to trigger the research. This services has
 * keeps internal state of the researches it performed
 * and the results they yielded.
 */
@Injectable({
  providedIn: 'root'
})
export class SearchService {
  constructor(
    private searchSourceService: SearchSourceService,
    private mapService: MapService
  ) {}

  /**
   * Perform a research by text
   * @param term Any text
   * @returns Researches
   */
  search(term: string, options: TextSearchOptions = {}): Research[] {
    if (!this.termIsValid(term)) {
      return [];
    }

    const proj = this.mapService.getMap()?.projection || 'EPSG:3857';
    const response = stringToLonLat(term, proj, {
      forceNA: options.forceNA
    });
    if (response.lonLat) {
      return this.reverseSearch(response.lonLat, { distance: response.radius, conf: response.conf });
    } else if (response.message) {
      console.log(response.message);
    }

    options.extent = this.mapService
      .getMap()
      ?.viewController.getExtent('EPSG:4326');

    let sources;

    if (options.getEnabledOnly || options.getEnabledOnly === undefined) {
      sources = this.searchSourceService.getEnabledSources();
    } else {
      sources = this.searchSourceService.getSources();
    }

    if (options.sourceId) {
      sources = sources.filter((source) => source.getId() === options.sourceId);
    } else if (options.searchType) {
      sources = sources.filter(
        (source) => source.getType() === options.searchType
      );
    }

    sources = sources.filter(sourceCanSearch);
    return this.searchSources(sources, term, options);
  }

  /**
   * Perform a research by lon/lat
   * @param lonLat Any lon/lat coordinates
   * @returns Researches
   */
  reverseSearch(
    lonLat: [number, number],
    options?: ReverseSearchOptions,
    asPointerSummary: boolean = false
  ) {
    const reverseSourceFonction = asPointerSummary
      ? sourceCanReverseSearchAsSummary
      : sourceCanReverseSearch;
    const sources = this.searchSourceService
      .getEnabledSources()
      .filter(reverseSourceFonction);
    return this.reverseSearchSources(sources, lonLat, options || {});
  }

  /**
   * Create a text research out of all given search sources
   * @param sources Search sources that implement TextSearch
   * @param term Search term
   * @returns Observable of Researches
   */
  private searchSources(
    sources: SearchSource[],
    term: string,
    options: TextSearchOptions
  ): Research[] {
    return sources.map((source: SearchSource) => {
      return {
        request: ((source as any) as TextSearch).search(term, options),
        reverse: false,
        source
      };
    });
  }

  /**
   * Create a reverse research out of all given search sources
   * @param sources Search sources that implement ReverseSearch
   * @param lonLat Any lon/lat coordinates
   * @returns Observable of Researches
   */
  private reverseSearchSources(
    sources: SearchSource[],
    lonLat: [number, number],
    options: ReverseSearchOptions
  ): Research[] {
    return sources.map((source: SearchSource) => {
      return {
        request: ((source as any) as ReverseSearch).reverseSearch(
          lonLat,
          options
        ),
        reverse: true,
        source
      };
    });
  }

  /**
   * Validate that a search term is valid
   * @param term Search term
   * @returns True if the search term is valid
   */
  private termIsValid(term: string): boolean {
    return typeof term === 'string' && term !== '';
  }
}
