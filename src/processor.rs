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
    error::MultisigWalletError,
    instruction::MultisigWalletInstruction,
    state::{MultisigWallet, Request},
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
                Self::init_wallet(m, instruction_data, accounts)?;
            }
            MultisigWalletInstruction::Request { amount, to_pub_key } => {
                msg!(
                    "MultisigWalletInstruction::Request {:?}, {:?}",
                    amount,
                    to_pub_key
                );
                Self::create_request(amount, to_pub_key, instruction_data, accounts)?;
            }
            MultisigWalletInstruction::Sign => {
                msg!("Sign",);
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

        Ok(())
    }

    fn init_wallet(m: u8, _instruction_data: &[u8], accounts: &[AccountInfo]) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let wallet_account = next_account_info(account_info_iter)?;

        // Log the number of compute units remaining that the program can consume.
        sol_log_compute_units();

        let mut multisig_wallet = MultisigWallet::try_from_slice(&wallet_account.data.borrow())?;

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
        multisig_wallet.m = m;

        multisig_wallet.serialize(&mut &mut wallet_account.data.borrow_mut()[..])?;

        msg!("wallet {:?}", multisig_wallet);

        Ok(())
    }

    fn create_request(
        amount: u64,
        receiver: Pubkey,
        _instruction_data: &[u8],
        accounts: &[AccountInfo],
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let wallet_account = next_account_info(account_info_iter)?;

        // Log the number of compute units remaining that the program can consume.
        sol_log_compute_units();

        let multisig_wallet = MultisigWallet::try_from_slice(&wallet_account.data.borrow())?;

        if multisig_wallet.is_initialized != 1 {
            return Err(MultisigWalletError::WalletNotInitialized.into());
        }

        let request_account = next_account_info(account_info_iter)?;
        let mut request = Request::try_from_slice(&request_account.data.borrow())?;

        if request.is_initialized != 0 {
            return Err(MultisigWalletError::AlreadyInUse.into());
        }

        let signer = next_account_info(account_info_iter)?;

        if !signer.is_signer {
            return Err(ProgramError::IllegalOwner);
        }

        request.is_initialized = 1;
        request.is_signed1 = 0;
        request.is_signed2 = 0;
        request.is_signed3 = 0;
        request.amount = amount;
        request.receiver = receiver;
        request.wallet = *wallet_account.key;

        request.serialize(&mut &mut request_account.data.borrow_mut()[..])?;

        msg!("request {:?}", request);

        Ok(())
    }
}
