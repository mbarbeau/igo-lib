import olLayerVector from 'ol/layer/Vector';
import olSourceVector from 'ol/source/Vector';
import { unByKey } from 'ol/Observable';
import { easeOut } from 'ol/easing';
import { asArray as ColorAsArray } from 'ol/color';
import { getVectorContext } from 'ol/render';
import FormatType from 'ol/format/FormatType';

import { FeatureDataSource } from '../../../datasource/shared/datasources/feature-datasource';
import { WFSDataSource } from '../../../datasource/shared/datasources/wfs-datasource';
import { ArcGISRestDataSource } from '../../../datasource/shared/datasources/arcgisrest-datasource';
import { WebSocketDataSource } from '../../../datasource/shared/datasources/websocket-datasource';
import { ClusterDataSource } from '../../../datasource/shared/datasources/cluster-datasource';

import { VectorWatcher } from '../../utils';
import { IgoMap } from '../../../map';
import { Layer } from './layer';
import { VectorLayerOptions } from './vector-layer.interface';
import { AuthInterceptor } from '@igo2/auth';
import { MessageService } from '@igo2/core';
export class VectorLayer extends Layer {
  public dataSource:
    | FeatureDataSource
    | WFSDataSource
    | ArcGISRestDataSource
    | WebSocketDataSource
    | ClusterDataSource;
  public options: VectorLayerOptions;
  public ol: olLayerVector;
  private watcher: VectorWatcher;
  private trackFeatureListenerId;

  get browsable(): boolean {
    return this.options.browsable !== false;
  }

  get exportable(): boolean {
    return this.options.exportable !== false;
  }

  constructor(
    options: VectorLayerOptions,
    public messageService?: MessageService,
    public authInterceptor?: AuthInterceptor
  ) {
    super(options, messageService, authInterceptor);
    this.watcher = new VectorWatcher(this);
    this.status$ = this.watcher.status$;
  }

  protected createOlLayer(): olLayerVector {
    const olOptions = Object.assign({}, this.options, {
      source: this.options.source.ol as olSourceVector
    });

    if (this.options.animation) {
      this.dataSource.ol.on(
        'addfeature',
        function(e) {
          this.flash(e.feature);
        }.bind(this)
      );
    }

    if (this.options.trackFeature) {
      this.enableTrackFeature(this.options.trackFeature);
    }

    const vector = new olLayerVector(olOptions);
    const vectorSource = (this.dataSource instanceof ClusterDataSource
      ? vector.getSource().getSource()
      : vector.getSource()) as olSourceVector;
    const url = vectorSource.getUrl();
    vectorSource.addEventListener('vectorloading');
    vectorSource.addEventListener('vectorloaded');
    vectorSource.addEventListener('vectorloaderror');
    if (url) {
      const loader = (extent, resolution, proj) => {
        this.customLoader(
          vectorSource,
          url,
          this.authInterceptor,
          extent,
          resolution,
          proj
        );
      };
      if (loader) {
        vectorSource.setLoader(loader);
      }
    }
    return vector;
  }

  protected flash(feature) {
    const start = new Date().getTime();
    const listenerKey = this.ol.on('postrender', animate.bind(this));

    function animate(event) {
      const vectorContext = getVectorContext(event);
      const frameState = event.frameState;
      const flashGeom = feature.getGeometry().clone();
      const elapsed = frameState.time - start;
      const elapsedRatio = elapsed / this.options.animation.duration;
      const opacity = easeOut(1 - elapsedRatio);
      const newColor = ColorAsArray(this.options.animation.color || 'red');
      newColor[3] = opacity;
      let style = this.ol
        .getStyleFunction()
        .call(this, feature)
        .find((style2) => {
          return style2.getImage();
        });
      if (!style) {
        style = this.ol.getStyleFunction().call(this, feature)[0];
      }
      const styleClone = style.clone();

      switch (feature.getGeometry().getType()) {
        case 'Point':
          const radius =
            easeOut(elapsedRatio) * (styleClone.getImage().getRadius() * 3);
          styleClone.getImage().setRadius(radius);
          styleClone.getImage().setOpacity(opacity);
          break;
        case 'LineString':
          // TODO
          if (styleClone.getImage()) {
            styleClone.getImage().getStroke().setColor(newColor);
            styleClone
              .getImage()
              .getStroke()
              .setWidth(
                easeOut(elapsedRatio) *
                  (styleClone.getImage().getStroke().getWidth() * 3)
              );
          }
          if (styleClone.getStroke()) {
            styleClone.getStroke().setColor(newColor);
            styleClone
              .getStroke()
              .setWidth(
                easeOut(elapsedRatio) * (styleClone.getStroke().getWidth() * 3)
              );
          }
          break;
        case 'Polygon':
          // TODO
          if (styleClone.getImage()) {
            styleClone.getImage().getFill().setColor(newColor);
          }
          if (styleClone.getFill()) {
            styleClone.getFill().setColor(newColor);
          }
          break;
      }

      styleClone.setText('');
      vectorContext.setStyle(styleClone);
      vectorContext.drawGeometry(flashGeom);

      if (elapsed > this.options.animation.duration) {
        unByKey(listenerKey);
        // remove last geometry
        // there is a little flash before feature disappear, better solution ?
        this.map.ol.render();
        return;
      }
      // tell OpenLayers to continue postcompose animation
      this.map.ol.render();
    }
  }

  public setMap(map: IgoMap | undefined) {
    if (map === undefined) {
      this.watcher.unsubscribe();
    } else {
      this.watcher.subscribe(() => {});
    }
    super.setMap(map);
  }

  public onUnwatch() {
    this.dataSource.onUnwatch();
    this.stopAnimation();
  }

  public stopAnimation() {
    this.dataSource.ol.un(
      'addfeature',
      function(e) {
        if (this.visible) {
          this.flash(e.feature);
        }
      }.bind(this)
    );
  }

  public enableTrackFeature(id: string | number) {
    this.trackFeatureListenerId = this.dataSource.ol.on(
      'addfeature',
      this.trackFeature.bind(this, id)
    );
  }
  public centerMapOnFeature(id: string | number) {
    const feat = this.dataSource.ol.getFeatureById(id);
    if (feat) {
      this.map.ol.getView().setCenter(feat.getGeometry().getCoordinates());
    }
  }

  public trackFeature(id, feat) {
    if (feat.feature.getId() === id && this.visible) {
      this.centerMapOnFeature(id);
    }
  }

  public disableTrackFeature(id?: string | number) {
    unByKey(this.trackFeatureListenerId);
  }

  /**
   * Custom loader for vector layer.
   * @internal
   * @param vectorSource the vector source to be created
   * @param url the url string or function to retrieve the data
   * @param interceptor the interceptor of the data
   * @param extent the extent of the requested data
   * @param resolution the current resolution
   * @param projection the projection to retrieve the data
   */
  private customLoader(
    vectorSource,
    url,
    interceptor,
    extent,
    resolution,
    projection
  ) {
    vectorSource.dispatchEvent({ type: 'vectorloading' });
    const xhr = new XMLHttpRequest();
    xhr.open(
      'GET',
      typeof url === 'function'
        ? (url = url(extent, resolution, projection))
        : url
    );
    const format = vectorSource.getFormat();
    if (format.getType() === FormatType.ARRAY_BUFFER) {
      xhr.responseType = 'arraybuffer';
    }
    if (interceptor) {
      interceptor.interceptXhr(xhr, url);
    }

    const onError = () => {
      vectorSource.dispatchEvent({ type: 'vectorloaderror' });
      vectorSource.removeLoadedExtent(extent);
    };
    xhr.onerror = onError;
    xhr.onload = () => {
      // status will be 0 for file:// urls
      if (!xhr.status || (xhr.status >= 200 && xhr.status < 300)) {
        const type = format.getType();
        let source;
        if (type === FormatType.JSON || type === FormatType.TEXT) {
          source = xhr.responseText;
        } else if (type === FormatType.XML) {
          source = xhr.responseXML;
          if (!source) {
            source = new DOMParser().parseFromString(
              xhr.responseText,
              'application/xml'
            );
          }
        } else if (type === FormatType.ARRAY_BUFFER) {
          source = xhr.response;
        }
        if (source) {
          vectorSource.addFeatures(
            format.readFeatures(source, {
              extent,
              featureProjection: projection
            }),
            format.readProjection(source)
          );
          vectorSource.dispatchEvent({ type: 'vectorloaded' });
        } else {
          onError();
        }
      } else {
        onError();
      }
    };
    xhr.send();
  }
}
