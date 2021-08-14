import {makeAddInflectorsPlugin} from "graphile-utils";
import type {PgAttribute} from "graphile-build-pg";

export const CustomInflectorPlugin = makeAddInflectorsPlugin(inflectors=>{
	const old = {...inflectors};
	const newInflectors = {};

	// helper function to replace a name, when you don't know what inflection method should be overridden
	// commented; not really needed anymore, now that I know camelCase and upperCamelCase overrides work well
	/*for (const key of Object.keys(old)) {
		newInflectors[key] = function(...args) {
			const result = old[key].apply(this, args);

			// place your "global name overrides" here
			if (result == "feedbackProposals") return "feedback_proposals";
			if (result == "feedbackProposal") return "feedback_proposal";
			if (result == "feedbackUserData") return "feedback_userDatas";
			if (result == "feedbackUserDatum") return "feedback_userData";

			return result;
		};
	}*/

	Object.assign(newInflectors, {
		// for semi-global name overrides, specifically: table-names, field-names, etc.
		camelCase(...args) {
			const result = old.camelCase.apply(this, args);
			if (result == "feedbackProposals") return "feedback_proposals";
			if (result == "feedbackProposal") return "feedback_proposal";
			/*if (result == "feedbackUserData") return "feedback_userDatas";
			if (result == "feedbackUserDatum") return "feedback_userData";*/
			if (result == "feedbackUserInfos") return "feedback_userInfos";
			if (result == "feedbackUserInfo") return "feedback_userInfo";
			return result;
		},
		// for semi-global name overrides, specifically: graphql type-names, etc.
		upperCamelCase(...args) {
			const result = old.upperCamelCase.apply(this, args);
			/*if (result == "FeedbackUserData") return "Feedback_UserDatas";
			if (result == "FeedbackUserDatum") return "Feedback_UserData";*/
			if (result == "FeedbackUserInfos") return "Feedback_UserInfos";
			if (result == "FeedbackUserInfo") return "Feedback_UserInfo";
			return result;
		},

		/*enumName(value: string) {
			// By the time we get here, `inflectors.enumName` refers to this very
			// method, so we must call `oldEnumName` rather than
			// `inflectors.enumName` otherwise we will get a "Maximum call stack size
			// exceeded" error.

			// Further, we must ensure that the value of `this` is passed through
			// otherwise the old inflector cannot reference other inflectors.

			//return oldEnumName.call(this, value.replace(/\./g, "_"));
			return oldEnumName.call(this, value).replace(/Id/g, "ID");
			//return oldEnumName.call(this, value.replace(/Id/g, "ID"));
		},*/
		// for turning plural into singular
		/*getBaseName(value: string) {
			//return value.replace(/Id/g, "ID");
			console.log("Test1", value);
			return oldGetBaseName.call(this, value)?.replace(/Id/g, "ID");
		},*/
		column(attr: PgAttribute) {
			//return old.column.call(this, attr).replace(/Id/g, "ID"); // call to old-func
			//return this.camelCase(this._columnName(attr)); // old-func code
			return this._columnName(attr); // modified version, without call to camelCase
		},

		// these don't work for some reason, so I needed to use the "semi-global name overrider" seen above (camelCase method)
		//_tableName(table: PgClass) {
		/*_tableName(table: any) {
			const result = old._tableName.call(this, table);
			//const result = this._tableName(table);
			console.log("Old:", result);
			if (result == "feedbackProposals") return "feedback_proposals";
			return result;
		},*/
		/*coerceToGraphQLName(...args) {
			const result = old.coerceToGraphQLName.apply(this, args);
			//console.log("Old1:", result);
			if (result == "feedbackProposal") return "feedback_proposal";
			if (result == "feedbackProposals") return "feedback_proposals";
			return result;
		},
		_singularizedTableName(...args) {
			const result = old._singularizedTableName.apply(this, args);
			//console.log("Old2:", result);
			if (result == "feedbackProposal") return "feedback_proposal";
			if (result == "feedbackProposals") return "feedback_proposals";
			return result;
		},*/
	});

	return newInflectors;
}, true);