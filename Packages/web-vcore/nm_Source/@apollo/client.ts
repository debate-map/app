//export * from "@apollo/client";
// we have to import from the subs; the root one is not marked type:module yet (they delayed it for now, since it broke things when they tried)
export * from "@apollo/client/core/index.js";
export * from "@apollo/client/react/index.js";