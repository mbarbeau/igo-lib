import {
  Directive,
  Input,
  OnDestroy,
  Self,
  OnInit,
  HostListener,
  AfterContentChecked
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
import { SearchSourceService } from './search-source.service';
import { sourceCanReverseSearchAsSummary } from './search.utils';
import { MediaService } from '@igo2/core';

/**
 * This directive makes the mouse coordinate trigger a reverse search on available search sources.
 * The search results are placed into a label, on a cross icon, representing the mouse coordinate.
 * By default, no search sources. Config in config file must be defined.
 * the layer level.
 */
@Directive({
  selector: '[igoSearchPointerSummary]'
})
export class SearchPointerSummaryDirective implements OnInit, OnDestroy, AfterContentChecked {

  public store: FeatureStore<Feature>;
  private lonLat: [number, number];
  private pointerSearchStore: EntityStore<SearchResult> = new EntityStore<SearchResult>([]);
  private lastTimeoutRequest;
  private store$$: Subscription;
  private layers$$: Subscription;
  private reverseSearch$$: Subscription[] = [];
  private hasPointerReverseSearchSource: boolean =  false;

  /**
   * Listener to the pointer move event
   */
  private pointerMoveListener: ListenerFunction;

  private searchPointerSummaryFeatureId: string = 'searchPointerSummaryFeatureId';
  /**
   * The delay where the mouse must be motionless before trigger the reverse search
   */
  @Input() igoSearchPointerSummaryDelay: number = 1000;

  /**
   * If the user has enabled or not the directive
   */
  @Input() igoSearchPointerSummaryEnabled: boolean = false;

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
    private searchService: SearchService,
    private searchSourceService: SearchSourceService,
    private mediaService: MediaService
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
    });

    // To handle context change without using the contextService.
    this.layers$$ = this.map.layers$.subscribe((layers) => {
      if (this.store && !layers.find(l => l.id === 'searchPointerSummaryId')) {
        this.initStore();
      }
    });

  }

  /**
   * Initialize the pointer position store
   * @internal
   */
  private initStore() {
    const store = this.store;

    const layer = new VectorLayer({
      id : 'searchPointerSummaryId',
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

  ngAfterContentChecked(): void {
      if (!this.searchSourceService.getEnabledSources().filter(sourceCanReverseSearchAsSummary).length) {
        this.hasPointerReverseSearchSource = false;
      } else {
        this.hasPointerReverseSearchSource = true;
      }
    }

  /**
   * Stop listening to pointermove and reverse search results.
   * @internal
   */
  ngOnDestroy() {
    this.unlistenToMapPointerMove();
    this.unsubscribeToPointerStore();
    this.unsubscribeReverseSearch();
    this.layers$$.unsubscribe();
  }

  /**
   * Subscribe to pointermove result store
   * @internal
   */
  subscribeToPointerStore() {
    this.store$$ = this.pointerSearchStore.entities$.subscribe(resultsUnderPointerPosition => {
      this.entitiesToPointerOverlay(resultsUnderPointerPosition);
    });
  }

  /**
   * Build an object based on the closest feature by type (base on type and distance properties )
   * @param results SearchResult[]
   * @returns OL style function
   */
  private computeSummaryClosestFeature(results: SearchResult[]): {} {
    const closestResultByType = {};

    results.map(result => {
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

    return closestResultByType;
  }

  /**
   * convert store entities to a pointer position overlay with label summary on.
   * @param event OL map browser pointer event
   */
  private entitiesToPointerOverlay(resultsUnderPointerPosition: SearchResult[]) {
    const closestResultByType = this.computeSummaryClosestFeature(resultsUnderPointerPosition);
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

  /**
   * Unsubscribe to pointer store.
   * @internal
   */
  unsubscribeToPointerStore() {
    this.store$$.unsubscribe();
  }
  /**
   * Unsubscribe to reverse seatch store.
   * @internal
   */
  unsubscribeReverseSearch() {
    this.reverseSearch$$.map(s => s.unsubscribe());
    this.reverseSearch$$ = [];
  }

  /**
   * Stop listening for map pointermove
   * @internal
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
    if (
      event.dragging || !this.igoSearchPointerSummaryEnabled ||
      !this.hasPointerReverseSearchSource || this.mediaService.isTouchScreen()) {
      this.clearLayer();
      return;
    }
    if (typeof this.lastTimeoutRequest !== 'undefined') { // cancel timeout when the mouse moves
      clearTimeout(this.lastTimeoutRequest);
      this.clearLayer();
      this.unsubscribeReverseSearch();
    }

    this.lonLat = transform(event.coordinate, this.mapProjection, 'EPSG:4326');

    this.lastTimeoutRequest = setTimeout(() => {
      this.onSearchCoordinate();
    }, this.igoSearchPointerSummaryDelay);
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

  /**
   * Add a feature to the pointer store
   * @param text string
   */
  private addPointerOverlay(text: string) {
    this.clearLayer();

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

/**
 * Clear the pointer store features
 */
private clearLayer() {
  if (this.store) {
    this.store.clearLayer();
  }
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
