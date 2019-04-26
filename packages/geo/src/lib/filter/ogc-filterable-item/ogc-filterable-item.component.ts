import { Component, Input, OnInit } from '@angular/core';

import * as olstyle from 'ol/style';

import { Layer } from '../../layer/shared/layers/layer';
import { DownloadService } from '../../download/shared/download.service';
import { WMSDataSource } from '../../datasource/shared/datasources/wms-datasource';
import { WFSDataSourceOptionsParams } from '../../datasource/shared/datasources/wfs-datasource.interface';

import {
  OgcFilterableDataSource,
  OgcFiltersOptions,
  OgcInterfaceFilterOptions
} from '../shared/ogc-filter.interface';
import { OGCFilterService } from '../shared/ogc-filter.service';
import { IgoMap } from '../../map';
import { OgcFilterWriter } from '../shared/ogc-filter';

@Component({
  selector: 'igo-ogc-filterable-item',
  templateUrl: './ogc-filterable-item.component.html',
  styleUrls: ['./ogc-filterable-item.component.scss']
})
export class OgcFilterableItemComponent implements OnInit {
  public color = 'primary';
  private lastRunOgcFilter;
  private defaultLogicalParent = 'And';
  public hasActiveSpatialFilter = false;
  public filtersAreEditable = true;
  public filtersCollapsed = true;

  @Input()
  get layer(): Layer {
    return this._layer;
  }
  set layer(value: Layer) {
    this._layer = value;
  }

  @Input()
  get map(): IgoMap {
    return this._map;
  }
  set map(value: IgoMap) {
    this._map = value;
  }

  get refreshFunc() {
    return this.refreshFilters.bind(this);
  }
  @Input()
  get showFeatureOnMap(): boolean {
    return this._showFeatureOnMap;
  }
  set showFeatureOnMap(value: boolean) {
    this._showFeatureOnMap = value;
  }

  public _showFeatureOnMap = false;
  private _map: IgoMap;
  private _layer: Layer;

  get datasource(): OgcFilterableDataSource {
    return this.layer.dataSource as OgcFilterableDataSource;
  }

  @Input()
  get ogcFiltersHeaderShown(): boolean {
    return this._ogcFiltersHeaderShown;
  }
  set ogcFiltersHeaderShown(value: boolean) {
    this._ogcFiltersHeaderShown = value;
  }
  private _ogcFiltersHeaderShown: boolean;

  constructor(
    private ogcFilterService: OGCFilterService,
    private downloadService: DownloadService
  ) {}

  ngOnInit() {
    switch (this.datasource.options.type) {
      case 'wms':
        this.ogcFilterService.setOgcWMSFiltersOptions(this.datasource);
        break;
      case 'wfs':
        this.ogcFilterService.setOgcWFSFiltersOptions(this.datasource);
        break;
      default:
        break;
    }

    if (this.datasource.options.ogcFilters) {
      if (this.datasource.options.ogcFilters.interfaceOgcFilters) {
        this.lastRunOgcFilter = JSON.parse(
          JSON.stringify(this.datasource.options.ogcFilters.interfaceOgcFilters)
        );
        if (
          this.datasource.options.ogcFilters.interfaceOgcFilters.filter(
            f => f.wkt_geometry
          ).length >= 1
        ) {
          this.hasActiveSpatialFilter = true;
        }
      }

      this.filtersAreEditable = this.datasource.options.ogcFilters.editable
        ? this.datasource.options.ogcFilters.editable
        : false;
    }
  }

  private getOverlayByID(id) {
    this.map.overlay.dataSource.ol.getFeatureById(id);
  }

  toggleShowFeatureOnMap() {
    this.showFeatureOnMap = !this.showFeatureOnMap;
    this.datasource.options.ogcFilters.interfaceOgcFilters.forEach(filter => {
      let drawnFeature;
      let drawnStrokeColor = [125, 136, 140, 0] as [
        number,
        number,
        number,
        number
      ];
      let drawStrokeWidth = 2;
      let drawnFillColor = [125, 136, 140, 0] as [
        number,
        number,
        number,
        number
      ];

      drawnFeature = this.getOverlayByID('ogcFilterOverlay_' + filter.filterid);
      if (this.showFeatureOnMap !== false) {
        drawnStrokeColor = [125, 136, 140, 0.5];
        drawStrokeWidth = 2;
        drawnFillColor = [125, 136, 140, 0];
      }

      const stroke = new olstyle.Stroke({
        width: drawStrokeWidth,
        color: drawnStrokeColor
      });

      const fill = new olstyle.Stroke({
        color: drawnFillColor
      });

      const olStyle = new olstyle.Style({
        stroke,
        fill,
        image: new olstyle.Circle({
          radius: 5,
          stroke,
          fill
        })
      });

      if (drawnFeature) {
        drawnFeature.setStyle(olStyle);
      }
    });
  }

  addFilterToSequence() {
    this.filtersCollapsed = false;
    const interfaceOgcFilters: OgcInterfaceFilterOptions[] = this.datasource.options.ogcFilters.interfaceOgcFilters;
    const arr = interfaceOgcFilters || [];
    const lastLevel = arr.length === 0 ? 0 : arr[arr.length - 1].level;
    let firstFieldName = '';
    if (this.datasource.options.sourceFields.length > 0) {
      firstFieldName =
        this.datasource.options.sourceFields[0].name === undefined
          ? ''
          : this.datasource.options.sourceFields[0].name;
    }
    let fieldNameGeometry;
    const datasourceOptions = this.datasource
      .options as WFSDataSourceOptionsParams;
    if (datasourceOptions.fieldNameGeometry) {
      fieldNameGeometry = datasourceOptions.fieldNameGeometry;
    } else if (
      (this.datasource.options as any).paramsWFS &&
      (this.datasource.options as any).paramsWFS.fieldNameGeometry
    ) {
      fieldNameGeometry = (this.datasource.options as any).paramsWFS
        .fieldNameGeometry;
    }
    const status = arr.length === 0 ? true : false;
    arr.push(
      new OgcFilterWriter().addInterfaceFilter(
        {
          propertyName: firstFieldName,
          operator: 'PropertyIsEqualTo',
          active: status,
          igoSpatialSelector: 'fixedExtent'
        } as OgcInterfaceFilterOptions,
        fieldNameGeometry,
        lastLevel,
        this.defaultLogicalParent
      )
    );
    this.datasource.options.ogcFilters.interfaceOgcFilters = arr;
  }

  openDownload() {
    this.downloadService.open(this.layer);
  }

  refreshFilters() {
    const ogcFilters: OgcFiltersOptions = this.datasource.options.ogcFilters;
    const ogcFilterWriter = new OgcFilterWriter();
    const activeFilters = ogcFilters.interfaceOgcFilters.filter(
      f => f.active === true
    );
    if (activeFilters.length === 0) {
      ogcFilters.filters = undefined;
      ogcFilters.filtered = false;
    }
    if (activeFilters.length > 1) {
      activeFilters[0].parentLogical = activeFilters[1].parentLogical;
    }
    if (
      activeFilters.filter(
        af => ['Contains', 'Intersects', 'Within'].indexOf(af.operator) !== -1
      ).length === 0
    ) {
      this.hasActiveSpatialFilter = false;
    } else {
      this.hasActiveSpatialFilter = true;
    }

    if (
      !(JSON.stringify(this.lastRunOgcFilter) === JSON.stringify(activeFilters))
    ) {
      if (this.layer.dataSource.options.type === 'wfs') {
        const ogcDataSource: any = this.layer.dataSource;
        const ogcLayer: OgcFiltersOptions = ogcDataSource.options.ogcFilters;
        ogcLayer.filters = ogcFilterWriter.rebuiltIgoOgcFilterObjectFromSequence(
          activeFilters
        );
        this.layer.dataSource.ol.clear();
      } else if (
        this.layer.dataSource.options.type === 'wms' &&
        ogcFilters.enabled
      ) {
        let rebuildFilter = '';
        if (activeFilters.length >= 1) {
          const ogcDataSource: any = this.layer.dataSource;
          const ogcLayer: OgcFiltersOptions = ogcDataSource.options.ogcFilters;
          ogcLayer.filters = ogcFilterWriter.rebuiltIgoOgcFilterObjectFromSequence(
            activeFilters
          );
          rebuildFilter = ogcFilterWriter.buildFilter(
            ogcLayer.filters,
            undefined,
            undefined,
            (this.layer.dataSource.options as any).fieldNameGeometry
          );
        }
        this.ogcFilterService.filterByOgc(
          this.datasource as WMSDataSource,
          rebuildFilter
        );
        this.datasource.options.ogcFilters.filtered =
          activeFilters.length === 0 ? false : true;
      }

      this.lastRunOgcFilter = JSON.parse(JSON.stringify(activeFilters));
    } else {
      // identical filter. Nothing triggered
    }
  }

  get downloadable() {
    return (this.datasource.options as any).download;
  }

  public setVisible() {
    this.layer.visible = true;
  }
}
