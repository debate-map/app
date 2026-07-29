use anyhow::Context;
use std::io::Read;

pub const OUTPUT_FORMAT_VERSION: u8 = 2;

pub fn compress_html(input: &[u8]) -> anyhow::Result<Vec<u8>> {
	let mut output = Vec::new();
	brotli::CompressorReader::new(input, 4096, 6, 22).read_to_end(&mut output).context("compress HTML with Brotli")?;
	Ok(output)
}

pub fn decompress_html(input: &[u8]) -> anyhow::Result<Vec<u8>> {
	let mut output = Vec::new();
	brotli::Decompressor::new(input, 4096).read_to_end(&mut output).context("decompress Brotli HTML")?;
	Ok(output)
}
