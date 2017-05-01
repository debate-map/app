import {Assert} from "../../../Frame/General/Assert";
import {SourceType} from "./@ContentNode";

export function GetSourceNamePlaceholderText(sourceType: SourceType) {
	if (sourceType == SourceType.Speech) return "speech name";
	if (sourceType == SourceType.Writing) return "book/document name";
	//if (sourceType == SourceType.Webpage) return "(webpage name)";
	Assert(false);
}
export function GetSourceAuthorPlaceholderText(sourceType: SourceType) {
	if (sourceType == SourceType.Speech) return "speaker";
	if (sourceType == SourceType.Writing) return "book/document author";
	//if (sourceType == SourceType.Webpage) return "(webpage name)";
	Assert(false);
}