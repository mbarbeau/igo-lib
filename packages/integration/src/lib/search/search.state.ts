import { Injectable } from '@angular/core';

import { EntityRecord, EntityStore, EntityStoreFilterCustomFuncStrategy, EntityStoreStrategyFuncOptions } from '@igo2/common';
import { ConfigService, StorageService } from '@igo2/core';
import { SearchResult, SearchSourceService, SearchSource, CommonVectorStyleOptions } from '@igo2/geo';
import { BehaviorSubject, Subscription } from 'rxjs';

/**
 * Service that holds the state of the search module
 */
@Injectable({
  providedIn: 'root'
})
export class SearchState {
  public searchOverlayStyle: CommonVectorStyleOptions = {};
  public searchOverlayStyleSelection: CommonVectorStyleOptions = {};
  public searchOverlayStyleFocus: CommonVectorStyleOptions = {};

  public focusedOrResolution$$: Subscription;
  public selectedOrResolution$$: Subscription;

  readonly searchTermSplitter$: BehaviorSubject<string> = new BehaviorSubject('|');

  readonly searchTerm$: BehaviorSubject<string> = new BehaviorSubject(undefined);

  readonly searchType$: BehaviorSubject<string> = new BehaviorSubject(undefined);

  readonly searchDisabled$: BehaviorSubject<boolean> = new BehaviorSubject(false);

  readonly searchResultsGeometryEnabled$: BehaviorSubject<boolean> = new BehaviorSubject(false);

  readonly searchSettingsChange$: BehaviorSubject<boolean> = new BehaviorSubject(undefined);

  readonly selectedResult$: BehaviorSubject<SearchResult> = new BehaviorSubject(undefined);

  /**
   * Store that holds the search results
   */
  readonly store: EntityStore<SearchResult> = new EntityStore<SearchResult>([]);

  /**
   * Search types currently enabled in the search source service
   */
  get searchTypes(): string[] {
    return this.searchSourceService
      .getEnabledSources()
      .map((source: SearchSource) => (source.constructor as any).type);
  }

  constructor(
    private searchSourceService: SearchSourceService,
    private storageService: StorageService,
    private configService: ConfigService) {
    const searchOverlayStyle = this.configService.getConfig('searchOverlayStyle') as {
      base?: CommonVectorStyleOptions,
      selection?: CommonVectorStyleOptions,
      focus?: CommonVectorStyleOptions
    };
    if (searchOverlayStyle) {
      this.searchOverlayStyle = searchOverlayStyle.base;
      this.searchOverlayStyleSelection = searchOverlayStyle.selection;
      this.searchOverlayStyleFocus = searchOverlayStyle.focus;
    }

    const searchResultsGeometryEnabled = this.storageService.get('searchResultsGeometryEnabled') as boolean;
    if (searchResultsGeometryEnabled) {
      this.searchResultsGeometryEnabled$.next(searchResultsGeometryEnabled);
    }
    this.store.addStrategy(this.createCustomFilterTermStrategy(), false);
  }

  private createCustomFilterTermStrategy(): EntityStoreFilterCustomFuncStrategy {
    const filterClauseFunc = (record: EntityRecord<SearchResult>) => {
      return record.entity.meta.score === 100;
    };
    return new EntityStoreFilterCustomFuncStrategy({filterClauseFunc} as EntityStoreStrategyFuncOptions);
  }

  /**
   * Activate custom strategy
   *
   */
  activateCustomFilterTermStrategy() {
    const strategy = this.store.getStrategyOfType(EntityStoreFilterCustomFuncStrategy);
    if (strategy !== undefined) {
      strategy.activate();
    }
  }

  /**
   * Deactivate custom strategy
   *
   */
  deactivateCustomFilterTermStrategy() {
    const strategy = this.store.getStrategyOfType(EntityStoreFilterCustomFuncStrategy);
    if (strategy !== undefined) {
      strategy.deactivate();
    }
  }

  enableSearch() {
    this.searchDisabled$.next(false);
  }

  disableSearch() {
    this.searchDisabled$.next(true);
  }

  setSearchTerm(searchTerm: string) {
    this.searchTerm$.next(searchTerm);
  }

  setSearchType(searchType: string) {
    this.searchSourceService.enableSourcesByType(searchType);
    this.searchType$.next(searchType);
  }

  setSearchSettingsChange() {
    this.searchSettingsChange$.next(true);
  }

  setSelectedResult(result: SearchResult) {
    this.selectedResult$.next(result);
  }

  setSearchResultsGeometryStatus(value) {
    this.storageService.set('searchResultsGeometryEnabled', value);
    this.searchResultsGeometryEnabled$.next(value);
  }
}
