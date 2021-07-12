import * as olStyle from 'ol/style';

import { MessageService, LanguageService, ConfigService } from '@igo2/core';

import { FeatureDataSource } from '../../datasource/shared/datasources/feature-datasource';
import { FeatureDataSourceOptions } from '../../datasource/shared/datasources/feature-datasource.interface';
import { Feature } from '../../feature/shared/feature.interfaces';
import {
  featureToOl,
  moveToOlFeatures
} from '../../feature/shared/feature.utils';
import { VectorLayer } from '../../layer/shared/layers/vector-layer';
import { IgoMap } from '../../map/shared/map';
import { QueryableDataSourceOptions } from '../../query/shared/query.interfaces';
import { StyleService } from '../../layer/shared/style.service';
import { StyleByAttribute } from '../../layer/shared/vector-style.interface';
import { StyleListService } from '../style-list/style-list.service';
import { ClusterParam } from '../../layer/shared/clusterParam';
import { ClusterDataSource } from '../../datasource/shared/datasources/cluster-datasource';
import { ClusterDataSourceOptions } from '../../datasource/shared/datasources/cluster-datasource.interface';

export function addLayerAndFeaturesToMap(
  features: Feature[],
  map: IgoMap,
  layerTitle: string
): VectorLayer {
  const olFeatures = features.map((feature: Feature) =>
    featureToOl(feature, map.projection)
  );

  const r = Math.floor(Math.random() * 255);
  const g = Math.floor(Math.random() * 255);
  const b = Math.floor(Math.random() * 255);
  const stroke = new olStyle.Stroke({
    color: [r, g, b, 1],
    width: 2
  });

  const fill = new olStyle.Fill({
    color: [r, g, b, 0.4]
  });
  const sourceOptions: FeatureDataSourceOptions & QueryableDataSourceOptions = {
    type: 'vector',
    queryable: true
  };
  const source = new FeatureDataSource(sourceOptions);
  source.ol.addFeatures(olFeatures);
  const layer = new VectorLayer({
    title: layerTitle,
    source,
    style: new olStyle.Style({
      stroke,
      fill,
      image: new olStyle.Circle({
        radius: 5,
        stroke,
        fill
      })
    })
  });
  map.addLayer(layer);
  moveToOlFeatures(map, olFeatures);

  return layer;
}

export function addLayerAndFeaturesStyledToMap(
  features: Feature[],
  map: IgoMap,
  layerTitle: string,
  styleListService: StyleListService,
  styleService: StyleService
): VectorLayer {
  const olFeatures = features.map((feature: Feature) =>
    featureToOl(feature, map.projection)
  );
  let style;
  let distance: number;

  if (
    styleListService.getStyleList(layerTitle.toString() + '.styleByAttribute')
  ) {
    const styleByAttribute: StyleByAttribute = styleListService.getStyleList(
      layerTitle.toString() + '.styleByAttribute'
    );

    style = feature => {
      return styleService.createStyleByAttribute(feature, styleByAttribute);
    };
  } else if (
    styleListService.getStyleList(layerTitle.toString() + '.clusterStyle')
  ) {
    const clusterParam: ClusterParam = styleListService.getStyleList(
      layerTitle.toString() + '.clusterParam'
    );
    distance = styleListService.getStyleList(
      layerTitle.toString() + '.distance'
    );

    const baseStyle = styleService.createStyle(
      styleListService.getStyleList(layerTitle.toString() + '.clusterStyle')
    );

    style = feature => {
      return styleService.createClusterStyle(feature, clusterParam, baseStyle);
    };
  } else if (styleListService.getStyleList(layerTitle.toString() + '.style')) {
    style = styleService.createStyle(
      styleListService.getStyleList(layerTitle.toString() + '.style')
    );
  } else if (
    styleListService.getStyleList('default.clusterStyle') &&
    features[0].geometry.type === 'Point'
  ) {
    const clusterParam: ClusterParam = styleListService.getStyleList(
      'default.clusterParam'
    );
    distance = styleListService.getStyleList('default.distance');

    const baseStyle = styleService.createStyle(
      styleListService.getStyleList('default.clusterStyle')
    );

    style = feature => {
      return styleService.createClusterStyle(feature, clusterParam, baseStyle);
    };
  } else {
    style = styleService.createStyle(
      styleListService.getStyleList('default.style')
    );
  }

  let source;
  if (styleListService.getStyleList(layerTitle.toString() + '.clusterStyle')) {
    const sourceOptions: ClusterDataSourceOptions &
      QueryableDataSourceOptions = {
      distance,
      type: 'cluster',
      queryable: true
    };
    source = new ClusterDataSource(sourceOptions);
    source.ol.source.addFeatures(olFeatures);
  } else if (styleListService.getStyleList(layerTitle.toString())) {
    const sourceOptions: FeatureDataSourceOptions & QueryableDataSourceOptions = {
      type: 'vector',
      queryable: true
    };
    source = new FeatureDataSource(sourceOptions);
    source.ol.addFeatures(olFeatures);
  } else if (
    styleListService.getStyleList('default.clusterStyle') &&
    features[0].geometry.type === 'Point'
  ) {
    const sourceOptions: ClusterDataSourceOptions &
      QueryableDataSourceOptions = {
      distance,
      type: 'cluster',
      queryable: true
    };
    source = new ClusterDataSource(sourceOptions);
    source.ol.source.addFeatures(olFeatures);
  } else {
    const sourceOptions: FeatureDataSourceOptions & QueryableDataSourceOptions = {
      type: 'vector',
      queryable: true
    };
    source = new FeatureDataSource(sourceOptions);
    source.ol.addFeatures(olFeatures);
  }

  const layer = new VectorLayer({
    title: layerTitle,
    source,
    style
  });
  map.addLayer(layer);
  moveToOlFeatures(map, olFeatures);

  return layer;
}

export function handleFileImportSuccess(
  file: File,
  features: Feature[],
  map: IgoMap,
  messageService: MessageService,
  languageService: LanguageService,
  styleListService?: StyleListService,
  styleService?: StyleService
) {
  if (features.length === 0) {
    handleNothingToImportError(file, messageService, languageService);
    return;
  }

  const layerTitle = computeLayerTitleFromFile(file);

  if (!styleListService) {
    addLayerAndFeaturesToMap(features, map, layerTitle);
  } else {
    addLayerAndFeaturesStyledToMap(
      features,
      map,
      layerTitle,
      styleListService,
      styleService
    );
  }

  const translate = languageService.translate;
  const messageTitle = translate.instant('igo.geo.dropGeoFile.success.title');
  const message = translate.instant('igo.geo.dropGeoFile.success.text', {
    value: layerTitle
  });
  messageService.success(message, messageTitle);
}

export function handleFileImportError(
  file: File,
  error: Error,
  messageService: MessageService,
  languageService: LanguageService,
  sizeMb?: number
) {
  sizeMb = sizeMb ? sizeMb : 30;
  const errMapping = {
    'Invalid file': handleInvalidFileImportError,
    'File is too large': handleSizeFileImportError,
    'Failed to read file': handleUnreadbleFileImportError,
    'Invalid SRS definition': handleSRSImportError,
    'Error 500 with OGRE in convert shapefile': handleOgreServerImportError
  };
  errMapping[error.message](
    file,
    error,
    messageService,
    languageService,
    sizeMb
  );
}

export function handleInvalidFileImportError(
  file: File,
  error: Error,
  messageService: MessageService,
  languageService: LanguageService
) {
  const translate = languageService.translate;
  const title = translate.instant('igo.geo.dropGeoFile.invalid.title');
  const message = translate.instant('igo.geo.dropGeoFile.invalid.text', {
    value: file.name,
    mimeType: file.type
  });
  messageService.error(message, title);
}

export function handleUnreadbleFileImportError(
  file: File,
  error: Error,
  messageService: MessageService,
  languageService: LanguageService
) {
  const translate = languageService.translate;
  const title = translate.instant('igo.geo.dropGeoFile.unreadable.title');
  const message = translate.instant('igo.geo.dropGeoFile.unreadable.text', {
    value: file.name
  });
  messageService.error(message, title);
}

export function handleSizeFileImportError(
  file: File,
  error: Error,
  messageService: MessageService,
  languageService: LanguageService,
  sizeMb: number
) {
  const translate = languageService.translate;
  const title = translate.instant('igo.geo.dropGeoFile.tooLarge.title');
  const message = translate.instant('igo.geo.dropGeoFile.tooLarge.text', {
    value: file.name,
    size: sizeMb
  });
  messageService.error(message, title);
}

export function handleNothingToImportError(
  file: File,
  messageService: MessageService,
  languageService: LanguageService
) {
  const translate = languageService.translate;
  const title = translate.instant('igo.geo.dropGeoFile.empty.title');
  const message = translate.instant('igo.geo.dropGeoFile.empty.text', {
    value: file.name,
    mimeType: file.type
  });
  messageService.error(message, title);
}

export function handleSRSImportError(
  file: File,
  messageService: MessageService,
  languageService: LanguageService
) {
  const translate = languageService.translate;
  const title = translate.instant('igo.geo.dropGeoFile.invalidSRS.title');
  const message = translate.instant('igo.geo.dropGeoFile.invalidSRS.text', {
    value: file.name,
    mimeType: file.type
  });
  messageService.error(message, title);
}

export function handleOgreServerImportError(
  file: File,
  error: Error,
  messageService: MessageService,
  languageService: LanguageService
) {
  const title = languageService.translate.instant('igo.geo.dropGeoFile.ogreServer.title');
  const message = languageService.translate.instant('igo.geo.dropGeoFile.ogreServer.text');
  messageService.error(message, title);
}

export function getFileExtension(file: File): string {
  return file.name
    .split('.')
    .pop()
    .toLowerCase();
}

export function computeLayerTitleFromFile(file: File): string {
  return file.name.substr(0, file.name.lastIndexOf('.'));
}
