import { Component } from '@angular/core';

import { LanguageService } from '@igo2/core';
import { IgoMap, LayerService } from '@igo2/geo';

@Component({
  selector: 'app-print',
  templateUrl: './print.component.html',
  styleUrls: ['./print.component.scss']
})
export class AppPrintComponent {
  public map = new IgoMap({
    controls: {
      attribution: {
        collapsed: false
      }
    }
  });

  public view = {
    center: [-73, 47.2],
    zoom: 9
  };

  constructor(
    private languageService: LanguageService,
    private layerService: LayerService
  ) {
    this.layerService
      .createAsyncLayer({
        title: 'Quebec Base Map',
        sourceOptions: {
          type: 'wmts',
          url: 'https://geoegl.msp.gouv.qc.ca/apis/carto/wmts/1.0.0/wmts',
          layer: 'carte_gouv_qc_ro',
          matrixSet: 'EPSG_3857',
          version: '1.3.0',
          crossOrigin: 'anonymous',
          attributions: "© <a href='http://www.droitauteur.gouv.qc.ca/copyright.php' target='_blank'><img src='https://geoegl.msp.gouv.qc.ca/gouvouvert/public/images/quebec/gouv_qc_logo.png' width='64' height='14'>Gouvernement du Québec</a> / <a href='https://www.igouverte.org/' target='_blank'>IGO2</a>"
        }
      })
      .subscribe(l => this.map.addLayer(l));

    this.layerService
      .createAsyncLayer({
        title: 'School board',
        sourceOptions: {
          type: 'wms',
          url: 'https://geoegl.msp.gouv.qc.ca/apis/ws/igo_gouvouvert.fcgi',
          params: {
            LAYERS: 'MELS_CS_ANGLO_S',
            VERSION: '1.3.0'
          },
          crossOrigin: 'anonymous'
        }
      })
      .subscribe(l => this.map.addLayer(l));
    //
    this.layerService
      .createAsyncLayer({
        title: 'Embacle',
        sourceOptions: {
          type: 'wms',
          url: 'https://geoegl.msp.gouv.qc.ca/apis/ws/igo_gouvouvert.fcgi',
          params: {
            LAYERS: 'vg_observation_v_inondation_embacle_wmst',
            VERSION: '1.3.0'
          },
          crossOrigin: 'anonymous'
        }
      })
      .subscribe(l => this.map.addLayer(l));

    // this.layerService
    //   .createAsyncLayer({
    //     title: 'Geomet',
    //     sourceOptions: {
    //       type: 'wms',
    //       url: 'http://geo.weather.gc.ca/geomet/?lang=fr',
    //       params: {
    //         LAYERS: 'RADAR_1KM_RDBR',
    //         VERSION: '1.3.0'
    //       },
    //       crossOrigin: 'anonymous'
    //     }
    //   })
    //   .subscribe(l => this.map.addLayer(l));

    /*
        //CORS error if activate (for test)
        this.layerService
          .createAsyncLayer({
            title: 'Geomet',
            sourceOptions: {
              type: 'wms',
              url: 'https://geoegl.msp.gouv.qc.ca/apis/ws/swtq?service=wms',
              params: {
                layers: 'swtq',
                version: '1.3.0',
              }
            }
          })
          .subscribe(l => this.map.addLayer(l));
    */
  }
}
