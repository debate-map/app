/*/// <reference path="../node_modules/@types/react/index.d.ts"/>
/// <reference path="../node_modules/@types/react-router/index.d.ts"/>*/

// general
// ==========

// libraries
declare var O;
declare var React;
declare var module;
//declare var global: __React.GlobalStatic
declare function require(name: string): any;

// custom
declare var g;
declare var NODE_ENV: string; // compile-time/magic
declare var env: string; // run-time
declare var __DEV__: boolean, __PROD__: boolean, __TEST__: boolean; // compile-time/magic
declare var devEnv: boolean, prodEnv: boolean, testEnv: boolean; // run-time

declare type voidy = void | Promise<void>;