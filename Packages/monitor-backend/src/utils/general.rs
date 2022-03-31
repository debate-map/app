use anyhow::Error;
use hyper::Body;

pub async fn body_to_str(body: Body) -> Result<String, Error> {
    let bytes1 = hyper::body::to_bytes(body).await?;
    let req_as_str: String = String::from_utf8_lossy(&bytes1).as_ref().to_owned();
    Ok(req_as_str)
}