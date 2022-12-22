use futures::Future;

pub trait AsyncFn_Args0<OutputType>: Fn() -> Self::Future {
    type Future: Future<Output = OutputType>;
}
impl<OutputType, F, Fut> AsyncFn_Args0<OutputType> for F
where F: Fn() -> Fut, Fut: Future<Output = OutputType> {
    type Future = Fut;
}

pub trait AsyncFn_Args1<OutputType, Arg1>: Fn(Arg1) -> Self::Future {
    type Future: Future<Output = OutputType>;
}
impl<OutputType, Arg1, F, Fut> AsyncFn_Args1<OutputType, Arg1> for F
where F: Fn(Arg1) -> Fut, Fut: Future<Output = OutputType> {
    type Future = Fut;
}

pub trait AsyncFn_Args2<OutputType, Arg1, Arg2>: Fn(Arg1, Arg2) -> Self::Future {
    type Future: Future<Output = OutputType>;
}
impl<OutputType, Arg1, Arg2, F, Fut> AsyncFn_Args2<OutputType, Arg1, Arg2> for F
where F: Fn(Arg1, Arg2) -> Fut, Fut: Future<Output = OutputType> {
    type Future = Fut;
}

pub trait AsyncFn_Args3<OutputType, Arg1, Arg2, Arg3>: Fn(Arg1, Arg2, Arg3) -> Self::Future {
    type Future: Future<Output = OutputType>;
}
impl<OutputType, Arg1, Arg2, Arg3, F, Fut> AsyncFn_Args3<OutputType, Arg1, Arg2, Arg3> for F
where F: Fn(Arg1, Arg2, Arg3) -> Fut, Fut: Future<Output = OutputType> {
    type Future = Fut;
}