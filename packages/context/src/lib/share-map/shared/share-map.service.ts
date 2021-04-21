import { Injectable, Optional } from '@angular/core';

import { RouteService, MessageService } from '@igo2/core';
import { Layer } from '@igo2/geo';
import type { IgoMap } from '@igo2/geo';

import { DetailedContext } from '../../context-manager/shared/context.interface';
import { ContextService } from '../../context-manager/shared/context.service';

@Injectable({
  providedIn: 'root'
})
export class ShareMapService {

  constructor(
    private contextService: ContextService,
    private messageService: MessageService,
    @Optional() private route: RouteService
  ) {}

  getUrlWithApi(formValues) {
    return `${location.origin + location.pathname}?context=${formValues.uri}`;
  }

  createContextShared(map: IgoMap, formValues) {
    const context = this.contextService.getContextFromMap(map);
    context.scope = 'public';
    context.title = formValues.title;
    context.uri = formValues.uri;
    return this.contextService.create(context);
  }

  updateContextShared(map: IgoMap, formValues, id: string) {
    const context = this.contextService.getContextFromMap(map);
    return this.contextService.update(id, {
      title: formValues.title,
      map: context.map
    } as DetailedContext);
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
    const addedLayersQueryParamsArcgisRest = this.makeLayersByService(layers, contextLayersID, 'arcgisrest');
    const addedLayersQueryParamsImageArcgisRest = this.makeLayersByService(layers, contextLayersID, 'imagearcgisrest');
    const addedLayersQueryParamsTileArcgisRest = this.makeLayersByService(layers, contextLayersID, 'tilearcgisrest');

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

    let url = `${location.origin}${location.pathname}?${context}&${zoom}&${center}&${layersUrl}&${llc}&${addedLayersQueryParamsWms}&${llc}&${addedLayersQueryParamsWmts}&${addedLayersQueryParamsArcgisRest}&${addedLayersQueryParamsImageArcgisRest}&${addedLayersQueryParamsTileArcgisRest}`;

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
    for (const layer of layers.filter(l => l.dataSource.options?.type === typeService)) {
      if (contextLayersID.indexOf(layer.id) === -1) {
        const linkUrl = encodeURIComponent((layer.dataSource.options as any).url);
        let addedLayer = '';
        switch (layer.dataSource.options.type.toLowerCase()) {
          case 'wms':
            addedLayer = encodeURIComponent((layer.dataSource.options as any).params.LAYERS);
            break;
          case 'wmts':
          case 'arcgisrest':
          case 'imagearcgisrest':
          case 'tilearcgisrest':
            addedLayer = encodeURIComponent((layer.dataSource.options as any).layer);
            break;
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
      let linkUrlKey;
      let layersKey;
      /*
      const linkUrlKey = (typeService === 'wms') ? this.route.options.wmsUrlKey :
        (typeService === 'wmts') ? this.route.options.wmtsUrlKey : '' ;
      const layersKey = (typeService === 'wms') ? this.route.options.wmsLayersKey :
        (typeService === 'wmts') ? this.route.options.wmtsLayersKey : '' ;
*/
      switch (typeService.toLowerCase()) {
        case 'wms':
          linkUrlKey = this.route.options.wmsUrlKey;
          layersKey = this.route.options.wmsLayersKey;
          break;
        case 'wmts':
          linkUrlKey = this.route.options.wmtsUrlKey;
          layersKey = this.route.options.wmtsLayersKey;
          break;
        case 'arcgisrest':
          linkUrlKey = this.route.options.arcgisUrlKey;
          layersKey = this.route.options.arcgisLayersKey;
          break;
        case 'imagearcgisrest':
          linkUrlKey = this.route.options.iarcgisUrlKey;
          layersKey = this.route.options.iarcgisLayersKey;
          break;
        case 'tilearcgisrest':
          linkUrlKey = this.route.options.tarcgisUrlKey;
          layersKey = this.route.options.tarcgisLayersKey;
          break;
        default:
          linkUrlKey = '';
          layersKey = '';
      }

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
