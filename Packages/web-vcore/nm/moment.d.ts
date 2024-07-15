import * as moment from "moment";
type MomentFunc = ((inp?: moment.MomentInput, format?: moment.MomentFormatSpecification, strict?: boolean) => moment.Moment) | ((inp?: moment.MomentInput, format?: moment.MomentFormatSpecification, language?: string, strict?: boolean) => moment.Moment);
declare const _default: MomentFunc & typeof moment;
export default _default;
