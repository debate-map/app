import {RowMap} from "@fast-csv/parse";
import {Assert} from "react-vextensions/Dist/Internals/FromJSVE";

export class CSV_SL_Row {
	static FromRawRow(row: RowMap<any>) {
		//Assert(row.length - 1 >= 14, `CSV has a row without enough cells! Need 15+, found ${row.length}. @row:${JSON.stringify(row)}`);
		const getCell = (name, valIfEmpty = "")=>{
			let val = row[name];
			Assert(val != null, `Cannot find cell "${name}" within CSV row! @row:${JSON.stringify(row)}`);
			val = val.trim();

			if (val.trim() == "") return valIfEmpty;
			return row[name];
		};
		return new CSV_SL_Row({
			topic: getCell("Topic", "(missing topic)"),
			analyst: getCell("Analyst"),
			subtopic: getCell("Subtopic", "(missing subtopic)"),
			orientation: getCell("Orientation"),
			position: getCell("Position", "(missing position)"),
			title: getCell("New Categories/Claims"),
			analyst_dup: getCell("analyst"),
			link: getCell("link"),
			note1: getCell("note 1"),
			note2: getCell("note 2"),
			note3: getCell("note 3"),
		});
	}

	constructor(data?: Partial<CSV_SL_Row>) {
		Object.assign(this, data);
	}

	topic: string;
	analyst: string;
	subtopic: string;
	orientation: string;
	position: string;
	title: string;
	analyst_dup: string; // duplicate of "analyst" field (not sure why there XD)
	link: string;
	note1: string;
	note2: string;
	note3: string;
}