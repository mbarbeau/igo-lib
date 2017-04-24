import { Component, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

import { IgoMap, Tool, QueryFormat,
         OverlayService, ContextService,
         Feature, FeatureService,
         WMSLayerOptions, LanguageService } from '../../lib';

@Component({
  selector: 'igo-demo',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.styl']
})
export class AppComponent implements OnInit {

  public searchTerm: string;
  public feature$ = new BehaviorSubject<Feature>(undefined);

  public map = new IgoMap();

  constructor(public contextService: ContextService,
              public featureService: FeatureService,
              public overlayService: OverlayService,
              public language: LanguageService) {}

  ngOnInit() {
    const projection = 'EPSG:3857';

    this.contextService.setContext({
      uri: 'qc911',
      title: 'Qc-911',
      map: {
        view: {
          projection: projection,
          center: [-72, 52],
          zoom: 6
        }
      },
      layers: [
        {
          type: 'osm',
          title: 'OSM'
        },
        {
          title: 'MSP DESSERTE MUN 911',
          type: 'wms',
          source: {
            url: '/cgi-wms/igo_gouvouvert.fcgi',
            params: {
              layers: 'MSP_DESSERTE_MUN_911',
              version: '1.3.0'
            },
            projection: projection
          },
          queryFormat: QueryFormat.GML2,
          queryTitle: 'Municipalite'
        } as WMSLayerOptions,
        {
          title: 'Embâcle',
          type: 'wms',
          source: {
            url: 'http://geoegl.msp.gouv.qc.ca/cgi-wms/igo_gouvouvert.fcgi',
            params: {
              layers: 'vg_observation_v_inondation_embacle_wmst',
              version: '1.3.0'
            },
            projection: projection
          },
          timeFilter: {
            min: '2017-01-01',
            max: '2018-01-01',
            type: 'date',
            range: true
          }
        } as WMSLayerOptions
      ],
      toolbar: [
        'featureList',
        'layerList',
        'timeFilter'
      ],
      tools: [
        {
          name: 'featureList'
        },
        {
          name: 'layerList'
        },
        {
          name: 'timeFilter'
        }
      ]
    });
  }

  handleSearch(term: string) {
    this.searchTerm = term;
  }

  handleFeatureFocus(feature: Feature) {
    this.feature$.next(feature);
    this.overlayService.setFeatures([feature], 'move');
  }

  handleFeatureSelect(feature: Feature) {
    this.feature$.next(feature);
    this.overlayService.setFeatures([feature], 'zoom');
  }

  handleToolSelect(tool: Tool) {
    alert(`Tool '${tool.name}' selected!`);
  }
}
