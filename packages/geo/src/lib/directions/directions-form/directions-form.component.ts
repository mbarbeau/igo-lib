import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  Optional,
  ChangeDetectorRef
} from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { Subscription, Subject, BehaviorSubject } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  map
} from 'rxjs/operators';

import olFeature from 'ol/Feature';
import OlGeoJSON from 'ol/format/GeoJSON';
import * as olgeom from 'ol/geom';
import * as olproj from 'ol/proj';
import * as olstyle from 'ol/style';
import * as olcondition from 'ol/events/condition';
import * as olinteraction from 'ol/interaction';
import * as olobservable from 'ol/Observable';

import { Clipboard } from '@igo2/utils';
import {
  Message,
  LanguageService,
  MessageService,
  RouteService
} from '@igo2/core';
import { getEntityTitle } from '@igo2/common';

import { IgoMap } from '../../map/shared/map';
import { SearchService } from '../../search/shared/search.service';
import { VectorLayer } from '../../layer/shared/layers/vector-layer';
import { FeatureDataSource } from '../../datasource/shared/datasources/feature-datasource';
import { FeatureMotion, FEATURE } from '../../feature/shared/feature.enums';
import {
  moveToOlFeatures,
  tryBindStoreLayer
} from '../../feature/shared/feature.utils';
import { tryAddLoadingStrategy } from '../../feature/shared/strategies.utils';

import { Directions, DirectionsOptions, Stop } from '../shared/directions.interface';
import { DirectionsService } from '../shared/directions.service';
import { DirectionsFormService } from './directions-form.service';

import { QueryService } from '../../query/shared/query.service';
import { FeatureStore } from '../../feature/shared/store';
import { Feature } from '../../feature/shared/feature.interfaces';
import { FeatureStoreLoadingStrategy } from '../../feature/shared/strategies/loading';
import { roundCoordTo } from '../../map/shared/map.utils';
import { createOverlayMarkerStyle } from '../../overlay/shared/overlay-marker-style.utils';

@Component({
  selector: 'igo-directions-form',
  templateUrl: './directions-form.component.html',
  styleUrls: ['./directions-form.component.scss']
})
export class DirectionsFormComponent implements OnInit, OnDestroy {
  private readonly invalidKeys = ['Control', 'Shift', 'Alt'];

  public stopsForm: FormGroup;
  public projection = 'EPSG:4326';
  public currentStopIndex: number;
  public routesQueries$$: Subscription[] = [];
  private search$$: Subscription;
  private selectStop;
  private translateStop;
  private selectedRoute;

  private stream$ = new Subject<string>();

  public routesResults: Directions[] | Message[];
  get activeRoute(): Directions {
    return this._activeRoute;
  }
  set activeRoute(value: Directions) {
    this._activeRoute = value;
    if (value && this.activeRoute$.getValue() && value.id !== this.activeRoute$.getValue().id) {
      this.activeRoute$.next(value);
    }
    this.activeRouteDescription.emit(this.directionsToText());
  }
  private _activeRoute: Directions;
  public activeRoute$: BehaviorSubject<Directions> = new BehaviorSubject(undefined);
  private lastTimeoutRequest;

  private focusOnStop = false;
  private focusKey = [];
  public initialStopsCoords;
  private browserLanguage;

  @Input() term: string;

  @Input() debounce: number = 200;

  @Input() length: number = 2;

  @Input() map: IgoMap;

  /**
   * The stops store
   */
  @Input()
  get stopsStore(): FeatureStore {
    return this._stopsStore;
  }
  set stopsStore(value: FeatureStore) {
    this._stopsStore = value;
    this.stopsStore$.next(value);
  }
  private _stopsStore: FeatureStore;

  stopsStore$: BehaviorSubject<FeatureStore> = new BehaviorSubject<FeatureStore>(undefined);

  @Input()
  get routeFromFeatureDetail(): boolean {
    return this._routeFromFeatureDetail;
  }
  set routeFromFeatureDetail(value: boolean) {
    this._routeFromFeatureDetail = value;
  }
  private _routeFromFeatureDetail: boolean;

  /**
   * The route and vertex store
   */
  @Input() routeStore: FeatureStore;

  @Output() activeRouteDescription = new EventEmitter<string>();
  constructor(
    private formBuilder: FormBuilder,
    private directionsService: DirectionsService,
    private languageService: LanguageService,
    private messageService: MessageService,
    private searchService: SearchService,
    private queryService: QueryService,
    private directionsFormService: DirectionsFormService,
    private changeDetectorRefs: ChangeDetectorRef,
    @Optional() private route: RouteService
  ) {}

  changeRoute() {
    this.showRouteGeometry(true);
  }

  prevent(event) {
    event.preventDefault();
  }

  ngOnInit() {
    this.queryService.queryEnabled = false;
    this.focusOnStop = false;
    this.browserLanguage = this.languageService.getLanguage();
    this.stopsForm = this.formBuilder.group({
      directionsType: 'car',
      directionsMode: 'driving', // loop
      stopOrderPriority: true,
      directionsFixedStartEnd: false,
      stops: this.formBuilder.array([
        this.createStop('start'),
        this.createStop('end')
      ])
    });

    setTimeout(() => {
      this.initStores();
      this.initOlInteraction();
    }, 1);

    this.subscribeToFormChange();
    this.routesQueries$$.push(
      this.stream$
        .pipe(
          debounceTime(this.debounce),
          distinctUntilChanged()
        )
        .subscribe((term: string) => this.handleTermChanged(term))
    );

    this.stopsStore$.subscribe(() => {
      if (this.routeFromFeatureDetail === true) {
        this.directionsFormService.setStops([]);
        setTimeout(() => {
          this.resetForm(false);
          for (const feature of this.stopsStore.all()) {
            if (feature.properties.id && feature.properties.id.toString().startsWith('directionsStop')) {
              this.stopsStore.delete(feature);
            }
          }

          if (this.stopsStore.all().length === 2) {
            let i = 0;
            const coordinates = [];

            for (const feature of this.stopsStore.all()) {
              coordinates.push(feature.geometry.coordinates);
              this.handleLocationProposals(feature.geometry.coordinates, i);
              this.chooseProposal(feature, i);
              i++;
            }
            this.writeStopsToFormService(coordinates);

            const routeResponse = this.directionsService.route(coordinates, {});
            if (routeResponse) {
              routeResponse.map(res =>
                this.routesQueries$$.push(
                  res.subscribe(route => {
                    this.routesResults = route;
                    this.activeRoute = this.routesResults[0] as Directions;
                    this.showRouteGeometry(true);
                    this.changeDetectorRefs.detectChanges();
                  })
                )
              );
            }

          } else if (this.stopsStore.all().length === 1) {
            this.handleLocationProposals(this.stopsStore.all()[0].geometry.coordinates, 1);
            this.chooseProposal(this.stopsStore.all()[0], 1);
            this.writeStopsToFormService(this.stopsStore.all()[0].geometry.coordinates);
          }
        }, 1);
        this.routeFromFeatureDetail = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.unsubscribeRoutesQueries();
    this.unlistenSingleClick();
    this.queryService.queryEnabled = true;
    this.freezeStores();
    this.writeStopsToFormService();
  }

  private initStores() {
    const loadingStrategy = new FeatureStoreLoadingStrategy({
      motion: FeatureMotion.None
    });

    // STOP STORE
    const stopsStore = this.stopsStore;
    const stopsLayer = new VectorLayer({
      title: this.languageService.translate.instant('igo.geo.directionsForm.stopLayer'),
      zIndex: 911,
      source: new FeatureDataSource(),
      showInLayerList: true,
      workspace: {
        enabled: false,
      },
      exportable: true,
      browsable: false,
      style: stopMarker
    });
    tryBindStoreLayer(stopsStore, stopsLayer);
    tryAddLoadingStrategy(stopsStore, loadingStrategy);

    // ROUTE AND VERTEX STORE
    const routeStore = this.routeStore;
    const routeLayer = new VectorLayer({
      title: this.languageService.translate.instant('igo.geo.directionsForm.routeLayer'),
      zIndex: 910,
      source: new FeatureDataSource(),
      showInLayerList: true,
      workspace: {
        enabled: false,
      },
      exportable: true,
      browsable: false,
      style: stopMarker
    });
    tryBindStoreLayer(routeStore, routeLayer);
    tryAddLoadingStrategy(routeStore, loadingStrategy);
  }

  private initOlInteraction() {
    let selectedStopFeature;
    this.selectStop = new olinteraction.Select({
      layers: [this.stopsStore.layer.ol],
      condition: olcondition.pointerMove,
      hitTolerance: 7,
      filter: feature => {
        return feature.get('type') === 'stop';
      }
    });

    this.selectStop.on('select', evt => {
      selectedStopFeature = evt.target.getFeatures()[0];
    });

    this.translateStop = new olinteraction.Translate({
      layers: [this.stopsStore.layer.ol],
      features: selectedStopFeature
      // TODO In Openlayers >= 6.x, filter is now allowed.
    });

    this.translateStop.on('translating', evt => {
      const features = evt.features;
      if (features.getLength() === 0) {
        return;
      }
      this.executeTranslation(features, false, 50, true);
    });

    this.translateStop.on('translateend', evt => {
      const features = evt.features;
      if (features.getLength() === 0) {
        return;
      }
      this.executeTranslation(features, true, 0, false);
    });

    this.selectedRoute = new olinteraction.Select({
      layers: [this.routeStore.layer.ol],
      condition: olcondition.click,
      hitTolerance: 7,
      filter: feature => {
        return feature.getId() === 'route';
      }
    });
    this.selectedRoute.on('select', evt => {
      if (this.focusOnStop === false) {
        const selectCoordinates = olproj.transform(
          (evt as any).mapBrowserEvent.coordinate,
          this.map.projection,
          this.projection
        );
        this.addStop();
        const pos = this.stops.length - 2;
        this.stops.at(pos).patchValue({ stopCoordinates: selectCoordinates });
        this.handleLocationProposals(selectCoordinates, pos);
        this.addStopOverlay(selectCoordinates, pos);
        this.selectedRoute.getFeatures().clear();
      }
      this.selectedRoute.getFeatures().clear();
    });

    this.map.ol.addInteraction(this.selectStop);
    this.map.ol.addInteraction(this.translateStop);
    this.map.ol.addInteraction(this.selectedRoute);
  }

  private subscribeToFormChange() {
    this.routesQueries$$.push(
      this.stopsForm.valueChanges
        .pipe(debounceTime(this.debounce))
        .subscribe(val => {
          this.writeStopsToFormService();
        })
    );
  }

  /**
   * Freeze any store, meaning the layer is removed, strategies are deactivated
   * and some listener removed
   * @internal
   */
  private freezeStores() {
    const stopsStore = this.stopsStore;
    const routeStore = this.routeStore;

    this.map.ol.removeInteraction(this.selectStop);
    this.map.ol.removeInteraction(this.translateStop);
    this.map.ol.removeInteraction(this.selectedRoute);
    stopsStore.deactivateStrategyOfType(FeatureStoreLoadingStrategy);
    routeStore.deactivateStrategyOfType(FeatureStoreLoadingStrategy);
  }

  private executeTranslation(
    features,
    reverseSearchProposal = false,
    delay: number = 0,
    overview: boolean = false
  ) {
    this.routeStore.clear();
    const firstFeature = features.getArray()[0];
    const translatedID = firstFeature.getId();
    const translatedPos = translatedID.split('_');
    let p;
    switch (translatedPos[1]) {
      case 'start':
        p = 0;
        break;
      case 'end':
        p = this.stops.length - 1;
        break;
      default:
        p = Number(translatedPos[1]);
        break;
    }
    const translationCoordinates = olproj.transform(
      firstFeature.getGeometry().getCoordinates(),
      this.map.projection,
      this.projection
    );
    this.stops
      .at(p)
      .patchValue({
        stopCoordinates: translationCoordinates,
        stopProposals: []
      });
    if (reverseSearchProposal) {
      this.handleLocationProposals(translationCoordinates, p);
    }

    const directionsOptions = {
      steps: true,
      overview: false,
      alternatives: true
    } as DirectionsOptions;

    if (overview) {
      directionsOptions.overview = true;
      directionsOptions.steps = false;
      directionsOptions.alternatives = false;
    }

    if (delay > 0) {
      if (typeof this.lastTimeoutRequest !== 'undefined') {
        // cancel timeout when the mouse moves
        clearTimeout(this.lastTimeoutRequest);
      }
      this.lastTimeoutRequest = setTimeout(() => {
        this.getRoutes(undefined, directionsOptions);
      }, delay);
    } else {
      clearTimeout(this.lastTimeoutRequest);
      this.getRoutes(undefined, directionsOptions);
    }
  }

  handleLocationProposals(coordinates: [number, number], stopIndex: number) {
    const groupedLocations = [];
    const roundedCoordinates = [
      coordinates[0].toFixed(5),
      coordinates[1].toFixed(5)
    ];
    this.stops
      .at(stopIndex)
      .patchValue({ stopPoint: roundedCoordinates.join(',') });
    this.searchService
      .reverseSearch(coordinates, { zoom: this.map.viewController.getZoom() })
      .map(res =>
        this.routesQueries$$.push(
          res.request.pipe(map(f => f)).subscribe(results => {
            results.forEach(result => {
              if (
                groupedLocations.filter(f => f.source === result.source)
                  .length === 0
              ) {
                groupedLocations.push({
                  source: result.source,
                  results: results.map(r => r.data)
                });
              }
            });
            this.stops
              .at(stopIndex)
              .patchValue({ stopProposals: groupedLocations });
            // TODO: Prefer another source?
            if (results[0]) {
              if (results[0].source.getId() === 'icherchereverse') {
                // prefer address type.
                let resultPos = 0;
                for (let i = 0; i < results.length; i++) {
                  const feature: any = results[i].data;
                  if (feature.properties.type === 'adresses') {
                    resultPos = i;
                    break;
                  }
                }
                this.stops.at(stopIndex).patchValue({
                  stopPoint: getEntityTitle(results[resultPos])
                });
                if (results[resultPos].data.geometry.type === 'Point') {
                  this.stops.at(stopIndex).patchValue({
                    stopCoordinates:
                      results[resultPos].data.geometry.coordinates
                  });
                } else {
                  // Not moving the translated point Only to suggest value into the UI.
                }
              } else if (results[0].source.getId() === 'coordinatesreverse') {
                this.stops.at(stopIndex).patchValue({
                  stopPoint: [
                    results[0].data.geometry.coordinates[0].toFixed(5),
                    results[0].data.geometry.coordinates[1].toFixed(5)
                  ].join(',')
                });
                if (results[0].data.geometry.type === 'Point') {
                  this.stops.at(stopIndex).patchValue({
                    stopCoordinates: results[0].data.geometry.coordinates
                  });
                } else {
                  // Not moving the translated point Only to suggest value into the UI.
                }
              }
            } else {
              this.stops
                .at(stopIndex)
                .patchValue({
                  stopPoint: roundedCoordinates.join(','),
                  stopProposals: []
                });
            }
            this.changeDetectorRefs.detectChanges();
          })
        )
      );
  }

  directionsText(index: number, stopsCounts = this.stops.length): string {
    if (index === 0) {
      return 'start';
    } else if (index === stopsCounts - 1 || stopsCounts === 1) {
      return 'end';
    } else {
      return 'intermediate';
    }
  }

  raiseStop(index: number) {
    if (index > 0) {
      this.moveStop(index, -1);
    }
  }

  lowerStop(index: number) {
    if (index < this.stops.length - 1) {
      this.moveStop(index, 1);
    }
  }

  private moveStop(index, diff) {
    const fromValue = this.stops.at(index);
    this.removeStop(index);
    this.stops.insert(index + diff, fromValue);
    this.stops
      .at(index)
      .patchValue({ directionsText: this.directionsText(index) });
    this.stops
      .at(index + diff)
      .patchValue({ directionsText: this.directionsText(index + diff) });
    if (this.stops.at(index).value.stopCoordinates) {
      this.addStopOverlay(this.stops.at(index).value.stopCoordinates, index);
    }
    if (this.stops.at(index + diff).value.stopCoordinates) {
      this.addStopOverlay(
        this.stops.at(index + diff).value.stopCoordinates,
        index + diff
      );
    }
  }

  get stops(): FormArray {
    return this.stopsForm.get('stops') as FormArray;
  }

  public writeStopsToFormService(stopsArray?) {
    if (stopsArray) {
      this.directionsFormService.setStops(stopsArray);
    } else {
      const stops = [];
      this.stops.value.forEach(stop => {
        if (stop.stopCoordinates instanceof Array) {
          stops.push(stop);
        }
      });
      this.directionsFormService.setStops(stops);
    }
  }

  addStop(): void {
    const insertIndex = this.stops.length - 1;
    this.stops.insert(insertIndex, this.createStop());
  }

  createStop(directionsPos = 'intermediate'): FormGroup {
    return this.formBuilder.group({
      stopPoint: [''],
      stopProposals: [[]],
      directionsText: directionsPos,
      stopCoordinates: ['', [Validators.required]]
    });
  }

  removeStop(index: number): void {
    const id = this.getStopOverlayID(index);
    this.deleteStoreFeatureByID(this.stopsStore, id);
    this.stops.removeAt(index);
    let cnt = 0;
    this.stops.value.forEach(stop => {
      this.stops
        .at(cnt)
        .patchValue({ directionsText: this.directionsText(cnt) });
      this.addStopOverlay(this.stops.at(cnt).value.stopCoordinates, cnt);
      cnt++;
    });
  }

  resetForm(stop: boolean) {
    this.routesResults = undefined;
    const nbStops = this.stops.length;
    for (let i = 0; i < nbStops; i++) {
      this.stops.removeAt(0);
    }
    this.stops.insert(0, this.createStop('start'));
    this.stops.insert(1, this.createStop('end'));

    if (stop === true) {
      this.stopsStore.clear();
    }
    this.routeStore.clear();
  }

  formatStep(step, cnt) {
    return this.formatInstruction(
      step.maneuver.type,
      step.maneuver.modifier,
      step.name,
      step.maneuver.bearing_after,
      cnt,
      step.maneuver.exit,
      cnt === this.activeRoute.steps.length - 1
    );
  }

  formatInstruction(
    type,
    modifier,
    route,
    direction,
    stepPosition,
    exit,
    lastStep = false
  ) {
    let directiveFr;
    let directiveEn;
    let image = 'forward';
    let cssClass = 'rotate-270';
    const translatedDirection = this.translateBearing(direction);
    const translatedModifier = this.translateModifier(modifier);
    const enPrefix = modifier === 'straight' ? '' : 'on the ';
    const frPrefix = modifier === 'straight' ? '' : 'à ';

    let frAggregatedDirection = frPrefix + translatedModifier;
    let enAggregatedDirection = enPrefix + translatedModifier;

    if (modifier && modifier.search('slight') >= 0) {
      enAggregatedDirection = translatedModifier;
    }

    if (modifier === 'uturn') {
      image = 'forward';
      cssClass = 'rotate-90';
    } else if (modifier === 'sharp right') {
      image = 'subdirectory-arrow-right';
      cssClass = 'icon-flipped';
    } else if (modifier === 'right') {
      image = 'subdirectory-arrow-right';
      cssClass = 'icon-flipped';
    } else if (modifier === 'slight right') {
      image = 'forward';
      cssClass = 'rotate-290';
    } else if (modifier === 'straight') {
      image = 'forward';
    } else if (modifier === 'slight left') {
      image = 'forward';
      cssClass = 'rotate-250';
    } else if (modifier === 'left') {
      image = 'subdirectory-arrow-left';
      cssClass = 'icon-flipped';
    } else if (modifier === 'sharp left') {
      image = 'subdirectory-arrow-left';
      cssClass = 'icon-flipped';
    }

    if (type === 'turn') {
      if (modifier === 'straight') {
        directiveFr = 'Continuer sur ' + route;
        directiveEn = 'Continue on ' + route;
      } else if (modifier === 'uturn') {
        directiveFr = 'Faire demi-tour sur ' + route;
        directiveEn = 'Make u-turn on ' + route;
      } else {
        directiveFr = 'Tourner ' + frAggregatedDirection + ' sur ' + route;
        directiveEn = 'Turn ' + translatedModifier + ' onto ' + route;
      }
    } else if (type === 'new name') {
      directiveFr =
        'Continuer en direction ' + translatedDirection + ' sur ' + route;
      directiveEn = 'Head ' + translatedDirection + ' on ' + route;
      image = 'compass';
      cssClass = '';
    } else if (type === 'depart') {
      directiveFr =
        'Aller en direction ' + translatedDirection + ' sur ' + route;
      directiveEn = 'Head ' + translatedDirection + ' on ' + route;
      image = 'compass';
      cssClass = '';
    } else if (type === 'arrive') {
      if (lastStep) {
        let coma = ', ';
        if (!translatedModifier) {
          frAggregatedDirection = '';
          enAggregatedDirection = '';
          coma = '';
        }
        directiveFr = 'Vous êtes arrivé' + coma + frAggregatedDirection;
        directiveEn =
          'You have reached your destination' + coma + enAggregatedDirection;
      } else {
        directiveFr = 'Vous atteignez le point intermédiare sur ' + route;
        directiveEn = 'You have reached the intermediate stop onto ' + route;
        image = 'map-marker';
        cssClass = '';
      }
    } else if (type === 'merge') {
      directiveFr = 'Continuer sur ' + route;
      directiveEn = 'Continue on ' + route;
      image = 'forward';
      cssClass = 'rotate-270';
    } else if (type === 'on ramp') {
      directiveFr = "Prendre l'entrée d'autoroute " + frAggregatedDirection;
      directiveEn = 'Take the ramp ' + enAggregatedDirection;
    } else if (type === 'off ramp') {
      directiveFr = "Prendre la sortie d'autoroute " + frAggregatedDirection;
      directiveEn = 'Take exit ' + enAggregatedDirection;
    } else if (type === 'fork') {
      if (modifier.search('left') >= 0) {
        directiveFr = 'Garder la gauche sur ' + route;
        directiveEn = 'Merge left onto ' + route;
      } else if (modifier.search('right') >= 0) {
        directiveFr = 'Garder la droite sur ' + route;
        directiveEn = 'Merge right onto ' + route;
      } else {
        directiveFr = 'Continuer sur ' + route;
        directiveEn = 'Continue on ' + route;
      }
    } else if (type === 'end of road') {
      directiveFr =
        'À la fin de la route, tourner ' + translatedModifier + ' sur ' + route;
      directiveEn =
        'At the end of the road, turn ' + translatedModifier + ' onto ' + route;
    } else if (type === 'use lane') {
      directiveFr = 'Prendre la voie de ... ';
      directiveEn = 'Take the lane ...';
    } else if (type === 'continue' && modifier !== 'uturn') {
      directiveFr = 'Continuer sur ' + route;
      directiveEn = 'Continue on ' + route;
      image = 'forward';
      cssClass = 'rotate-270';
    } else if (type === 'roundabout') {
      directiveFr = 'Au rond-point, prendre la ' + exit;
      directiveFr += exit === 1 ? 're' : 'e';
      directiveFr += ' sortie vers ' + route;
      directiveEn = 'At the roundabout, take the ' + exit;
      directiveEn += exit === 1 ? 'st' : 'rd';
      directiveEn += ' exit towards ' + route;
      image = 'chart-donut';
      cssClass = '';
    } else if (type === 'rotary') {
      directiveFr = 'Rond-point rotary....';
      directiveEn = 'Roundabout rotary....';
      image = 'chart-donut';
      cssClass = '';
    } else if (type === 'roundabout turn') {
      directiveFr = 'Rond-point, prendre la ...';
      directiveEn = 'Roundabout, take the ...';
      image = 'chart-donut';
      cssClass = '';
    } else if (type === 'exit roundabout') {
      directiveFr = 'Poursuivre vers ' + route;
      directiveEn = 'Continue to ' + route;
      image = 'forward';
      cssClass = 'rotate-270';
    } else if (type === 'notification') {
      directiveFr = 'notification ....';
      directiveEn = 'notification ....';
    } else if (modifier === 'uturn') {
      directiveFr =
        'Faire demi-tour et continuer en direction ' +
        translatedDirection +
        ' sur ' +
        route;
      directiveEn =
        'Make u-turn and head ' + translatedDirection + ' on ' + route;
    } else {
      directiveFr = '???';
      directiveEn = '???';
    }

    if (lastStep) {
      image = 'flag-variant';
      cssClass = '';
    }
    if (stepPosition === 0) {
      image = 'compass';
      cssClass = '';
    }

    let directive;
    if (this.browserLanguage === 'fr') {
      directive = directiveFr;
    } else if (this.browserLanguage === 'en') {
      directive = directiveEn;
    }

    return { instruction: directive, image, cssClass };
  }

  translateModifier(modifier) {
    if (modifier === 'uturn') {
      return this.languageService.translate.instant('igo.geo.directions.uturn');
    } else if (modifier === 'sharp right') {
      return this.languageService.translate.instant(
        'igo.geo.directions.sharp right'
      );
    } else if (modifier === 'right') {
      return this.languageService.translate.instant('igo.geo.directions.right');
    } else if (modifier === 'slight right') {
      return this.languageService.translate.instant(
        'igo.geo.directions.slight right'
      );
    } else if (modifier === 'sharp left') {
      return this.languageService.translate.instant(
        'igo.geo.directions.sharp left'
      );
    } else if (modifier === 'left') {
      return this.languageService.translate.instant('igo.geo.directions.left');
    } else if (modifier === 'slight left') {
      return this.languageService.translate.instant(
        'igo.geo.directions.slight left'
      );
    } else if (modifier === 'straight') {
      return this.languageService.translate.instant(
        'igo.geo.directions.straight'
      );
    } else {
      return modifier;
    }
  }

  translateBearing(bearing) {
    if (bearing >= 337 || bearing < 23) {
      return this.languageService.translate.instant('igo.geo.cardinalPoints.n');
    } else if (bearing < 67) {
      return this.languageService.translate.instant(
        'igo.geo.cardinalPoints.ne'
      );
    } else if (bearing < 113) {
      return this.languageService.translate.instant('igo.geo.cardinalPoints.e');
    } else if (bearing < 157) {
      return this.languageService.translate.instant(
        'igo.geo.cardinalPoints.se'
      );
    } else if (bearing < 203) {
      return this.languageService.translate.instant('igo.geo.cardinalPoints.s');
    } else if (bearing < 247) {
      return this.languageService.translate.instant(
        'igo.geo.cardinalPoints.sw'
      );
    } else if (bearing < 293) {
      return this.languageService.translate.instant('igo.geo.cardinalPoints.w');
    } else if (bearing < 337) {
      return this.languageService.translate.instant(
        'igo.geo.cardinalPoints.nw'
      );
    } else {
      return;
    }
  }

  formatDistance(distance) {
    if (distance === 0) {
      return;
    }
    if (distance >= 100000) {
      return Math.round(distance / 1000) + ' km';
    }
    if (distance >= 10000) {
      return Math.round(distance / 100) / 10 + ' km';
    }
    if (distance >= 100) {
      return Math.round(distance / 100) / 10 + ' km';
    }
    return distance + ' m';
  }

  formatDuration(duration: number, summary = false) {
    if (duration >= 3600) {
      const hour = Math.floor(duration / 3600);
      const minute = Math.round((duration / 3600 - hour) * 60);
      if (minute === 60) {
        return hour + 1 + ' h';
      }
      return hour + ' h ' + minute + ' min';
    }

    if (duration >= 60) {
      return Math.round(duration / 60) + ' min';
    }
    return duration + ' s';
  }

  showSegment(step, zoomToExtent = false) {
    this.showRouteSegmentGeometry(step.geometry.coordinates, zoomToExtent);
  }

  showRouteSegmentGeometry(coordinates, zoomToExtent = false) {
    const vertexId = 'vertex';
    const geometry4326 = new olgeom.LineString(coordinates);
    const geometryMapProjection = geometry4326.transform(
      'EPSG:4326',
      this.map.projection
    );
    const routeSegmentCoordinates = (geometryMapProjection as any).getCoordinates();
    const lastPoint = routeSegmentCoordinates[0];

    const geometry = new olgeom.Point(lastPoint);
    const feature = new olFeature({ geometry });

    const geojsonGeom = new OlGeoJSON().writeGeometryObject(geometry, {
      featureProjection: this.map.projection,
      dataProjection: this.map.projection
    });

    const previousVertex = this.routeStore.get(vertexId);
    const previousVertexRevision = previousVertex
      ? previousVertex.meta.revision
      : 0;

    const vertexFeature: Feature = {
      type: FEATURE,
      geometry: geojsonGeom,
      projection: this.map.projection,
      properties: {
        id: vertexId,
        type: 'vertex'
      },
      meta: {
        id: vertexId,
        revision: previousVertexRevision + 1
      },
      ol: feature
    };
    this.routeStore.update(vertexFeature);
    if (zoomToExtent) {
      this.map.viewController.zoomToExtent(feature.getGeometry().getExtent());
    }
  }

  zoomRoute(extent?) {
    if (extent) {
      this.map.viewController.zoomToExtent(extent);
    } else {
      if (this.routeStore.layer) {
        const routeFeature = this.routeStore.layer.ol
          .getSource()
          .getFeatures()
          .find(f => f.getId() === 'route');
        if (routeFeature) {
          const routeExtent = routeFeature.getGeometry().getExtent();
          this.map.viewController.zoomToExtent(routeExtent);
        }
      }
    }
  }

  public showRouteGeometry(moveToExtent = false) {
    const geom = this.activeRoute.geometry.coordinates;
    const geometry4326 = new olgeom.LineString(geom);
    const geometryMapProjection = geometry4326.transform(
      'EPSG:4326',
      this.map.projection
    );
    if (moveToExtent) {
      this.zoomRoute(geometryMapProjection.getExtent());
    }

    const geojsonGeom = new OlGeoJSON().writeGeometryObject(
      geometryMapProjection,
      {
        featureProjection: this.map.projection,
        dataProjection: this.map.projection
      }
    );

    const previousRoute = this.routeStore.get('route');
    const previousRouteRevision = previousRoute
      ? previousRoute.meta.revision
      : 0;

    const routeFeature: Feature = {
      type: FEATURE,
      geometry: geojsonGeom,
      projection: this.map.projection,
      properties: {
        id: 'route',
        type: 'route'
      },
      meta: {
        id: 'route',
        revision: previousRouteRevision + 1
      },
      ol: new olFeature({ geometry: geometryMapProjection })
    };
    this.routeStore.update(routeFeature);
  }

  getRoutes(
    moveToExtent: boolean = true,
    directionsOptions: DirectionsOptions = {}
  ) {
    this.deleteStoreFeatureByID(this.routeStore, 'vertex');
    this.writeStopsToFormService();
    const coords = this.directionsFormService.getStopsCoordinates();
    if (coords.length < 2) {
      return;
    }
    const routeResponse = this.directionsService.route(
      coords,
      directionsOptions
    );
    if (routeResponse) {
      routeResponse.map(res =>
        this.routesQueries$$.push(
          res.subscribe(route => {
            this.routesResults = route;
            this.activeRoute = this.routesResults[0] as Directions;
            this.showRouteGeometry(moveToExtent);
            this.changeDetectorRefs.detectChanges();
          })
        )
      );
    }
  }

  private unlistenSingleClick() {
    if (this.focusKey.length !== 0) {
      this.focusKey.forEach(key => {
        olobservable.unByKey(key);
      });
    }
  }

  private unsubscribeRoutesQueries() {
    this.routesQueries$$.forEach((sub: Subscription) => sub.unsubscribe());
    this.routesQueries$$ = [];
  }

  copyLinkToClipboard() {
    const successful = Clipboard.copy(this.getUrl());
    if (successful) {
      const translate = this.languageService.translate;
      const title = translate.instant(
        'igo.geo.directionsForm.dialog.copyTitle'
      );
      const msg = translate.instant(
        'igo.geo.directionsForm.dialog.copyMsgLink'
      );
      this.messageService.success(msg, title);
    }
  }

  copyDirectionsToClipboard() {
    const directionsBody = this.directionsToText();
    const successful = Clipboard.copy(directionsBody);
    if (successful) {
      const translate = this.languageService.translate;
      const title = translate.instant(
        'igo.geo.directionsForm.dialog.copyTitle'
      );
      const msg = translate.instant('igo.geo.directionsForm.dialog.copyMsg');
      this.messageService.success(msg, title);
    }
  }

  private directionsToText() {
    const indent = '\t';
    let activeRouteDirective =
      this.languageService.translate.instant(
        'igo.geo.directionsForm.instructions'
      ) + ':\n';
    let wayPointList = '';
    const summary =
      this.languageService.translate.instant('igo.geo.directionsForm.summary') +
      ': \n' +
      indent +
      this.activeRoute.title +
      '\n' +
      indent +
      this.formatDistance(this.activeRoute.distance) +
      '\n' +
      indent +
      this.formatDuration(this.activeRoute.duration) +
      '\n\n' +
      this.languageService.translate.instant(
        'igo.geo.directionsForm.stopsList'
      ) +
      ':\n';

    const url =
      this.languageService.translate.instant('igo.geo.directionsForm.link') +
      ':\n' +
      indent +
      this.getUrl();

    let wayPointsCnt = 1;
    this.stops.value.forEach(stop => {
      let coord = '';
      let stopPoint = '';
      if (stop.stopPoint !== stop.stopCoordinates) {
        stopPoint = stop.stopPoint;
        coord =
          ' (' +
          [stop.stopCoordinates[1], stop.stopCoordinates[0]].join(',') +
          ')';
      } else {
        stopPoint = [stop.stopCoordinates[1], stop.stopCoordinates[0]].join(
          ','
        );
      }

      wayPointList =
        wayPointList +
        indent +
        wayPointsCnt.toLocaleString() +
        '. ' +
        stopPoint +
        coord +
        '\n';
      wayPointsCnt++;
    });

    // Directions
    let localCnt = 0;
    this.activeRoute.steps.forEach(step => {
      const instruction = this.formatStep(step, localCnt).instruction;
      const distance =
        this.formatDistance(step.distance) === undefined
          ? ''
          : ' (' + this.formatDistance(step.distance) + ')';
      activeRouteDirective =
        activeRouteDirective +
        indent +
        (localCnt + 1).toLocaleString() +
        '. ' +
        instruction +
        distance +
        '\n';
      localCnt++;
    });

    const directionsBody =
      summary + wayPointList + '\n' + url + '\n\n' + activeRouteDirective;

    return directionsBody;
  }

  private handleTermChanged(term: string) {
    if (term !== undefined || term.length !== 0) {
      const searchProposals = [];
      if (this.search$$) {
        this.search$$.unsubscribe();
      }
      const researches = this.searchService.search(term, {searchType: 'Feature'});
      researches.map(res =>
        this.search$$ =
        res.request.subscribe(results => {
          results
            .filter(r => r.data.geometry)
            .forEach(element => {
              if (
                searchProposals.filter(r => r.source === element.source)
                  .length === 0
              ) {
                searchProposals.push({
                  source: element.source,
                  meta: element.meta,
                  results: results.map(r => r.data)
                });
              }
            });
          if (this.stops) {
            this.stops
              .at(this.currentStopIndex)
              .patchValue({ stopProposals: searchProposals });
          }
          this.changeDetectorRefs.detectChanges();
        })
      );
    }
  }

  setTerm(term: string) {
    this.term = term;
    if (
      this.keyIsValid(term) &&
      (term.length >= this.length || term.length === 0)
    ) {
      this.stream$.next(term);
    }
  }

  private keyIsValid(key: string) {
    return this.invalidKeys.find(value => value === key) === undefined;
  }

  keyup(i, event: KeyboardEvent) {
    const term = (event.target as HTMLInputElement).value;
    this.setTerm(term);
    this.map.ol.un('singleclick', evt => {
      this.handleMapClick(evt, i);
    });
  }

  clearStop(stopIndex) {
    // this.deleteDirectionsOverlaybyID(this.getStopOverlayID(stopIndex));
    const id = this.getStopOverlayID(stopIndex);
    this.deleteStoreFeatureByID(this.stopsStore, id);
    this.routeStore.clear();
    const stopsCounts = this.stops.length;
    this.stops.removeAt(stopIndex);
    this.stops.insert(
      stopIndex,
      this.createStop(this.directionsText(stopIndex, stopsCounts))
    );
    this.routesResults = undefined;
    this.getRoutes(false);
  }

  chooseProposal(proposal, i) {
    if (proposal !== undefined) {
      let geomCoord;
      const geom = (proposal as any).geometry;
      if (geom.type === 'Point') {
        geomCoord = geom.coordinates;
      } else if (geom.type.search('Line') >= 0) {
        const line = new OlGeoJSON().readFeatures(geom);
        geomCoord = line[0].getGeometry().getFirstCoordinate();
        geomCoord = [geomCoord[0], geomCoord[1]];
      } else if (geom.type.search('Polygon') >= 0) {
        const poly = new OlGeoJSON().readFeatures(geom);
        geomCoord = poly[0].getGeometry().getType() === 'Polygon' ?
          geomCoord =  poly[0].getGeometry().getInteriorPoint().getFirstCoordinate() :
          geomCoord =  poly[0].getGeometry().getInteriorPoints().getFirstCoordinate();
        geomCoord = [geomCoord[0], geomCoord[1]];
      }

      if (geomCoord !== undefined) {
        this.stops.at(i).patchValue({ stopCoordinates: geomCoord });
        this.addStopOverlay(geomCoord, i);
        /*  const proposalExtent = this.directionsStopsOverlayDataSource.ol
          .getFeatureById(this.getStopOverlayID(i))
          .getGeometry()
          .getExtent();*/

        /* if (!olextent.intersects(proposalExtent, this.map.viewController.getExtent())) {
          this.map.viewController.moveToExtent(proposalExtent);
        }*/
      }
    }
  }

  focus(i) {
    this.unlistenSingleClick();
    this.currentStopIndex = i;
    this.focusOnStop = true;
    this.focusKey.push(
      this.map.ol.once('singleclick', evt => {
        this.handleMapClick(evt, i);
      })
    );
  }

  private handleMapClick(event: olcondition, indexPos?) {
    if (this.currentStopIndex === undefined) {
      this.addStop();
      indexPos = this.stops.length - 2;
      this.stops.at(indexPos).value.stopProposals = [];
    } else {
      indexPos = this.currentStopIndex;
    }
    const clickCoordinates = olproj.transform(
      event.coordinate,
      this.map.projection,
      this.projection
    );
    this.stops
      .at(indexPos)
      .patchValue({ stopProposals: [], stopCoordinates: clickCoordinates });

    this.handleLocationProposals(clickCoordinates, indexPos);
    this.addStopOverlay(clickCoordinates, indexPos);
    setTimeout(() => {
      this.focusOnStop = false; // prevent to trigger map click and Select on routes at same time.
    }, 500);
  }

  geolocateStop(index: number) {
    moveToOlFeatures(
      this.map,
      [this.map.geolocationFeature],
      FeatureMotion.Move
    );
    const geolocateCoordinates = this.map.viewController.getCenter(
      this.projection
    );
    this.stops.at(index).patchValue({ stopCoordinates: geolocateCoordinates });
    this.addStopOverlay(geolocateCoordinates, index);
    this.handleLocationProposals(geolocateCoordinates, index);
  }

  public addStopOverlay(coordinates: [number, number], index: number) {
    const directionsText = this.directionsText(index);
    let stopColor;
    let stopText;
    if (directionsText === 'start') {
      stopColor = '#008000';
      stopText = this.languageService.translate.instant(
        'igo.geo.directionsForm.start'
      );
    } else if (directionsText === 'end') {
      stopColor = '#f64139';
      stopText = this.languageService.translate.instant(
        'igo.geo.directionsForm.end'
      );
    } else {
      stopColor = '#ffd700';
      stopText =
        this.languageService.translate.instant(
          'igo.geo.directionsForm.intermediate'
        ) +
        ' #' +
        index;
    }

    const geometry = new olgeom.Point(
      olproj.transform(coordinates, this.projection, this.map.projection)
    );

    const stopID = this.getStopOverlayID(index);
    const geojsonGeom = new OlGeoJSON().writeGeometryObject(geometry, {
      featureProjection: this.map.projection,
      dataProjection: this.map.projection
    });

    const previousStop = this.stopsStore.get(stopID);
    const previousStopRevision = previousStop ? previousStop.meta.revision : 0;

    const stopFeature: Feature = {
      type: FEATURE,
      geometry: geojsonGeom,
      projection: this.map.projection,
      properties: {
        id: stopID,
        type: 'stop',
        stopText,
        stopColor,
        stopOpacity: 1
      },
      meta: {
        id: stopID,
        revision: previousStopRevision + 1
      },
      ol: new olFeature({ geometry })
    };
    this.stopsStore.update(stopFeature);
    this.getRoutes();
  }

  public getStopOverlayID(index: number): string {
    let txt;
    if (index === 0) {
      txt = 'start';
    } else if (index === this.stops.length - 1) {
      txt = 'end';
    } else {
      txt = index;
    }
    return 'directionsStop_' + txt;
  }

  public deleteStoreFeatureByID(store, id) {
    const entity = store.get(id);
    if (entity) {
      store.delete(entity);
    }
  }

  private getUrl() {
    if (!this.route) {
      return;
    }

    const directionsKey = this.route.options.directionsCoordKey;
    const stopsCoordinates = [];
    if (
      this.directionsFormService &&
      this.directionsFormService.getStopsCoordinates() &&
      this.directionsFormService.getStopsCoordinates().length !== 0
    ) {
      this.directionsFormService.getStopsCoordinates().forEach(coord => {
        stopsCoordinates.push(roundCoordTo(coord, 6));
      });
    }
    let directionsUrl = '';
    if (stopsCoordinates.length >= 2) {
      directionsUrl = `${directionsKey}=${stopsCoordinates.join(';')}`;
    }

    return `${location.origin}${location.pathname}?tool=directions&sidenav=1&${directionsUrl}`;
  }
}

/**
 * Create a style for the directions stops and routes
 * @param feature OlFeature
 * @returns OL style function
 */
export function stopMarker(
  feature: olFeature,
  resolution: number
): olstyle.Style {
  const vertexStyle = [
    new olstyle.Style({
      geometry: feature.getGeometry(),
      image: new olstyle.Circle({
        radius: 7,
        stroke: new olstyle.Stroke({ color: '#FF0000', width: 3 })
      })
    })
  ];

  const stopStyle = createOverlayMarkerStyle({
    text: feature.get('stopText'),
    opacity: feature.get('stopOpacity'),
    markerColor: feature.get('stopColor'),
    markerOutlineColor: [255, 255, 255]});

  const routeStyle = [
    new olstyle.Style({
      stroke: new olstyle.Stroke({ color: '#6a7982', width: 10, opacity: 0.75 })
    }),
    new olstyle.Style({
      stroke: new olstyle.Stroke({ color: '#4fa9dd', width: 6, opacity: 0.75 })
    })
  ];

  if (feature.get('type') === 'stop') {
    return stopStyle;
  }
  if (feature.get('type') === 'vertex') {
    return vertexStyle;
  }
  if (feature.get('type') === 'route') {
    return routeStyle;
  }
}
