import {Store} from "redux";
import {RootState} from "./Store/index";
import {FirebaseApp} from "./Frame/Database/DatabaseHelpers";
import ReactDOM from "react-dom";

let createStore = require("./Frame/Store/CreateStore").default;

declare global { var store: Store<RootState> & {firebase: FirebaseApp}; }
var store = createStore(g.__InitialState__, {}) as Store<RootState>;
g.Extend({store});

declare global { var State: ()=>RootState; }
function State() { return store.getState(); }
g.Extend({State});

const mountNode = document.getElementById("root");
let RootUIWrapper = require("./UI/Root").default;
ReactDOM.render(<RootUIWrapper store={store}/>, mountNode);