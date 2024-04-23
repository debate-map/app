// usable from webpack, but not ts-node (webpack is less picky about module structure); for ts-node, use client_deep_cjs.ts
export * from "@apollo/client/link/ws/index.js";
export * from "@apollo/client/link/error/index.js";
export * from "@apollo/client/link/subscriptions/index.js";
export * from "@apollo/client/utilities/index.js";