import {HKMode} from "UI/@SL/SL";
import {HKLogIn} from "./MobXHK/HKLogin.js";
import {hkStore, HKStore} from "./MobXHK/HKStore.js";

// atm, the mobx-hyperknowledge "library" is just a set of files in the "MobXHK" folder
export let hkToken = null as string|n;
export async function InitMobXHyperknowledge() {
	if (HKMode) {
		hkToken = await HKLogIn();
		hkStore.Start(hkToken);
	}
}