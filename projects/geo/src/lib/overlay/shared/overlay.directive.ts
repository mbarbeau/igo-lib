import { Directive, Self, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

import olFormatGeoJSON from 'ol/format/GeoJSON';
import * as olextent from 'ol/extent';
import * as olproj from 'ol/proj';

import { IgoMap } from '../../map/shared/map';
import { MapBrowserComponent } from '../../map/map-browser/map-browser.component';
import { SourceFeatureType } from '../../feature/shared/feature.enum';
import { Feature } from '../../feature/shared/feature.interface';

import { OverlayService } from '../shared/overlay.service';
import { OverlayAction } from '../shared/overlay.enum';

@Directive({
  selector: '[igoOverlay]'
})
export class OverlayDirective implements OnInit, OnDestroy {
  private features$$: Subscription;
  private format = new olFormatGeoJSON();

  get map(): IgoMap {
    return this.component.map;
  }

  constructor(
    @Self() private component: MapBrowserComponent,
    private overlayService: OverlayService
  ) {}

  ngOnInit() {
    this.features$$ = this.overlayService.features$.subscribe(res =>
      this.handleFeatures(res[0], res[1])
    );
  }

  ngOnDestroy() {
    this.features$$.unsubscribe();
  }

  private handleFeatures(features: Feature[], action: OverlayAction) {
    this.map.clearOverlay();

    if (!features || features.length === 0) {
      return;
    }

    const extent = olextent.createEmpty();

    let featureExtent, geometry, featureFlatCoordinates;
    features.forEach((feature: Feature) => {
      const olFeature = this.format.readFeature(feature, {
        dataProjection: feature.projection,
        featureProjection: this.map.projection
      });

      geometry = olFeature.getGeometry();
      featureFlatCoordinates = geometry.simplify(100).getFlatCoordinates();
      featureExtent = this.getFeatureExtent(feature);
      if (olextent.isEmpty(featureExtent)) {
        if (geometry !== null) {
          featureExtent = geometry.getExtent();
        }
      }
      olextent.extend(extent, featureExtent);

      this.map.addOverlay(olFeature);
    }, this);
    if (features[0].sourceType === SourceFeatureType.Click) {
      if (olextent.containsCoordinate(this.map.getExtent(), featureFlatCoordinates)) {
        action = OverlayAction.None;
      } else {
        action = OverlayAction.Move;
      }
    }
    let cntOverlapExtent = 0;
    for (let i = 0; i < featureFlatCoordinates.length; i += 2) {
      if (olextent.containsCoordinate(this.map.getExtent(),
       [featureFlatCoordinates[i], featureFlatCoordinates[i + 1]])) {
        cntOverlapExtent += 1;
      }
    }
    if (!olextent.isEmpty(featureExtent)) {
      if (action === OverlayAction.Zoom) {
        this.map.zoomToExtent(extent);
      } else if (action === OverlayAction.Move) {
        this.map.moveToExtent(extent);
      } else if (action === OverlayAction.ZoomIfOutMapExtent) {
        if (cntOverlapExtent === 0) {
          this.map.zoomToExtent(extent);
        } else if (cntOverlapExtent / (featureFlatCoordinates.length / 2) <= 0.1) {
            this.map.zoomOut();
        }
      }
    }
  }

  private getFeatureExtent(feature: Feature): [number, number, number, number] {
    let extent = olextent.createEmpty();

    if (feature.extent && feature.projection) {
      extent = olproj.transformExtent(
        feature.extent,
        feature.projection,
        this.map.projection
      );
    }

    return extent;
  }
}
