import { Component } from '@angular/core';

import { LanguageService } from '@igo2/core';
import {
  IgoMap,
  DataSourceService,
  LayerService,
  WMSDataSourceOptions,
  WFSDataSourceOptions,
  WFSDataSourceOptionsParams,
  OgcFilterableDataSourceOptions,
  AnyBaseOgcFilterOptions,
  OgcFilterOperatorType,
  OgcFilterDuringOptions
} from '@igo2/geo';

@Component({
  selector: 'app-ogc-filter',
  templateUrl: './ogc-filter.component.html',
  styleUrls: ['./ogc-filter.component.scss']
})
export class AppOgcFilterComponent {
  public map = new IgoMap({
    controls: {
      attribution: {
        collapsed: true
      }
    }
  });

  public view = {
    center: [-73, 47.2],
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
            source: dataSource
          })
        );
      });

    interface WFSoptions
      extends WFSDataSourceOptions,
        OgcFilterableDataSourceOptions {}

    const datasource: WFSoptions = {
      type: 'wfs',
      url: 'https://geoegl.msp.gouv.qc.ca/apis/ws/igo_gouvouvert.fcgi',
      params: {
        featureTypes: 'vg_observation_v_autre_wmst',
        fieldNameGeometry: 'geometry',
        maxFeatures: 10000,
        version: '2.0.0',
        outputFormat: undefined,
        outputFormatDownload: 'SHP' // based on service capabilities
      },
      sourceFields: [
        { name: 'code_municipalite', alias: '# de la municipalitée' },
        { name: 'date_observation', excludeFromOgcFilters: true },
        { name: 'urgence', values: ['immédiate', 'inconnue'] }
      ],
      ogcFilters: {
        enabled: true,
        editable: true,
        allowedOperatorsType: OgcFilterOperatorType.All,
        filters: {
          logical: 'Or',
          filters: [
            {
              operator: 'PropertyIsEqualTo',
              propertyName: 'code_municipalite',
              expression: '10043'
            },
            {
              operator: 'Intersects',
              geometryName: 'the_geom',
              wkt_geometry: `MULTIPOLYGON(((
              -8379441.158019895 5844447.897707146,
              -8379441.158019895 5936172.331649357,
              -8134842.66750733 5936172.331649357,
              -8134842.66750733 5844447.897707146,
              -8379441.158019895 5844447.897707146
            ), (
              -8015003 5942074,
              -8015003 5780349,
              -7792364 5780349,
              -7792364 5942074,
              -8015003 5942074
            )))`
            }
          ] as AnyBaseOgcFilterOptions[]
        }
      }
    };

    this.dataSourceService
      .createAsyncDataSource(datasource)
      .subscribe(dataSource => {
        this.map.addLayer(
          this.layerService.createLayer({
            title: 'Embâcle (PropertyIsEqualTo OR Intersects)',
            source: dataSource,
            style: {
              circle : {
                radius: 5,
                fill: {
                  color: 'white'
                },
                stroke: {
                  color: 'orange',
                  width: 1
                }
              }
            }
          })
        );
      });

    const datasourceDuringFilter: WFSoptions = {
      type: 'wfs',
      url: 'https://geoegl.msp.gouv.qc.ca/apis/ws/igo_gouvouvert.fcgi',
      params: {
        featureTypes: 'vg_observation_v_autre_wmst',
        fieldNameGeometry: 'geometry',
        maxFeatures: 10000,
        version: '2.0.0',
        outputFormat: undefined,
        outputFormatDownload: 'SHP' // based on service capabilities
      },
      ogcFilters: {
        enabled: true,
        editable: true,
        allowedOperatorsType: OgcFilterOperatorType.All,
        filters:
          {
            operator: 'During',
            propertyName: 'date_observation',
            begin: '2016-01-21T00:00:00-05:00',
            end: '2016-01-26T00:00:00-05:00'
          } as OgcFilterDuringOptions
      },
      minDate: '2016-01-01T00:00:00-05:00',
      maxDate: '2016-02-10T00:00:00-05:00',
      stepDate: 'P2D'
    };

    this.dataSourceService
      .createAsyncDataSource(datasourceDuringFilter)
      .subscribe(dataSource => {
        this.map.addLayer(
          this.layerService.createLayer({
            title: 'Embâcle (During, Step: P2D)',
            id: '1',
            source: dataSource,
            style: {
              circle: {
                radius: 5,
                fill: {
                  color: 'white'
                },
                stroke: {
                  color: 'red',
                  width: 1
                }
              }
            }
          })
        );
      });


    const datasourceDuringFilterTime: WFSoptions = {
      type: 'wfs',
      url: 'https://geoegl.msp.gouv.qc.ca/apis/ws/igo_gouvouvert.fcgi',
      params: {
        featureTypes: 'vg_observation_v_autre_wmst',
        fieldNameGeometry: 'geometry',
        maxFeatures: 10000,
        version: '2.0.0',
        outputFormat: undefined,
        outputFormatDownload: 'SHP' // based on service capabilities
      },
      sourceFields: [
        { name: 'date_observation', alias: 'Date de l\'observation', allowedOperatorsType: 'Time' as OgcFilterOperatorType }
      ],
      ogcFilters: {
        enabled: true,
        editable: true,
        allowedOperatorsType: OgcFilterOperatorType.All,
        filters:
          {
            operator: 'During',
            propertyName: 'date_observation',
            begin: '2016-01-01T04:00:00-05:00',
            end: '2016-01-12T16:00:00-05:00'
          } as OgcFilterDuringOptions
      },
      minDate: '2016-01-01T00:00:00-05:00',
      maxDate: '2016-02-14T20:00:00-05:00',
      stepDate: 'PT4H'
    };

    this.dataSourceService
      .createAsyncDataSource(datasourceDuringFilterTime)
      .subscribe(dataSource => {
        this.map.addLayer(
          this.layerService.createLayer({
            title: 'Embâcle (During, Step: PT4H)',
            id: '2',
            source: dataSource,
            style: {
              circle: {
                radius: 5,
                fill: {
                  color: 'white'
                },
                stroke: {
                  color: 'blue',
                  width: 1
                }
              }
            }
          })
        );
      });

    const datasourceDuringFilterTimeMonth: WFSoptions = {
      type: 'wfs',
      url: 'https://geoegl.msp.gouv.qc.ca/apis/ws/igo_gouvouvert.fcgi',
      params: {
        featureTypes: 'vg_observation_v_autre_wmst',
        fieldNameGeometry: 'geometry',
        maxFeatures: 10000,
        version: '2.0.0',
        outputFormat: undefined,
        outputFormatDownload: 'SHP' // based on service capabilities
      },
      sourceFields: [
        { name: 'date_observation', alias: 'Date de l\'observation', allowedOperatorsType: 'Time' as OgcFilterOperatorType }
      ],
      ogcFilters: {
        enabled: true,
        editable: true,
        allowedOperatorsType: OgcFilterOperatorType.All,
        filters:
          {
            operator: 'During',
            propertyName: 'date_observation',
            begin: '2016-01-01T00:00:00-05:00',
            end: '2016-03-31T00:00:00-05:00',
            displayFormat: 'MMMM'
          } as OgcFilterDuringOptions
      },
      minDate: '2016-01-01T00:00:00-05:00',
      maxDate: '2018-12-31T00:00:00-05:00',
      stepDate: 'P1M'
    };

    this.dataSourceService
      .createAsyncDataSource(datasourceDuringFilterTimeMonth)
      .subscribe(dataSource => {
        this.map.addLayer(
          this.layerService.createLayer({
            title: 'Embâcle (During, Step: P1M)',
            id: '3',
            source: dataSource,
            style: {
              circle: {
                radius: 5,
                fill: {
                  color: 'white'
                },
                stroke: {
                  color: 'yellow',
                  width: 1
                }
              }
            }
          })
        );
      });

    const datasourceDuringFilterTimeYear: WFSoptions = {
      type: 'wfs',
      url: 'https://geoegl.msp.gouv.qc.ca/apis/ws/igo_gouvouvert.fcgi',
      params: {
        featureTypes: 'vg_observation_v_autre_wmst',
        fieldNameGeometry: 'geometry',
        maxFeatures: 10000,
        version: '2.0.0',
        outputFormat: undefined,
        outputFormatDownload: 'SHP' // based on service capabilities
      },
      sourceFields: [
        { name: 'date_observation', alias: 'Date de l\'observation', allowedOperatorsType: 'Time' as OgcFilterOperatorType }
      ],
      ogcFilters: {
        enabled: true,
        editable: true,
        allowedOperatorsType: OgcFilterOperatorType.All,
        filters:
          {
            operator: 'During',
            propertyName: 'date_observation',
            begin: '2014-01-01T00:00:00-05:00',
            end: '2019-12-31T00:00:00-05:00',
            sliderOptions: {
              interval: 2000,
              displayFormat: 'YY'
            },
            displayFormat: 'YYYY'
          } as OgcFilterDuringOptions
      },
      minDate: '2014-01-01T00:00:00-05:00',
      maxDate: '2019-12-31T00:00:00-05:00',
      stepDate: 'P1Y'
    };

    this.dataSourceService
      .createAsyncDataSource(datasourceDuringFilterTimeYear)
      .subscribe(dataSource => {
        this.map.addLayer(
          this.layerService.createLayer({
            title: 'Embâcle (During, Step: P1Y)',
            id: '4',
            source: dataSource,
            style: {
              circle: {
                radius: 5,
                fill: {
                  color: 'white'
                },
                stroke: {
                  color: 'green',
                  width: 1
                }
              }
            }
          })
        );
      });

    const datasourceDuringFilterTimeInterval: WFSoptions = {
      type: 'wfs',
      url: 'https://geoegl.msp.gouv.qc.ca/apis/ws/igo_gouvouvert.fcgi',
      params: {
        featureTypes: 'vg_observation_v_autre_wmst',
        fieldNameGeometry: 'geometry',
        maxFeatures: 10000,
        version: '2.0.0',
        outputFormat: undefined,
        outputFormatDownload: 'SHP' // based on service capabilities
      },
      sourceFields: [
        { name: 'date_observation', alias: 'Date de l\'observation', allowedOperatorsType: 'Time' as OgcFilterOperatorType }
      ],
      ogcFilters: {
        enabled: true,
        editable: true,
        allowedOperatorsType: OgcFilterOperatorType.All,
        filters:
          {
            operator: 'During',
            propertyName: 'date_observation',
            begin: 'today - 2 days', // "now" can also be used. Instead of midnight, the current time will be used
            end: 'today', // "now" can also be used. Instead of midnight, the current time will be used
          } as OgcFilterDuringOptions
      },
      minDate: '2016-01-01T00:00:00-05:00',
      maxDate: '2025-12-31T00:00:00-05:00',
      stepDate: 'P1D'
    };

    this.dataSourceService
      .createAsyncDataSource(datasourceDuringFilterTimeInterval)
      .subscribe(dataSource => {
        this.map.addLayer(
          this.layerService.createLayer({
            title: 'Embâcle (During, Interval from Now, Step: P1D)',
            id: '5',
            source: dataSource,
            style: {
              circle: {
                radius: 5,
                fill: {
                  color: 'white'
                },
                stroke: {
                  color: 'black',
                  width: 1
                }
              }
            }
          })
        );
      });

    const datasourceDuringFilterTimeRestrictedToStep: WFSoptions = {
      type: 'wfs',
      url: 'https://geoegl.msp.gouv.qc.ca/apis/ws/igo_gouvouvert.fcgi',
      params: {
        featureTypes: 'vg_observation_v_autre_wmst',
        fieldNameGeometry: 'geometry',
        maxFeatures: 10000,
        version: '2.0.0',
        outputFormat: undefined,
        outputFormatDownload: 'SHP' // based on service capabilities
      },
      sourceFields: [
        { name: 'date_observation', alias: 'Date de l\'observation', allowedOperatorsType: 'Time' as OgcFilterOperatorType }
      ],
      ogcFilters: {
        enabled: true,
        editable: true,
        allowedOperatorsType: OgcFilterOperatorType.All,
        filters:
          {
            operator: 'During',
            propertyName: 'date_observation',
            begin: '2019-01-01 00:00:00',
            restrictToStep: true
          } as OgcFilterDuringOptions
      },
      minDate: '2016-01-01T00:00:00-05:00',
      maxDate: '2025-12-31T00:00:00-05:00',
      stepDate: 'P1M'
    };

    this.dataSourceService
      .createAsyncDataSource(datasourceDuringFilterTimeRestrictedToStep)
      .subscribe(dataSource => {
        this.map.addLayer(
          this.layerService.createLayer({
            title: 'Embâcle (During, RestrictToStep, Step: P1M)',
            id: '6',
            source: dataSource,
            style: {
              circle: {
                radius: 5,
                fill: {
                  color: 'black'
                },
                stroke: {
                  color: 'red',
                  width: 1
                }
              }
            }
          })
        );
      });

    const wmsOgcFilterOptions: WMSoptions = {
        type: 'wms',
        url: 'https://geoegl.msp.gouv.qc.ca/apis/ws/igo_gouvouvert.fcgi',
        optionsFromCapabilities: true,
        params: {
          LAYERS: 'vg_observation_v_inondation23avril2017_wmst',
          VERSION: '1.3.0'
        },
        sourceFields: [
          { name: 'date_observation', alias: 'Date de l\'observation', allowedOperatorsType: 'Time' as OgcFilterOperatorType }
        ],
        ogcFilters: {
          enabled: true,
          editable: true,
          filters:
          {
            operator: 'During',
            propertyName: 'date_observation'
          } as OgcFilterDuringOptions,
          allowedOperatorsType: OgcFilterOperatorType.Time
        }
    };

    this.dataSourceService
      .createAsyncDataSource(wmsOgcFilterOptions)
      .subscribe(dataSource => {
        this.map.addLayer(
          this.layerService.createLayer({
            title: 'Inondation (During, optionsFromCapabilities)',
            source: dataSource
          })
        );
      });

    interface WMSoptions
      extends WMSDataSourceOptions,
        OgcFilterableDataSourceOptions {}

    const filterableWMSwithPushButtons: WMSoptions = {
      type: 'wms',
      url: 'https://geoegl.msp.gouv.qc.ca/apis/ws/swtq',
      urlWfs: 'https://geoegl.msp.gouv.qc.ca/apis/ws/swtq',
      params: {
        LAYERS: 'radars_photos',
        VERSION: '1.3.0'
      },
      ogcFilters: {
        enabled: true,
        editable: true,
        pushButtons: {
          selectorType: 'pushButton',
          order: 2,
          groups : [
            {title: 'Nom du group1 - push', name: '1 - push', ids : ['id1']},
          ],
          bundles: [
            {
              id: 'id1',
              title: 'Régions',
              logical: 'Or',
              vertical: true,
              selectors: [
                {
                  title: 'Montréal & Laval',
                  enabled: false,
                  tooltip: 'Here a tooltip explaning ...',
                  filters: {
                    logical: 'Or',
                    filters: [
                      {
                        operator: 'PropertyIsEqualTo',
                        propertyName: 'region',
                        expression: 'Montréal'
                      },
                      {
                        operator: 'PropertyIsEqualTo',
                        propertyName: 'region',
                        expression: 'Laval'
                      }
                    ]
                  }
                },
                {
                  title: 'Outside Montréal & Laval',
                  enabled: false,
                  tooltip: 'Here a tooltip explaning ...',
                  filters: {
                    logical: 'And',
                    filters: [
                      {
                        operator: 'PropertyIsNotEqualTo',
                        propertyName: 'region',
                        expression: 'Montréal'
                      },
                      {
                        operator: 'PropertyIsNotEqualTo',
                        propertyName: 'region',
                        expression: 'Laval'
                      }
                    ]
                  }
                }
              ]
            }
          ]
        },
        checkboxes: {
          selectorType: 'checkbox',
          order: 1,
          groups : [
            {title: 'Nom du group1 - checkbox', name: '1 - checkbox', ids : ['id1']},
          ],
          bundles: [
            {
              id: 'id1',
              title: 'Type de radar photo',
              logical: 'Or',
              selectors: [
                {
                  title: 'Radar photo fixe',
                  enabled: true,
                  tooltip: 'Here a tooltip explaning ...',
                  filters: {
                    operator: 'PropertyIsEqualTo',
                    propertyName: 'typeAppareil',
                    expression: 'Radar photo fixe'
                  }
                },
                {
                  title: 'Radar photo mobile',
                  enabled: false,
                  tooltip: 'Here a tooltip explaning ...',
                  filters: {
                    operator: 'PropertyIsEqualTo',
                    propertyName: 'typeAppareil',
                    expression: 'Radar photo mobile'
                  }
                },
                {
                  title: 'Radar photo fixe + feu rouge',
                  enabled: false,
                  color: '0,200,0',
                  tooltip: 'Here a tooltip explaning ...',
                  filters: {
                    operator: 'PropertyIsEqualTo',
                    propertyName: 'typeAppareil',
                    expression: 'Radar photo fixe et surveillance au feu rouge'
                  }
                },
                {
                  title: 'Radar feu rouge',
                  enabled: false,
                  color: '255,0,0',
                  tooltip: 'Here a tooltip explaning ...',
                  filters: {
                    operator: 'PropertyIsEqualTo',
                    propertyName: 'typeAppareil',
                    expression: 'Appareil de surveillance au feu rouge'
                  }
                }
              ]
            }
          ]
        },
        allowedOperatorsType: OgcFilterOperatorType.Basic
        },
      paramsWFS: {
        featureTypes: 'radars_photos',
        fieldNameGeometry: 'geometry',
        maxFeatures: 10000,
        version: '1.1.0',
        outputFormat: 'geojson',
        outputFormatDownload: 'shp'
      } as WFSDataSourceOptionsParams
    };

    this.dataSourceService
      .createAsyncDataSource(filterableWMSwithPushButtons)
      .subscribe(dataSource => {
        this.map.addLayer(
          this.layerService.createLayer({
            title: 'Filterable WMS layers with predefined filters (push buttons)',
            source: dataSource
          })
        );
      });

    // const datasourceWmsWith2Layers: WMSoptions = {
    //   type: 'wms',
    //   url: 'https://geoegl.msp.gouv.qc.ca/apis/ws/swtq',
    //   urlWfs: 'https://geoegl.msp.gouv.qc.ca/apis/ws/swtq',
    //   params: {
    //     layers: 'stations_meteoroutieres,histo_stations_meteoroutieres',
    //     version: '1.3.0'
    //   },
    //   ogcFilters: {
    //     enabled: true,
    //     editable: true
    //   },
    //   paramsWFS: {
    //     featureTypes: 'histo_stations_meteoroutieres',
    //     fieldNameGeometry: 'geometry',
    //     maxFeatures: 10000,
    //     version: '1.1.0',
    //     outputFormat: 'geojson',
    //     outputFormatDownload: 'shp'
    //   } as WFSDataSourceOptionsParams
    // };
    //
    // this.dataSourceService
    //   .createAsyncDataSource(datasourceWmsWith2Layers)
    //   .subscribe(dataSource => {
    //     this.map.addLayer(
    //       this.layerService.createLayer({
    //         title: 'Layer build from 2 WMS layers',
    //         source: dataSource
    //       })
    //     );
    //   });

    // const datasourceWms: WMSoptions = {
    //   type: 'wms',
    //   url: '/geoserver/wms',
    //   urlWfs: '/geoserver/wfs',
    //   params: {
    //     LAYERS: 'water_areas',
    //     VERSION: '1.3.0'
    //   },
    //   ogcFilters: {
    //     enabled: true,
    //     editable: true,
    //     filters: {
    //       operator: 'PropertyIsEqualTo',
    //       propertyName: 'waterway',
    //       expression: 'riverbank'
    //     }
    //   },
    //   sourceFields: [
    //     { name: 'waterway', alias: 'Chemin d eau' },
    //     { name: 'osm_id' },
    //     { name: 'landuse', values: ['yes', 'no'] }
    //   ],
    //   paramsWFS: {
    //     featureTypes: 'water_areas',
    //     fieldNameGeometry: 'the_geom',
    //     maxFeatures: 10000,
    //     version: '1.1.0',
    //     outputFormat: 'application/json',
    //     outputFormatDownload: 'application/vnd.google-earth.kml+xml'
    //   } as WFSDataSourceOptionsParams
    // };
    //
    // this.dataSourceService
    //   .createAsyncDataSource(datasourceWms)
    //   .subscribe(dataSource => {
    //     this.map.addLayer(
    //       this.layerService.createLayer({
    //         title: 'Geoserver water_areas',
    //         source: dataSource
    //       })
    //     );
    //   });
  }
}
