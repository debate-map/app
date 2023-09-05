import {HKMode} from "UI/@SL/SL";
import {HKLogIn} from "./MobXHK/HKLogin";

// atm, the mobx-hyperknowledge "library" is just a set of files in the "MobXHK" folder
export function InitMobXHyperknowledge() {
	if (HKMode) {
		HKLogIn();
	}
}