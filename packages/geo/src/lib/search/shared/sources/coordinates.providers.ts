import { ConfigService, LanguageService, StorageService } from '@igo2/core';

import { SearchSource } from './source';
import {
  CoordinatesReverseSearchSource,
  CoordinatesSearchResultFormatter
} from './coordinates';
import { Projection } from '../../../map/shared/projection.interfaces';
import { ProjectionService } from '../../../map/shared/projection.service';

/**
 * ICherche search result formatter factory
 * @ignore
 */
export function defaultCoordinatesSearchResultFormatterFactory(
  languageService: LanguageService
) {
  return new CoordinatesSearchResultFormatter(languageService);
}

/**
 * Function that returns a provider for the ICherche search result formatter
 */
export function provideDefaultCoordinatesSearchResultFormatter() {
  return {
    provide: CoordinatesSearchResultFormatter,
    useFactory: defaultCoordinatesSearchResultFormatterFactory,
    deps: [LanguageService]
  };
}

/**
 * CoordinatesReverse search source factory
 * @ignore
 */
export function CoordinatesReverseSearchSourceFactory(
  config: ConfigService,
  languageService: LanguageService,
  storageService: StorageService,
  _projectionService: ProjectionService
) {
  return new CoordinatesReverseSearchSource(
    config.getConfig(`searchSources.${CoordinatesReverseSearchSource.id}`),
    languageService,
    storageService,
    (config.getConfig('projections') as Projection[]) || []
  );
}

/**
 * Function that returns a provider for the IChercheReverse search source
 */
export function provideCoordinatesReverseSearchSource() {
  return {
    provide: SearchSource,
    useFactory: CoordinatesReverseSearchSourceFactory,
    multi: true,
    deps: [ConfigService, LanguageService, StorageService, ProjectionService]
  };
}
