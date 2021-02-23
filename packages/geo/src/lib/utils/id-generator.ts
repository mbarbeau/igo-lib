import { ArcGISRestDataSourceOptions } from './../datasource/shared/datasources/arcgisrest-datasource.interface';
import { Md5 } from 'ts-md5';

import { uuid } from '@igo2/utils';

import { AnyDataSourceOptions } from '../datasource/shared/datasources/any-datasource.interface';
import { DataSourceOptions } from '../datasource/shared/datasources/datasource.interface';
import { WMSDataSourceOptions } from '../datasource/shared/datasources/wms-datasource.interface';
import { WMTSDataSourceOptions } from '../datasource/shared/datasources/wmts-datasource.interface';
import { WFSDataSourceOptions } from '../datasource';

/**
 * Generate a id from it's datasource options.
 * @param options Data source options
 * @returns A id
 */
export function generateIdFromSourceOptions(options: DataSourceOptions): string {
  const generators = {
    wms: generateWMSIdFromSourceOptions,
    wmts: generateWMTSIdFromSourceOptions,
    xyz: generateXYZIdFromSourceOptions,
    feature: generateFeatureIdFromSourceOptions,
    wfs: generateWfsIdFromSourceOptions,
    arcgisrest: generateArcgisRestIdFromSourceOptions,
    imagearcgisrest: generateArcgisRestIdFromSourceOptions,
    tilearcgisrest: generateArcgisRestIdFromSourceOptions,
    osm: (_options: AnyDataSourceOptions) => 'OSM',
    tiledebug: (_options: AnyDataSourceOptions) => 'tiledebug'
  };
  const generator = generators[options.type] || generateId;
  return generator(options);
}

/**
 * Generate a id from WMS data source options
 * @param options WMS data source options
 * @returns A md5 hash of the the url and layers
 */
export function generateWMSIdFromSourceOptions(options: WMSDataSourceOptions) {
  const layers = options.params.LAYERS;
  const url = standardizeUrl(options.url);
  const chain = 'wms' + url + layers;
  return Md5.hashStr(chain) as string;
}

/**
 * Generate a id from WMTS data source options
 * @param options WMTS data source options
 * @returns A md5 hash of the the url and layer
 */
export function generateWMTSIdFromSourceOptions(options: WMTSDataSourceOptions) {
  const layer = options.layer;
  const url = standardizeUrl(options.url);
  const chain = 'wmts' + url + layer;
  return Md5.hashStr(chain) as string;
}

/**
 * Generate a id from XYZ data source options
 * @param options XYZ data source options
 * @returns A md5 hash of the the url and layer
 */
export function generateXYZIdFromSourceOptions(options: WMTSDataSourceOptions) {
  const url = standardizeUrl(options.url);
  const chain = 'xyz' + url;
  return Md5.hashStr(chain) as string;
}

/**
 * Generate a id from feature data source options
 * @param options XYZ data source options
 * @returns A md5 hash of the the url and layer
 */
export function generateFeatureIdFromSourceOptions(options: WMTSDataSourceOptions) {
  if (!options.url) { return generateId(options); }
  const url = standardizeUrl(options.url);
  const chain = 'feature' + url;
  return Md5.hashStr(chain) as string;
}

/**
 * Generate a id from feature data source options
 * @param options XYZ data source options
 * @returns A md5 hash of the the url and layer
 */
export function generateWfsIdFromSourceOptions(options: WFSDataSourceOptions) {
  if (!options.url || !options.params) { return generateId(options); }
  const url = standardizeUrl(options.url);
  const chain = 'wfs' + url + options.params.featureTypes;
  return Md5.hashStr(chain) as string;
}
/**
 * Generate a id from ArcGIS Rest data source options
 * @param options ArcGIS Rest data source options
 * @returns A md5 hash of the url and layers
 */
export function generateArcgisRestIdFromSourceOptions(options: ArcGISRestDataSourceOptions) {
  const layers = options.layer;
  const url = standardizeUrl(options.url);
  const chain = (options.type || 'arcgis') + url + layers;
  return Md5.hashStr(chain) as string;
}

/**
 * Generate a unique id
 * @returns A uuid
 */
export function generateId(_options: AnyDataSourceOptions) {
  return uuid();
}

export function standardizeUrl(url: string): string {
  const absUrl = url.charAt(0) === '/' ? window.location.origin + url : url;
  const urlDecomposed = absUrl.split(/[?&]/);
  let urlStandardized = urlDecomposed.shift();
  const paramsToKeep = urlDecomposed.filter(p => p.length !== 0 && p.charAt(0) !== '_');
  if (paramsToKeep.length) {
    urlStandardized += '?' + paramsToKeep.join('&');
  }
  return urlStandardized;
}
