use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Error, Debug, Copy, Clone)]
pub enum MultisigWalletError {
    #[error("Invalid Instruction")]
    InvalidInstruction,
    #[error("Already in use")]
    AlreadyInUse,
}

impl From<MultisigWalletError> for ProgramError {
    fn from(e: MultisigWalletError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
