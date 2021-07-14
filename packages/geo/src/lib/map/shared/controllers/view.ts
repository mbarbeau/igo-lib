import OlMap from 'ol/Map';
import OlMapEvent from 'ol/MapEvent';

import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import * as oleasing from 'ol/easing';
import * as olproj from 'ol/proj';
import OlProjection from 'ol/proj/Projection';
import OlView from 'ol/View';

import { MapViewAction } from '../map.enums';
import { MapExtent, MapViewState } from '../map.interface';
import { getScaleFromResolution, viewStatesAreEqual } from '../map.utils';
import { MapController } from './controller';

export interface MapViewControllerOptions {
  stateHistory: boolean;
}

/**
 * Controller to handle map view interactions
 */
export class MapViewController extends MapController {
  /**
   * Observable of the current resolution
   */
  resolution$ = new BehaviorSubject<number>(undefined);

  /**
   * Observable of the current state
   */
  state$ = new BehaviorSubject<MapViewState>(undefined);

  /**
   * View Padding
   */
  padding = [0, 0, 0, 0];

  /**
   * Max zoom after set extent
   */
  maxZoomOnExtent = 19;

  /**
   * Max extent possible when zooming
   */
  maxLayerZoomExtent: MapExtent;

  /**
   * Extent stream
   */
  private extent$ = new Subject<{ extent: MapExtent; action: MapViewAction }>();

  /**
   * Subscription to the movement stream
   */
  private extent$$: Subscription;

  /**
   * History of states
   */
  private states: MapViewState[] = [];

  /**
   * Current state index
   */
  private stateIndex: number = 0;

  /**
   * Whether the view controller should keep the view's state history
   */
  get stateHistory(): boolean {
    return this.options ? this.options.stateHistory === true : false;
  }

  /**
   * OL View
   */
  get olView(): OlView {
    return this.olMap.getView();
  }

  constructor(private options?: MapViewControllerOptions) {
    super();
  }

  /**
   * Add or remove this controller to/from a map.
   * @param map OL Map
   */
  setOlMap(olMap: OlMap | undefined) {
    super.setOlMap(olMap);
    this.setupObservers();
  }

  /**
   * Observe move moveend and subscribe to the extent stream
   */
  setupObservers() {
    if (this.stateHistory === true) {
      this.observerKeys.push(
        this.olMap.on('moveend', (event: OlMapEvent) => this.onMoveEnd(event))
      );
    }

    this.extent$$ = this.extent$
      .pipe(debounceTime(25))
      .subscribe((value: { extent: MapExtent; action: MapViewAction }) => {
        this.setExtent(value.extent, value.action);
      });
  }

  /**
   * Teardown any observers
   */
  teardownObservers() {
    super.teardownObservers();
    if (this.extent$$ !== undefined) {
      this.extent$$.unsubscribe();
      this.extent$$ = undefined;
    }
  }

  /**
   * Get the view's OL projection
   * @returns OL projection
   */
  getOlProjection(): OlProjection {
    return this.olView.getProjection();
  }

  /**
   * Get the current map view center
   * @param projection Output projection
   * @returns Center
   */
  getCenter(projection?: string | OlProjection): [number, number] {
    let center = this.olView.getCenter();
    if (projection && center) {
      center = olproj.transform(center, this.getOlProjection(), projection);
    }
    return center;
  }

  /**
   * Get the current view extent
   * @param projection Output projection
   * @returns Extent
   */
  getExtent(projection?: string | OlProjection): MapExtent {
    let extent = this.olView.calculateExtent(this.olMap.getSize());
    if (projection && extent) {
      extent = olproj.transformExtent(
        extent,
        this.getOlProjection(),
        projection
      );
    }
    return extent;
  }

  /**
   * Get the current scale
   * @param dpi Dot per inches
   * @returns View scale
   */
  getScale(dpi = 96) {
    return getScaleFromResolution(
      this.getResolution(),
      this.getOlProjection().getUnits(),
      dpi
    );
  }

  /**
   * Get the current resolution
   * @returns Projection denominator
   */
  getResolution(): number {
    return this.olView.getResolution();
  }

  /**
   * Get the current zoom level
   * @returns Zoom level
   */
  getZoom(): number {
    return Math.round(this.olView.getZoom());
  }

  /**
   * Zoom in
   */
  zoomIn() {
    this.zoomTo(this.olView.getZoom() + 1);
  }

  /**
   * Zoom out
   */
  zoomOut() {
    this.zoomTo(this.olView.getZoom() - 1);
  }

  /**
   * Zoom to specific zoom level
   * @param zoom Zoom level
   */
  zoomTo(zoom: number) {
    this.olView.cancelAnimations();
    this.olView.animate({
      zoom,
      duration: 250,
      easing: oleasing.easeOut
    });
  }

  /**
   * Move to extent after a short delay (100ms) unless
   * a new movement gets registered in the meantime.
   * @param extent Extent to move to
   */
  moveToExtent(extent: [number, number, number, number]) {
    this.extent$.next({ extent, action: MapViewAction.Move });
  }

  /**
   * Zoom to extent after a short delay (100ms) unless
   * a new movement gets registered in the meantime.
   * @param extent Extent to zoom to
   */
  zoomToExtent(extent: [number, number, number, number]) {
    this.extent$.next({ extent, action: MapViewAction.Zoom });
  }

  /**
   * Return the current view rotation
   * @returns Rotation angle in degrees
   */
  getRotation(): number {
    return this.olView.getRotation();
  }

  /**
   * Reset the view rotation to 0
   */
  resetRotation() {
    this.olView.animate({ rotation: 0 });
  }

  /**
   * Whether the view has a previous state
   * @returns True if the view has a previous state
   */
  hasPreviousState(): boolean {
    return this.states.length > 1 && this.stateIndex > 0;
  }

  /**
   * Whether the view has a next state
   * @returns True if the view has a next state
   */
  hasNextState(): boolean {
    return this.states.length > 1 && this.stateIndex < this.states.length - 1;
  }

  /**
   * Restore the previous view state
   */
  previousState() {
    if (this.hasPreviousState()) {
      this.setStateIndex(this.stateIndex - 1);
    }
  }

  /**
   * Restore the next view state
   */
  nextState() {
    if (this.hasNextState()) {
      this.setStateIndex(this.stateIndex + 1);
    }
  }

  /**
   * Clear the state history
   */
  clearStateHistory() {
    this.states = [];
    this.stateIndex = 0;
  }

  /**
   * Update the the view to it's intial state
   */
  setInitialState() {
    if (this.states.length > 0) {
      this.setStateIndex(0);
    }
  }

  /**
   * Move to the extent retrieved from the stream
   * @param extent Extent
   * @param action Either zoom or move
   * @param animation With or without animation to the target extent.
   */
  private setExtent(
    extent: MapExtent,
    action: MapViewAction,
    animation: boolean = true
  ) {
    const olView = this.olView;
    olView.cancelAnimations();
    const duration = animation ? 500 : 0;
    const zoom = olView.getZoom();

    const fromCenter = olView.getCenter();
    const toCenter = [
      extent[0] + (extent[2] - extent[0]) / 2,
      extent[1] + (extent[3] - extent[1]) / 2
    ];
    const distCenter = Math.sqrt(
      Math.pow(fromCenter[0] - toCenter[0], 2) +
        Math.pow(fromCenter[1] - toCenter[1], 2)
    );
    const fromExtent = olView.calculateExtent();
    const fromSize = Math.sqrt(
      Math.pow(fromExtent[2] - fromExtent[0], 2) +
        Math.pow(fromExtent[3] - fromExtent[1], 2)
    );
    const toSize = Math.sqrt(
      Math.pow(extent[2] - extent[0], 2) + Math.pow(extent[3] - extent[1], 2)
    );
    const moySize = (toSize + fromSize) / 2;
    const xSize = distCenter / moySize;

    const maxZoom =
      action === MapViewAction.Move || zoom > this.maxZoomOnExtent
        ? zoom
        : this.maxZoomOnExtent;

    olView.fit(extent, {
      size: this.olMap.getSize(),
      maxZoom,
      padding: this.padding,
      duration: xSize > 4 ? 0 : duration,
      callback: (isFinished: boolean) => {
        if (!isFinished) {
          olView.fit(extent, {
            size: this.olMap.getSize(),
            maxZoom,
            padding: this.padding,
            duration: xSize > 4 ? 0 : duration
          });
        }
      }
    });
  }

  /**
   * Set the view state index
   * @param index State index
   */
  private setStateIndex(index: number) {
    this.stateIndex = index;
    this.setState(this.states[index]);
  }

  /**
   * Set the view state
   * @param state View state
   */
  private setState(state: MapViewState) {
    this.olView.animate({
      resolution: state.resolution,
      center: state.center,
      duration: 0
    });
  }

  /**
   * On move end, get the view state and record it.
   * @param event Map event
   */
  private onMoveEnd(event: OlMapEvent) {
    const resolution = this.getResolution();
    if (this.resolution$.value !== resolution) {
      this.resolution$.next(resolution);
    }

    const state = {
      resolution,
      center: this.getCenter(),
      zoom: this.getZoom()
    };

    if (this.stateHistory === true) {
      const stateIndex = this.stateIndex;
      const stateAtIndex =
        this.states.length === 0 ? undefined : this.states[stateIndex];
      if (!viewStatesAreEqual(state, stateAtIndex)) {
        this.states = this.states.slice(0, stateIndex + 1).concat([state]);
        this.stateIndex = this.states.length - 1;
      }
    }

    this.state$.next(state);
  }
}
