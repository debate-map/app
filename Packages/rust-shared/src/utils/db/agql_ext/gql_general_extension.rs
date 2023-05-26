use std::fmt::Write;
use std::sync::Arc;

use async_graphql::extensions::{
    Extension, ExtensionContext, ExtensionFactory, NextExecute, NextParseQuery, NextSubscribe, NextPrepareRequest, NextRequest,
};
use async_graphql::parser::types::{ExecutableDocument, OperationType, Selection};
use async_graphql::{PathSegment, Response, ServerResult, Variables, ServerError, Request};
use async_graphql::futures_util::stream::BoxStream;
use indoc::{indoc, formatdoc};
use crate::utils::errors_::backtrace_simplifier::simplify_backtrace_str;
use crate::utils::general_::extensions::{indent_all_lines, ToOwnedV};
use tracing::{warn, info};

/// Logger extension
#[cfg_attr(docsrs, doc(cfg(feature = "log")))]
pub struct CustomExtensionCreator;
impl CustomExtensionCreator {
    pub fn new() -> Self {
        Self {}
    }
}
impl ExtensionFactory for CustomExtensionCreator {
    fn create(&self) -> Arc<dyn Extension> {
        Arc::new(CustomExtension)
    }
}

fn path_to_str(path: &[PathSegment]) -> String {
    let mut path_str = String::new();
    for (idx, s) in path.iter().enumerate() {
        if idx > 0 { path_str.push('.'); }
        match s {
            PathSegment::Index(idx) => { let _ = write!(&mut path_str, "{}", idx); }
            PathSegment::Field(name) => { let _ = write!(&mut path_str, "{}", name); }
        }
    }
    if path_str.len() == 0 { path_str.push_str("n/a"); }
    path_str
}
/// Helper so that that after we've printed the full error-info to the server log, we can remove the stacktrace-info from the response. (so it doesn't get sent to the client)
fn strip_stacktraces_from_errors(errors: Vec<ServerError>) -> Vec<ServerError> {
    errors.into_iter().map(|err| {
        let message_before_backtrace = err.message.split("Stack backtrace:").next().map(|a| a.trim_end()).unwrap_or(&err.message);
        ServerError {
            message: message_before_backtrace.to_owned(),
            ..err
        }
    }).collect()
}

pub struct CustomExtension;
#[async_trait::async_trait]
impl Extension for CustomExtension {
    /// Called at start of query/mutation request.
    async fn request(&self, ctx: &ExtensionContext<'_>, next: NextRequest<'_>) -> Response {
        let mut resp = next.run(ctx).await;
        for err in &resp.errors {
            // todo: find way to have logs for errors here include the query-string and variables as well (helpful for debugging other devs' failed query attempts, as well as catching abuse attempts)
            let error_message_cleaned = simplify_backtrace_str(err.message.o());
            let error_message_final = indent_all_lines(&error_message_cleaned, 1);
            warn!(target: "async-graphql", "[error in gql.request] path={} locations={:?} message={}", path_to_str(&err.path), err.locations, error_message_final);
        }
        //Response { errors: strip_stacktraces_from_errors(resp.errors), ..resp }
        resp.errors = strip_stacktraces_from_errors(resp.errors);
        resp
    }

    // todo: find way to log errors in subscribe-requests here (atm, using line in SubError constructor to accomplish)
    //fn subscribe<'s>(&self, ctx: &ExtensionContext<'_>, stream: BoxStream<'s, Response>, next: NextSubscribe<'_>) -> BoxStream<'s, Response> { next.run(ctx, stream) }

    async fn parse_query(&self, ctx: &ExtensionContext<'_>, query: &str, variables: &Variables, next: NextParseQuery<'_>) -> ServerResult<ExecutableDocument> {
        let document = next.run(ctx, query, variables).await?;
        // commented; errors in syntax of the graphql-query appear to not actually show up as errors here, so this is not currently known to be helpful (anyway, we want a more universal solution)
        // (instead they bubble-up to the `async_graphql::parser::parse_query(query_field)?` line in proxy_to_asjs.rs)
        /*let document = next.run(ctx, query, variables).await.map_err(|err| {
            // Why log here in addition to in `request`? Because the `query` and `variables` fields are not currently discernible in `request`, and we want that info in the logs.
            let message = formatdoc!(r#"
                [error in gql.parse_query]
                    variables={:?}
                    query=
                    ----------
                    {}
                    ----------
                    error:{:?}
            "#, &variables, &query, &err).trim_end().to_owned();
            log::warn!(target: "async-graphql", "{}", message);
            
            err
        })?;*/

        let is_schema = document.operations.iter()
            .filter(|(_, operation)| operation.node.ty == OperationType::Query)
            .any(|(_, operation)| operation.node.selection_set.node.items.iter().any(|selection| matches!(&selection.node, Selection::Field(field) if field.node.name.node == "__schema")));
        if !is_schema {
            // this isn't really necessary, but can be helpful for debugging in some cases (not visible unless `INFO` logging for "async-graphql" target is enabled in logging.rs)
            info!(target: "async-graphql", "[gql.execute] {}", ctx.stringify_execute_doc(&document, variables));
        }
        Ok(document)
    }
}

/*struct DropListener;
impl DropListener {
    fn new() -> Self {
        Self {}
    }
}
impl Drop for DropListener {
    fn drop(&mut self) {
        println!("DropListener got dropped. @address:{:p}", self);
    }
}*/