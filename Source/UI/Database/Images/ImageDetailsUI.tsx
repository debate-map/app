import {GetEntries, GetErrorMessagesUnderElement, Clone} from "js-vextensions";
import Moment from "moment";
import {Column, Div, Pre, Row, RowLR, Select, Spinner, TextInput} from "react-vcomponents";
import {BaseComponent, GetDOM, BaseComponentPlus} from "react-vextensions";
import {ScrollView} from "react-vscrollview";
import {User} from "Store/firebase/users/@User";
import {ES} from "Utils/UI/GlobalStyles";
import {IDAndCreationInfoUI} from "UI/@Shared/CommonPropUIs/IDAndCreationInfoUI";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {AddImage} from "Server/Commands/AddImage";
import {GetNiceNameForImageType, Image, ImageType, Image_namePattern, Image_urlPattern} from "../../../Store/firebase/images/@Image";
import {GetUser, MeID} from "../../../Store/firebase/users";
import {SourceChainsEditorUI} from "../../@Shared/Maps/MapNode/SourceChainsEditorUI";

export class ImageDetailsUI extends BaseComponentPlus(
	{} as {baseData: Image, creating: boolean, editing: boolean, style?, onChange?: (newData: Image, error: string)=>void},
	{} as {newData: Image, dataError: string},
) {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) { // if base-data changed
			this.SetState({newData: Clone(props.baseData)});
		}
	}
	OnChange() {
		const {onChange} = this.props;
		const newData = this.GetNewData();
		const error = this.GetValidationError();
		if (onChange) onChange(newData, error);
		this.SetState({newData, dataError: error});
	}

	scrollView: ScrollView;
	render() {
		const {baseData, creating, editing, style, onChange} = this.props;
		const {newData, dataError} = this.state;

		const Change = (..._)=>this.OnChange();

		const splitAt = 170; const width = 600;
		return (
			<Column style={style}>
				{!creating &&
					<IDAndCreationInfoUI id={baseData._key} creatorID={newData.creator} createdAt={newData.createdAt}/>}
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Pre>Name: </Pre>
					<TextInput
						pattern={Image_namePattern} required
						enabled={creating || editing} style={{width: "100%"}}
						value={newData.name} onChange={val=>Change(newData.name = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Pre>Type: </Pre>
					<Select options={GetEntries(ImageType, name=>GetNiceNameForImageType(ImageType[name]))} enabled={creating || editing} style={ES({flex: 1})}
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
					<TextInput enabled={creating || editing} style={ES({flex: 1})}
						value={newData.description} onChange={val=>Change(newData.description = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{display: "flex", alignItems: "center"}}>
					<Pre>Preview width: </Pre>
					<Div>
						<Spinner max={100} enabled={creating || editing}
							value={newData.previewWidth | 0} onChange={val=>Change(newData.previewWidth = val != 0 ? val : null)}/>
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
		);
	}
	chainsEditor: SourceChainsEditorUI;
	GetValidationError() {
		return GetErrorMessagesUnderElement(GetDOM(this))[0] || this.chainsEditor.GetValidationError();
	}

	GetNewData() {
		const {newData} = this.state;
		return Clone(newData) as Image;
	}
}