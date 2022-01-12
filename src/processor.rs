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
        match MultisigWalletInstruction::unpack(instruction_data)? {
            MultisigWalletInstruction::InitWallet { m } => {
                msg!("MultisigWalletInstruction::InitWallet {:?}", m);
                Self::init_wallet(program_id, m, instruction_data, accounts)?;
            }
            MultisigWalletInstruction::Request { amount, to_pub_key } => {
                msg!(
                    "MultisigWalletInstruction::Request {:?}, {:?}",
                    amount,
                    to_pub_key
                );
                Self::create_request(program_id, amount, to_pub_key, instruction_data, accounts)?;
            }
            MultisigWalletInstruction::Sign => {
                msg!("Sign",);
                Self::sign(program_id, instruction_data, accounts)?;
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

    fn init_wallet(
        program_id: &Pubkey,
        m: u8,
        _instruction_data: &[u8],
        accounts: &[AccountInfo],
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let wallet_account = next_account_info(account_info_iter)?;

        let mut multisig_wallet = MultisigWallet::try_from_slice(&wallet_account.data.borrow())?;

        if wallet_account.owner != program_id {
            msg!(
                "wrong wallet_account owner, wallet_account: {:}, program_id: {:}",
                wallet_account.owner,
                program_id,
            );
            return Err(ProgramError::IncorrectProgramId);
        }

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

    fn check_signer(signer: &AccountInfo, multisig_wallet: &MultisigWallet) -> u8 {
        if multisig_wallet.signer1 == *signer.key {
            return 1;
        }
        if multisig_wallet.signer2 == *signer.key {
            return 2;
        }
        if multisig_wallet.signer3 == *signer.key {
            return 3;
        }

        return 0;
    }

    fn create_request(
        program_id: &Pubkey,
        amount: u64,
        receiver: Pubkey,
        _instruction_data: &[u8],
        accounts: &[AccountInfo],
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let wallet_account = next_account_info(account_info_iter)?;

        if wallet_account.owner != program_id {
            return Err(ProgramError::IncorrectProgramId);
        }

        let multisig_wallet = MultisigWallet::try_from_slice(&wallet_account.data.borrow())?;

        if multisig_wallet.is_initialized != 1 {
            return Err(MultisigWalletError::WalletNotInitialized.into());
        }

        let request_account = next_account_info(account_info_iter)?;

        if request_account.owner != program_id {
            return Err(ProgramError::IncorrectProgramId);
        }

        let mut request = Request::try_from_slice(&request_account.data.borrow())?;

        if request.is_initialized != 0 {
            return Err(MultisigWalletError::AlreadyInUse.into());
        }

        let signer = next_account_info(account_info_iter)?;

        if !signer.is_signer {
            return Err(ProgramError::IllegalOwner);
        }

        request.is_initialized = 1;
        request.is_finished = 0;
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

    fn sign(
        program_id: &Pubkey,
        _instruction_data: &[u8],
        accounts: &[AccountInfo],
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let wallet_account = next_account_info(account_info_iter)?;

        if wallet_account.owner != program_id {
            return Err(ProgramError::IncorrectProgramId);
        }

        let multisig_wallet = MultisigWallet::try_from_slice(&wallet_account.data.borrow())?;

        if multisig_wallet.is_initialized != 1 {
            return Err(MultisigWalletError::WalletNotInitialized.into());
        }

        let request_account = next_account_info(account_info_iter)?;

        if request_account.owner != program_id {
            return Err(ProgramError::IncorrectProgramId);
        }

        let mut request = Request::try_from_slice(&request_account.data.borrow())?;

        if request.is_initialized != 1 {
            return Err(ProgramError::UninitializedAccount);
        }
        if request.is_finished == 1 {
            return Err(MultisigWalletError::RequestFulfilled.into());
        }
        if request.wallet != *wallet_account.key {
            return Err(ProgramError::InvalidAccountData);
        }

        let signer = next_account_info(account_info_iter)?;

        if !signer.is_signer {
            return Err(ProgramError::IllegalOwner);
        }

        match Self::check_signer(&signer, &multisig_wallet) {
            0 => return Err(ProgramError::IllegalOwner),
            1 => request.is_signed1 = 1,
            2 => request.is_signed2 = 1,
            3 => request.is_signed3 = 1,
            _ => return Err(ProgramError::IllegalOwner),
        };

        if (request.is_signed1 + request.is_signed2 + request.is_signed3) >= multisig_wallet.m {
            msg!(
                "TRANSFER from {:?}, to {:?}",
                &wallet_account.key,
                &request.receiver
            );
            request.is_finished = 1;

            let receiver = next_account_info(account_info_iter)?;

            **receiver.try_borrow_mut_lamports()? += request.amount;
            **wallet_account.try_borrow_mut_lamports()? -= request.amount;
        };

        request.serialize(&mut &mut request_account.data.borrow_mut()[..])?;

        msg!("request {:?}", request);

        Ok(())
    }
}
