use std::hash::Hash;
use std::collections::HashSet;

pub fn dedup<T: Clone + Eq + Hash>(vs: &Vec<T>) -> Vec<T> {
    let hs = vs.iter().cloned().collect::<HashSet<T>>();
    hs.into_iter().collect()
}

pub fn get_all_header_names() -> Vec<&'static str> {
    let mut result: Vec<&str> = vec![];

    // from: https://stackoverflow.com/a/33704645
    let blob_slices = r#"
        Accept, Accept-CH, Accept-Charset, Accept-Datetime, Accept-Encoding, Accept-Ext, Accept-Features, Accept-Language, Accept-Params, Accept-Ranges, Access-Control-Allow-Credentials,
        Access-Control-Allow-Headers, Access-Control-Allow-Methods, Access-Control-Allow-Origin, Access-Control-Expose-Headers, Access-Control-Max-Age, Access-Control-Request-Headers,
        Access-Control-Request-Method, Age, Allow, Alternates, Authentication-Info, Authorization, C-Ext, C-Man, C-Opt, C-PEP, C-PEP-Info, CONNECT, Cache-Control, Compliance, Connection,
        Content-Base, Content-Disposition, Content-Encoding, Content-ID, Content-Language, Content-Length, Content-Location, Content-MD5, Content-Range, Content-Script-Type, Content-Security-Policy,
        Content-Style-Type, Content-Transfer-Encoding, Content-Type, Content-Version, Cookie, Cost, DAV, DELETE, DNT, DPR, Date, Default-Style, Delta-Base, Depth, Derived-From, Destination,
        Differential-ID, Digest, ETag, Expect, Expires, Ext, From, GET, GetProfile, HEAD, HTTP-date, Host, IM, If, If-Match, If-Modified-Since, If-None-Match, If-Range, If-Unmodified-Since,
        Keep-Alive, Label, Last-Event-ID, Last-Modified, Link, Location, Lock-Token, MIME-Version, Man, Max-Forwards, Media-Range, Message-ID, Meter, Negotiate, Non-Compliance, OPTION, OPTIONS,
        OWS, Opt, Optional, Ordering-Type, Origin, Overwrite, P3P, PEP, PICS-Label, POST, PUT, Pep-Info, Permanent, Position, Pragma, ProfileObject, Protocol, Protocol-Query, Protocol-Request,
        Proxy-Authenticate, Proxy-Authentication-Info, Proxy-Authorization, Proxy-Features, Proxy-Instruction, Public, RWS, Range, Referer, Refresh, Resolution-Hint, Resolver-Location, Retry-After,
        Safe, Sec-Websocket-Extensions, Sec-Websocket-Key, Sec-Websocket-Origin, Sec-Websocket-Protocol, Sec-Websocket-Version, Security-Scheme, Server, Set-Cookie, Set-Cookie2, SetProfile, SoapAction,
        Status, Status-URI, Strict-Transport-Security, SubOK, Subst, Surrogate-Capability, Surrogate-Control, TCN, TE, TRACE, Timeout, Title, Trailer, Transfer-Encoding, UA-Color, UA-Media, UA-Pixels,
        UA-Resolution, UA-Windowpixels, URI, Upgrade, User-Agent, Variant-Vary, Vary, Version, Via, Viewport-Width, WWW-Authenticate, Want-Digest, Warning, Width, X-Content-Duration, X-Content-Security-Policy,
        X-Content-Type-Options, X-CustomHeader, X-DNSPrefetch-Control, X-Forwarded-For, X-Forwarded-Port, X-Forwarded-Proto, X-Frame-Options, X-Modified, X-OTHER, X-PING, X-PINGOTHER, X-Powered-By, X-Requested-With
    "#.trim().split(",");
    for slice in blob_slices {
        let header_name = slice.trim();
        if header_name.len() == 0 { continue; }
        result.push(header_name);
    }

    // add additional ones observed myself
    let custom_blob_slices = r#"
        Accept,
        Accept-Encoding,
        Accept-Language,
        Cache-Control,
        Connection,
        Pragma,
        Upgrade-Insecure-Requests,
        User-Agent,
        X-Forwarded-Host,
        X-Forwarded-Port,
        X-Forwarded-Proto,
        X-Forwarded-Server,
        X-Real-Ip,

        X-Requested-With,
        X-Request-Id,
        Cdn-Loop,
        Cf-Connecting-Ip,
        Cf-Ipcountry,
        Cf-Ray,
        Cf-Visitor,
        Cookie,
        Origin,
        Sec-Fetch-Dest,
        Sec-Fetch-Mode,
        Sec-Fetch-Site,
        Sec-Websocket-Extensions,
        Sec-Websocket-Key,
        Sec-Websocket-Protocol,
        Sec-Websocket-Version,
        Upgrade,
    "#.trim().split(",");
    for slice in custom_blob_slices {
        let header_name = slice.trim();
        if header_name.len() == 0 { continue; }
        result.push(header_name);
    }
    
    return dedup(&result);
}