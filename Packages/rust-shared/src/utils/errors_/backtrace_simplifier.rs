use crate::anyhow::{Error, ensure};
use crate::itertools::Itertools;
use once_cell::sync::Lazy;
use regex::Regex;

#[derive(Clone)]
enum StackTraceLine {
    // source types
    FuncName(String),
    CodePath(String),
    Other(String),
    // types that only exist after simplification
    CodePathPlusFuncName(String),
}
impl StackTraceLine {
    pub fn get_str(&self) -> &str {
        match self {
            Self::FuncName(str) => str,
            Self::CodePath(str) => str,
            Self::Other(str) => str,
            Self::CodePathPlusFuncName(str) => str,
        }
    }
}

#[allow(non_upper_case_globals)]
pub fn simplify_backtrace_str(source: String) -> String {
    let lines_raw = source.split("\n");
    static regex__func_name: Lazy<Regex> = Lazy::new(|| Regex::new(r"^ +(\d+):").unwrap());
    static regex__code_path: Lazy<Regex> = Lazy::new(|| Regex::new(r"^ +at ").unwrap());
    static regex__code_path_for_own_code: Lazy<Regex> = Lazy::new(|| Regex::new(r"^ +at \./").unwrap());
    static regex__github_path: Lazy<Regex> = Lazy::new(|| Regex::new("/usr/local/cargo/registry/src/github.com-([0-9a-f]+)/").unwrap());
    static regex__rustc_path: Lazy<Regex> = Lazy::new(|| Regex::new("/rustc/([0-9a-f]+)/").unwrap());

    let lines = lines_raw.map(|line| {
        if regex__func_name.is_match(line) {
            let simplified = line.trim_start().to_owned();
            StackTraceLine::FuncName(simplified)
        } else if regex__code_path.is_match(line) {
            let mut simplified = line.trim_start().to_owned();
            simplified = regex__github_path.replace(&simplified, "[GH]/").into_owned();
            simplified = regex__rustc_path.replace(&simplified, "[RUSTC]/").into_owned();
            // for code-path lines that are for non-local-project files, indent it a bit (making visual distinction easier)
            if !regex__code_path_for_own_code.is_match(line) {
                simplified.insert_str(0, "    ");
            }
            StackTraceLine::CodePath(simplified)
        } else {
            StackTraceLine::Other(line.to_owned())
        }
    }).collect_vec();
    let indent_for_column_2: usize = lines.iter().filter_map(|line| {
        match line {
            StackTraceLine::CodePath(str) => Some(str.len()),
            _ => None,
        }
    }).max().unwrap_or(0) + 3; // add a 3-space buffer, for longest-path-line

    let old_lines = lines.clone();
    let new_lines = lines.into_iter().enumerate().filter_map(|(i, line)| {
        match line {
            StackTraceLine::FuncName(_) => {
                let next_line_is_path_line = match &old_lines.get(i + 1) { Some(StackTraceLine::CodePath(_)) => true, _ => false };
                if next_line_is_path_line {
                    None
                } else {
                    // if we can't find a code-path line after this func-name line, indent this line anyway, right here
                    let func_line_str = old_lines.get(i).unwrap().get_str();
                    let new_line = StackTraceLine::CodePathPlusFuncName(" ".repeat(indent_for_column_2) + func_line_str);
                    Some((i, new_line))
                }
            },
            StackTraceLine::CodePath(_) => {
                let path_line_str = old_lines.get(i).unwrap().get_str();
                let func_line_str = match &old_lines.get(i - 1) { Some(StackTraceLine::FuncName(str)) => Some(str), _ => None };
                if let Some(func_line_str) = func_line_str {
                    let spaces_to_reach_c2_indent = indent_for_column_2 - path_line_str.len();
                    let new_line = StackTraceLine::CodePathPlusFuncName(path_line_str.to_owned() + &" ".repeat(spaces_to_reach_c2_indent) + &func_line_str);
                    return Some((i, new_line));
                }
                Some((i, line))
            },
            _ => Some((i, line)),
        }
    }).map(|a| a.1).collect_vec();

    let result = new_lines.iter().map(|a| a.get_str()).collect_vec().join("\n");
    result
}