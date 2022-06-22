import {buildLexoRank, NumeralSystem64} from "@wewatch/lexorank";
// required atm, for use in NodeJS-based app-server-js
/*import LexoRankPkg from "@wewatch/lexorank";
const {buildLexoRank, NumeralSystem64} = LexoRankPkg;*/

// todo: maybe replace this system eventually with the simpler system Figma uses (as seen here: https://github.com/jdcaballerov/lexorank-rust)

// see here for defaults: https://github.com/wewatch/lexorank/blob/master/src/lexoRank/config.ts
export const VLexoRank = buildLexoRank({
	NumeralSystem: NumeralSystem64,
	//defaultGap: "8",
	//maxOrder: 6,
	//initialMinDecimal: "100000",
});