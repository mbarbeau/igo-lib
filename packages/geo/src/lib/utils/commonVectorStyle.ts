import * as olstyle from 'ol/style';
import olFeature from 'ol/Feature';
import { asArray as ColorAsArray } from 'ol/color';

import { createOverlayMarkerStyle } from '../overlay/shared/overlay-marker-style.utils';
import { createOverlayDefaultStyle } from '../overlay/shared/overlay.utils';
import { FeatureCommonVectorStyleOptions } from './commonVectorStyle.interface';


/**
 * Generate a style for selected features
 * @param feature The feature to generate the style
 * @returns A olStyle
 */
export function getCommonVectorSelectedStyle(
  {
    feature,
    markerColor = [0, 161, 222],
    markerOpacity = 1,
    markerOutlineColor = [0, 255, 255],
    fillColor,
    fillOpacity = 0.15,
    strokeColor = [0, 255, 255],
    strokeOpacity = 0.5,
    strokeWidth = 4
  }: FeatureCommonVectorStyleOptions): olstyle.Style {

  return getCommonVectorStyle({
    feature,
    markerColor,
    markerOpacity,
    markerOutlineColor,
    fillColor,
    fillOpacity,
    strokeColor,
    strokeOpacity,
    strokeWidth
  });
}

/**
 * Generate a basic style for features
 * @param feature The feature to generate the style
 * @returns A olStyle
 */
export function getCommonVectorStyle(
  {
    feature,
    markerColor = [0, 161, 222],
    markerOpacity = 0.5,
    markerOutlineColor,
    fillColor = [0, 161, 222],
    fillOpacity = 0.15,
    strokeColor = [0, 161, 222],
    strokeOpacity = 0.5,
    strokeWidth = 2
  }: FeatureCommonVectorStyleOptions): olstyle.Style {

  const isOlFeature = feature instanceof olFeature;
  const geometry = isOlFeature ? feature.getGeometry() : feature.geometry;
  const geometryType = isOlFeature ? geometry.getType() : geometry.type;

  if (!geometry || geometryType === 'Point') {
    const markerColorAsArray = ColorAsArray(markerColor).slice(0);
    const markerColorRGB = markerColorAsArray.slice(0, 3);

    if (markerColorAsArray.length === 4 &&
        (typeof markerColor !== 'string' || /^#[0-9A-F]{8}$/i.test(markerColor as string))) {
      markerOpacity = markerColorAsArray[3];
    }

    return createOverlayMarkerStyle({
      text: isOlFeature ? undefined : feature.meta.mapTitle,
      opacity: markerOpacity,
      markerOutlineColor,
      markerColor: markerColorRGB
    });
  } else {
    const fillWithOpacity = ColorAsArray(fillColor).slice(0);
    const strokeWithOpacity = ColorAsArray(strokeColor).slice(0);

    if (!(fillWithOpacity.length === 4 &&
        (typeof fillColor !== 'string' || /^#[0-9A-F]{8}$/i.test(fillColor as string)))) {
      fillWithOpacity[3] = fillOpacity;
    }

    if (!(strokeWithOpacity.length === 4 &&
        (typeof strokeColor !== 'string' || /^#[0-9A-F]{8}$/i.test(strokeColor as string)))) {
      strokeWithOpacity[3] = strokeOpacity;
    }

    return createOverlayDefaultStyle({
      text: isOlFeature ? undefined : feature.meta.mapTitle,
      strokeWidth,
      strokeColor: strokeWithOpacity,
      fillColor: fillWithOpacity
    });
  }
}
