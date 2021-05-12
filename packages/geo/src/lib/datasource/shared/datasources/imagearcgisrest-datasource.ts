import ImageArcGISRest from 'ol/source/ImageArcGISRest';

import { DataSource } from './datasource';
import { Legend } from './datasource.interface';
import { ArcGISRestImageDataSourceOptions } from './imagearcgisrest-datasource.interface';
import { QueryHtmlTarget } from '../../../query/shared/query.enums';
export class ImageArcGISRestDataSource extends DataSource {
  public ol: ImageArcGISRest;
  public options: ArcGISRestImageDataSourceOptions;

  get params(): any {
    return this.options.params as any;
  }

  get queryTitle(): string {
    return (this.options as any).queryTitle
      ? (this.options as any).queryTitle
      : 'title';
  }

  get mapLabel(): string {
    return (this.options as any).mapLabel;
  }

  get queryHtmlTarget(): string {
    return (this.options as any).queryHtmlTarget
      ? (this.options as any).queryHtmlTarget
      : QueryHtmlTarget.BLANK;
  }

  protected createOlSource(): ImageArcGISRest {
    const params = this.options.layer === undefined ? this.options.params : Object.assign(
      {LAYERS: `show:${this.options.layer}`},
      this.options.params
    );

    if (typeof params.renderingRule === 'object') {
      params.renderingRule = JSON.stringify(params.renderingRule);
    }

    return new ImageArcGISRest({
      ratio: 1,
      params,
      url: this.options.url
    });
  }

  getLegend(): Legend[] {
    const legendInfo = this.options.options?.legendInfo || this.params?.legendInfo;
    const legend = super.getLegend();
    if (legendInfo === undefined || this.options.layer === undefined || legend.length > 0) {
      return legend;
    }

    const id = parseInt(this.options.layer, 10);
    const lyr = legendInfo.layers.find(layer => layer.layerId === id);
    if (!lyr) {
      return;
    }
    let htmlString = '<table>';

    for (const lyrLegend of lyr.legend) {
      const src = `${this.options.url}/${lyr.layerId}/images/${
        lyrLegend.url
      }`;
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
