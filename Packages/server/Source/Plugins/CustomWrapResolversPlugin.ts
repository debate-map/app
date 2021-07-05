import {makeWrapResolversPlugin} from "postgraphile";

export const CustomWrapResolversPlugin = makeWrapResolversPlugin({
	/*User: {
		async email(resolve, source, args, context, resolveInfo) {
			const result = await resolve(source, args, context, resolveInfo);
			return result.toLowerCase();
		},
	},*/
});