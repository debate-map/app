/* eslint-disable */

// general
// ==========

// libraries
/*declare var module;
declare function require(name: string): any;*/

// declare var startURL;

//declare type voidy = void | Promise<void>;

// temp fix for mobx/flow.d.ts (fixed by updating @types/webpack, I believe)
//declare type AsyncGenerator<A, B, C> = any;

//declare type n = null;
//declare type u = undefined;
//declare type nu = null | undefined;

// workaround, for referencing the native Map type, in files that already import the custom Map class
// todo: remove this, once custom Map class is renamed (eg. to DMap)
type NativeMap<K, V> = Map<K, V>;