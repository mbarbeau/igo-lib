import { Component, OnInit } from '@angular/core';

import { ContextService, Feature, FeatureService, IgoMap,
         LanguageService, OverlayService, QueryFormat,
         ToolService, WMSLayerOptions } from '../../lib';

@Component({
  selector: 'igo-demo',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.styl']
})
export class AppComponent implements OnInit {

  public searchTerm: string;

  public map = new IgoMap();

  constructor(public contextService: ContextService,
              public featureService: FeatureService,
              public overlayService: OverlayService,
              public toolService: ToolService,
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
        'searchResults',
        'map',
        'timeFilter'
      ],
      tools: [
        {
          name: 'searchResults'
        },
        {
          name: 'map'
        },
        {
          name: 'timeAnalysis'
        }
      ]
    });
  }

  handleSearch(term: string) {
    this.searchTerm = term;
    const tool = this.toolService.getTool('searchResults');
    this.toolService.selectTool(tool);
  }

  handleFeatureFocus(feature: Feature) {
    this.overlayService.setFeatures([feature], 'move');
  }

  handleFeatureSelect(feature: Feature) {
    this.overlayService.setFeatures([feature], 'zoom');
  }

  clearFeature() {
    this.featureService.unfocusFeature();
    this.overlayService.clear();
  }
}
