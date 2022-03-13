/*use async_graphql::SimpleObject;
use rust_macros::{cached_expand};
use serde::Serialize;*/

mod sub1;

fn test1() {
  println!("test12345671232233243");
} 

// something2

// Recursive expansion of SimpleObject! macro
// ===========================================

/*#[allow(clippy::all,clippy::pedantic)]
impl S {
  #[inline]
  #[allow(missing_docs)]
  async fn test(&self,ctx: &async_graphql::Context< '_>) -> async_graphql::Result< &String>{
    ::std::result::Result::Ok(&self.test)
  }

  }
#[allow(clippy::all,clippy::pedantic)]
#[async_graphql::async_trait::async_trait]
impl async_graphql::resolver_utils::ContainerType for S {
  async fn resolve_field(&self,ctx: &async_graphql::Context< '_>) -> async_graphql::ServerResult< ::std::option::Option<async_graphql::Value>>{
    if ctx.item.node.name.node=="test" {
      let f = async move {
        self.test(ctx).await.map_err(|err|err.into_server_error(ctx.item.pos))
      };
      let obj = f.await.map_err(|err|ctx.set_error_path(err))? ;
      let ctx_obj = ctx.with_selection_set(&ctx.item.node.selection_set);
      return async_graphql::OutputType::resolve(&obj, &ctx_obj,ctx.item).await.map(::std::option::Option::Some);
      
    }::std::result::Result::Ok(::std::option::Option::None)
  }

  }
#[allow(clippy::all,clippy::pedantic)]
#[async_graphql::async_trait::async_trait]
impl async_graphql::OutputType for S {
  fn type_name() ->  ::std::borrow::Cow< 'static, ::std::primitive::str>{
    ::std::borrow::Cow::Borrowed("S")
  }
  fn create_type_info(registry: &mut async_graphql::registry::Registry) ->  ::std::string::String {
    registry.create_output_type:: <Self,_>(|registry|async_graphql::registry::MetaType::Object {
      name: ::std::borrow::ToOwned::to_owned("S"),description: ::std::option::Option::None,fields:{
        let mut fields = async_graphql::indexmap::IndexMap::new();
        fields.insert(::std::borrow::ToOwned::to_owned("test"),async_graphql::registry::MetaField {
          name: ::std::borrow::ToOwned::to_owned("test"),description: ::std::option::Option::None,args: ::std::default::Default::default(),ty: <String as async_graphql::OutputType> ::create_type_info(registry),deprecation:async_graphql::registry::Deprecation::NoDeprecated,cache_control:async_graphql::CacheControl {
            public:true,max_age:0usize,
          },external:false,provides: ::std::option::Option::None,requires: ::std::option::Option::None,visible: ::std::option::Option::None,compute_complexity: ::std::option::Option::None,
        });
        fields
      },cache_control:async_graphql::CacheControl {
        public:true,max_age:0usize,
      },extends:false,keys: ::std::option::Option::None,visible: ::std::option::Option::None,is_subscription:false,rust_typename: ::std::any::type_name:: <Self>(),
    })
  }
  async fn resolve(&self,ctx: &async_graphql::ContextSelectionSet< '_> ,_field: &async_graphql::Positioned<async_graphql::parser::types::Field>) -> async_graphql::ServerResult<async_graphql::Value>{
    async_graphql::resolver_utils::resolve_container(ctx,self).await
  }

  }
impl async_graphql::ObjectType for S{}*/



fn main() {
    println!("{:?}", "hai");
}