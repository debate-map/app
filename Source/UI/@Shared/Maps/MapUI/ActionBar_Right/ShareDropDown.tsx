import {GetNewURL} from "Utils/URL/URLs";
import {VURL, WaitXThenRun, CopyText} from "js-vextensions";
import {Button, Column, DropDown, DropDownContent, DropDownTrigger, Pre, Row, RowLR, Select, TextInput} from "react-vcomponents";
import {BaseComponent, BaseComponentPlus} from "react-vextensions";
import {GetCurrentURL} from "vwebapp-framework";
import {Map} from "../../../../../Store/firebase/maps/@Map";
import {GetMapTimelines} from "../../../../../Store/firebase/timelines";
import {Timeline} from "../../../../../Store/firebase/timelines/@Timeline";

export class ShareDropDown extends BaseComponentPlus({} as {map: Map}, {timeline: null as Timeline, justCopied: false}) {
	render() {
		const {map} = this.props;
		const {timeline, justCopied} = this.state;
		const newURL = GetNewURL();
		const timelines = GetMapTimelines(map);

		newURL.queryVars.Clear();
		newURL.domain = GetCurrentURL().domain;
		if (timeline) {
			newURL.SetQueryVar("timeline", timeline._key);
		}

		const splitAt = 130;
		return (
			<DropDown>
				<DropDownTrigger><Button mr={5} text="Share"/></DropDownTrigger>
				<DropDownContent style={{right: 0, width: 400, borderRadius: "0 0 0 5px"}}>
					<Column>
						<RowLR splitAt={splitAt}>
							<Pre>URL: </Pre>
							<Row style={{width: "100%"}}>
								<TextInput value={newURL.toString({domain: true})} editable={false} style={{flex: 0.75}}/>
								<Button text={justCopied ? "Copied!" : "Copy"} ml={5} style={{flex: ".25 0 auto"}} onClick={()=>{
									CopyText(newURL.toString({domain: true}));
									this.SetState({justCopied: true});
									WaitXThenRun(1000, ()=>this.SetState({justCopied: false}));
								}}/>
							</Row>
						</RowLR>
						<RowLR mt={5} splitAt={splitAt}>
							<Pre>Show timeline: </Pre>
							<Select options={[{name: "None", value: null} as any].concat(timelines)} value={timeline} onChange={val=>this.SetState({timeline: val})}/>
						</RowLR>
					</Column>
				</DropDownContent>
			</DropDown>
		);
	}
}