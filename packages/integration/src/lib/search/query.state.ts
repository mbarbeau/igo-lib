import { Injectable } from '@angular/core';

import { EntityStore } from '@igo2/common';
import { ConfigService } from '@igo2/core';
import { CommonVectorStyleOptions, SearchResult } from '@igo2/geo';

/**
 * Service that holds the state of the query module
 */
@Injectable({
  providedIn: 'root'
})
export class QueryState {
  /**
   * Store that holds the query results
   */
  public store: EntityStore<SearchResult> = new EntityStore<SearchResult>([]);
  public queryOverlayStyle: CommonVectorStyleOptions  = {};
  public queryOverlayStyleSelection: CommonVectorStyleOptions = {};
  public queryOverlayStyleFocus: CommonVectorStyleOptions = {};

  constructor(private configService: ConfigService) {
    const queryOverlayStyle = this.configService.getConfig('queryOverlayStyle') as {
      base?: CommonVectorStyleOptions,
      selection?: CommonVectorStyleOptions,
      focus?: CommonVectorStyleOptions
    };
    if (queryOverlayStyle) {
      this.queryOverlayStyle = queryOverlayStyle.base;
      this.queryOverlayStyleSelection = queryOverlayStyle.selection;
      this.queryOverlayStyleFocus = queryOverlayStyle.focus;
    }
  }
}
