import type { Action, ActionHandler, UITree, UIElement } from "@json-render/core";

export type JsonRenderSegment = {
  type: "text" | "json-render";
  content: string;
};

export type JsonRenderParseResult = {
  tree: UITree;
};

export type JsonRenderParseError = {
  message: string;
};

export type JsonRenderActionHandlers = Record<string, ActionHandler>;

export type JsonRenderAction = Action;

export type JsonRenderElement = UIElement;
