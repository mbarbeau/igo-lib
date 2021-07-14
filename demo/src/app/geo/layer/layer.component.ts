import { Component } from '@angular/core';

import { LanguageService } from '@igo2/core';
import {
  IgoMap,
  DataSourceService,
  LayerService,
  WMSDataSourceOptions,
  LayerOptions,
  WFSDataSourceOptions,
  OgcFilterableDataSourceOptions,
  MetadataLayerOptions
} from '@igo2/geo';

@Component({
  selector: 'app-layer',
  templateUrl: './layer.component.html',
  styleUrls: ['./layer.component.scss']
})
export class AppLayerComponent {
  public map = new IgoMap({
    controls: {
      attribution: {
        collapsed: true
      }
    }
  });

  public view = {
    center: [-73, 47.2],
    maxLayerZoomExtent: [-11000000, 4500000, -4500000, 10000000],
    zoom: 7
  };

  constructor(
    private languageService: LanguageService,
    private dataSourceService: DataSourceService,
    private layerService: LayerService
  ) {
    this.dataSourceService
      .createAsyncDataSource({
        type: 'osm'
      })
      .subscribe(dataSource => {
        this.map.addLayer(
          this.layerService.createLayer({
            title: 'OSM',
            visible: true,
            baseLayer: true,
            source: dataSource
          })
        );
      });

    interface WFSoptions
      extends WFSDataSourceOptions,
        OgcFilterableDataSourceOptions {}

    const wfsDatasource: WFSoptions = {
      type: 'wfs',
      url: 'https://geoegl.msp.gouv.qc.ca/apis/ws/igo_gouvouvert.fcgi',
      params: {
        featureTypes: 'vg_observation_v_autre_wmst',
        fieldNameGeometry: 'geometry',
        maxFeatures: 10000,
        version: '2.0.0',
        outputFormat: undefined,
        outputFormatDownload: 'shp'
      },
      ogcFilters: {
        enabled: true,
        editable: true,
        filters: {
          operator: 'PropertyIsEqualTo',
          propertyName: 'code_municipalite',
          expression: '10043'
        }
      }
    };

    this.dataSourceService
      .createAsyncDataSource(wfsDatasource)
      .subscribe(dataSource => {
        const layer: LayerOptions = {
          title: 'WFS ',
          visible: true,
          source: dataSource
        };
        this.map.addLayer(this.layerService.createLayer(layer));
      });

    const wfsDatasourceCustomEPSG: WFSoptions = {
      type: 'wfs',
      url: 'https://geoegl.msp.gouv.qc.ca/apis/ws/igo_gouvouvert.fcgi',
      params: {
        featureTypes: 'vg_observation_v_autre_wmst',
        fieldNameGeometry: 'geometry',
        maxFeatures: 10000,
        version: '2.0.0',
        outputFormat: 'geojson_utf8',
        srsName: 'EPSG:32198',
        outputFormatDownload: 'shp'
      },
      ogcFilters: {
        enabled: true,
        editable: true,
        filters: {
          operator: 'PropertyIsEqualTo',
          propertyName: 'code_municipalite',
          expression: '12072'
        }
      },
      formatOptions: {
        dataProjection: 'EPSG:32198'
      }
    };

    this.dataSourceService
      .createAsyncDataSource(wfsDatasourceCustomEPSG)
      .subscribe(dataSource => {
        const layer: LayerOptions = {
          title: 'WFS (Custom EPSG)',
          visible: true,
          source: dataSource,
          removable: false
        };
        this.map.addLayer(this.layerService.createLayer(layer));
      });

    this.layerService
      .createAsyncLayer({
        sourceOptions: {
          type: 'wms',
          url: 'https://geoegl.msp.gouv.qc.ca/apis/ws/igo_gouvouvert.fcgi',
          optionsFromCapabilities: true,
          params: {
            LAYERS: 'MELS_CS_ANGLO_S',
            VERSION: '1.3.0'
          }
        }
      })
      .subscribe(l => this.map.addLayer(l));

    this.layerService
      .createAsyncLayer({
        title: 'Réseau routier',
        visible: false,
        sourceOptions: {
          type: 'wms',
          url: 'https://geoegl.msp.gouv.qc.ca/apis/ws/swtq',
          params: {
            LAYERS: 'bgr_v_sous_route_res_sup_act',
            VERSION: '1.3.0'
          }
        }
      })
      .subscribe(l => this.map.addLayer(l));

    this.layerService
      .createAsyncLayer({
        title: 'lieu habité',
        visible: false,
        sourceOptions: {
          type: 'wms',
          url: 'https://geoegl.msp.gouv.qc.ca/apis/ws/swtq',
          optionsFromCapabilities: true,
          params: {
            LAYERS: 'lieuhabite',
            VERSION: '1.3.0'
          }
        }
      })
      .subscribe(l => this.map.addLayer(l));

    this.layerService
      .createAsyncLayer({
        title: 'sh_dis_eco',
        visible: false,
        sourceOptions: {
          type: 'wms',
          url: 'https://geoegl.msp.gouv.qc.ca/apis/ws/mffpecofor.fcgi',
          optionsFromCapabilities: true,
          params: {
            LAYERS: 'sh_dis_eco',
            VERSION: '1.3.0'
          }
        }
      })
      .subscribe(l => this.map.addLayer(l));

    this.layerService
      .createAsyncLayer({
        title: 'nurc:Arc_Sample_Parent',
        visible: false,
        legendOptions: {
          // collapsed: false,
          display: true,
          // url: 'https://v.seloger.com/s/width/1144/visuels/0/m/l/4/0ml42xbt1n3itaboek3qec5dtskdgw6nlscu7j69k.jpg',
          stylesAvailable: [
            { name: 'rain', title: 'Pluie' },
            { name: 'raster', title: 'Défaut' }
          ] //
        },
        sourceOptions: {
          type: 'wms',
          url: 'https://demo.geo-solutions.it/geoserver/ows',
          optionsFromCapabilities: true,
          params: {
            LAYERS: 'nurc:Arc_Sample', // , test:Linea_costa
            VERSION: '1.3.0'
          }
        }
      })
      .subscribe(l => this.map.addLayer(l));

    this.layerService
      .createAsyncLayer({
        title: 'Avertissements routier',
        visible: false,
        sourceOptions: {
          type: 'wms',
          url: 'https://geoegl.msp.gouv.qc.ca/apis/ws/swtq',
          params: {
            LAYERS: 'evenements',
            VERSION: '1.3.0'
          }
        }
      })
      .subscribe(l => this.map.addLayer(l));

    const datasource: WMSDataSourceOptions = {
      type: 'wms',
      url: 'https://geoegl.msp.gouv.qc.ca/apis/ws/igo_gouvouvert.fcgi',
      refreshIntervalSec: 15,
      params: {
        LAYERS: 'vg_observation_v_inondation_embacle_wmst',
        VERSION: '1.3.0'
      }
    };

    interface LayerOptionsWithMetadata
      extends LayerOptions,
        MetadataLayerOptions {}

    this.dataSourceService
      .createAsyncDataSource(datasource)
      .subscribe(dataSource => {
        const layer: LayerOptionsWithMetadata = {
          title: 'Embâcle',
          source: dataSource,
          metadata: {
            url:
              'https://www.donneesquebec.ca/recherche/fr/dataset/historique-publique-d-embacles-repertories-au-msp',
            extern: true
          }
        };
        this.map.addLayer(this.layerService.createLayer(layer));
      });
  }
}
