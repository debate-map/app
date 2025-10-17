import {GetNodeTags, GetTagCompClassByTag, HasAdminPermissions, HasModPermissions, DMap, NodeL3, NodeTag, MeID, TagComp_MirrorChildrenFromXToY, PERMISSIONS} from "dm_common";
import {E, GetEntries} from "js-vextensions";
import React, {useEffect, useRef, useState} from "react";
import {VMenuItem, VMenuStub} from "react-vmenu";
import {store} from "Store";
import {TagsPanel_Subpanel} from "Store/main/maps";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel";
import {ShowAddTagDialog, TagDetailsUI} from "UI/Database/Tags/TagDetailsUI.js";
import {RunCommand_AddNodeLabel, RunCommand_DeleteNodeLabel, RunCommand_DeleteNodeTag, RunCommand_UpdateNodeTag} from "Utils/DB/Command";
import {liveSkin} from "Utils/Styles/SkinManager";
import {GetUpdates, HSLA, RunInAction_Set} from "web-vcore";
import {Button, Column, Row, Select, Text, TextInput} from "react-vcomponents";
import {ShowMessageBox} from "react-vmessagebox";
import {observer_mgl} from "mobx-graphlink";
import {DropDown, DropDownTrigger, DropDownContent} from "react-vcomponents";
import {apolloClient} from "Utils/LibIntegrations/Apollo";
import {gql} from "@apollo/client";
import {zIndexes} from "Utils/UI/ZIndexes";
import {ScrollView} from "react-vscrollview";

const DEFAULT_SEARCH_LIMIT = 30; // used to search node labels
const DEFAULT_FETCH_ALL_LIMIT = 100; // used to fetch all node labels for a specific node

type NodeLabel = {
	label: string,
	/**
     * Total number of nodes that have used this label.
     */
	usageCount: number
	/**
     * Whether the current user is the creator of this label.
     * This is only set if the user has provided a node ID in the query input to filter by;
     * otherwise, this will always be null.
     */
	isCreator?: boolean,
}

const fetchNodeLabels = async (nodeId: string|n, searchText: string|n): Promise<Map<string, NodeLabel>> => {
	const filter: any = { limit: nodeId ? DEFAULT_FETCH_ALL_LIMIT : DEFAULT_SEARCH_LIMIT, };
	if (searchText) filter.searchText = searchText;
    if (nodeId) filter.nodeId = nodeId;

	const result = await apolloClient.query({
		query: gql`
			query($filter: NodeLabelsInput!) {
				nodeLabels(filter: $filter) {
					label
					usageCount
					isCreator
				}
			}
		`,
		variables: {filter}
	});

	return new Map((result.data.nodeLabels as NodeLabel[]).map(item => [item.label, item]));
}

type LabelDropdownContent_Props = {
    label: string;
    usageCount: number;
    onClick?: ()=>void;
}

const LabelDropdownContent = ({label, usageCount, onClick}: LabelDropdownContent_Props) => {
    const [hovered, setHovered] = useState(false);
    return (
        <Row p={4} pl={10} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            onClick={onClick}
            style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer', backgroundColor: hovered ? 'rgba(0,0,0,0.2)' : 'transparent',
            }}
        >
            <div style={{ fontWeight: 500 }}>{label}</div>
            <div>&nbsp;({usageCount})</div>
        </Row>
    );
};

const LabelsPanel = observer_mgl(({node}: {node: NodeL3})=>{
	const dropDownRef = useRef<DropDown>(null);

	const reqIdRef = useRef(0);
	const debounceRef = useRef<NodeJS.Timeout>(null);

    const [fetchingLabels, setFetchingLabels] = useState({
		all: false, // for all the labels for this specific node
		search: false // for search results when Countadding a new label
	});
	const [fetchAllResults, setFetchAllResults] = useState<Map<string, NodeLabel>|n>(null);
	const [searchResult, setSearchResult] = useState<Map<string, NodeLabel>|n>(null);
	const [addLabelMode, setAddLabelMode] = useState(false);
	const [newLabelText, setNewLabelText] = useState("");
	const [saving, setSaving] = useState(false);

	const fetchAllLabelsForNode = async () => {
	    setFetchingLabels(prev=>({...prev, all: true}));
	    try {
	        const res = await fetchNodeLabels(node.id, null);
	        setFetchAllResults(res);
	    } finally {
	        setFetchingLabels(prev=>({...prev, all: false}));
	    }
	};

	// we'll debounce the search input to avoid excessive requests (in case the user types quickly),
	// and also use a reqId to ignore stale results (if the results come back out-of-order, if one comes late)
	const fetchLabelsForSearch = (text: string) => {
		debounceRef.current && clearTimeout(debounceRef.current);
	    debounceRef.current = setTimeout(async () => {
	        const id = ++reqIdRef.current;
	        setFetchingLabels(f => ({ ...f, search: true }));
	        try {
	            const res = await fetchNodeLabels(null, text);
				// we'll ignore stale response
	            if (id !== reqIdRef.current) return;
	            setSearchResult(res);
	        } finally {
	            if (id === reqIdRef.current)
	                setFetchingLabels(f => ({ ...f, search: false }));
	        }
	    }, 250);
	};

	const addLabel = async (label: string, fromTextInput: boolean)=>{
		fromTextInput && setSaving(true);
		await RunCommand_AddNodeLabel({nodeId: node.id, label});
		const res = await fetchNodeLabels(node.id, null);
		setFetchAllResults(res);
		fromTextInput && setSaving(false);
	};

	const removeLabel = async (label: string, forAllCreators: boolean)=>{
		// we'll set it to not be the creator immediately, and if it turns out that we were the last creator, then we'll remove it from the list entirely
		setFetchAllResults(prev=>{
			if (prev == null) return prev;
			const newMap = new Map(prev);
			if (!forAllCreators){
				newMap.get(label.toLowerCase())!.isCreator = false;
			}else{
				newMap.delete(label.toLowerCase());
			}
			return newMap;
		});

		let res = await RunCommand_DeleteNodeLabel({nodeId: node.id, label, forAllCreators});

		if (!res.stillCreatorLeft){
			setFetchAllResults(prev=>{
				if (prev == null) return prev;
				const newMap = new Map(prev);
				newMap.delete(label.toLowerCase());
				return newMap;
			});
		}
	}

	useEffect(() => {
		fetchAllLabelsForNode();
	}, [node.id]);

	if (fetchAllResults == null || fetchingLabels.all) {
		return <Row mt={5} style={{flexWrap: "wrap", gap: 5, justifyContent: "center"}}>
			Loading...
		</Row>;
	} else {
		return <>
			<Row center mt={5}>
				<Text style={{fontWeight: "bold"}}>Labels:</Text>
				{
					!addLabelMode &&
					<Button ml={5} p="3px 7px" text="+" enabled={HasModPermissions(MeID())} onClick={()=>{
						setAddLabelMode(true);
					}}/>}
					{addLabelMode &&
					<>
						<DropDown ref={dropDownRef}>
							<DropDownTrigger>
								<TextInput ml={5} instant={true} value={newLabelText}
									onChange={(val)=>{
										val = val.toLowerCase();
										fetchLabelsForSearch(val.trim());
										setNewLabelText(val.toLowerCase())
									}}
									onFocus={()=>{
										if (newLabelText.trim().length == 0) {
											fetchLabelsForSearch("");
										}
									}}
									onBlur={()=>{
										console.log("onBlur");
									}}
								/>
							</DropDownTrigger>
							<DropDownContent style={{ zIndex: zIndexes.dropdown, width: 240, padding: 0, border: "none"}}>
							    <Column>
							        {fetchingLabels.search || searchResult == null ? (
										// only showing this when search text is empty, btw we can also do this while typing but the user input is faster than fetching speed, so it would be a lot of flickering
										newLabelText.length === 0 && <Row p={2} style={{justifyContent: "center", alignItems: "center"}}>"Loading popular labels..."</Row>
							        ) : (
							            <ScrollView style={{maxHeight: 200, height: "100%"}}>
											{
												[...searchResult.values()].map((nodeLabel, index)=>{
													//  we'll only include those labels that arent already applied to the node
													if (!fetchAllResults.get(nodeLabel.label)){
														return <LabelDropdownContent
															key={index}
															label={nodeLabel.label}
															onClick={()=>{
																if (MeID() == null) return ShowSignInPopup();
																setNewLabelText(nodeLabel.label);
																dropDownRef.current?.Hide();
															}}
															usageCount={nodeLabel.usageCount}
														/>;
													}
												})
											}
							            </ScrollView>
							        )}
							    </Column>
							</DropDownContent>
						</DropDown>
						<Button ml={5} p="3px 7px" text={saving ? "Saving..." : "Add"} enabled={newLabelText.trim().length > 0 && !fetchAllResults.get(newLabelText) && !saving} onClick={()=>{
							addLabel(newLabelText, true);
							setAddLabelMode(false);
							setNewLabelText("");
						}}/>
						<Button ml={5} p="3px 7px" text="Cancel" onClick={()=>{
							setAddLabelMode(false);
							setNewLabelText("");
						}}/>
					</>
				}
			</Row>
			<Row mt={5} style={{flexWrap: "wrap", gap: 5}}>
				{
					[...fetchAllResults.values()].map((nodeLabel, index)=>{
						return (
							<Text key={index} /*ml={index == 0 ? 0 : 5} mt={5}*/ p="0 5px 3px"
									style={E({display: "inline-block", background: HSLA(0, 0, 1, .3), borderRadius: 5, cursor: "pointer"}, nodeLabel.isCreator && {background: "rgba(100,200,100,.5)"})}
									onClick={()=>{
										// if we are the creator of this label, then clicking it removes it and if we're not the creator,
										// then clicking it will add the user also as a creator of this label
										if (MeID() == null) return ShowSignInPopup();
										if (nodeLabel.isCreator){
											removeLabel(nodeLabel.label, false);
										}else{
											addLabel(nodeLabel.label, false);
										}
									}}>
								{nodeLabel.label}<sup>{nodeLabel.usageCount}</sup>
								{HasAdminPermissions(MeID()) && // mods are technically able to remove whatever tags they want, but we only want to show this "shortcut" tool to admins
								<VMenuStub>
									<VMenuItem text="Remove all" style={liveSkin.Style_VMenuItem()}
										onClick={async e=>{
											if (e.button != 0) return;
											removeLabel(nodeLabel.label, true);
										}}/>
								</VMenuStub>
								}
							</Text>
						);
					})
				}
			</Row>

		</>
	}

});

export type TagsPanel_Props = {
	show: boolean,
	map?: DMap|n,
	node: NodeL3,
	path: string
};

export const TagsPanel = observer_mgl((props: TagsPanel_Props)=>{
	const {show, node} = props;
	const uiState = store.main.maps.tagsPanel;
	const tags = GetNodeTags(node.id);

	return (
		<Column style={{position: "relative", display: show ? null : "none"}}>
			<Row center mt={5}>
				<Select displayType="button bar" options={GetEntries(TagsPanel_Subpanel, "ui")} value={uiState.subpanel} onChange={val=>RunInAction_Set(()=>uiState.subpanel = val)}/>
			</Row>
			{uiState.subpanel == TagsPanel_Subpanel.basic && <LabelsPanel node={node}/>}
			{uiState.subpanel == TagsPanel_Subpanel.advanced &&
			<>
				<Row center mt={5}>
					<Text style={{fontWeight: "bold"}}>Tags:</Text>
					<Button ml={5} p="3px 7px" text="+" enabled={HasModPermissions(MeID())} onClick={()=>{
						ShowAddTagDialog({
							mirrorChildrenFromXToY: new TagComp_MirrorChildrenFromXToY({nodeY: node.id}),
							nodes: [node.id],
						} as Partial<NodeTag>);
					}}/>
				</Row>
				{tags.filter(a=>a.labels == null).map((tag, index)=>{
					return (
						<TagRow key={index} tag={tag} index={index} node={node}/>
					);
				})}
			</>}
		</Column>
	);
});

type TagRow_Props = {
	node: NodeL3,
	tag: NodeTag,
	index: number
};

const TagRow = observer_mgl((props: TagRow_Props)=>{
	const {node, tag} = props;
	const [newTag, setNewTag] = useState<NodeTag|n>(null);
	const effectiveTag = newTag ?? tag;

	let tempCommand_valid = true;
	let tempCommand_error: string | undefined;
	if (tempCommand_valid && !effectiveTag.nodes.Contains(node.id)) {
		tempCommand_valid = false;
		tempCommand_error = `
			The selected-node cannot be detached from a tag through the Tags panel.

			To proceed, select a different attached node${/*, use the Database->Tags page*/""}, or delete and recreate for the target node.
		`.AsMultiline(0);
	}

	const creatorOrMod = PERMISSIONS.NodeTag.Modify(MeID(), tag);
	const compClass = GetTagCompClassByTag(tag);

	return (
		<Column mt={5} style={{background: HSLA(0, 0, 0, .3), padding: 5, borderRadius: 5}}>
			<TagDetailsUI  baseData={tag} phase={creatorOrMod ? "edit" : "view"} onChange={val=>setNewTag(val)}/>
			{creatorOrMod &&
				<Row mt={5}>
					<Button text="Save" enabled={tempCommand_valid} title={tempCommand_error} onLeftClick={async()=>{
						await RunCommand_UpdateNodeTag({id: tag.id, updates: GetUpdates(tag, effectiveTag)});
					}}/>

					<Button ml="auto" text="Delete" onLeftClick={async()=>{
						ShowMessageBox({
							title: "Delete node tag", cancelButton: true,
							message: `
								Delete the node tag below?
								Type: ${compClass.displayName}
							`.AsMultiline(0),
							onOK: async()=>{
								await RunCommand_DeleteNodeTag({id: tag.id});
							},
						});
					}}/>
				</Row>}
		</Column>
	);
});
