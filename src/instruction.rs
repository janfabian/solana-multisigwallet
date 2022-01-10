use solana_program::{program_error::ProgramError, pubkey::Pubkey};

use crate::error::MultisigWalletError::InvalidInstruction;

pub enum MultisigWalletInstruction {
    InitWallet { m: u8 },
    Request { amount: u64, to_pub_key: Pubkey },
}

impl MultisigWalletInstruction {
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        let (tag, rest) = input.split_first().ok_or(InvalidInstruction)?;

        Ok(match tag {
            0 => Self::InitWallet {
                m: Self::unpack_m(&input[1..2])?,
            },
            1 => Self::Request {
                amount: Self::unpack_amount(&input[1..9])?,
                to_pub_key: Self::unpack_to_pub_key(&input[9..41])?,
            },
            _ => return Err(InvalidInstruction.into()),
        })
    }

    fn unpack_m(input: &[u8]) -> Result<u8, ProgramError> {
        let amount = input
            .get(0..1)
            .and_then(|slice| slice.try_into().ok())
            .map(u8::from_le_bytes)
            .ok_or(InvalidInstruction)?;
        Ok(amount)
    }

    fn unpack_amount(input: &[u8]) -> Result<u64, ProgramError> {
        let amount = input
            .get(..8)
            .and_then(|slice| slice.try_into().ok())
            .map(u64::from_le_bytes)
            .ok_or(InvalidInstruction)?;
        Ok(amount)
    }

    fn unpack_to_pub_key(input: &[u8]) -> Result<Pubkey, ProgramError> {
        let amount = input
            .get(..32)
            .and_then(|slice| slice.try_into().ok())
            .map(Pubkey::new_from_array)
            .ok_or(InvalidInstruction)?;
        Ok(amount)
    }
}
