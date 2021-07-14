import {
  Directive,
  Self,
  AfterViewInit,
  Optional,
  ChangeDetectorRef
} from '@angular/core';

import { RouteService } from '@igo2/core';
import { delay } from 'rxjs/operators';
import { Directions } from '../shared/directions.interface';
import { DirectionsService } from '../shared/directions.service';

import { DirectionsFormComponent } from './directions-form.component';
import { DirectionsFormService } from './directions-form.service';

@Directive({
  selector: '[igoDirectionsFormBinding]'
})
export class DirectionsFormBindingDirective implements AfterViewInit {
  constructor(
    @Self() private component: DirectionsFormComponent,
    private directionsFormService: DirectionsFormService,
    private directionsService: DirectionsService,
    private changeDetectorRefs: ChangeDetectorRef,
    @Optional() private route: RouteService
  ) {}

  ngAfterViewInit(): void {
    const storedStops = this.directionsFormService.getStops();
    if (!storedStops && this.route && this.route.options.directionsCoordKey) {
      this.route.queryParams.subscribe((params) => {
        const directionsParams =
          params[this.route.options.directionsCoordKey as string];
        const stopsCoordinatesFromURL = [];
        if (directionsParams) {
          const directionsCoordUrl = directionsParams.split(';');
          if (directionsCoordUrl.length >= 2) {
            let cnt = 0;
            directionsCoordUrl.forEach((coord) => {
              if (cnt !== 0 && cnt !== directionsCoordUrl.length - 1) {
                this.component.stops.insert(cnt, this.component.createStop());
              }

              const stopCoordinatesFromURL = JSON.parse('[' + coord + ']');
              this.component.stops
                .at(cnt)
                .patchValue({ stopCoordinates: stopCoordinatesFromURL });
              this.component.stops
                .at(cnt)
                .patchValue({ stopPoint: stopCoordinatesFromURL });
              this.component.handleLocationProposals(
                stopCoordinatesFromURL,
                cnt
              );

              stopsCoordinatesFromURL.push(stopCoordinatesFromURL);
              this.component.addStopOverlay(stopCoordinatesFromURL, cnt);
              cnt++;
            });
            this.component.activeRoute$
              .pipe(delay(250))
              .subscribe((activeRoute) => {
                this.getRoutes(activeRoute);
              });
          }
        }
      });
    } else if (storedStops) {
      for (let i = 0; i < storedStops.length; i++) {
        if (i !== 0 && i !== storedStops.length - 1) {
          this.component.stops.insert(i, this.component.createStop());
        }
        if (storedStops[i].stopCoordinates instanceof Array) {
          this.component.addStopOverlay(storedStops[i].stopCoordinates, i);
          this.component.stops.at(i).patchValue(storedStops[i]);
        }
      }
      this.component.getRoutes();
    }
    this.component.writeStopsToFormService();
  }

  private getRoutes(activeRoute) {
    this.component.deleteStoreFeatureByID(this.component.routeStore, 'vertex');
    this.component.writeStopsToFormService();
    const coords = this.directionsFormService.getStopsCoordinates();
    if (coords.length < 2) {
      return;
    }
    const routeResponse = this.directionsService.route(coords, {});
    if (routeResponse) {
      routeResponse.map((res) =>
        this.component.routesQueries$$.push(
          res.subscribe((route) => {
            this.component.routesResults = route;
            if (!activeRoute) {
              this.component.activeRoute = route[0] as Directions;
              this.component.showRouteGeometry(true);
              return;
            }
            this.component.showRouteGeometry(true);
            this.changeDetectorRefs.detectChanges();
          })
        )
      );
    }
  }
}
