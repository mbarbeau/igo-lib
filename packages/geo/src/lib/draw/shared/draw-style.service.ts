import { Injectable } from '@angular/core';

import * as olstyle from 'ol/style';
import OlPoint from 'ol/geom/Point';
import { transform } from 'ol/proj';
import { MapService } from '../../map/shared/map.service';

@Injectable({
    providedIn: 'root'
  })
export class DrawStyleService {

    private fillColor: string = 'rgba(255,255,255,0.4)';
    private strokeColor: string = 'rgba(51,153,204,1)';
    private drawCounter: number = 1;
    private toggleLabel = true;
    private icon;

    constructor(
      private mapService: MapService
    ) {}

    getFill(): string {
        return this.fillColor;
    }

    setFill(fillColor: string) {
        this.fillColor = fillColor;
    }

    getStroke(): string {
        return this.strokeColor;
    }

    setStroke(strokeColor: string) {
        this.strokeColor = strokeColor;
    }

    getDrawCount() {
      return this.drawCounter;
    }

    getToggleLabel() {
      return this.toggleLabel;
    }

    switchLabel() {
      this.toggleLabel = !this.toggleLabel;
    }

    raiseDrawCounter() {
      this.drawCounter = this.drawCounter + 1;
    }

    setIcon(icon: string) {
      this.icon = icon;
    }

    getIcon() {
      return this.icon;
    }

    createDrawLayerStyle(feature, resolution, label?: boolean, icon?: string): olstyle.Style {
      let style;
      let labelOffset: boolean = false;
      const proj = this.mapService.getMap().ol.getView().getProjection().getCode();
      const geom = feature.getGeometry();

      if (geom instanceof OlPoint) {
        labelOffset = !labelOffset;
      }

      if (feature.get('radius') !== undefined) {
        const coordinates = transform(feature.getGeometry().flatCoordinates, proj, 'EPSG:4326');
        style = [
          new olstyle.Style({
            text: new olstyle.Text({
              text: label ? feature.get('draw') : '',
              stroke: new olstyle.Stroke({
                color: 'white',
                width: 0.75
              }),
              fill: new olstyle.Fill({
                color: 'black'
              }),
              font: '20px sans-serif',
              overflow: true
            }),
            image: new olstyle.Circle({
              radius: feature.get('radius') /
              Math.cos((Math.PI / 180) * coordinates[1]) /
              resolution,
              stroke: new olstyle.Stroke({
                color: this.strokeColor
              }),
              fill: new olstyle.Fill({
                color: this.fillColor
              })
            })
          })
        ];
        return style;
      } else if (icon) {
        style = [
          new olstyle.Style({
            text: new olstyle.Text({
              text: label ? feature.get('draw') : '',
              offsetY: -26,
              stroke: new olstyle.Stroke({
                color: 'white',
                width: 0.75
              }),
              fill: new olstyle.Fill({
                color: 'black'
              }),
              font: '20px sans-serif',
              overflow: true
            }),
            stroke: new olstyle.Stroke({
              color: this.strokeColor,
              width: 2
            }),
            fill:  new olstyle.Fill({
              color: this.fillColor
            }),
            image: new olstyle.Icon({
              src: icon
            })
          })
        ];
        return style;
      } else {
        style = [
          new olstyle.Style({
            text: new olstyle.Text({
              text: label ? feature.get('draw') : '',
              stroke: new olstyle.Stroke({
                color: 'white',
                width: 0.75
              }),
              fill: new olstyle.Fill({
                color: 'black'
              }),
              font: '20px sans-serif',
              overflow: true,
              offsetY: labelOffset ? -15 : 0
            }),
            stroke: new olstyle.Stroke({
              color: this.strokeColor,
              width: 2
            }),
            fill:  new olstyle.Fill({
              color: this.fillColor
            }),
            image: new olstyle.Circle({
              radius: 5,
              stroke: new olstyle.Stroke({
                color: this.strokeColor
              }),
              fill: new olstyle.Fill({
                color: this.fillColor
              })
            })
          })
        ];
        return style;
      }
    }
}
