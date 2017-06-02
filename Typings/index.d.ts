// general
// ==========

// libraries
declare var O;
declare var module;
//declare var global: __React.GlobalStatic
declare function require(name: string): any;

// custom
declare var NODE_ENV: string; // compile-time/magic
declare var __DEV__: boolean, __PROD__: boolean, __TEST__: boolean; // compile-time/magic
//declare var startURL;

declare type voidy = void | Promise<void>;