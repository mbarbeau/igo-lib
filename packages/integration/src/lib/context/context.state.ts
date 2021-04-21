import { Injectable } from '@angular/core';

import { BehaviorSubject } from 'rxjs';

import { LanguageService } from '@igo2/core';
import { Tool, ToolService } from '@igo2/common';
import { ContextService, DetailedContext } from '@igo2/context';

import { ToolState } from '../tool/tool.state';

/**
 * Service that holds the state of the context module
 */
@Injectable({
  providedIn: 'root'
})
export class ContextState {
  /**
   * Observable of the active context
   */
  context$: BehaviorSubject<DetailedContext> = new BehaviorSubject(undefined);

  constructor(
    private contextService: ContextService,
    private toolService: ToolService,
    private toolState: ToolState,
    private languageService: LanguageService
  ) {
    this.contextService.context$.subscribe((context: DetailedContext) => {
      this.onContextChange(context);
    });
    this.contextService.toolsChanged$.subscribe((context: DetailedContext) => {
      this.updateTools(context);
    });
  }

  /**
   * Set the active context
   * @param context Detailed context
   */
  private setContext(context: DetailedContext) {
    this.updateTools(context);
    this.context$.next(context);
  }

  /**
   * Update the tool state with the context's tools
   * @param context Detailed context
   */
  private updateTools(context: DetailedContext) {
    const toolbox = this.toolState.toolbox;

    const tools = [];
    const contextTools = context.tools || [];
    contextTools.forEach((contextTool: Tool) => {
      const baseTool = this.toolService.getTool(contextTool.name);
      if (baseTool === undefined) {
        return;
      }

      const options = Object.assign(
        {},
        baseTool.options || {},
        contextTool.options || {}
      );
      const tool = Object.assign({}, baseTool, contextTool, { options });
      tools.push(tool);
    });

    tools.forEach((tool) => {
      if (tool.parent) {
        const parentIndex = tools.findIndex((el) => el.name === tool.parent);
        if (parentIndex !== -1) {
          tools[parentIndex].children = [];
          tools[parentIndex].children.push(tool.name);
        }
      }
    });

    toolbox.setTools(tools);
    toolbox.setToolbar(context.toolbar || []);

    // TODO: This is a patch so the context service can work without
    // injecting the ToolState or without being completely refactored
    this.contextService.setTools([].concat(tools));
    this.contextService.setToolbar(context.toolbar || []);
  }

  /**
   * Set a new context and update the tool state
   * @param context Detailed context
   */
  private onContextChange(context: DetailedContext) {
    if (context === undefined) {
      return;
    }
    this.setContext(context);
  }
}
