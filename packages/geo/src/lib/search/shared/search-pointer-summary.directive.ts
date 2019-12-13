import {
  Directive,
  Input,
  OnDestroy,
  Self,
  OnInit,
  HostListener
} from '@angular/core';

import { Subscription } from 'rxjs';

import { MapBrowserPointerEvent as OlMapBrowserPointerEvent } from 'ol/MapBrowserEvent';
import { ListenerFunction } from 'ol/events';

import { IgoMap } from '../../map/shared/map';
import { MapBrowserComponent } from '../../map/map-browser/map-browser.component';
import { Feature } from '../../feature/shared/feature.interfaces';
import { SearchService } from './search.service';

import olFeature from 'ol/Feature';
import { transform } from 'ol/proj';
import * as olstyle from 'ol/style';
import * as olgeom from 'ol/geom';
import OlGeoJSON from 'ol/format/GeoJSON';

import { SearchResult, Research } from './search.interfaces';
import { EntityStore } from '@igo2/common';
import { FeatureDataSource } from '../../datasource/shared/datasources/feature-datasource';
import { VectorLayer } from '../../layer/shared/layers/vector-layer';
import { take } from 'rxjs/operators';
import { tryBindStoreLayer } from '../../feature/shared/feature.utils';
import { FeatureStore } from '../../feature/shared/store';
import { FeatureMotion, FEATURE } from '../../feature/shared/feature.enums';

/**
 * This directive makes the mouse coordinate trigger a reverse search on available search sources.
 * The search results are placed into a label, on a cross icon, representing the mouse coordinate.
 * By default, no search sources. Config in config file must be defined.
 * the layer level.
 */
@Directive({
  selector: '[igoSearchPointerSummary]'
})
export class SearchPointerSummaryDirective implements OnInit, OnDestroy {

  public store: FeatureStore<Feature>;
  private lonLat: [number, number];
  private pointerSearchStore: EntityStore<SearchResult> = new EntityStore<SearchResult>([]);
  private lastTimeoutRequest;
  private store$$: Subscription;
  private reverseSearch$$: Subscription[] = [];

  /**
   * Listener to the pointer move event
   */
  private pointerMoveListener: ListenerFunction;

  private searchPointerSummaryFeatureId: string = 'searchPointerSummaryFeatureId';
  /**
   * The delay where the mouse must be motionless before trigger the reverse search
   */
  @Input() pointerMoveDelay: number = 1000;

  @HostListener('mouseout')
  mouseout() {
    clearTimeout(this.lastTimeoutRequest);
    this.store.clearLayer();
  }

  /**
   * IGO map
   * @internal
   */
  get map(): IgoMap {
    return this.component.map;
  }

  get mapProjection(): string {
    return (this.component.map as IgoMap).projection;
  }

  constructor(
    @Self() private component: MapBrowserComponent,
    private searchService: SearchService
  ) { }

  /**
   * Start listening to pointermove and reverse search results.
   * @internal
   */
  ngOnInit() {
    this.listenToMapPointerMove();
    this.subscribeToPointerStore();

    this.map.status$.pipe(take(1)).subscribe(() => {
      this.store = new FeatureStore<Feature>([], {map: this.map});
      this.initStore();
    }
    );
  }

  /**
   * Initialize the measure store and set up some listeners
   * @internal
   */
  private initStore() {
    const store = this.store;

    const layer = new VectorLayer({
      title: 'searchPointerSummary',
      zIndex: 900,
      source: new FeatureDataSource(),
      showInLayerList: false,
      exportable: false,
      browsable: false,
      style: pointerPositionSummaryMarker
    });
    tryBindStoreLayer(store, layer);
  }

  /**
   * Stop listening to pointermove and reverse search results.
   * @internal
   */
  ngOnDestroy() {
    this.unlistenToMapPointerMove();
    this.unsubscribeToPointerStore();
    this.unsubscribeReverseSearch();

    // this.map.removeLayer(this.pointerPositionLayer);
  }

  subscribeToPointerStore() {
    this.store$$ = this.pointerSearchStore.entities$.subscribe(resultsUnderPointerPosition => {
      this.entitiesToPointerOverlay(resultsUnderPointerPosition);

    });
  }

  private entitiesToPointerOverlay(resultsUnderPointerPosition: SearchResult[]) {

    const closestResultByType = {};

    resultsUnderPointerPosition.map(result => {
      if (result.data.properties.type && result.data.properties.distance >= 0) {
        if (closestResultByType.hasOwnProperty(result.data.properties.type)) {
          const prevDistance = closestResultByType[result.data.properties.type].distance;
          if (result.data.properties.distance < prevDistance) {
            closestResultByType[result.data.properties.type] = { distance: result.data.properties.distance, title: result.meta.title };
          }
        } else {
          closestResultByType[result.data.properties.type] = { distance: result.data.properties.distance, title: result.meta.title };
        }
      }
    });

    const summarizedClosestType = Object.keys(closestResultByType);
    const processedSummarizedClosestType = [];
    const summary = [];
    resultsUnderPointerPosition.map(result => {
      const typeIndex = summarizedClosestType.indexOf(result.data.properties.type);
      if (typeIndex !== -1) {
        summary.push(closestResultByType[result.data.properties.type].title);
        summarizedClosestType.splice(typeIndex, 1);
        processedSummarizedClosestType.push(result.data.properties.type);
      } else {
        if (processedSummarizedClosestType.indexOf(result.data.properties.type) === -1) {
          summary.push(result.meta.title);
        }
      }
    });
    if (summary.length) {
      this.addPointerOverlay(summary.join('\n'));
    }
  }

  /**
   * On map pointermove
   */
  private listenToMapPointerMove() {
    this.pointerMoveListener = this.map.ol.on(
      'pointermove',
      (event: OlMapBrowserPointerEvent) => this.onMapEvent(event)
    );
  }

  unsubscribeToPointerStore() {
    this.store$$.unsubscribe();
  }

  unsubscribeReverseSearch() {
    this.reverseSearch$$.map(s => s.unsubscribe());
    this.reverseSearch$$ = [];
  }

  /**
   * Stop listening for map pointermove
   */
  private unlistenToMapPointerMove() {
    this.map.ol.un(this.pointerMoveListener.type, this.pointerMoveListener.listener);
    this.pointerMoveListener = undefined;
  }

  /**
   * Trigger reverse search when the mouse is motionless during the defined delay (pointerMoveDelay).
   * @param event OL map browser pointer event
   */
  private onMapEvent(event: OlMapBrowserPointerEvent) {
    if (event.dragging) { return; }
    if (typeof this.lastTimeoutRequest !== 'undefined') { // cancel timeout when the mouse moves
      clearTimeout(this.lastTimeoutRequest);
      this.store.clearLayer();
      this.unsubscribeReverseSearch();
    }

    this.lonLat = transform(event.coordinate, this.mapProjection, 'EPSG:4326');

    this.lastTimeoutRequest = setTimeout(() => {
      this.onSearchCoordinate();
    }, this.pointerMoveDelay);
  }

  private onSearchCoordinate() {
    this.pointerSearchStore.clear();
    const results = this.searchService.reverseSearch(this.lonLat, { params: { geometry: 'false', icon: 'false' } }, true);

    for (const i in results) {
      if (results.length > 0) {
        this.reverseSearch$$.push(
          results[i].request.subscribe((_results: SearchResult<Feature>[]) => {
            this.onSearch({ research: results[i], results: _results });
          }));
      }
    }
  }

  private onSearch(event: { research: Research; results: SearchResult[] }) {
    const results = event.results;
    const newResults = this.pointerSearchStore.all()
      .filter((result: SearchResult) => result.source !== event.research.source)
      .concat(results);
    this.pointerSearchStore.load(newResults);
  }

  private addPointerOverlay(text: string) {
    this.store.clearLayer();

    const geometry = new olgeom.Point(
      transform(this.lonLat, 'EPSG:4326', this.mapProjection)
    );
    const feature = new olFeature({ geometry });
    const geojsonGeom = new OlGeoJSON().writeGeometryObject(geometry, {
      featureProjection: this.mapProjection,
      dataProjection: this.mapProjection
    });

    const f: Feature = {
      type: FEATURE,
      geometry: geojsonGeom,
      projection: this.mapProjection,
      properties: {
        id: this.searchPointerSummaryFeatureId,
        pointerSummary: text
      },
      meta: {
        id: this.searchPointerSummaryFeatureId
      },
      ol: feature
    };
    this.store.setLayerFeatures([f], FeatureMotion.None);
  }

}

/**
 * Create a default style for the pointer position and it's label summary.
 * @param feature OlFeature
 * @returns OL style function
 */
export function pointerPositionSummaryMarker(feature: olFeature, resolution: number): olstyle.Style {
  return new olstyle.Style({
    image: new olstyle.Icon({
      src: './assets/igo2/geo/icons/cross_black_18px.svg',
      imgSize: [18, 18], // for ie
    }),

    text: new olstyle.Text({
      text: feature.get('pointerSummary'),
      textAlign: 'left',
      textBaseline: 'bottom',
      font: '12px Calibri,sans-serif',
      fill: new olstyle.Fill({ color: '#000' }),
      backgroundFill: new olstyle.Fill({ color: 'rgba(255, 255, 255, 0.5)' }),
      backgroundStroke: new olstyle.Stroke({ color: 'rgba(200, 200, 200, 0.75)', width: 2 }),
      stroke: new olstyle.Stroke({ color: '#fff', width: 3 }),
      overflow: true,
      offsetX: 10,
      offsetY: -10,
      padding: [2.5, 2.5, 2.5, 2.5]
    })
  });
}