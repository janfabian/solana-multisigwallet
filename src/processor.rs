//! Program instruction processor

use borsh::{BorshDeserialize, BorshSerialize};

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    log::{sol_log_compute_units, sol_log_params, sol_log_slice},
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

use crate::{
    error::MultisigWalletError, instruction::MultisigWalletInstruction, state::MultisigWallet,
};

pub struct Processor;

impl Processor {
    /// Instruction processor
    pub fn process_instruction(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let initializer = next_account_info(account_info_iter)?;

        if initializer.owner != program_id {
            msg!(
                "wrong initializer, initializer: {:}, program_id: {:}",
                initializer.owner,
                program_id,
            );
            return Err(ProgramError::IncorrectProgramId);
        }

        match MultisigWalletInstruction::unpack(instruction_data)? {
            MultisigWalletInstruction::InitWallet { m } => {
                msg!("MultisigWalletInstruction::InitWallet {:?}", m);
            }
            MultisigWalletInstruction::Request { amount, to_pub_key } => {
                msg!(
                    "MultisigWalletInstruction::Request {:?}, {:?}",
                    amount,
                    to_pub_key
                );
            }
        };

        // Log a slice
        // sol_log_slice(instruction_data);
        // Log a formatted message, use with caution can be expensive
        // msg!("formatted {}: {:?}", "message", instruction_data);
        // Log a public key
        // program_id.log();
        // Log all the program's input parameters
        // sol_log_params(accounts, instruction_data);

        let m = instruction_data.first();
        // msg!("{:?}", instruction_data.first());

        // Log the number of compute units remaining that the program can consume.
        sol_log_compute_units();

        // msg!("prev {:?}", initializer.data.borrow());
        let mut multisig_wallet = MultisigWallet::try_from_slice(&initializer.data.borrow())?;

        if multisig_wallet.is_initialized != 0 {
            return Err(MultisigWalletError::AlreadyInUse.into());
        }

        let signer1 = next_account_info(account_info_iter)?;
        let signer2 = next_account_info(account_info_iter)?;
        let signer3 = next_account_info(account_info_iter)?;

        multisig_wallet.signer1 = *signer1.key;
        multisig_wallet.signer2 = *signer2.key;
        multisig_wallet.signer3 = *signer3.key;
        multisig_wallet.is_initialized = 1;
        multisig_wallet.m = *m.unwrap();

        multisig_wallet.serialize(&mut &mut initializer.data.borrow_mut()[..])?;

        msg!("next {:?}", multisig_wallet);

        Ok(())
    }
}
