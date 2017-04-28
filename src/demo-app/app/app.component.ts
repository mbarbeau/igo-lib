import { Component, OnInit } from '@angular/core';

import { ContextService, Feature, FeatureService, IgoMap,
         LanguageService, OverlayService, ToolService} from '../../lib';

@Component({
  selector: 'igo-demo',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.styl']
})
export class AppComponent implements OnInit {

  public map = new IgoMap();
  public searchTerm: string;

  constructor(public contextService: ContextService,
              public featureService: FeatureService,
              public overlayService: OverlayService,
              public toolService: ToolService,
              public language: LanguageService) {}

  ngOnInit() {
    // If you do not wat to load a context from a file,
    // you can simplye do contextService.setContext(context)
    // where "context" is an object with the same interface
    // as the contexts in ../contexts/
    this.contextService.loadContext('_default');
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
