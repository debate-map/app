import {CreateWebpackConfig} from "vwebapp-framework/Scripts/Build/WebpackConfig";
import {config} from "../Config";

/*export const webpackConfig: webpack.Configuration = {
	...webpackConfig_base,
	name: "client",
};*/

// modify the imported config-base, then return it (that's fine/intended)
export const webpackConfig = CreateWebpackConfig(config, {
	name: "client",
});