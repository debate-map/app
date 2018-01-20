import {Spinner} from "react-vcomponents";
import {Assert} from "js-vextensions";
import {BaseComponent, FindDOM} from "react-vextensions";
import {Term, TermType, Term_nameFormat, Term_disambiguationFormat} from "../../../Store/firebase/terms/@Term";
import {Column} from "react-vcomponents";
import {TextInput} from "react-vcomponents";
import Moment from "moment";
import {GetUser} from "../../../Store/firebase/users";
import {User} from "Store/firebase/users/@User";
import {Connect} from "../../../Frame/Database/FirebaseConnect";
import {GetEntries} from "../../../Frame/General/Enums";
import {Select} from "react-vcomponents";
import {CheckBox} from "react-vcomponents";
import {ScrollView} from "react-vscrollview";
import {Button} from "react-vcomponents";
import InfoButton from "../../../Frame/ReactComponents/InfoButton";
import {Image, Image_namePattern, Image_urlPattern, ImageType, GetNiceNameForImageType} from "../../../Store/firebase/images/@Image";
import SourceChainsEditorUI from "../../@Shared/Maps/MapNode/SourceChainsEditorUI";
import {Div, Span, Pre, Row, RowLR} from "react-vcomponents";
 import {GetErrorMessagesUnderElement} from "js-vextensions";

type Props = {baseData: Image, creating: boolean, editing: boolean, style?, onChange?: (newData: Image, error: string)=>void}
	& Partial<{creator: User, variantNumber: number}>;
@Connect((state, {baseData, creating}: Props)=>({
	creator: !creating && GetUser(baseData.creator),
}))
export default class ImageDetailsUI extends BaseComponent<Props, {newData: Image, dataError: string}> {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) { // if base-data changed
			this.SetState({newData: Clone(props.baseData)});
		}
	}
	OnChange() {
		let {onChange} = this.props;
		let error = this.GetValidationError();
		if (onChange) onChange(this.GetNewData(), error);
		//this.Update();
		this.SetState({dataError: error});
	}

	scrollView: ScrollView;
	render() {
		let {creating, editing, style, onChange, creator, variantNumber} = this.props;
		let {newData, dataError} = this.state;
		let Change = _=>this.OnChange();

		let splitAt = 170, width = 600;
		return (
			<div> {/* needed so GetInnerComp() works */}
			<Column style={style}>
				{!creating &&
					<table className="selectableAC" style={{/*borderCollapse: "separate", borderSpacing: "10px 0"*/}}>
						<thead>
							<tr><th>ID</th><th>Creator</th><th>Created at</th></tr>
						</thead>
						<tbody>
							<tr>
								<td>{newData._id}</td>
								<td>{creator ? creator.displayName : `n/a`}</td>
								<td>{Moment(newData.createdAt).format(`YYYY-MM-DD HH:mm:ss`)}</td>
							</tr>
						</tbody>
					</table>}
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Pre>Name: </Pre>
					<TextInput
						pattern={Image_namePattern} required
						enabled={creating || editing} style={{width: "100%"}}
						value={newData.name} onChange={val=>Change(newData.name = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Pre>Type: </Pre>
					<Select options={GetEntries(ImageType, name=>GetNiceNameForImageType(ImageType[name]))} enabled={creating || editing} style={{flex: 1}}
						value={newData.type} onChange={val=>Change(newData.type = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Pre>URL: </Pre>
					<TextInput
						pattern={Image_urlPattern} required
						enabled={creating || editing} style={{width: "100%"}}
						value={newData.url} onChange={val=>Change(newData.url = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
					<Pre>Description: </Pre>
					<TextInput enabled={creating || editing} style={{flex: 1}}
						value={newData.description} onChange={val=>Change(newData.description = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt}style={{display: "flex", alignItems: "center"}}>
					<Pre>Preview width: </Pre>
					<Div>
						<Spinner max={100} value={newData.previewWidth|0} onChange={val=>Change(newData.previewWidth = val != 0 ? val : null)}/>
						<Pre>% (0 for auto)</Pre>
					</Div>
				</RowLR>
				<Row mt={10}>Source chains:</Row>
				<Row mt={5}>
					<SourceChainsEditorUI ref={c=>this.chainsEditor = c} enabled={creating || editing} baseData={newData.sourceChains} onChange={val=>Change(newData.sourceChains = val)}/>
				</Row>
				<Column mt={10}>
					<Row style={{fontWeight: "bold"}}>Preview:</Row>
					<Row mt={5} style={{display: "flex", alignItems: "center"}}>
						<img src={newData.url} style={{width: newData.previewWidth != null ? `${newData.previewWidth}%` : null, maxWidth: "100%"}}/>
					</Row>
				</Column>
				{dataError && dataError != "Please fill out this field." && <Row mt={5} style={{color: "rgba(200,70,70,1)"}}>{dataError}</Row>}
			</Column>
			</div>
		);
	}
	chainsEditor: SourceChainsEditorUI;
	GetValidationError() {
		return GetErrorMessagesUnderElement(FindDOM(this))[0] || this.chainsEditor.GetValidationError();
	}

	GetNewData() {
		let {newData} = this.state;
		return Clone(newData) as Image;
	}
}