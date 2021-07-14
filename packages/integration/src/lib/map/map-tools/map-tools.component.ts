import {
  Component,
  ChangeDetectionStrategy,
  Input,
  OnInit,
  ViewChild,
  OnDestroy
} from '@angular/core';

import { ToolComponent } from '@igo2/common';
import {
  LayerListControlsEnum,
  LayerListControlsOptions,
  IgoMap,
  SearchSourceService,
  sourceCanSearch,
  Layer,
  ExportOptions,
  VectorLayer
} from '@igo2/geo';

import { LayerListToolState } from '../layer-list-tool.state';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { ToolState } from '../../tool/tool.state';
import { MapState } from '../map.state';
import { BehaviorSubject, Observable, Subscription, combineLatest } from 'rxjs';
import { map, debounceTime } from 'rxjs/operators';
import { ImportExportMode, ImportExportState } from '../../import-export/import-export.state';
/**
 * Tool to browse a map's layers or to choose a different map
 */
@ToolComponent({
  name: 'mapTools',
  title: 'igo.integration.tools.map',
  icon: 'map'
})
@Component({
  selector: 'igo-map-tools',
  templateUrl: './map-tools.component.html',
  styleUrls: ['./map-tools.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapToolsComponent implements OnInit, OnDestroy {
  layers$: BehaviorSubject<Layer[]> = new BehaviorSubject([]);
  showAllLegendsValue$: BehaviorSubject<boolean> = new BehaviorSubject(false);

  private resolution$$: Subscription;
  private visibleOrInRangeLayers$$: Subscription;
  public delayedShowEmptyMapContent: boolean = false;

  @Input() allowShowAllLegends: boolean = false;

  @Input() showAllLegendsValue: boolean = false;

  @Input() toggleLegendOnVisibilityChange: boolean = false;

  @Input() expandLegendOfVisibleLayers: boolean = false;

  @Input() updateLegendOnResolutionChange: boolean = false;

  @Input() selectedTabAtOpening: string;

  @Input() ogcButton: boolean = true;

  @Input() timeButton: boolean = true;

  @Input() layerAdditionAllowed: boolean = true;

  @Input()
  get layerListControls(): LayerListControlsOptions {
    return this._layerListControls;
  }
  set layerListControls(value: LayerListControlsOptions) {
    const stateOptions = this.layerListToolState.getLayerListControls();
    const stateKeyword = stateOptions.keyword;
    const stateOnlyVisible = stateOptions.onlyVisible;
    const stateSortAlpha = stateOptions.sortAlpha;

    value.keyword = stateKeyword !== '' ? stateKeyword : value.keyword;
    value.onlyVisible =
      stateOnlyVisible !== undefined ? stateOnlyVisible : value.onlyVisible;
    value.sortAlpha =
      stateSortAlpha !== undefined ? stateSortAlpha : value.sortAlpha;

    value.onlyVisible =
      value.onlyVisible === undefined ? false : value.onlyVisible;
    value.sortAlpha = value.sortAlpha === undefined ? false : value.sortAlpha;

    this._layerListControls = value;
  }
  private _layerListControls = {};

  get map(): IgoMap {
    return this.mapState.map;
  }

  @Input() queryBadge: boolean = false;

  get visibleOrInRangeLayers$(): Observable<Layer[]> {
    return this.layers$.pipe(
      map((layers) =>
        layers.filter(
          (layer) => layer.visible$.value && layer.isInResolutionsRange$.value
        )
      )
    );
  }

  get visibleLayers$(): Observable<Layer[]> {
    return this.layers$.pipe(
      map((layers) => layers.filter((layer) => layer.visible$.value))
    );
  }

  get excludeBaseLayers(): boolean {
    return this.layerListControls.excludeBaseLayers || false;
  }

  get layerFilterAndSortOptions(): LayerListControlsOptions {
    const filterSortOptions = Object.assign(
      {
        showToolbar: LayerListControlsEnum.default
      },
      this.layerListControls
    );

    switch (this.layerListControls.showToolbar) {
      case LayerListControlsEnum.always:
        filterSortOptions.showToolbar = LayerListControlsEnum.always;
        break;
      case LayerListControlsEnum.never:
        filterSortOptions.showToolbar = LayerListControlsEnum.never;
        break;
      default:
        break;
    }
    return filterSortOptions;
  }

  @ViewChild('tabGroup', { static: true }) tabGroup;

  get searchToolInToolbar(): boolean {
    return (
      this.toolState.toolbox.getToolbar().indexOf('searchResults') !== -1 &&
      this.searchSourceService
        .getSources()
        .filter(sourceCanSearch)
        .filter((s) => s.available && s.getType() === 'Layer').length > 0
    );
  }

  get catalogToolInToolbar(): boolean {
    return this.toolState.toolbox.getToolbar().indexOf('catalog') !== -1;
  }

  get contextToolInToolbar(): boolean {
    return this.toolState.toolbox.getToolbar().indexOf('contextManager') !== -1;
  }

  constructor(
    public layerListToolState: LayerListToolState,
    private toolState: ToolState,
    public mapState: MapState,
    private searchSourceService: SearchSourceService,
    private importExportState: ImportExportState
  ) {}

  ngOnInit(): void {
    this.selectedTab();
    this.resolution$$ = combineLatest([
      this.map.layers$,
      this.map.viewController.resolution$
    ])
      .pipe(debounceTime(10))
      .subscribe((bunch: [Layer[], number]) => {
        this.layers$.next(
          bunch[0].filter(
            (layer) =>
              layer.showInLayerList !== false &&
              (!this.excludeBaseLayers || !layer.baseLayer)
          )
        );
      });

    if (this.allowShowAllLegends) {
      this.mapState.showAllLegendsValue =
        this.mapState.showAllLegendsValue !== undefined
          ? this.mapState.showAllLegendsValue
          : this.showAllLegendsValue || false;
      this.showAllLegendsValue$.next(this.mapState.showAllLegendsValue);
    } else {
      this.showAllLegendsValue$.next(false);
    }

    // prevent message to be shown too quickly. Waiting for layers
    setTimeout(() => (this.delayedShowEmptyMapContent = true), 250);
  }

  ngOnDestroy(): void {
    this.resolution$$.unsubscribe();
    if (this.visibleOrInRangeLayers$$) {
      this.visibleOrInRangeLayers$$.unsubscribe();
    }
  }

  onShowAllLegends(event) {
    this.mapState.showAllLegendsValue = event;
    this.showAllLegendsValue$.next(event);
  }

  private selectedTab() {
    const userSelectedTab = this.layerListToolState.selectedTab$.value;
    if (userSelectedTab !== undefined) {
      this.layerListToolState.setSelectedTab(userSelectedTab);
    } else {
      if (this.selectedTabAtOpening === 'legend') {
        this.layerListToolState.setSelectedTab(1);
      } else {
        this.layerListToolState.setSelectedTab(0);
      }
    }
  }

  public tabChanged(tab: MatTabChangeEvent) {
    this.layerListToolState.setSelectedTab(tab.index);
    this.layers$.next(
      this.map.layers.filter(
        (layer) =>
          layer.showInLayerList !== false &&
          (!this.excludeBaseLayers || !layer.baseLayer)
      )
    );
  }

  onLayerListChange(appliedFilters: LayerListControlsOptions) {
    this.layerListToolState.setKeyword(appliedFilters.keyword);
    this.layerListToolState.setSortAlpha(appliedFilters.sortAlpha);
    this.layerListToolState.setOnlyVisible(appliedFilters.onlyVisible);
  }

  showAllLegend() {
    if (this.layers$.getValue().length === 0) {
      return false;
    } else if (
      this.layers$.getValue().length !== 0 &&
      this.allowShowAllLegends === false
    ) {
      let visibleOrInRangeLayers;
      this.visibleOrInRangeLayers$$ = this.visibleOrInRangeLayers$.subscribe((value) => {
        value.length === 0
          ? (visibleOrInRangeLayers = false)
          : (visibleOrInRangeLayers = true);
      });

      if (visibleOrInRangeLayers === false) {
        return false;
      }
    }
    return true;
  }

  activateExport(layer: Layer) {
    let id = layer.id;
    if (layer.options.workspace?.workspaceId) {
      id = layer.options.workspace.workspaceId !== layer.id ? layer.options.workspace.workspaceId : layer.id;
    }
    this.importExportState.setsExportOptions({ layers: [id] } as ExportOptions);
    this.importExportState.setMode(ImportExportMode.export);
    this.toolState.toolbox.activateTool('importExport');
  }

  activateTimeFilter() {
    this.toolState.toolbox.activateTool('activeTimeFilter');
  }

  activateOgcFilter() {
    this.toolState.toolbox.activateTool('activeOgcFilter');
  }

  searchEmit() {
    this.toolState.toolbox.activateTool('searchResults');
  }

  catalogEmit() {
    this.toolState.toolbox.activateTool('catalog');
  }

  contextEmit() {
    this.toolState.toolbox.activateTool('contextManager');
  }

  isTimeFilterButton(layer): boolean {
    const options = layer.dataSource.options;
    return this.timeButton && options.timeFilterable && options.timeFilter;
  }

  isOGCFilterButton(layer): boolean {
    const options = layer.dataSource.options;
    return this.ogcButton && options.ogcFilters && options.ogcFilters.enabled &&
    (options.ogcFilters.pushButtons || options.ogcFilters.checkboxes || options.ogcFilters.radioButtons
      || options.ogcFilters.select || options.ogcFilters.editable);
  }

  isExportButton(layer: Layer): boolean {
    if (
      (layer instanceof VectorLayer && layer.exportable === true) ||
      (layer.dataSource.options.download && layer.dataSource.options.download.url) ||
      (layer.options.workspace?.enabled && layer.options.workspace?.workspaceId !== layer.id))
      {
          return true;
      }
    return false;
  }
}
