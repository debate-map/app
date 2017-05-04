import {User} from "./firebase/users";
import UserExtraInfo from "./firebase/userExtras/@UserExtraInfo";
import {MapNode} from "./firebase/nodes/@MapNode";
import {RatingsSet} from "./firebase/nodeRatings/@RatingsRoot";
import {Term} from "./firebase/terms/@Term";
import {Map} from "./firebase/maps/@Map";
import TermComponent from "./firebase/termComponents/@TermComponent";

export interface FirebaseData {
	general: GeneralData;
	users: {[key: string]: User};
	userExtras: {[key: string]: UserExtraInfo};
	maps: {[key: number]: Map};
	nodes: {[key: number]: MapNode};
	nodeExtras: {[key: number]: any};
	nodeRatings: {[key: number]: RatingsSet};
	terms: {[key: number]: Term};
	termComponents: {[key: number]: TermComponent};
}
export interface GeneralData {
	lastTermID: number;
	lastTermComponentID: number;
	lastNodeID: number;
}