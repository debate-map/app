import Moment from "moment";
G({Moment});

//g.Break = function() { debugger; };
G({Debugger_If}); declare global { function Debugger(); }
export function Debugger() { debugger; }
G({Debugger_If}); declare global { function Debugger_True(); }
export function Debugger_True() { debugger; return true; }
G({Debugger_If}); declare global { function Debugger_If(condition); }
export function Debugger_If(condition) {
    if (condition)
        debugger;
}