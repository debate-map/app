import {NodeType, NodeType_Info} from "dm_common";

//export const GUTTER_WIDTH = 30;
export const GUTTER_WIDTH = 40;
//export const GUTTER_WIDTH_SMALL = 20;
export const GUTTER_WIDTH_SMALL = 12;
//export const GUTTER_WIDTH_SMALL = 0;

export const TOOLBAR_BUTTON_WIDTH = 110;
export const TOOLBAR_BUTTON_WIDTH_WITH_BORDER = TOOLBAR_BUTTON_WIDTH + 1;
export const TOOLBAR_BUTTON_HEIGHT = 25;
export const TOOLBAR_HEIGHT_BASE = TOOLBAR_BUTTON_HEIGHT;
export const TOOLBAR_HEIGHT_WITH_BORDER = TOOLBAR_HEIGHT_BASE + 1;
export const ARGUMENTS_BAR_WIDTH = 90;
export const ARGUMENTS_BAR_WIDTH_WITH_ITS_GUTTER = ARGUMENTS_BAR_WIDTH + GUTTER_WIDTH;

export const NOTIFICATION_BELL_WIDTH = 20;

export const ARG_MAX_WIDTH_FOR_IT_TO_FIT_BEFORE_PREMISE_TOOLBAR = (NodeType_Info.for[NodeType.claim].minWidth + GUTTER_WIDTH_SMALL) - (TOOLBAR_BUTTON_WIDTH * 2);
export const ARG_MAX_WIDTH_FOR_IT_AND_ARG_BAR_TO_FIT_BEFORE_PREMISE_TOOLBAR = ARG_MAX_WIDTH_FOR_IT_TO_FIT_BEFORE_PREMISE_TOOLBAR - ARGUMENTS_BAR_WIDTH_WITH_ITS_GUTTER;