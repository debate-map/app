/*import {GetDataAsync} from "../../../../Frame/Database/DatabaseHelpers";
import {AddUpgradeFunc, FirebaseData} from "../../Admin";
import {ContentNode, SourceChain, Source, SourceType} from "../../../../Store/firebase/contentNodes/@ContentNode";

let newVersion = 4;
AddUpgradeFunc(newVersion, (oldData: FirebaseData)=> {
	let data = FromJSON(ToJSON(oldData)) as FirebaseData;

	for (let node of data.nodes.VValues(true) as any[]) {
		if (node.quote == null) continue;
		let oldQuote = node.quote;
		let oldSource = oldQuote.sources[0];
		delete node.quote;

		// add contentNode
		let contentNode = new ContentNode();
		contentNode.content = oldQuote.text;
		delete contentNode.sourceChains[0][0]; // clear first (and only) source in first source-chain
		
		// eg: "some-doc (author-name) <- some-doc-2 (author-name-2) <- example.com"
		let newSourceStrings = oldSource.name.split(" <- ");
		for (let sourceStr of newSourceStrings) {
			let newSource = new Source();

			let nameAndAuthorMatch = sourceStr.match(/([^(]+)\((.+?)\)/);
			if (nameAndAuthorMatch) {
				newSource.name = nameAndAuthorMatch[1];
				newSource.author = nameAndAuthorMatch[2];
			} else if (sourceStr.toLowerCase() == sourceStr) { // if link
				newSource.type = SourceType.Webpage;
				newSource.link = sourceStr;
			} else { // if just doc-name
				newSource.name = sourceStr;
			}

			contentNode.sourceChains[0].FakeArray_Add(newSource);
		}

		node.contentNode = contentNode;
	}

	return data;
});*/