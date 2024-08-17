import {store} from "Store";
import {GetMapState, GetSelectedTimeline, GetTimelineInEditMode, GetTimelinePanelOpen} from "Store/main/maps/mapStates/$mapState.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {RunWithRenderingBatchedAndBailsCaught} from "Utils/UI/General.js";
import {GenerateSafeID, GetTimelineStepTimeFromStart, GetTimelineSteps, IsUserCreatorOrMod, DMap, MeID, Timeline, TimelineStep} from "dm_common";
import React, {useEffect} from "react";
import ReactList from "react-list";
import {ES, GetAutoElement, GetViewportRect, HSLA, Icon, O, Observer, PosChangeSource, RunInAction, RunInAction_Set, TextPlus, UseSize, YoutubePlayer, YoutubePlayerUI} from "web-vcore";
import {GetPercentFromXToY, Lerp, Timer, Vector2, WaitXThenRun, ea} from "js-vextensions";
import {computed, makeObservable, observable} from "mobx";
import {Button, CheckBox, Column, Row, Spinner, TimeSpanInput} from "react-vcomponents";
import {BaseComponent, GetDOM, UseCallback} from "react-vextensions";
import {ScrollSource, ScrollView} from "react-vscrollview";
import {GetOpenMapID} from "Store/main.js";
import {DroppableInfo} from "Utils/UI/DNDStructures.js";
import {Droppable, DroppableProvided, DroppableStateSnapshot} from "@hello-pangea/dnd";
import {GetPlaybackCurrentStepIndex} from "Store/main/maps/mapStates/PlaybackAccessors/Basic.js";
import {IsTimelineStepActive} from "Store/main/maps/mapStates/PlaybackAccessors/ForSteps.js";
import {GetAudioFilesActiveForTimeline} from "Utils/OPFS/Map/OPFS_Step.js";
import {TimelineAudioFilePlayer} from "./StepList/TimelineAudioFilePlayer.js";
import {StepUI} from "./StepList/StepUI.js";
import {RecordDropdown} from "./StepList/RecordDropdown.js";
import {AddTimelineStep_Simple} from "./StepList/Editing/StepEditorUI.js";

// for use by hello-pangea-dnd (using text-replacement/node-modules-patching)
G({LockMapEdgeScrolling});
function LockMapEdgeScrolling() {
	const mapID = GetOpenMapID();
	if (mapID == null) return;
	return store.main.maps.lockMapScrolling && GetTimelinePanelOpen(mapID) && GetTimelineInEditMode(mapID);
}

class NoVideoPlayer {
	constructor(comp: StepList) {
		makeObservable(this);
		this.comp = comp;
	}

	comp: StepList;

	@O speed = 1;
	SetSpeed(speed: number) {
		this.speed = speed;
		this.timer.intervalInMS = (1000 / 30) / speed;
		if (this.playing) {
			this.timer.Start();
		}
	}

	@O playing = false;
	SetPlaying(playing: boolean) {
		RunInAction("NoVideoPlayer.SetPlaying", ()=>this.playing = playing);
		this.timer.Enabled = playing;
		if (playing) this.timer_ticksSinceStart = 0;

		// debug
		//if (playing) Object.assign(g, {nvpTest_startTimeReal: Date.now(), nvpTest_startTimeSim: this.comp.targetTime, nvpTest_ticks: 0});
	}

	timer_ticksSinceStart = 0;
	timer = new Timer(1000 / 30, ()=>{
		this.timer_ticksSinceStart++;
		let framesToProgress = 2; // 2 frames = 1/30th of a second

		// if parent component gets unmounted, stop the timer (parent *should* call `SetPlaying(false)` itself, but this is a reasonable safety hatch)
		if (!this.comp.mounted) return void this.timer.Stop();

		// Apparently, Timer/setInterval can easily "fall behind" on the number of ticks that end up running!
		// To fix this, detect whenever our fall-behind amount is enough to warrant another half-tick (equating to 1 frame), and execute that half-tick synthetically.
		const timeSinceStart = Date.now() - this.timer.startTime;
		const ticksExpectedSinceStart = timeSinceStart / this.timer.intervalInMS;
		const ticksLost = ()=>ticksExpectedSinceStart - this.timer_ticksSinceStart;
		while (ticksLost() >= .5) {
			this.timer_ticksSinceStart += .5;
			//this.comp.AdjustTargetTimeByFrames(1);
			framesToProgress += 1;
		}

		this.comp.AdjustTargetTimeByFrames(framesToProgress);

		// debug
		/*g.nvpTest_ticks = (g.nvpTest_ticks ?? 0) + 1;
		console.log("@realTimePassed:", Date.now() - g.nvpTest_startTimeReal, "@simTimePassed:", (this.comp.targetTime - g.nvpTest_startTimeSim) * 1000, "@ticks:", g.nvpTest_ticks, "@ticks_asSimTime[if 1x]:", g.nvpTest_ticks * (1000 / 30));*/
	});
}

@Observer
export class StepList extends BaseComponent<{map: DMap, timeline: Timeline}, {}, {/*messageAreaHeight: number,*/ steps: TimelineStep[], creatorOrMod: boolean}> {
	static instance: StepList|n;
	constructor(props) {
		super(props);
		makeObservable(this);
	}

	//initialStash = { messageAreaHeight: 0 };

	player: YoutubePlayer;
	noVideoPlayer = new NoVideoPlayer(this);
	listRootEl: HTMLDivElement;
	sideBarEl: HTMLDivElement;
	//stepRects = [] as VRect[];
	//stepComps = [] as StepUI[];
	stepElements = [] as HTMLDivElement[];
	stepElements_updateTimes = {};

	// there are two "target time" fields: store.main.maps.$mapID.playingTimeline_time, this.targetTime
	// #1 is for persistence between sessions and sharing with node-uis (updates about once per second), #2 is for this comp's arrow (frequent updates)

	@observable listY: number;
	@observable messageAreaHeight = 0;

	@observable targetTime: number;
	//targetStepIndex = null as number;
	lastPosChangeSource: PosChangeSource;

	AdjustTargetTimeByFrames(frameDelta: number) {
		const newTargetTime = (this.targetTime ?? 0) + (frameDelta * (1 / 60));
		this.SetTargetTime(newTargetTime.KeepAtLeast(0), "setPosition");
	}
	SetTargetTime(newTargetTime: number, source: PosChangeSource) {
		const {map} = this.props;
		const mapState = GetMapState(map.id);
		if (mapState == null) return;
		RunInAction("StepList.SetTargetTime", ()=>{
			this.targetTime = newTargetTime;

			// commented; for node/line animation to work, the global timeline-time field must be updated
			/*if (newTargetTime.FloorTo(1) != mapState.playingTimeline_time) {
				mapState.playingTimeline_time = newTargetTime.FloorTo(1);
			}*/
			mapState.playingTimeline_time = newTargetTime;

			this.lastPosChangeSource = source;
		});
	}

	@computed get SharedInfo() {
		const {map} = this.props;
		// const mapInfo = storeM.main.maps.get(map.id);
		const timeline = GetSelectedTimeline(map.id);
		// const { targetTime, autoScroll } = this.state;
		// const { messageAreaHeight } = this.stash;

		// tell mobx to track scroll-pos (we use the derivative, eg. GetViewportRect(listRoot), but mobx doesn't track that; so we explicitly track its source)
		this.listY;

		let targetStepIndex: number|n;
		let targetTime_yInMessageArea: number|n;
		if (timeline) {
			// const steps = timeline ? GetTimelineSteps(timeline, false) : null;
			const steps = GetTimelineSteps(timeline.id);
			//const stepTimesFromStart = steps.map(step=>GetTimelineStepTimeFromStart(step.id));
			const firstNormalStep = steps[1];
			const targetStep = steps.Skip(1).LastOrX(a=>a && IsTimelineStepActive(a, this.targetTime)) ?? firstNormalStep!;
			if (targetStep) {
				targetStepIndex = steps.indexOf(targetStep);
				//const postTargetStepIndex = targetStepIndex + 1 < steps.length ? targetStepIndex + 1 : -1;
				const postTargetStepIndex = (targetStepIndex + 1).KeepAtMost(steps.length - 1); // if on last step, we want arrow to stop there, so consider last-step both the current-step and next-step (for arrow positioning)
				const postTargetStep: TimelineStep|n = steps[postTargetStepIndex];

				const targetStepTimeFromStart = GetTimelineStepTimeFromStart(targetStep);
				const postTargetStepTimeFromStart = GetTimelineStepTimeFromStart(postTargetStep);

				// const targetStep_rect = this.stepRects[targetStepIndex];
				/* const targetStep_comp = this.stepComps[targetStepIndex];
				if (postTargetStep && targetStep_comp) {
					const listRoot = targetStep_comp.DOM_HTML.parentElement.parentElement.parentElement; */
				const targetStep_el = this.stepElements[targetStepIndex];
				if (postTargetStep && targetStep_el && document.body.contains(targetStep_el)) {
					const listRoot = targetStep_el.parentElement!.parentElement!.parentElement!;
					const listRect = GetViewportRect(listRoot);
					const targetStep_rect = GetViewportRect(targetStep_el);
					targetStep_rect.Position = targetStep_rect.Position.Minus(listRect.Position);
					// Log('Target step rect:', targetStep_rect);

					// const postTargetStep_rect = this.stepRects[postTargetStepIndex];
					/* const targetTime_screenY = Lerp(targetStep_rect.Top, targetStep_rect.Bottom, GetPercentFromXToY(targetStep.videoTime, postTargetStep.videoTime, targetTime));
					targetTime_yInParent = targetTime_screenY - GetViewportRect(this.sideBarEl).y; */
					const percentThroughStep = GetPercentFromXToY(targetStepTimeFromStart ?? 0, postTargetStepTimeFromStart ?? 0, this.targetTime);
					const targetTime_yInList = Lerp(targetStep_rect.Top, targetStep_rect.Bottom, percentThroughStep);
					// const listY = GetViewportRect(this.listRootEl).y;
					// const { listY } = this.state;
					const messageAreaY = GetViewportRect(this.sideBarEl).y;
					const messageAreaYDiffFromListY = messageAreaY - this.listY;
					targetTime_yInMessageArea = targetTime_yInList - messageAreaYDiffFromListY;
					//AssertWarn(!IsNaN(targetTime_yInMessageArea));

					// this can happen if executing during first render() call
					if (isNaN(targetTime_yInMessageArea)) {
						targetTime_yInMessageArea = 0;
					}
				}
			}
		}

		let targetTimeDirection;
		if (targetTime_yInMessageArea != null) {
			if (targetTime_yInMessageArea < 0) targetTimeDirection = "up";
			else if (targetTime_yInMessageArea >= this.messageAreaHeight - 20) targetTimeDirection = "down";
			else targetTimeDirection = "right";
		} else if (this.list) {
			const [firstVisibleIndex, lastVisibleIndex] = this.list.getVisibleRange();
			targetTimeDirection = (targetStepIndex ?? 0) <= firstVisibleIndex ? "up" : "down";
			targetTime_yInMessageArea = targetTimeDirection == "up" ? 0 : this.messageAreaHeight - 20;
		}

		/* let distanceOffScreen: number;
		if (targetTimeDirection == 'up') distanceOffScreen = -targetTime_yInMessageArea;
		else if (targetTimeDirection == 'down') distanceOffScreen = targetTime_yInMessageArea - (messageAreaHeight - 20); */

		// this.Stash({ targetTime_yInMessageArea, targetTimeDirection } as any); // for debugging
		return {targetTime_yInMessageArea, targetTimeDirection};
	}
	@computed get targetTime_yInMessageArea() {
		return this.SharedInfo.targetTime_yInMessageArea;
	}
	@computed get targetTimeDirection(): "down" | "up" | "right" {
		return this.SharedInfo.targetTimeDirection || "down";
	}

	timer = new Timer(100, ()=>RunWithRenderingBatchedAndBailsCaught(()=>{
		const {map} = this.props;
		if (this.listRootEl == null) return; // if something goes wrong with rendering, we don't want to keep spewing new errors

		const newListY = GetViewportRect(this.listRootEl).y;
		if (this.listY != newListY) {
			RunInAction("StepList_timer.setListY", ()=>this.listY = newListY);
		}

		const mapState = GetMapState(map.id);
		if (mapState == null) return void console.warn("Map-state not found for map:", map.id);

		const timeline = GetSelectedTimeline(map.id);
		const oldCurrentStepIndex = GetPlaybackCurrentStepIndex() ?? 0;
		//const oldAppliedStepIndex = GetPlaybackAppliedStepIndex() ?? 0;
		if (timeline && this.targetTime != null) {
			const steps = GetTimelineSteps(timeline.id);
			const firstStep = steps[0];

			const targetStep = steps.LastOrX(a=>a && IsTimelineStepActive(a, this.targetTime)) ?? firstStep;
			if (targetStep) {
				const newCurrentStepIndex = steps.indexOf(targetStep);
				//const newAppliedStepIndex = newCurrentStepIndex.KeepAtLeast(oldAppliedStepIndex);
				const newAppliedStepIndex = newCurrentStepIndex; // for now, have applied-step always match the current-step
				if (newCurrentStepIndex != oldCurrentStepIndex) {
					//console.log("Target-step changing @Old:", oldCurrentStepIndex, "@New:", newCurrentStepIndex, "@Time:", this.targetTime);
					RunInAction("StepList_timer.setStepAndAppliedStep", ()=>{
						mapState.playingTimeline_step = newCurrentStepIndex;
						//mapState.playingTimeline_appliedStep = newAppliedStepIndex;

						// commented; see TimelineNodeFocuser.ts instead
						/*if (newAppliedStepIndex > oldAppliedStepIndex) {
							for (let i = oldAppliedStepIndex + 1; i <= newAppliedStepIndex; i++) {
								const step = steps[i];
								for (const nodeReveal of step.nodeReveals) {
									ACTNodeExpandedSet({mapID: map.id, path: nodeReveal.path, expanded: nodeReveal.show, expandAncestors: true}});
								}
							}
						}*/
					});

					if (store.main.timelines.autoScroll && this.lastPosChangeSource == "playback") {
						// jump one further down, so that the target point *within* the target step is visible (and with enough space for the arrow button itself)
						// this.list.scrollAround(newTargetStepIndex + 1);
						// jump X further down, so that we see some of the upcoming text (also for if video-time data is off some)
						this.list.scrollAround(newCurrentStepIndex + 3);
						WaitXThenRun(0, ()=>this.list.scrollAround(newCurrentStepIndex)); // make sure target box itself is still visible, however
					}
				}
			}
		}
	}));

	OnScroll = (e: React.UIEvent<HTMLDivElement>, source: ScrollSource, pos: Vector2)=>{
		// we only change auto-scroll status if the user initiated the scroll
		if (source == ScrollSource.Code) return;

		// this processing is here rather than in timer, because only this OnScroll function is told whether the scroll was user-initiated
		const {map} = this.props;
		if (this.targetTimeDirection != "right") {
			RunInAction("StepList.OnScroll", ()=>store.main.timelines.autoScroll = false);
		}
	};

	list: ReactList;
	render() {
		const {map, timeline} = this.props;
		const mapState = GetMapState(map.id);
		if (mapState == null) return null;
		const steps = timeline ? GetTimelineSteps(timeline.id) : ea;
		//const targetStepIndex = GetPlaybackAppliedStepIndex();
		const targetStepIndex = GetPlaybackCurrentStepIndex();

		const audioFiles = timeline ? GetAudioFilesActiveForTimeline(map.id, timeline.id) : [];

		const creatorOrMod = IsUserCreatorOrMod(MeID(), timeline);
		this.Stash({steps, creatorOrMod});

		const [messageAreaRef, {height: messageAreaHeight}] = UseSize(); // todo: maybe switch this to use `useResizeObserver()`, so reacts to [css/window]-only height changes
		// this.Stash({ messageAreaHeight });
		// todo: make sure this is correct
		useEffect(()=>{
			RunInAction("StepList.render.useEffect", ()=>this.messageAreaHeight = messageAreaHeight ?? 0); // set for other observers
		});

		useEffect(()=>{
			StepList.instance = this;
			return ()=>{
				if (StepList.instance == this) StepList.instance = null;
			};
		});

		// update some stuff based on timer (since user may have scrolled)
		useEffect(()=>{
			this.timer.Start();
			return ()=>{
				this.timer.Stop();

				// when component is unmounted...
				// stop the non-component-based timers/players
				this.noVideoPlayer.SetPlaying(false);
				// store the exact timeline playing-time (so it can be restored exactly to StepList.targetTime when component is re-mounted)
				RunInAction("StepList.onUnmount", ()=>mapState.playingTimeline_time = this.targetTime);
			};
		}, ["depToEnsureEffectRunsOnFirstNonBailedRender"]); // eslint-disable-line

		const droppableInfo = new DroppableInfo({type: "TimelineStepList", timelineID: timeline ? timeline.id : null});

		const reactList = ()=>{
			//return timelineSteps && timelineSteps.map((step, index) => <StepUI key={index} index={index} last={index == timeline.steps.length - 1} map={map} timeline={timeline} step={step}/>)
			return <ReactList type='variable' length={steps?.length ?? 0}
				ref={UseCallback(c=>{
					this.list = c;
					if (c) {
						this.listRootEl = GetDOM(c) as any;
					}
				}, [])}
				initialIndex={targetStepIndex ?? 0}
				// pageSize={20} threshold={300}
				itemSizeEstimator={this.EstimateStepHeight}
				itemRenderer={this.RenderStep}/>;
		};

		// todo: make-so the UseCallbacks below can't break from this early-return changing the hook-count (atm, not triggering since timeline is always ready when this comp renders)
		if (timeline == null) return null;
		return (
			<Column style={{flex: 1, minHeight: 0}}>
				{timeline.videoID == null && <div ref={c=>{
					// if no video is attached, use this empty div as an alternative route to setting the targetTime field
					if (c && this.targetTime == null) {
						RunInAction("StepList.targetTimeInitializer.onAttach", ()=>this.targetTime = mapState.playingTimeline_time ?? 0);
					}
				}}/>}
				{timeline.videoID &&
				<YoutubePlayerUI /* ref={videoRef} */ videoID={timeline.videoID} startTime={mapState.playingTimeline_time || (timeline.videoStartTime ?? undefined)} heightVSWidthPercent={timeline.videoHeightVSWidthPercent ?? .56}
					onPlayerInitialized={player=>{
						this.player = player;
						player.GetPlayerUI().style.position = "absolute";
						// this.Update();
						this.forceUpdate();
					}}
					onPosChanged={(pos, source)=>{
						if (pos == 0) return; // ignore "pos 0" event; this just happens when the video first loads (even if seek-to time set otherwise)
						this.SetTargetTime(pos, source);
					}}/>}
				{audioFiles.map((audioFile, index)=>{
					// ensure that each audio File object has a unique ID, and thus a unique TimelineAudioFilePlayer associated with it (the comp is not resilient to audio file/blob switchouts atm)
					if (audioFile["vID"] == null) audioFile["vID"] = GenerateSafeID();
					//const key = `${index}_${audioFile.name}`;
					const key = audioFile["vID"];

					return <TimelineAudioFilePlayer key={key} map={map} timeline={timeline} steps={steps} audioFile={audioFile}
						playSpeedGetter={()=>this.noVideoPlayer.speed} isPlayingGetter={()=>this.noVideoPlayer.playing} timeGetter={()=>this.targetTime}/>;
				})}
				<Row style={{height: 30, background: liveSkin.BasePanelBackgroundColor().css()}}>
					<CheckBox text="Playback:" value={mapState.timelinePlayback} onChange={val=>RunInAction_Set(this, ()=>mapState.timelinePlayback = val)}/>
					<Button ml={5} mdIcon={this.noVideoPlayer.playing ? "pause" : "play"} size={30} onClick={()=>this.noVideoPlayer.SetPlaying(!this.noVideoPlayer.playing)}/>
					<Spinner style={{width: 45}} instant={true} min={0} max={10} step={.1} value={this.noVideoPlayer.speed} onChange={val=>this.noVideoPlayer.SetSpeed(val)}/>
					<TimeSpanInput largeUnit="minute" smallUnit="second" style={{width: 60}} value={this.targetTime ?? 0} onChange={val=>{
						this.SetTargetTime(val, "setPosition");
					}}/>
					<TextPlus ml={3} info="With mouse over button, mouse scroll-wheel moves forward/backward by X frames.">Seek:</TextPlus>
					<Button text="±1" ml={3} p={5} onClick={()=>this.AdjustTargetTimeByFrames(1)} onWheel={e=>this.AdjustTargetTimeByFrames(Math.sign(e.deltaY) * 1)}/>
					<Button text="±5" ml={3} p={5} onClick={()=>this.AdjustTargetTimeByFrames(5)} onWheel={e=>this.AdjustTargetTimeByFrames(Math.sign(e.deltaY) * 5)}/>
					<Button text="±20" ml={3} p={5} onClick={()=>this.AdjustTargetTimeByFrames(20)} onWheel={e=>this.AdjustTargetTimeByFrames(Math.sign(e.deltaY) * 20)}/>
					<Button text="±60" ml={3} p={5} onClick={()=>this.AdjustTargetTimeByFrames(60)} onWheel={e=>this.AdjustTargetTimeByFrames(Math.sign(e.deltaY) * 60)}/>
					<Button text="±600" ml={3} p={5} onClick={()=>this.AdjustTargetTimeByFrames(600)} onWheel={e=>this.AdjustTargetTimeByFrames(Math.sign(e.deltaY) * 600)}/>

					<Row ml="auto" style={{position: "relative"}}>
						<RecordDropdown/>
					</Row>
				</Row>
				<Row ref={c=>c && c.DOM && messageAreaRef(c.DOM)} style={{flex: 1, minHeight: 0}}>
					<Column ref={c=>this.sideBarEl = c ? c.DOM as any : null} style={{position: "relative", width: 20, background: HSLA(0, 0, 0, 1)}}>
						<Button text={<Icon icon={`arrow-${this.targetTimeDirection}`} size={20}/>} /* enabled={targetTime_yInMessageArea < 0 || targetTime_yInMessageArea >= messageAreaHeight - 20} */
							style={{
								background: "none", padding: 0,
								position: "absolute", top: this.targetTime_yInMessageArea ? this.targetTime_yInMessageArea.KeepBetween(0, (messageAreaHeight ?? 0) - 20) : 0,
								// opacity: autoScroll ? 1 : 0.7,
								filter: store.main.timelines.autoScroll ? "sepia(1) saturate(15) hue-rotate(55deg)" : null,
							}}
							onClick={UseCallback(()=>{
								if (this.list == null || targetStepIndex == null) return;
								const targetOffScreen = this.targetTimeDirection != "right";
								if (targetOffScreen) {
									if (this.targetTimeDirection == "down") {
										this.list.scrollAround(targetStepIndex + 1); // jump one further down, so that the target point *within* the target step is visible (and with enough space for the arrow button itself)
									} else {
										this.list.scrollAround(targetStepIndex);
									}
								}

								const newAutoScroll = !store.main.timelines.autoScroll;
								RunInAction("StepList.targetArrow.onClick", ()=>store.main.timelines.autoScroll = newAutoScroll);
							}, [targetStepIndex])}/>
					</Column>
					<ScrollView className="brightScrollBars" style={ES({flex: 1})}
						contentStyle={ES({
							flex: 1, position: "relative", padding: 7,
							//filter: "drop-shadow(rgb(0, 0, 0) 0px 0px 10px)",
							background: "rgba(0,0,0,1)",
							minHeight: "100%", // since we're setting a background, make sure it fills the whole scroll-view area
						})}
						scrollVBarStyle={{width: 7}} // width:7 to match with container padding
						onScroll={this.OnScroll}
					>
						{!mapState.timelineEditMode && reactList()}
						{mapState.timelineEditMode &&
						<Droppable type="TimelineStep" droppableId={JSON.stringify(droppableInfo.VSet({timelineID: timeline.id}))} isDropDisabled={!creatorOrMod}>
							{(provided: DroppableProvided, snapshot: DroppableStateSnapshot)=>{
								return (
									<Column ref={c=>provided.innerRef(GetDOM(c) as any)} {...provided.droppableProps}>
										{reactList()}
										{steps.length == 0 && !mapState.timelineEditMode && <Row>Switch to edit-mode to add steps.</Row>}
										{mapState.timelineEditMode &&
										<Row style={{justifyContent: "center"}}>
											<Button text="Add timeline step" mt={5} mb={5} enabled={creatorOrMod} onClick={()=>{
												AddTimelineStep_Simple(timeline.id, steps, steps.length);
											}}/>
										</Row>}
									</Column>
								);
							}}
						</Droppable>}
					</ScrollView>
				</Row>
			</Column>
		);
	}
	stepList: ReactList|n;

	/*EstimateStepHeight = (index: number, cache: any)=>{
		return 50; // keep at just 50; apparently if set significantly above the actual height of enough items, it causes a gap to sometimes appear at the bottom of the viewport
	};*/
	EstimateStepHeight = (index: number, cache: any)=>{
		return 100;
	};
	RenderStep = (index: number, key: any)=>{
		const {map, timeline, steps, creatorOrMod} = this.PropsStash;
		if (steps == null) return <div key={key}/>;
		const step = steps[index];
		//const nextStep = steps[index + 1];

		//return <StepEditorUI key={step.id} index={index} map={map} timeline={timeline!} step={step} nextStep={nextStep} draggable={creatorOrMod}/>;
		return <StepUI key={step.id} index={index} last={index == steps.length - 1} map={map} timeline={timeline} steps={steps} step={step} player={this.player}
			ref={c=>{
				if (c == null || c.DOM_HTML == null) return;
				this.stepElements[index] = c.DOM_HTML as any;
				this.stepElements_updateTimes[index] = Date.now();
			}}/>;
	};
}