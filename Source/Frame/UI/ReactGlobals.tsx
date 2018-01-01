import {Log} from "../General/Logging";
import React from "react";
import {Component} from "react";
import ReactDOM from "react-dom";
import {WaitXThenRun, Timer} from "js-vextensions";
import autoBind from "react-autobind";
import {Assert} from "js-vextensions";
import ShallowCompare from "react/lib/shallowCompare";
import classNames from "classnames";
export {ShallowCompare};
import {BaseComponent, FindDOM, ApplyBasicStyles} from "react-vextensions";

export function FindDOM_(comp) { return $(FindDOM(comp)) as JQuery; };
G({FindDOM_});

export type RouteProps = {match};

export function GetErrorMessagesUnderElement(element) {
	return $(element).find(":invalid").ToList().map(node=>(node[0] as any).validationMessage || `Invalid value.`);
}