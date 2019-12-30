/* import { Clone, ToJSON } from 'js-vextensions';
import { presetBackgrounds } from 'Utils/UI/PresetBackgrounds';

export function CreateMissingThumbnails() {
	const backgroundPairs = presetBackgrounds.Pairs();

	const newBackgroundPairs = [];
	for (const pair of backgroundPairs) {
		const newPair = Clone(pair);

		newBackgroundPairs.push(newPair);
	}

	const newJSON = ToJSON(newBackgroundPairs.ToMap(a => a.key, a => a.value));
	console.log(newJSON);
} */