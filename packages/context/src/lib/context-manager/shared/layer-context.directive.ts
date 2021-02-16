import { Directive, OnInit, OnDestroy, Optional, Input } from '@angular/core';

import { Subscription, merge } from 'rxjs';
import { buffer, debounceTime, filter } from 'rxjs/operators';

import { RouteService, ConfigService } from '@igo2/core';
import {
  MapBrowserComponent,
  Layer,
  LayerService,
  LayerOptions,
  StyleListService,
  StyleService
} from '@igo2/geo';
import type { IgoMap } from '@igo2/geo';

import { ContextService } from './context.service';
import { DetailedContext } from './context.interface';
import {
  addImportedFeaturesToMap,
  addImportedFeaturesStyledToMap
} from '../../context-import-export/shared/context-import.utils';
import GeoJSON from 'ol/format/GeoJSON';

@Directive({
  selector: '[igoLayerContext]'
})
export class LayerContextDirective implements OnInit, OnDestroy {
  private context$$: Subscription;
  private queryParams: any;

  private contextLayers: Layer[] = [];

  @Input() removeLayersOnContextChange: boolean = true;

  get map(): IgoMap {
    return this.component.map;
  }

  constructor(
    private component: MapBrowserComponent,
    private contextService: ContextService,
    private layerService: LayerService,
    private configService: ConfigService,
    private styleListService: StyleListService,
    private styleService: StyleService,
    @Optional() private route: RouteService
  ) {}

  ngOnInit() {
    this.context$$ = this.contextService.context$
      .pipe(filter((context) => context !== undefined))
      .subscribe((context) => this.handleContextChange(context));

    if (
      this.route &&
      this.route.options.visibleOnLayersKey &&
      this.route.options.visibleOffLayersKey &&
      this.route.options.contextKey
    ) {
      const queryParams$$ = this.route.queryParams.subscribe((params) => {
        if (Object.keys(params).length > 0) {
          this.queryParams = params;
          queryParams$$.unsubscribe();
        }
      });
    }
  }

  ngOnDestroy() {
    this.context$$.unsubscribe();
  }

  private handleContextChange(context: DetailedContext) {
    if (context.layers === undefined) {
      return;
    }
    if (this.removeLayersOnContextChange === true) {
      this.map.removeAllLayers();
    } else {
      this.map.removeLayers(this.contextLayers);
    }
    this.contextLayers = [];

    const layersAndIndex$ = merge(
      ...context.layers.map((layerOptions: LayerOptions, index: number) => {
        return this.layerService.createAsyncLayer(layerOptions, context.uri);
      })
    );

    layersAndIndex$
      .pipe(buffer(layersAndIndex$.pipe(debounceTime(500))))
      .subscribe((layers: Layer[]) => {
        layers = layers
          .filter((layer: Layer) => layer !== undefined)
          .map((layer) => {
            layer.visible = this.computeLayerVisibilityFromUrl(layer);
            layer.zIndex = layer.zIndex;

            return layer;
          });

        this.contextLayers.concat(layers);
        this.map.addLayers(layers);

        if (context.extraFeatures) {
          context.extraFeatures.forEach((featureCollection) => {
            const format = new GeoJSON();
            const title = featureCollection.name;
            featureCollection = JSON.stringify(featureCollection);
            featureCollection = format.readFeatures(featureCollection, {
              dataProjection: 'EPSG:4326',
              featureProjection: 'EPSG:3857'
            });
            if (!this.configService.getConfig('importWithStyle')) {
              addImportedFeaturesToMap(featureCollection, this.map, title);
            } else {
              addImportedFeaturesStyledToMap(
                featureCollection,
                this.map,
                title,
                this.styleListService,
                this.styleService
              );
            }
          });
        }
      });
  }

  private computeLayerVisibilityFromUrl(layer: Layer): boolean {
    const params = this.queryParams;
    const currentContext = this.contextService.context$.value.uri;
    const currentLayerid: string = layer.id;

    let visible = layer.visible;
    if (!params || !currentLayerid) {
      return visible;
    }

    const contextParams = params[this.route.options.contextKey as string];
    if (contextParams === currentContext || !contextParams) {
      let visibleOnLayersParams = '';
      let visibleOffLayersParams = '';
      let visiblelayers: string[] = [];
      let invisiblelayers: string[] = [];

      if (
        this.route.options.visibleOnLayersKey &&
        params[this.route.options.visibleOnLayersKey as string]
      ) {
        visibleOnLayersParams =
          params[this.route.options.visibleOnLayersKey as string];
      }
      if (
        this.route.options.visibleOffLayersKey &&
        params[this.route.options.visibleOffLayersKey as string]
      ) {
        visibleOffLayersParams =
          params[this.route.options.visibleOffLayersKey as string];
      }

      /* This order is important because to control whichever
       the order of * param. First whe open and close everything.*/
      if (visibleOnLayersParams === '*') {
        visible = true;
      }
      if (visibleOffLayersParams === '*') {
        visible = false;
      }

      // After, managing named layer by id (context.json OR id from datasource)
      visiblelayers = visibleOnLayersParams.split(',');
      invisiblelayers = visibleOffLayersParams.split(',');
      if (visiblelayers.indexOf(currentLayerid) > -1  || visiblelayers.indexOf(currentLayerid.toString()) > -1) {
        visible = true;
      }
      if (invisiblelayers.indexOf(currentLayerid) > -1 || invisiblelayers.indexOf(currentLayerid.toString()) > -1) {
        visible = false;
      }
    }

    return visible;
  }
}
