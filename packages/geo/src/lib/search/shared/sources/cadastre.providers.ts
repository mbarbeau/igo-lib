import { HttpClient } from '@angular/common/http';

import { ConfigService, LanguageService, StorageService } from '@igo2/core';

import { SearchSource } from './source';
import { CadastreSearchSource } from './cadastre';

/**
 * Cadastre search source factory
 * @ignore
 */
export function cadastreSearchSourceFactory(
  http: HttpClient,
  languageService: LanguageService,
  storageService: StorageService,
  config: ConfigService
) {
  return new CadastreSearchSource(
    http,
    languageService,
    storageService,
    config.getConfig(`searchSources.${CadastreSearchSource.id}`),
  );
}

/**
 * Function that returns a provider for the Cadastre search source
 */
export function provideCadastreSearchSource() {
  return {
    provide: SearchSource,
    useFactory: cadastreSearchSourceFactory,
    multi: true,
    deps: [HttpClient, LanguageService, StorageService, ConfigService]
  };
}
