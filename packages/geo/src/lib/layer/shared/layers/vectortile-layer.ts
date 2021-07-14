import olLayerVectorTile from 'ol/layer/VectorTile';
import olSourceVectorTile from 'ol/source/VectorTile';

import { MVTDataSource } from '../../../datasource/shared/datasources/mvt-datasource';

import { Layer } from './layer';
import { VectorTileLayerOptions } from './vectortile-layer.interface';
import { TileWatcher } from '../../utils';
import { AuthInterceptor } from '@igo2/auth';
import { IgoMap } from '../../../map';
import { MessageService } from '@igo2/core';

export class VectorTileLayer extends Layer {
  public dataSource: MVTDataSource;
  public options: VectorTileLayerOptions;
  public ol: olLayerVectorTile;

  private watcher: TileWatcher;

  constructor(
    options: VectorTileLayerOptions,
    public messageService?: MessageService,
    public authInterceptor?: AuthInterceptor) {
    super(options, messageService, authInterceptor);
    this.watcher = new TileWatcher(this);
    this.status$ = this.watcher.status$;
  }

  protected createOlLayer(): olLayerVectorTile {
    const olOptions = Object.assign({}, this.options, {
      source: this.options.source.ol as olSourceVectorTile
    });

    const vectorTile = new olLayerVectorTile(olOptions);
    const vectorTileSource = vectorTile.getSource() as olSourceVectorTile;

    vectorTileSource.setTileLoadFunction((tile, url) => {
      const loader = this.customLoader(url, tile.getFormat(), this.authInterceptor, tile.onLoad.bind(tile));
      if (loader) {
        tile.setLoader(loader);
      }
    }
    );

    return vectorTile;
  }

  /**
   * Custom loader for vector tile layer. Modified from the loadFeaturesXhr function in ol\featureloader.js
   * @internal
   * @param url the url string or function to retrieve the data
   * @param format the format of the tile
   * @param interceptor the interceptor of the data
   * @param success On success event action to trigger
   * @param failure On failure event action to trigger TODO
   */
  customLoader(url, format, interceptor, success, failure?) {
    return ((extent, resolution, projection) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', typeof url === 'function' ? url = url(extent, resolution, projection) : url);
      if (interceptor) {
        interceptor.interceptXhr(xhr, url);
      }

      if (format.getType() === 'arraybuffer') {
        xhr.responseType = 'arraybuffer';
      }
      xhr.onload = (event) => {
        if (!xhr.status || xhr.status >= 200 && xhr.status < 300) {
          const type = format.getType();
          let source;
          if (type === 'json' || type === 'text') {
            source = xhr.responseText;
          }
          else if (type === 'xml') {
            source = xhr.responseXML;
            if (!source) {
              source = new DOMParser().parseFromString(xhr.responseText, 'application/xml');
            }
          }
          else if (type === 'arraybuffer') {
            source = xhr.response;
          }
          if (source) {
            success.call(this, format.readFeatures(source, {
              extent,
              featureProjection: projection
            }), format.readProjection(source));
          }
          else {
            // TODO
            failure.call(this);
          }
        } else {
          // TODO
          failure.call(this);
        }
      };
      xhr.onerror = () => {
        // TODO
        failure.call(this);
      };
      xhr.send();
    });
  }

  public setMap(map: IgoMap | undefined) {
    if (map === undefined) {
      this.watcher.unsubscribe();
    } else {
      this.watcher.subscribe(() => {});
    }
    super.setMap(map);
  }
}
