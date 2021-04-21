import olSourceVector from 'ol/source/Vector';
import olFormatEsriJSON from 'ol/format/EsriJSON';
import * as olloadingstrategy from 'ol/loadingstrategy';

import { DataSource } from './datasource';
import { Legend } from './datasource.interface';
import { ArcGISRestDataSourceOptions } from './arcgisrest-datasource.interface';

export class ArcGISRestDataSource extends DataSource {
  public ol: olSourceVector;
  public options: ArcGISRestDataSourceOptions;

  protected createOlSource(): olSourceVector {
    const esrijsonFormat = new olFormatEsriJSON();
    return new olSourceVector({
      attributions: this.options.params.attributions,
      overlaps: false,
      format: esrijsonFormat,
      url: function(extent, resolution, proj) {
        const baseUrl = this.options.url + '/' + this.options.layer + '/query/';
        const geometry = encodeURIComponent(
          '{"xmin":' +
            extent[0] +
            ',"ymin":' +
            extent[1] +
            ',"xmax":' +
            extent[2] +
            ',"ymax":' +
            extent[3] +
            ',"spatialReference":{"wkid":102100}}'
        );
        const params = [
          'f=json',
          `geometry=${geometry}`,
          'geometryType=esriGeometryEnvelope',
          'inSR=102100',
          'spatialRel=esriSpatialRelIntersects',
          'outFields=*',
          'returnGeometry=true',
          'outSR=102100'
        ];
        if (this.options.params.time) {
          const time = `time=${this.options.params.time}`;
          params.push(time);
        }
        if (this.options.params.customParams) {
          this.options.params.customParams.forEach(element => {
            params.push(element);
          });
        }
        return `${baseUrl}?${params.join('&')}`;
      }.bind(this),
      strategy: olloadingstrategy.bbox
    });
  }

  getLegend(): Legend[] {
    const legendInfo = this.options.legendInfo;
    const legend = super.getLegend();
    if (legendInfo === undefined || legend.length > 0) {
      return legend;
    }

    const id = parseInt(this.options.layer, 10);
    const lyr = legendInfo.layers.find(layer => layer.layerId === id);
    if (!lyr) {
      return;
    }
    let htmlString = '<table>';

    for (const lyrLegend of lyr.legend) {
      const modifiedUrl = this.options.url.replace(
        'FeatureServer',
        'MapServer'
      );
      const src = `${modifiedUrl}/${lyr.layerId}/images/${lyrLegend.url}`;
      const label = lyrLegend.label.replace('<Null>', 'Null');
      htmlString +=
        `<tr><td align='left'><img src="` +
        src +
        `" alt ='' /></td><td>` +
        label +
        '</td></tr>';
    }
    htmlString += '</table>';
    return [{ html: htmlString }];
  }

  public onUnwatch() {}
}
