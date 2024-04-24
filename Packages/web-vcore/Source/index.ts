import {CE, E} from "js-vextensions";

// import own exports; thus we gain access to the exports object, letting us modify it
import * as frameworkExportsObject from "./index.js";
import "js-vextensions/Helpers/@ApplyCECode.js";
//export * from "./UserTypes.js";
import "./UserTypes.js";
import "./Utils/General/DuplicateLibCheck.js";
import {RestoreOrigDefinePropertyFunc} from "./@EnableExportOverwrites.js";

//type __ = typeof import("../node_modules/js-vextensions/Helpers/@ApplyCETypes");
type __ = typeof import("js-vextensions/Helpers/@ApplyCETypes"); // eslint-disable-line

export * from "./@EnableExportOverwrites.js";
// special key, marking this module's exports object, which allows the patch in ExportOverwriteEnabler.ts to make the remaining exports overwriteable
//export const __EnableExportOverwrites__ = true;

export * from "./Manager.js";

//export * from "./Server/Command.js";

export * from "./Store/WVCStore.js";

export * from "./UI/NotificationsUI.js";
export * from "./UI/NotificationsUI/NotificationMessage.js";
export * from "./UI/NotificationsUI/ErrorMessage.js";

export * from "./Utils/Audio/AudioNodes.js";
export * from "./Utils/Audio/SpeechToText.js";
export * from "./Utils/Audio/TextToSpeech.js";
export * from "./Utils/Audio/VMediaRecorder.js";

//export * from "./Utils/Database/DatabaseHelpers.js";
//export * from "./Utils/Database/QuickJoin.js";
//export * from "./Utils/Database/SchemaHelpers.js";
//export * from "./Utils/Database/StringSplitCache.js";

export * from "./Utils/General/Constants.js";
export * from "./Utils/General/Errors.js";
export * from "./Utils/General/General.js";
export * from "./Utils/General/Geometry.js";
//export * from "./Utils/General/KeyGenerator.js";
export * from "./Utils/General/KeyNames.js";
export * from "./Utils/General/Logging.js";
export * from "./Utils/General/ModuleExportExposer.js";
export * from "./Utils/General/Others.js";
export * from "./Utils/General/RegexHelpers.js";
export * from "./Utils/General/WVCSchemas.js";
export * from "./Utils/General/YoutubePlayer.js";
//export * from "./Utils/General/ClassExtensions/MobX.js";

export * from "./Utils/ReactComponents/AddressBarWrapper.js";
export * from "./Utils/ReactComponents/DefaultLoadingUI.js";
export * from "./Utils/ReactComponents/DraggableLabel.js";
export * from "./Utils/ReactComponents/ErrorBoundary.js";
export * from "./Utils/ReactComponents/Icon.js";
export * from "./Utils/ReactComponents/InfoButton.js";
export * from "./Utils/ReactComponents/Link.js";
export * from "./Utils/ReactComponents/List.js";
export * from "./Utils/ReactComponents/PageContainer.js";
export * from "./Utils/ReactComponents/Paragraph.js";
export * from "./Utils/ReactComponents/Slider.js";
export * from "./Utils/ReactComponents/TextPlus.js";
export * from "./Utils/ReactComponents/Tooltip.js";
export * from "./Utils/ReactComponents/TreeView.js";
export * from "./Utils/ReactComponents/VDateTime.js";
export * from "./Utils/ReactComponents/VReactMarkdown_Remarkable.js";
export * from "./Utils/ReactComponents/VReactMarkdown.js";
export * from "./Utils/ReactComponents/YoutubePlayerUI.js";

export * from "./Utils/Skins/Skin.js";
export * from "./Utils/Skins/DefaultSkin.js";

export * from "./Utils/Store/MobX.js";

export * from "./Utils/UI/DNDHelpers.js";
export * from "./Utils/UI/General.js";
export * from "./Utils/UI/NavBar.js";
export * from "./Utils/UI/ReactHooks.js";
export * from "./Utils/UI/Sizes.js";
export * from "./Utils/UI/Styles.js";
export * from "./Utils/UI/SubNavBar.js";
export * from "./Utils/UI/UPlotDefaults.js";

export * from "./Utils/URL/History.js";
export * from "./Utils/URL/URLs.js";

//export * from "./__DisableExportOverwrites__";
export const __DisableExportOverwrites__ = {};
// now that our exports are done being attached, we can remove our replacement of Object.defineProperty
// (attempt is also made in handler itself, on seeing the placeholder export/property above, but it seems to not work reliably)
RestoreOrigDefinePropertyFunc();

// override system
// ==========

/*export const WVC_exports_orig = E(frameworkExportsInterface);
export const WVC_exports_final = frameworkExportsInterface;
export function WVC_OverrideExport(newValue_withNameProp: any);
export function WVC_OverrideExport(exportName: string, newValue: any);
export function WVC_OverrideExport(...args) {
	let exportName: string, newValue: any;
	if (args.length == 1) [exportName, newValue] = [args[0].name, args[0]];
	else [exportName, newValue] = args;
	WVC_exports_final[exportName] = newValue;
}*/

export const WVC_exports_orig = E(CE(frameworkExportsObject).ExcludeKeys("WVC_exports_orig", "WVC_exports_final", "WVC_OverrideExport"));
export const WVC_exports_final = frameworkExportsObject;
export function WVC_OverrideExport(newValue_withNameProp: any);
export function WVC_OverrideExport(exportName: string, newValue: any);
export function WVC_OverrideExport(...args) {
	let exportName: string, newValue: any;
	if (args.length == 1) [exportName, newValue] = [args[0].name, args[0]];
	else [exportName, newValue] = args;
	delete WVC_exports_final[exportName]; // delete getter-setter
	WVC_exports_final[exportName] = newValue;
}