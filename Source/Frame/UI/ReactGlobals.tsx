import {Log} from "../General/Logging";
import React from "react";
import {Component} from "react";
import ReactDOM from "react-dom";
import {WaitXThenRun, Timer} from "../General/Timers";
import autoBind from "react-autobind";
import {IsString} from "../General/Types";
import {Assert} from "../General/Assert";
import {E, Global, QuickIncrement} from "../General/Globals_Free";
import ShallowCompare from "react/lib/shallowCompare";
import V from "../V/V";
import classNames from "classnames";
export {ShallowCompare};
import {BaseComponent, FindDOM, ApplyBasicStyles} from "react-vextensions";

export function FindDOM_(comp) { return $(FindDOM(comp)) as JQuery; };
g.Extend({FindDOM_});

export type RouteProps = {match};

export function GetErrorMessagesUnderElement(element) {
	return $(element).find(":invalid").ToList().map(node=>(node[0] as any).validationMessage || `Invalid value.`);
}