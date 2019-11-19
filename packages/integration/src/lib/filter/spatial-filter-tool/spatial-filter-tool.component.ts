import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import {
  IgoMap,
  DataSourceService,
  LayerService,
  Feature,
  moveToOlFeatures,
  FeatureMotion,
  ClusterDataSource,
  featureToOl,
  DataSource,
  QueryableDataSourceOptions,
  SpatialFilterService,
  SpatialFilterType,
  SpatialFilterItemType,
  SpatialFilterQueryType,
  SpatialFilterThematic,
  Layer
} from '@igo2/geo';
import { EntityStore, ToolComponent } from '@igo2/common';
import olFormatGeoJSON from 'ol/format/GeoJSON';
import { BehaviorSubject } from 'rxjs';
import { MapState } from '../../map/map.state';
import * as olstyle from 'ol/style';
import { MessageService, LanguageService } from '@igo2/core';

/**
 * Tool to apply spatial filter
 */
@ToolComponent({
  name: 'spatialFilter',
  title: 'igo.integration.tools.spatialFilter',
  icon: 'map-marker-radius'
})

/**
 * Spatial Filter Type
 */
@Component({
  selector: 'igo-spatial-filter-tool',
  templateUrl: './spatial-filter-tool.component.html',
  styleUrls: ['./spatial-filter-tool.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpatialFilterToolComponent {

  get map(): IgoMap {
    return this.mapState.map;
  }

  @Input() type: SpatialFilterType;
  @Input() itemType: SpatialFilterItemType = SpatialFilterItemType.Address;
  @Input() freehandDrawIsActive: boolean;

  public layers: Layer[] = [];

  public queryType: SpatialFilterQueryType;
  public thematics: SpatialFilterThematic[];
  public zone: Feature;
  public radius: number;
  public clearSearch;

  public selectedFeature$: BehaviorSubject<Feature> = new BehaviorSubject(undefined);

  private format = new olFormatGeoJSON();

  public store: EntityStore<Feature> = new EntityStore<Feature>([]); // Store to print results at the end

  public spatialListStore: EntityStore<Feature> = new EntityStore<Feature>([]);

  public loading = false;

  constructor(
    private spatialFilterService: SpatialFilterService,
    private dataSourceService: DataSourceService,
    private layerService: LayerService,
    private mapState: MapState,
    private messageService: MessageService,
    private languageService: LanguageService
  ) {}

  getOutputType(event: SpatialFilterType) {
    this.type = event;
    this.queryType = undefined;
    this.radius = undefined;
  }

  getOutputQueryType(event: SpatialFilterQueryType) {
    this.queryType = event;
    if (this.queryType) {
      this.loadFilterList();
    }
  }

  private loadFilterList() {
    this.spatialFilterService.loadFilterList(this.queryType)
      .subscribe((features: Feature[]) => {
        features.sort(function(a, b){
          if(a.properties.nom < b.properties.nom) { return -1; }
          if(a.properties.nom > b.properties.nom) { return 1; }
          return 0;
        });
        this.spatialListStore.clear();
        this.spatialListStore.load(features);
      });
  }

  getOutputToggleSearch() {
    this.loadThematics();
  }

  getOutputClearSearch() {
    this.clearSearch = !this.clearSearch;
  }

  private loadThematics() {
    this.loading = true;
    this.tryAddFeaturesToMap([this.zone]);
    if (!this.thematics) {
      const theme: SpatialFilterThematic = {
        name: ''
      }
      this.thematics = [theme];
    }
    if (this.type === SpatialFilterType.Polygon) {
      this.radius = undefined;
    }
    this.thematics.forEach(thematic => {
      this.spatialFilterService.loadFilterItem(this.zone, this.itemType, this.queryType, thematic, this.radius)
        .subscribe((features: Feature[]) => {
          this.store.insertMany(features);
          const featuresPoint: Feature[] = [];
          const featuresLinePoly: Feature[] = [];
          let idPoint;
          let idLinePoly;
          features.forEach(feature => {
            if (feature.geometry.type === 'Point') {
              featuresPoint.push(feature);
              idPoint = feature.meta.id;
            } else {
              featuresLinePoly.push(feature);
              idLinePoly = feature.meta.id;
            }
          });
          this.tryAddPointToMap(featuresPoint, idPoint);
          this.tryAddLayerToMap(featuresLinePoly, idLinePoly);
          this.loading = false;
          features.length >= 10000 ?
          this.messageService.alert(this.languageService.translate.instant('igo.geo.spatialFilter.maxSizeAlert'),
            this.languageService.translate.instant('igo.geo.spatialFilter.warning')) : undefined
        });
    });
  }

  onZoneChange(feature: Feature) {
    this.zone = feature;
    if (feature) {
      this.tryAddFeaturesToMap([feature]);
      this.zoomToFeatureExtent(feature);
    }
  }

  /**
   * Try to add zone feature to the map overlay
   */
  public tryAddFeaturesToMap(features: Feature[]) {
    let i = 1;
    for (const feature of features) {
      if (this.type === SpatialFilterType.Predefined) {
        for (const layer of this.map.layers) {
          if (layer.alias === feature.properties.code) {
            return;
          }
          if  (layer.title.startsWith('Zone')) {
            this.map.removeLayer(layer);
          }
        }
      }
      for (const layer of this.map.layers) {
        if  (layer.title.startsWith('Zone')) {
          i++;
        }
      }
      this.dataSourceService
      .createAsyncDataSource({
        type: 'vector',
        queryable: true
      } as QueryableDataSourceOptions )
        .subscribe((dataSource: DataSource) => {
          const olLayer = this.layerService.createLayer({
            title: 'Zone ' + i as string,
            alias: this.type === SpatialFilterType.Predefined ? feature.properties.code : undefined,
            source: dataSource,
            visible: true,
            style: (_feature, resolution) => {
              const coordinates = (features[0] as any).coordinates;
              return new olstyle.Style({
                image: new olstyle.Circle({
                    radius: coordinates ? this.radius / (Math.cos((Math.PI / 180) * coordinates[1])) / resolution : undefined,
                    fill: new olstyle.Fill({
                      color: 'rgba(200, 200, 20, 0.2)'
                    }),
                    stroke: new olstyle.Stroke({
                      width: 1,
                      color: 'orange'
                    })
                }),
                stroke: new olstyle.Stroke({
                  width: 1,
                  color: 'orange'
                }),
                fill: new olstyle.Fill({
                  color: 'rgba(200, 200, 20, 0.2)'
                })
              });
            }
          });
          const featuresOl = features.map(f => {
            return featureToOl(f, this.map.projection);
          });
          dataSource.ol.addFeatures(featuresOl);
          this.map.addLayer(olLayer);
          this.layers.push(olLayer);
        });
    }
  }

  /**
   * Try to point features to the map
   * Necessary to create clusters
   */
  private tryAddPointToMap(features: Feature[], id) {
    let i = 1;
    if (features.length > 1) {
      if (this.map === undefined) {
        return;
      }
      for (const layer of this.map.layers) {
        if  (layer.title.startsWith(features[0].meta.title)) {
          i++;
        }
      }
      this.dataSourceService
      .createAsyncDataSource({
        type: 'cluster',
        id,
        queryable: true,
        distance: 120,
        meta: {
          title: 'Cluster'
        }
        } as QueryableDataSourceOptions )
        .subscribe((dataSource: ClusterDataSource) => {
          const olLayer = this.layerService.createLayer({
            title: features[0].meta.title + ' ' + i as string,
            source: dataSource,
            visible: true,
            clusterParam: {clusterRange: [1, 5]}
          });
          const featuresOl = features.map(feature => {
            return featureToOl(feature, this.map.projection);
          });
          dataSource.ol.source.addFeatures(featuresOl);
          if (this.map.layers.find(layer => layer.id === olLayer.id)) {
            this.map.removeLayer(this.map.layers.find(layer => layer.id === olLayer.id));
            i = i - 1;
            olLayer.title = features[0].meta.title + ' ' + i as string;
            olLayer.options.title = olLayer.title;
          }
          this.map.addLayer(olLayer);
          this.layers.push(olLayer);
        });
    }
  }

  /**
   * Try to add line or polygon features to the map
   */
  private tryAddLayerToMap(features: Feature[], id) {
    let i = 1;
    if (features.length > 1) {
      if (this.map === undefined) {
        return;
      }
      for (const layer of this.map.layers) {
        if  (layer.title.startsWith(features[0].meta.title)) {
          i++;
        }
      }
      this.dataSourceService
      .createAsyncDataSource({
        type: 'vector',
        id,
        queryable: true
        } as QueryableDataSourceOptions )
        .subscribe((dataSource: DataSource) => {
          const olLayer = this.layerService.createLayer({
            title: features[0].meta.title + ' ' + i as string,
            source: dataSource,
            visible: true
          });
          const featuresOl = features.map(feature => {
            return featureToOl(feature, this.map.projection);
          });
          dataSource.ol.addFeatures(featuresOl);
          if (this.map.layers.find(layer => layer.id === olLayer.id)) {
            this.map.removeLayer(this.map.layers.find(layer => layer.id === olLayer.id));
            i = i - 1;
            olLayer.title = features[0].meta.title + ' ' + i as string;
            olLayer.options.title = olLayer.title;
          }
          this.map.addLayer(olLayer);
          this.layers.push(olLayer);
        });
    }
  }

  zoomToFeatureExtent(feature) {
    if (feature) {
      const olFeature = this.format.readFeature(feature, {
        dataProjection: feature.projection,
        featureProjection: this.map.projection
      });
      moveToOlFeatures(this.map, [olFeature], FeatureMotion.Zoom);
    }
  }
}
