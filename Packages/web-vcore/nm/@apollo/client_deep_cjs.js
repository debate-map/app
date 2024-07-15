/*export * from "@apollo/client/link/ws/index.js";
export * from "@apollo/client/link/error/index.js";
export * from "@apollo/client/utilities/index.js";*/
// fix for pickier ts-node (v1)
// ==========
/*import link_ws from "@apollo/client/link/ws/index.js"; // eslint-disable-line
const {WebSocketLink} = link_ws;
export {WebSocketLink};

import link_error from "@apollo/client/link/error/index.js"; // eslint-disable-line
const {onError} = link_error;
export {onError};

import utilities from "@apollo/client/utilities/index.js"; // eslint-disable-line
const {getMainDefinition} = utilities;
export {getMainDefinition};*/
// fix for pickier ts-node (v2)
// ==========
// @ts-ignore
export * from "@apollo/client/link/ws/ws.cjs"; // @ts-ignore // eslint-disable-line 
export * from "@apollo/client/link/error/error.cjs"; // @ts-ignore // eslint-disable-line
export * from "@apollo/client/utilities/utilities.cjs"; // eslint-disable-line
//# sourceMappingURL=client_deep_cjs.js.map