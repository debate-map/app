//export * from "react";
//export {default} from "react";
/*import React = require("react");
export = React;*/

export {
	default,
	// hook funcs (these are the only ones worth exporting directly; for the rest, just use React.someFuncName)
	useCallback,
	useContext,
	useDebugValue,
	useEffect,
	useImperativeHandle,
	useLayoutEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
	// other funcs
	/*cloneElement,
	createContext,
	createElement,
	createFactory,
	createRef,
	forwardRef,
	isValidElement,
	lazy,
	memo,*/
} from "react";
//} from "../node_modules/react";