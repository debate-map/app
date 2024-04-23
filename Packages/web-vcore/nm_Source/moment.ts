//export * from "moment";
/*import moment = require("moment");
export default moment;*/

import * as moment from "moment";
//export default moment;

type MomentFunc = ((inp?: moment.MomentInput, format?: moment.MomentFormatSpecification, strict?: boolean)=>moment.Moment)
	| ((inp?: moment.MomentInput, format?: moment.MomentFormatSpecification, language?: string, strict?: boolean)=>moment.Moment);
const moment_fixed = moment as any as {default: MomentFunc & typeof moment};
/*const moment_fixed = moment as (
	((inp?: moment.MomentInput, format?: moment.MomentFormatSpecification, strict?: boolean)=>moment.Moment)
	| ((inp?: moment.MomentInput, format?: moment.MomentFormatSpecification, language?: string, strict?: boolean)=>moment.Moment)
) & typeof moment;*/
export default moment_fixed.default;