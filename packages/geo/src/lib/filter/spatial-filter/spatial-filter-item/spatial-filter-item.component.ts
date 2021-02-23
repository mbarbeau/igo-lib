import {
  Component,
  Input,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Output,
  EventEmitter,
  OnDestroy,
  OnInit
} from '@angular/core';
import { SpatialFilterQueryType, SpatialFilterType } from '../../shared/spatial-filter.enum';
import { SelectionModel } from '@angular/cdk/collections';
import { IgoMap } from '../../../map';
import { SpatialFilterItemType } from './../../shared/spatial-filter.enum';
import { Feature } from './../../../feature/shared/feature.interfaces';
import { FormControl } from '@angular/forms';
import { BehaviorSubject, Subscription } from 'rxjs';
import type { default as OlGeometryType } from 'ol/geom/GeometryType';
import { GeoJSONGeometry } from '../../../geometry/shared/geometry.interfaces';
import { Style as OlStyle } from 'ol/style';
import * as olstyle from 'ol/style';
import * as olproj from 'ol/proj';
import { olFeature } from 'ol/Feature';
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { SpatialFilterService } from '../../shared/spatial-filter.service';
import { MeasureLengthUnit } from '../../../measure';
import { EntityStore } from '@igo2/common';
import { Layer } from '../../../layer/shared';
import { NestedTreeControl } from '@angular/cdk/tree';
import { SpatialFilterThematic } from './../../shared/spatial-filter.interface';
import { MessageService, LanguageService } from '@igo2/core';
import { debounceTime } from 'rxjs/operators';

/**
 * Spatial-Filter-Item (search parameters)
 */
@Component({
  selector: 'igo-spatial-filter-item',
  templateUrl: './spatial-filter-item.component.html',
  styleUrls: ['./spatial-filter-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpatialFilterItemComponent implements OnDestroy, OnInit {

  @Input() map: IgoMap;

  @Input()
  get type(): SpatialFilterType {
    return this._type;
  }
  set type(type: SpatialFilterType) {
    this._type = type;
    const index = this.geometryTypes.findIndex(geom => geom === this.type);
    this.geometryType = this.geometryTypes[index];
    this.formControl.reset();
    this.radius = undefined;
    this.drawGuide$.next(null);
    this.drawStyle$.next(undefined);

    // Necessary to keep reference to the geometry form field input
    if (this.type === SpatialFilterType.Predefined) {
      const geojson: GeoJSONGeometry = {
        type: 'Point',
        coordinates: ''
      };
      this.formControl.setValue(geojson);
    }

    // Necessary to apply the right style when geometry type is Point
    if (this.type === SpatialFilterType.Point) {
      this.radius = 1000; // Base radius
      this.radiusFormControl.setValue(this.radius);
      this.PointStyle = (feature: olFeature, resolution: number) => {
        const coordinates = olproj.transform(feature.getGeometry().getCoordinates(), this.map.projection, 'EPSG:4326');
        return new olstyle.Style ({
          image: new olstyle.Circle ({
            radius: this.radius / (Math.cos((Math.PI / 180) * coordinates[1])) / resolution, // Latitude correction
            stroke: new olstyle.Stroke({
              width: 2,
              color: 'rgba(0, 153, 255)'
            }),
            fill: new olstyle.Fill({
              color: 'rgba(0, 153, 255, 0.2)'
            })
          })
        });
      };
      this.overlayStyle = this.PointStyle;
      this.drawStyle$.next(this.overlayStyle);
    } else {
      // If geometry types is Polygon
      this.radius = undefined;
      this.PolyStyle = (feature, resolution) => {
        return new olstyle.Style ({
          stroke: new olstyle.Stroke({
            width: 2,
            color: 'rgba(0, 153, 255)'
          }),
          fill: new olstyle.Fill({
            color: 'rgba(0, 153, 255, 0.2)'
          })
        });
      };
      this.overlayStyle = this.PolyStyle;
    }
    this.overlayStyle$.next(this.overlayStyle);
  }
  private _type: SpatialFilterType;

  @Input() queryType: SpatialFilterQueryType;

  @Input() zone: Feature;

  @Input() loading;

  @Input()
  get store(): EntityStore<Feature> {
    return this._store;
  }
  set store(store: EntityStore<Feature>) {
    this._store = store;
    this._store.entities$.subscribe(() => { this.cdRef.detectChanges(); });
  }
  private _store: EntityStore<Feature>;

  /**
   * Available measure units for the measure type given
   * @internal
   */
  get measureUnits(): string[] {
    return [MeasureLengthUnit.Meters, MeasureLengthUnit.Kilometers];
  }

  @Input() layers: Layer[] = [];

  @Input() allLayers: Layer[] = [];

  @Input()
  get thematicLength(): number {
    return this._thematicLength;
  }
  set thematicLength(value: number) {
    this._thematicLength = value;
  }
  private _thematicLength: number;

  @Output() toggleSearch = new EventEmitter();

  @Output() itemTypeChange = new EventEmitter<SpatialFilterItemType>();

  @Output() thematicChange = new EventEmitter<SpatialFilterThematic[]>();

  @Output() drawZoneEvent = new EventEmitter<Feature>();

  @Output() bufferEvent = new EventEmitter<number>();
  @Output() zoneWithBufferChange = new EventEmitter<Feature>();
  @Output() measureUnitChange = new EventEmitter<MeasureLengthUnit>();

  @Output() radiusEvent = new EventEmitter<number>();
  @Output() freehandControl = new EventEmitter<boolean>();

  @Output() clearButtonEvent = new EventEmitter();

  @Output() clearSearchEvent = new EventEmitter();

  @Output() export = new EventEmitter();

  @Output() openWorkspace = new EventEmitter();

  public itemType: SpatialFilterItemType[] = [SpatialFilterItemType.Address, SpatialFilterItemType.Thematics];
  public selectedItemType: SpatialFilterItemType = SpatialFilterItemType.Address;
  public selectedSourceAddress;

  treeControl: NestedTreeControl<SpatialFilterThematic> = new NestedTreeControl<SpatialFilterThematic>(node => node.children);

  // For thematics and results tables
  public displayedColumns: string[] = ['name', 'select'];
  public childrens: SpatialFilterThematic[] = [];
  public groups: string[] = [];
  public thematics: SpatialFilterThematic[] = [];
  public dataSource = new MatTreeNestedDataSource<SpatialFilterThematic>();
  public selectedThematics = new SelectionModel<SpatialFilterThematic>(true, []);

  // For geometry form field input
  value$: BehaviorSubject<GeoJSONGeometry> = new BehaviorSubject(undefined);
  drawGuide$: BehaviorSubject<number> = new BehaviorSubject(null);
  overlayStyle$: BehaviorSubject<OlStyle> = new BehaviorSubject(undefined);
  drawStyle$: BehaviorSubject<OlStyle> = new BehaviorSubject(undefined);

  private value$$: Subscription;
  private radiusChanges$$: Subscription;
  private bufferChanges$$: Subscription;

  public formControl = new FormControl();
  public geometryType: OlGeometryType;
  public geometryTypeField = false;
  public geometryTypes: string[] = ['Point', 'Polygon'];
  public drawGuideField = false;
  public drawGuide: number = null;
  public drawGuidePlaceholder = '';
  public measure = false;
  public drawControlIsActive = true;
  public freehandDrawIsActive = false;
  public drawStyle: OlStyle;
  public drawZone;
  public overlayStyle: OlStyle;
  public PointStyle: OlStyle;
  public PolyStyle: OlStyle;

  public radius: number;
  public buffer: number = 0;
  public radiusFormControl = new FormControl();
  public bufferFormControl = new FormControl();

  public measureUnit: MeasureLengthUnit = MeasureLengthUnit.Meters;
  public zoneWithBuffer;

  constructor(
    private cdRef: ChangeDetectorRef,
    private spatialFilterService: SpatialFilterService,
    private messageService: MessageService,
    private languageService: LanguageService) {}

  ngOnInit() {
    this.spatialFilterService.loadThematicsList()
    .subscribe((items: SpatialFilterThematic[]) => {
      for (const item of items) {
        this.childrens.push(item);
        this.childrens.sort((a, b) => {
          return a.name.localeCompare(b.name);
        });
      }
      this.groups.push(this.languageService.translate.instant('igo.geo.terrapi.limites'));
      const limits: SpatialFilterThematic = {
        name: this.groups[0],
        children: []
      };
      this.thematics.push(limits);
      this.childrens.forEach(child => {
        if (child.group && (this.groups.indexOf(child.group) === -1)) {
          this.groups.push(child.group);
          const thematic: SpatialFilterThematic = {
            name: child.group,
            children: []
          };
          this.thematics.push(thematic);
        }

        if (!child.group) {
          if (
            child.name === this.languageService.translate.instant('igo.geo.terrapi.AdmRegion') ||
            child.name === this.languageService.translate.instant('igo.geo.terrapi.Mun') ||
            child.name === this.languageService.translate.instant('igo.geo.terrapi.Arrond') ||
            child.name === this.languageService.translate.instant('igo.geo.terrapi.CircFed') ||
            child.name === this.languageService.translate.instant('igo.geo.terrapi.CircProv') ||
            child.name === this.languageService.translate.instant('igo.geo.terrapi.DirReg') ||
            child.name === this.languageService.translate.instant('igo.geo.terrapi.MRC') ||
            child.name === this.languageService.translate.instant('igo.geo.terrapi.RegTour')) {
              child.group = limits.name;
          } else if (child.name === this.languageService.translate.instant('igo.geo.terrapi.routes')) {
            child.group = this.languageService.translate.instant('igo.geo.spatialFilter.group.transport');
          } else {
            const thematic: SpatialFilterThematic = {
              name: child.name,
              children: [],
              source: child.source
            };
            this.thematics.push(thematic);
          }
        }
        this.thematics.sort((a, b) => {
          return a.name.localeCompare(b.name);
        });
      });
      this.thematics.forEach(thematic => {
        for (const child of this.childrens) {
          if (child.group === thematic.name) {
            thematic.children.push(child);
          }
        }
      });
    });

    this.dataSource.data = this.thematics;

    this.drawGuide$.next(null);
    this.value$.next(this.formControl.value ? this.formControl.value : undefined);
    this.value$$ = this.formControl.valueChanges.subscribe((value: GeoJSONGeometry) => {
      if (value) {
        this.value$.next(value);
        this.drawZone = this.formControl.value as Feature;
        if (this.buffer !== 0) {
          this.drawZoneEvent.emit(this.drawZone);
          this.bufferFormControl.setValue(this.buffer);
        }
      } else {
        this.value$.next(undefined);
        this.drawZone = undefined;
      }
    });

    this.value$.subscribe(() => {
      this.getRadius();
      this.cdRef.detectChanges();
    });

    this.radiusChanges$$ = this.radiusFormControl.valueChanges.subscribe(() => {
      this.getRadius();
      this.cdRef.detectChanges();
    });

    this.bufferChanges$$ = this.bufferFormControl.valueChanges
      .pipe(
        debounceTime(500)
      )
      .subscribe((value) => {
        if (this.measureUnit === MeasureLengthUnit.Meters && value > 0 && value <= 100000) {
          this.buffer = value;
          this.bufferEvent.emit(value);
          this.spatialFilterService.loadBufferGeometry(
            this.drawZone,
            SpatialFilterType.Polygon,
            value
          ).subscribe((featureGeom: Feature) => {
            this.zoneWithBuffer = featureGeom;
            this.zoneWithBufferChange.emit(this.zoneWithBuffer);
          });
        } else if (this.measureUnit === MeasureLengthUnit.Kilometers && value > 0 && value <= 100) {
          this.buffer = value;
          this.bufferEvent.emit(value);
          this.spatialFilterService.loadBufferGeometry(
            this.drawZone,
            SpatialFilterType.Polygon,
            value * 1000
          ).subscribe((featureGeom: Feature) => {
            this.zoneWithBuffer = featureGeom;
            this.zoneWithBufferChange.emit(this.zoneWithBuffer);
          });
        } else if (value === 0) {
          this.buffer = value;
          this.bufferEvent.emit(value);
          this.drawZoneEvent.emit(this.drawZone);
        } else if (
          value < 0 ||
          (this.measureUnit === MeasureLengthUnit.Meters && value > 100000) ||
          (this.measureUnit === MeasureLengthUnit.Kilometers && value > 100)) {
            this.bufferFormControl.setValue(0);
            this.buffer = 0;
            this.messageService.alert(this.languageService.translate.instant('igo.geo.spatialFilter.bufferAlert'),
              this.languageService.translate.instant('igo.geo.spatialFilter.warning'));
        }
    });
  }

  /**
   * Unsubscribe to the value stream
   * @internal
   */
  ngOnDestroy() {
    this.value$$.unsubscribe();
    this.radiusChanges$$.unsubscribe();
    this.bufferChanges$$.unsubscribe();
    this.cdRef.detach();
    if (this.radiusChanges$$) {
      this.radiusChanges$$.unsubscribe();
    }
    if (this.value$$) {
      this.value$$.unsubscribe();
    }
  }

  onItemTypeChange(event) {
    this.selectedItemType = event.value;
    this.itemTypeChange.emit(this.selectedItemType);
  }

  /**
   * Set the measure unit
   * @internal
   */
  onMeasureUnitChange(unit: MeasureLengthUnit) {
    if (unit === this.measureUnit) {
      return;
    } else {
      this.measureUnit = unit;
      this.measureUnitChange.emit(this.measureUnit);
      if (this.isPolygon()) {
        this.measureUnit === MeasureLengthUnit.Meters ?
          this.bufferFormControl.setValue(this.bufferFormControl.value * 1000) :
          this.bufferFormControl.setValue(this.bufferFormControl.value / 1000);
      } else if (this.isPoint()) {
        this.measureUnit === MeasureLengthUnit.Meters ?
          this.radiusFormControl.setValue(this.radiusFormControl.value * 1000) :
          this.radiusFormControl.setValue(this.radiusFormControl.value / 1000);
      }
    }
  }

  isPredefined() {
    return this.type === SpatialFilterType.Predefined;
  }

  isPolygon() {
    return this.type === SpatialFilterType.Polygon;
  }

  isPoint() {
    return this.type === SpatialFilterType.Point;
  }

  hasChild(_: number, node: SpatialFilterThematic) {
    if (node.children) {
      return node.children.length;
    }
    return false;
  }

  onToggleClick(node: SpatialFilterThematic) {
    this.treeControl.isExpanded(node) ? this.treeControl.collapse(node) : this.treeControl.expand(node);
  }

  isAllSelected(node?: SpatialFilterThematic) {
    let numSelected;
    let numNodes = 0;
    if (!node) {
      numSelected = this.selectedThematics.selected.length;
      this.thematics.forEach(thematic => {
        if (this.groups.indexOf(thematic.name) === -1) {
          numNodes++;
        }
      });
      this.childrens.forEach(children => {
        if (!this.thematics.find(thematic => thematic.source === children.source)) {
          numNodes++;
        }
      });
    } else {
      numSelected = node.children.length;
      node.children.forEach(children => {
        if (this.selectedThematics.selected.find(thematic => thematic === children)) {
          numNodes++;
        }
      });
    }

    if (numNodes >= 1) {
      return numSelected === numNodes;
    } else {
      return false;
    }
  }

  hasChildrenSelected(node: SpatialFilterThematic) {
    let bool = false;
    node.children.forEach(child => {
      if (this.selectedThematics.selected.find(thematic => thematic.source === child.source)) {
        bool = true;
      }
    });
    return bool;
  }

  /**
   * Apply header checkbox
   */
  masterToggle() {
    this.isAllSelected() ?
      this.selectedThematics.clear() :
      this.selectAll();

    const selectedThematicsName: SpatialFilterThematic[] = [];
    for (const thematic of this.selectedThematics.selected) {
      selectedThematicsName.push(thematic);
    }

    if (this.isAllSelected()) {
      this.thematics.forEach(thematic => {
        if (this.hasChild(0, thematic)) {
          this.treeControl.expand(thematic);
        }
      });
    } else {
      this.thematics.forEach(thematic => {
        if (this.hasChild(0, thematic)) {
          this.treeControl.collapse(thematic);
        }
      });
    }
    this.thematicChange.emit(selectedThematicsName);
  }

  selectAll(node?: SpatialFilterThematic) {
    if (!node) {
      this.thematics.forEach(thematic => {
        if (this.groups.indexOf(thematic.name) === -1) {
          this.selectedThematics.select(thematic);
        }
      });
      this.childrens.forEach(children => {
        if (!this.selectedThematics.selected.find(thematic => thematic.source === children.source)) {
          this.selectedThematics.select(children);
        }
      });
    } else {
      if (this.hasChild(0, node)) {
        node.children.forEach(children => this.selectedThematics.select(children));
      }
    }
  }

  childrensToggle(node: SpatialFilterThematic) {
    this.isAllSelected(node) ?
    node.children.forEach(child => this.selectedThematics.deselect(child)) :
    this.selectAll(node);

    const selectedThematicsName: SpatialFilterThematic[] = [];
    for (const thematic of this.selectedThematics.selected) {
      selectedThematicsName.push(thematic);
    }
    this.treeControl.expand(node);
    this.thematicChange.emit(selectedThematicsName);
  }

  /**
   * Apply changes to the thematics selected tree and emit event
   */
  onToggleChange(nodeSelected: SpatialFilterThematic) {
    let selected = false;
    if (this.selectedThematics.selected.find(thematic => thematic.source === nodeSelected.source) !== undefined) {
      selected = true;
    }

    this.childrens.forEach(children => {
      if (children === nodeSelected && selected === false) {
        this.selectedThematics.select(children);
      }
      if (children === nodeSelected && selected === true) {
        this.selectedThematics.deselect(children);
      }
    });
    this.thematics.forEach(thematic => {
      if (thematic === nodeSelected && selected === false) {
        this.selectedThematics.select(thematic);
      }
      if (thematic === nodeSelected && selected === true) {
        this.selectedThematics.deselect(thematic);
      }
    });

    const selectedThematicsName: SpatialFilterThematic[] = [];
    for (const thematic of this.selectedThematics.selected) {
      selectedThematicsName.push(thematic);
    }
    this.thematicChange.emit(selectedThematicsName);
  }

  onDrawControlChange() {
    this.drawControlIsActive = !this.drawControlIsActive;
  }

  onfreehandControlChange() {
    this.freehandDrawIsActive = !this.freehandDrawIsActive;
    this.freehandControl.emit(this.freehandDrawIsActive);
  }

  /**
   * Launch search button
   */
  toggleSearchButton() {
    if (!this.isPredefined()) {
      if (this.buffer > 0) {
        this.zoneWithBuffer.meta = {
          id: undefined,
          title: 'Zone'
        };
        this.zoneWithBuffer.properties = {
          nom: 'Zone',
          type: this.type as string
        };
        this.drawZoneEvent.emit(this.zoneWithBuffer);
      } else {
        this.drawZone.meta = {
          id: undefined,
          title: 'Zone'
        };
        this.drawZone.properties = {
          nom: 'Zone',
          type: this.type as string
        };
        this.drawZoneEvent.emit(this.drawZone);
      }
    }
    if (this.isPoint()) {
      this.radiusEvent.emit(this.radius);
    } else if (this.isPolygon()) {
      this.bufferEvent.emit(this.buffer);
    }
    this.toggleSearch.emit();
    this.store.entities$.subscribe((value) => {
      if (value.length && this.layers.length === this.thematicLength + 1) {
        this.openWorkspace.emit();
      }
    });
  }

  /**
   * Launch clear button (clear store and map layers)
   */
  clearButton() {
    this.loading = true;
    if (this.store) {
      this.store.clear();
    }
    if (this.isPoint() || this.isPolygon()) {
      this.drawZone = undefined;
      this.formControl.reset();
    }
    this.bufferFormControl.setValue(0);
    this.buffer = 0;
    this.bufferEvent.emit(0);
    this.clearButtonEvent.emit();
    this.loading = false;
  }

  clearDrawZone() {
    this.formControl.reset();
    this.bufferFormControl.setValue(0);
    this.buffer = 0;
  }

  /**
   * Launch clear search (clear field if type is predefined)
   */
  clearSearch() {
    this.selectedThematics.clear();
    this.bufferFormControl.setValue(0);
    this.buffer = 0;
    this.bufferEvent.emit(0);
    this.thematicChange.emit([]);
    this.clearSearchEvent.emit();
  }

  /**
   * Verify conditions of incomplete fields or busy service
   */
  disableSearchButton(): boolean {
    if (this.type === SpatialFilterType.Predefined) {
      if (this.selectedItemType === SpatialFilterItemType.Address) {
        if (this.queryType !== undefined && this.zone !== undefined) {
          return this.loading;
        }
      }
      if (this.selectedItemType === SpatialFilterItemType.Thematics) {
        if (this.queryType !== undefined && this.zone !== undefined && this.selectedThematics.selected.length > 0) {
          return this.loading;
        }
      }
    }
    if (this.type === SpatialFilterType.Polygon || this.type === SpatialFilterType.Point) {
      if (this.selectedItemType === SpatialFilterItemType.Address && this.formControl.value !== null) {
        return this.loading;
      }
      if (this.selectedItemType === SpatialFilterItemType.Thematics) {
        if (this.selectedThematics.selected.length > 0 && this.formControl.value !== null) {
          return this.loading;
        }
      }
    }
    return true;
  }

  disabledClearSearch() {
    let disable = true;
    this.selectedItemType === SpatialFilterItemType.Address ?
      disable = this.queryType === undefined :
      disable = this.queryType === undefined && this.selectedThematics.selected.length === 0;

    return disable;
  }

  /**
   * Manage radius value at user change
   */
  getRadius() {
    let formValue;
    if (this.formControl.value !== null) {
      this.measureUnit === MeasureLengthUnit.Meters ?
        formValue = this.formControl.value.radius :
        formValue = this.formControl.value.radius / 1000;
    } else {
      formValue = undefined;
    }

    if (this.type === SpatialFilterType.Point) {
      if (!this.freehandDrawIsActive) {
        if (
          this.radiusFormControl.value < 0 ||
          (this.measureUnit === MeasureLengthUnit.Meters && this.radiusFormControl.value >= 100000) ||
          (this.measureUnit === MeasureLengthUnit.Kilometers && this.radiusFormControl.value >= 100)) {
          this.messageService.alert(this.languageService.translate.instant('igo.geo.spatialFilter.radiusAlert'),
            this.languageService.translate.instant('igo.geo.spatialFilter.warning'));
          this.radius = 1000;
          this.measureUnit === MeasureLengthUnit.Meters ?
            this.radiusFormControl.setValue(this.radius) :
            this.radiusFormControl.setValue(this.radius / 1000);
          this.drawGuide$.next(this.radius);
          return;
        }
      } else {
        if (formValue) {
          if (formValue >= 100000) {
            this.messageService.alert(this.languageService.translate.instant('igo.geo.spatialFilter.radiusAlert'),
              this.languageService.translate.instant('igo.geo.spatialFilter.warning'));
            this.formControl.reset();
            return;
          }
          if (formValue !== this.radiusFormControl.value) {
            this.radiusFormControl.setValue(formValue);
            return;
          }
        }
      }
      if (this.measureUnit === MeasureLengthUnit.Meters) {
        this.radius = this.radiusFormControl.value;
        this.drawGuide$.next(this.radius);
      } else {
        this.radius = this.radiusFormControl.value * 1000;
        this.drawGuide$.next(this.radius * 1000);
      }
      this.overlayStyle$.next(this.PointStyle);
      this.drawStyle$.next(this.PointStyle);
    }
  }
}
