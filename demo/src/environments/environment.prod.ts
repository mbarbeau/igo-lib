interface Environment {
  production: boolean;
  igo: any;
}

export const environment: Environment = {
  production: true,
  igo: {
    auth: {
      intern: {
        enabled: true
      }
    },
    language: {
      prefix: './locale/'
    },
    catalog: {
      sources: [
        {
          id: 'Gououvert',
          title: 'Gouvouvert',
          url: 'https://geoegl.msp.gouv.qc.ca/apis/ws/igo_gouvouvert.fcgi'
        },
        {
          id: 'DefiningInfoFormat',
          title: 'Defining info_format',
          url: 'https://ws.mapserver.transports.gouv.qc.ca/swtq',
          queryFormat: {
            html: '*',
            'application/json':  ['stations_meteoroutieres', 'histo_stations_meteoroutieres']
          },
          queryHtmlTarget: 'iframe',
          count: 30
        },
        {
          id: 'catalogwithregex',
          title: 'Filtered catalog by regex',
          url: 'https://ws.mapserver.transports.gouv.qc.ca/swtq',
          regFilters: ['zpegt']
        },
        {
          id: 'catalogwithtooltipcontrol',
          title: 'Controling tooltip format',
          url: 'https://geoegl.msp.gouv.qc.ca/apis/ws/igo_gouvouvert.fcgi',
          tooltipType: 'abstract' // or title
        }
      ]
    },
    searchSources: {
      nominatim: {
        enabled: true
      },
      reseautq: {
        searchUrl: 'https://ws.mapserver.transports.gouv.qc.ca/swtq',
        locateUrl: 'https://ws.mapserver.transports.gouv.qc.ca/swtq',
        zoomMaxOnSelect: 8,
        enabled: true
      },
      icherche: {
        searchUrl: 'https://geoegl.msp.gouv.qc.ca/icherche/geocode',
        locateUrl: 'https://geoegl.msp.gouv.qc.ca/icherche/xy',
        zoomMaxOnSelect: 10,
        enabled: true
      },
      datasource: {
        searchUrl: 'https://geoegl.msp.gouv.qc.ca/igo2/api/layers/search'
      }
    }
  }
};
