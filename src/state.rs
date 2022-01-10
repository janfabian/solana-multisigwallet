use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct MultisigWallet {
    pub is_initialized: u8,
    pub m: u8,
    pub signer1: Pubkey,
    pub signer2: Pubkey,
    pub signer3: Pubkey,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct Request {
    pub is_initialized: u8,
    pub m: u8,
    pub n: u8,
}
