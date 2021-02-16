import { Injectable, Optional } from '@angular/core';

import { RouteService, ConfigService, MessageService } from '@igo2/core';
import { Layer } from '@igo2/geo';
import type { IgoMap } from '@igo2/geo';

import { ContextService } from '../../context-manager/shared/context.service';

@Injectable({
  providedIn: 'root'
})
export class ShareMapService {
  private apiUrl: string;

  constructor(
    private config: ConfigService,
    private contextService: ContextService,
    private messageService: MessageService,
    @Optional() private route: RouteService
  ) {
    this.apiUrl = this.config.getConfig('context.url');
  }

  getUrl(map: IgoMap, formValues, publicShareOption) {
    if (this.apiUrl) {
      return this.getUrlWithApi(map, formValues);
    }
    return this.getUrlWithoutApi(map, publicShareOption);
  }

  getUrlWithApi(map: IgoMap, formValues) {
    const context = this.contextService.getContextFromMap(map);
    context.scope = 'public';
    context.title = formValues.title;
    context.uri = formValues.uri;
    this.contextService.create(context).subscribe(
      rep => {},
      err => {
        err.error.title = 'Share Map';
        this.messageService.showError(err);
      }
    );
    return `${location.origin + location.pathname}?context=${formValues.uri}`;
  }

  getUrlWithoutApi(map: IgoMap, publicShareOption) {
    if (
      !this.route ||
      !this.route.options.visibleOnLayersKey ||
      !this.route.options.visibleOffLayersKey ||
      !map.viewController.getZoom()
    ) {
      return;
    }
    const llc = publicShareOption.layerlistControls.querystring;

    let visibleKey = this.route.options.visibleOnLayersKey;
    let invisibleKey = this.route.options.visibleOffLayersKey;
    const layers = map.layers;

    const visibleLayers = layers.filter(lay => lay.visible && lay.id !== 'searchPointerSummaryId');
    const invisibleLayers = layers.filter(lay => !lay.visible && lay.id !== 'searchPointerSummaryId');

    if (visibleLayers.length === 0) {
      visibleKey = '';
    }
    if (invisibleLayers.length === 0) {
      invisibleKey = '';
    }

    let layersUrl = '';
    let layersToLoop = [];
    if (visibleLayers.length > invisibleLayers.length) {
      layersUrl = `${visibleKey}=*&${invisibleKey}=`;
      layersToLoop = invisibleLayers;
    } else {
      layersUrl = `${invisibleKey}=*&${visibleKey}=`;
      layersToLoop = visibleLayers;
    }

    for (const layer of layersToLoop) {
      if (layer.id) {
        layersUrl += layer.id + ',';
      }
    }
    const contextLayersID = [];
    const contextLayers = this.contextService.context$.value.layers;
    for (const contextLayer of contextLayers) {
      if ( typeof contextLayer.id !== 'undefined'  ||  typeof contextLayer.source !== 'undefined' ) {
        contextLayersID.push(contextLayer.id || contextLayer.source.id);
      }
    }

    const addedLayersQueryParamsWms = this.makeLayersByService(layers, contextLayersID, 'wms');
    const addedLayersQueryParamsWmts = this.makeLayersByService(layers, contextLayersID, 'wmts');

    layersUrl = layersUrl.substr(0, layersUrl.length - 1);

    const zoomKey = this.route.options.zoomKey;
    const centerKey = this.route.options.centerKey;
    const contextKey = this.route.options.contextKey;

    const zoom = `${zoomKey}=${map.viewController.getZoom()}`;
    const arrayCenter = map.viewController.getCenter('EPSG:4326') || [];
    const long = arrayCenter[0].toFixed(5).replace(/\.([^0]+)0+$/, '.$1');
    const lat = arrayCenter[1].toFixed(5).replace(/\.([^0]+)0+$/, '.$1');
    const center = `${centerKey}=${long},${lat}`.replace(/.00000/g, '');
    let context = '';
    if (this.contextService.context$.value) {
      context = `${contextKey}=${this.contextService.context$.value.uri}`;
    }

    let url = `${location.origin}${location.pathname}?${context}&${zoom}&${center}&${layersUrl}&${llc}&${addedLayersQueryParamsWms}&${llc}&${addedLayersQueryParamsWmts}`;

    for (let i = 0; i < 5; i++) {
      url = url.replace(/&&/g, '&');
      url = url.endsWith('&') ? url.slice(0, -1) : url;
    }
    url = url.endsWith('&') ? url.slice(0, -1) : url;
    url = url.replace('?&wm', '&wm');
    url = url.replace('?&', '?');

    return url;
  }

  private makeLayersByService(layers: Layer[], contextLayersID: any[], typeService: string): string {

    const addedLayersByService = [];
    for (const layer of layers.filter(
      l => l.dataSource.options && (l.dataSource.options.type === typeService)
    )) {
      if (contextLayersID.indexOf(layer.id) === -1) {
        const linkUrl = encodeURIComponent((layer.dataSource.options as any).url);
        let addedLayer = '';
        if (layer.dataSource.options.type === 'wms') {
          addedLayer = encodeURIComponent((layer.dataSource.options as any).params.LAYERS);
        } else if (layer.dataSource.options.type === 'wmts') {
          addedLayer = encodeURIComponent((layer.dataSource.options as any).layer);
        }
        const addedLayerPosition = `${addedLayer}:igoz${layer.zIndex}`;

        if (
          !addedLayersByService.find(definedUrl => definedUrl.url === linkUrl)
        ) {
          addedLayersByService.push({
            url: linkUrl,
            layers: [addedLayerPosition]
          });
        } else {
          addedLayersByService.forEach(service => {
            if (service.url === linkUrl) {
              service.layers.push(addedLayerPosition);
            }
          });
        }
      }
    }

    let addedLayersQueryParams = '';
    if (addedLayersByService.length >= 1) {
      const linkUrlKey = (typeService === 'wms') ? this.route.options.wmsUrlKey :
        (typeService === 'wmts') ? this.route.options.wmtsUrlKey : '' ;
      const layersKey = (typeService === 'wms') ? this.route.options.wmsLayersKey :
        (typeService === 'wmts') ? this.route.options.wmtsLayersKey : '' ;

      let linkUrlQueryParams = '';
      let layersQueryParams = '';
      addedLayersByService.forEach(service => {
        linkUrlQueryParams += `${service.url},`;
        layersQueryParams += `(${service.layers.join(',')}),`;
      });
      linkUrlQueryParams = linkUrlQueryParams.endsWith(',')
        ? linkUrlQueryParams.slice(0, -1)
        : linkUrlQueryParams;
      layersQueryParams = layersQueryParams.endsWith(',')
        ? layersQueryParams.slice(0, -1)
        : layersQueryParams;
      addedLayersQueryParams = `${linkUrlKey}=${linkUrlQueryParams}&${layersKey}=${layersQueryParams}`;
    }

    return addedLayersQueryParams;
  }
}
