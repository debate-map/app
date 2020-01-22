import {CreateConfig} from "vwebapp-framework/Scripts/Config";
import path from "path";

const {NODE_ENV, PORT, USE_TSLOADER, BASENAME} = process.env;

/*export const config = {
	...config_base,
	path_base: path.resolve(__dirname, ".."),
	server_port: PORT || 3005,
};*/

// modify the imported config-base, then return it (that's fine/intended)
export const config = CreateConfig({
	path_base: path.resolve(__dirname, ".."),
	server_port: PORT || 3005,
});