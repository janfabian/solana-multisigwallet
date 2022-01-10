//! A program demonstrating logging
#![forbid(unsafe_code)]
#![cfg(not(feature = "no-entrypoint"))]
mod entrypoint;

pub mod error;
pub mod instruction;
pub mod processor;
pub mod state;
