import {AssertValidate, Command, dbp, GenerateUUID} from "web-vcore/nm/mobx-graphlink.js";
import {Share} from "../DB.js";
import {UserEdit} from "../CommandMacros.js";

/*
ID-generation schemes
==========
base64: about as compact you can get while maintaining url-friendliness [I usually use "-" and "_" as the two extra chars]
base54: like base64, but no vowels, avoiding exact-match profanity
base50: like base64, but no vowels or vowel-digits (4:A, 3:E, 1:I, 0:O), avoiding exact-match and obvious-match profanity

The below implements: base50, length of 10 (generated randomly, like uuids)

I feel this is a suitable balance between:
1) Compactness: 10-chars is about the same length as the 11-chars youtube video ids
2) Room to avoid clashes: 50^10 [ids possible] / 1000 (imagined generations per second) = 9.76e+13 seconds = 3,096,266 years (ie. if generating sequentially, at 1k ids per second, you could keep going for ~3 million years)
3) Avoiding of profanity: You avoid all exact-match profanity, as well as the standard digit->vowel equivalents
*/

const avoidStrings = ["pp", "kkk", "xxx"];
const avoidStrings_regexes_atStart = avoidStrings.map(str=>new RegExp(`^${str}`));
const avoidStrings_regexes_anywhere = avoidStrings.map(str=>new RegExp(str, "g"));

/** Generates a base-50, 10-char id. Designed as a balance between compactness, clash-avoidance, and profanity-avoidance. */
export function GenerateSafeID(targetLength = 10, hardCodedStringAvoidance = "anywhere" as "none" | "atStart" | "anywhere") {
	let result = "";
	let charsToFill: number;
	while ((charsToFill = targetLength - result.length) > 0) {
		let uuid = GenerateUUID(false); // we do profanity-avoidance ourselves
		uuid = uuid.replace(/[AEIOUaeiou4310]/g, "");
		if (hardCodedStringAvoidance != "none") {
			while (true) {
				let uuid_new = uuid;
				const avoidRegexes = hardCodedStringAvoidance == "atStart" ? avoidStrings_regexes_atStart : avoidStrings_regexes_anywhere;
				for (const avoidRegex of avoidRegexes) {
					uuid_new = uuid_new.replace(avoidRegex, "");
				}
				// if no matches are left to correct, break loop
				if (uuid_new == uuid) break;
				uuid = uuid_new;
			}
		}
		result += uuid.substr(0, charsToFill);
	}
	return result;
}

@UserEdit
export class AddShare extends Command<{share: Share}, string> {
	shareID: string;
	Validate() {
		const {share} = this.payload;
		this.shareID = this.shareID ?? GenerateSafeID();
		share.creator = this.userInfo.id;
		share.createdAt = Date.now();

		this.returnData = this.shareID;
		AssertValidate("Share", share, "Share invalid");
	}

	GetDBUpdates() {
		const {share} = this.payload;
		const updates = {
			[dbp`shares/${this.shareID}`]: share,
		} as any;
		return updates;
	}
}