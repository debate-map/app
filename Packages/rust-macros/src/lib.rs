/*use std::env::args;

use async_graphql_derive::SimpleObject;
//use async_graphql_derive::derive_simple_object;

//use darling::{FromDeriveInput, FromMeta};
use proc_macro::TokenStream;
use syn::parse_macro_input;
use syn::{AttributeArgs, DeriveInput, ItemFn, ItemImpl};

// function copied from async_graphql_derive's source
fn derive_simple_object(input: TokenStream) -> TokenStream {
    let object_args =
        match args::SimpleObject::from_derive_input(&parse_macro_input!(input as DeriveInput)) {
            Ok(object_args) => object_args,
            Err(err) => return TokenStream::from(err.write_errors()),
        };
    match simple_object::generate(&object_args) {
        Ok(expanded) => expanded,
        Err(err) => err.write_errors().into(),
    }
}

#[proc_macro_derive(SimpleObject_Cached)]
pub fn derive_simple_object_cached(input: TokenStream) -> TokenStream {
    //let input_tokens = &parse_macro_input!(input as DeriveInput);
    println!("{}", input);

    const input_changed_since_last_invokation: bool = ...; // TODO; check if input has changed since last cache-file save
    
    let output_tokens = if input_changed_since_last_invokation {
        //let temp = derive_simple_object(input);
        let temp = SimpleObject(input);
        save_output_tokens_to_cache(temp); // TODO; save output_tokens to cache-file
        temp
    } else {
        read_output_tokens_from_cache(input); // TODO; read previous output_tokens from cache-file, for the given macro
    };

    return output_tokens;
}*/

extern crate proc_macro;
extern crate syn;
use std::{env, fs};
use std::process::{Command, Stdio};
//use std::path::Path;
use std::io::{BufReader, BufRead};
use std::str::FromStr;

use proc_macro::{TokenStream, Ident, Span};
//use syn::token::Token;
use quote::quote;

#[proc_macro]
pub fn cached_expand(input: TokenStream) -> TokenStream {
    let _input_str = input.to_string();
    //println!("Input: {:?}", input);

    let group_id = {
        let mut result = "".to_owned();
        let mut last_token_str: Option<String> = None;
        for token in input.clone() {
            println!("Got token:{token}");
            let token_str = format!("{token}");
            if token_str.starts_with("CEID_") && last_token_str.is_some() && last_token_str.unwrap() == "struct" {
                result = token_str["CEID_".len()..].to_string();
                break;
            }

            last_token_str = Some(token_str);
        }
        if result == "" {
            panic!("Could not find required struct matching pattern: CEID_<group name here>");
        }
        result
    };
    println!("Found group-id:{}", group_id);
    let cache_folder_path = env::current_dir().unwrap().join("target").join("cached_expand").join("expansions");
    let cache_input_path = cache_folder_path.join(group_id.clone() + "_Input");
    let cache_output_path = cache_folder_path.join(group_id.clone() + "_Output");

    //if env::var("FOR_CACHED_EXPAND").is_ok_with(|a| a == "1") {
    //if let Ok(val) = env::var("FOR_CACHED_EXPAND") && val == "1" {
    const SPECIAL_MESSAGE_1: &str = "FOR_CACHED_EXPAND is true, so only adding markers.";
    const SPECIAL_MESSAGE_2: &str = "FOR_RUST_ANALYZER is true, so only adding markers.";
    let only_add_markers = {
        let mut temp = false;
        // if this macro is running as part of the "cargo expand" command (of a parent instance of this macro), then...
        if let Ok(val) = env::var("FOR_CACHED_EXPAND") {
            if val == "1" {
                println!("{}", SPECIAL_MESSAGE_1);
                temp = true;
            }
        }
        // if this macro is running as part of rust-analyzer, then...
        // todo: find alternative (one I didn't hard-code into settings.json)
        if let Ok(val) = env::var("FOR_RUST_ANALYZER") {
            if val == "1" {
                println!("{}", SPECIAL_MESSAGE_2);
                temp = true;
            }
        }
        temp
    };
    if only_add_markers {
        /*let pre_tokens = TokenStream::from(quote! { struct StartMarker {} });*/
        let pre_tokens = TokenStream::from_str(format!("struct StartMarker_{group_id} {{}}").as_str()).unwrap();
        //println!("PreTokens:{}", pre_tokens);
        //let post_tokens = TokenStream::from(quote! { struct EndMarker {} });
        let post_tokens = TokenStream::from_str(format!("struct EndMarker_{group_id} {{}}").as_str()).unwrap();
        return pre_tokens.into_iter()
            .chain(input)
            .chain(post_tokens.into_iter())
            .collect();
    }

    // check for a cache-hit
    if cache_input_path.exists() && fs::read_to_string(cache_input_path.clone()).unwrap() == input.to_string() && cache_output_path.exists() {
        let cached_output = fs::read_to_string(cache_output_path.clone()).unwrap();
        println!("Cache hit! Cached-output length: {}", cached_output.len());
        return TokenStream::from_str(&cached_output).unwrap();
    }

    //println!("Env-vars:{}", env::vars().map(|(var_name, var_value)| format!("{var_name}: {var_value}")).collect::<Vec<String>>().join("\n"));

    let working_dir = env::current_dir().unwrap();
    let working_dir_str = working_dir.as_path().display().to_string();
    println!("Working-dir:{}", working_dir_str);
    
    let mut cmd =
        // todo: fix that the user must call "cargo +nightly build" instead of just "cargo build" (for the initial command to start things off)
        Command::new("cargo")//.arg("+nightly")
        .arg("expand")
        //.arg("::".to_owned() + &struct_id)
        //.arg("::sub1") // temp
        .arg("--target-dir").arg("/tmp/cargo-expand-for-cached-expand")
        .env("FOR_CACHED_EXPAND", "1")
        //.current_dir(working_dir)
        .current_dir(working_dir_str + "/Packages/app-server-rs")
        
        //.output()
        .stdout(Stdio::piped())
        //.stderr(Stdio::piped())
        .spawn()

        .unwrap();

    //String::from_utf8_lossy(&expand_command_output.stderr)
    let mut expanded_code = "".to_owned();
    {
        /*let stderr = cmd.stderr.as_mut().unwrap();
        let stderr_reader = BufReader::new(stderr);
        let stderr_lines = stderr_reader.lines();
        for (i, line) in stderr_lines.enumerate() {
            let line_str = line.unwrap().to_string();
            println!("Err({i}): {line_str}");
        }*/

        let stdout = cmd.stdout.as_mut().unwrap();
        let stdout_reader = BufReader::new(stdout);
        let stdout_lines = stdout_reader.lines();

        let mut start_marker_hit = false;
        let mut end_marker_hit = false;
        for (i, line) in stdout_lines.enumerate() {
            let line_str = line.unwrap().to_string();
            //println!("Read({i}): {line_str}");

            if line_str.contains(format!("StartMarker_{group_id}").as_str()) {
                start_marker_hit = true;
            }

            if start_marker_hit && !end_marker_hit && line_str != SPECIAL_MESSAGE_1 && line_str != SPECIAL_MESSAGE_2 {
                println!("FoundExpanded({i}): {line_str}");
                expanded_code += &line_str;
            }

            // run this after, so end-marker is still included
            if line_str.contains(format!("EndMarker_{group_id}").as_str()) {
                end_marker_hit = true;
            }
        }
    }

    cmd.wait().unwrap();
        
    //println!("Expanded code:[[[{}]]]", expanded_code);
    println!("Expanded code length:{}", expanded_code.len());
    if expanded_code.is_empty() {
        panic!("Expanded-code is empty! Terminating...");
    }

    println!("Caching input-code and expanded-code to:{}", cache_folder_path.as_path().display().to_string());
    fs::create_dir_all(cache_folder_path).unwrap();
    fs::write(cache_input_path.clone(), input.to_string()).unwrap();
    fs::write(cache_output_path.clone(), expanded_code.clone()).unwrap();
    println!("Writes done! Proofs:[{}, {}]",
        fs::read_to_string(cache_input_path.clone()).unwrap().len(),
        fs::read_to_string(cache_output_path.clone()).unwrap().len());

    return TokenStream::from_str(&expanded_code).unwrap();
}

/*//TokenStream::new()
input
//input.into_iter().take(1).collect()
/*input.to_string().parse::<TokenStream>().unwrap().into_iter().chain(
    input.to_string().replace("MyStruct", "MyStruct2").parse::<TokenStream>().unwrap().into_iter()
).collect()*/ */