import { HttpClient } from '@angular/common/http';

import { ConfigService, StorageService } from '@igo2/core';

import { SearchSource } from './source';
import { NominatimSearchSource } from './nominatim';

/**
 * Nominatim search source factory
 * @ignore
 */
export function nominatimSearchSourceFactory(
  http: HttpClient,
  config: ConfigService,
  storageService: StorageService
) {
  return new NominatimSearchSource(
    http,
    config.getConfig(`searchSources.${NominatimSearchSource.id}`),
    storageService
  );
}

/**
 * Function that returns a provider for the Nominatim search source
 */
export function provideNominatimSearchSource() {
  return {
    provide: SearchSource,
    useFactory: nominatimSearchSourceFactory,
    multi: true,
    deps: [HttpClient, ConfigService, StorageService]
  };
}
