import { Injectable, EventEmitter, Output } from '@angular/core';

import { FeatureStore } from '@igo2/geo';
import { MapState } from '../map/map.state';

/**
 * Service that holds the state of the direction module
 */
@Injectable({
  providedIn: 'root'
})
export class DirectionState {

  /**
   * Store that holds the stop and the driving route
   */
  public stopsStore: FeatureStore = new FeatureStore([], {
    map: this.mapState.map
  });

  /**
   * Store that holds the driving route
   */
  public routeStore: FeatureStore = new FeatureStore([], {
    map: this.mapState.map
  });

  public activeRouteDescription: string;

  public routeFromFeatureDetail = false;

  constructor(private mapState: MapState) {}

  setRouteFromFeatureDetail(value: boolean) {
    this.routeFromFeatureDetail = value;
  }

}
