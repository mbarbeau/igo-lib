import { Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { ConfigService, LanguageService, StorageService } from '@igo2/core';

import { SearchSource } from './source';
import {
  IChercheSearchSource,
  IChercheSearchResultFormatter,
  IChercheReverseSearchSource
} from './icherche';

/**
 * ICherche search result formatter factory
 * @ignore
 */
export function defaultIChercheSearchResultFormatterFactory(
  languageService: LanguageService
) {
  return new IChercheSearchResultFormatter(languageService);
}

/**
 * Function that returns a provider for the ICherche search result formatter
 */
export function provideDefaultIChercheSearchResultFormatter() {
  return {
    provide: IChercheSearchResultFormatter,
    useFactory: defaultIChercheSearchResultFormatterFactory,
    deps: [LanguageService]
  };
}

/**
 * ICherche search source factory
 * @ignore
 */
export function ichercheSearchSourceFactory(
  http: HttpClient,
  languageService: LanguageService,
  storageService: StorageService,
  config: ConfigService,
  formatter: IChercheSearchResultFormatter,
  injector: Injector
) {
  return new IChercheSearchSource(
    http,
    languageService,
    storageService,
    config.getConfig(`searchSources.${IChercheSearchSource.id}`),
    formatter,
    injector
  );
}

/**
 * Function that returns a provider for the ICherche search source
 */
export function provideIChercheSearchSource() {
  return {
    provide: SearchSource,
    useFactory: ichercheSearchSourceFactory,
    multi: true,
    deps: [
      HttpClient,
      LanguageService,
      StorageService,
      ConfigService,
      IChercheSearchResultFormatter,
      Injector
    ]
  };
}

/**
 * IChercheReverse search source factory
 * @ignore
 */
export function ichercheReverseSearchSourceFactory(
  http: HttpClient,
  languageService: LanguageService,
  storageService: StorageService,
  config: ConfigService,
  injector: Injector
) {
  return new IChercheReverseSearchSource(
    http,
    languageService,
    storageService,
    config.getConfig(`searchSources.${IChercheReverseSearchSource.id}`),
    injector
  );
}

/**
 * Function that returns a provider for the IChercheReverse search source
 */
export function provideIChercheReverseSearchSource() {
  return {
    provide: SearchSource,
    useFactory: ichercheReverseSearchSourceFactory,
    multi: true,
    deps: [HttpClient, LanguageService, StorageService, ConfigService, Injector]
  };
}
