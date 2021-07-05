import {autorun, IAutorunOptions, IReactionDisposer, IReactionPublic} from "web-vcore/nm/mobx";
import {CatchBail} from "web-vcore/nm/mobx-graphlink";

export function AutoRun_HandleBail(view: (r: IReactionPublic)=>any, opts?: IAutorunOptions): IReactionDisposer {
	return autorun(()=>CatchBail(null, view), opts);
}