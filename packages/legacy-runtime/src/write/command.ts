
import * as T from 'fp-ts/lib/Task.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as ContractCollection from '../contract/endpoints/collection.js';
import * as TransactionCollection from '../contract/transaction/endpoints/collection.js';
import * as WithdrawalCollection from '../contract/withdrawal/endpoints/collection.js';
import { DecodingError } from '../common/codec.js';
import { ContractDetails } from '../contract/details.js';
import { pipe } from 'fp-ts/lib/function.js'
import { ContractId }  from '../contract/id.js';
import * as Contracts from '../contract/id.js';
import * as Tx from '../contract/transaction/id.js';
import * as Transaction from '../contract/transaction/details.js';
import * as Withdrawal from '../contract/withdrawal/details.js';
import * as WithdrawalId from '../contract/withdrawal/id.js';
import { RuntimeRestAPI } from '../restAPI.js';
import { WalletAPI, getAddressesAndCollaterals } from '../wallet/api.js';
import { Metadata, Tags } from '../common/metadata/index.js';
import { MarloweVersion } from '../common/version.js';
import { Contract } from '@marlowe.io/language-core-v1/semantics/contract/index.js';
import { RolesConfig } from '../contract/role.js';
import { Input } from '@marlowe.io/language-core-v1/semantics/contract/when/input/index.js';
import { ISO8601 } from '@marlowe.io/legacy-adapter/time';


export type InitialisePayload =
   ({ contract: Contract
    , roles?: RolesConfig
    , tags? : Tags
    , metadata?: Metadata
    , minUTxODeposit?: number})


export type ApplyInputsPayload
    = ( { inputs: Input[]
        , tags? : Tags
        , metadata?: Metadata
        , invalidBefore?: ISO8601
        , invalidHereafter?: ISO8601})

export type WithdrawPayload = WithdrawalCollection.PostWithdrawalsRequest

export const initialise
  :  (client : RuntimeRestAPI)
  => (wallet : WalletAPI)
  => (payload : InitialisePayload)
  => TE.TaskEither<Error | DecodingError,ContractId>
  = (client) => (wallet) => (payload) =>
      pipe( getAddressesAndCollaterals (wallet)
          , TE.fromTask
          , TE.chain((addressesAndCollaterals) =>
                client.contracts.post(
                  ( { contract: payload.contract
                    , version: "v1"
                    , roles : payload.roles
                    , tags : payload.tags?payload.tags:{}
                    , metadata: payload.metadata?payload.metadata:{}
                    , minUTxODeposit: payload.minUTxODeposit?payload.minUTxODeposit:3_000_000})
                  , addressesAndCollaterals))
          , TE.chainW((contractTextEnvelope) =>
                pipe ( wallet.signTxTheCIP30Way(contractTextEnvelope.tx.cborHex)
                    , TE.chain((hexTransactionWitnessSet) =>
                          client.contracts.contract.put( contractTextEnvelope.contractId, hexTransactionWitnessSet))
                    , TE.map (() => contractTextEnvelope.contractId)))
          , TE.chainFirstW((contractId) => wallet.waitConfirmation(pipe(contractId, Contracts.idToTxId)))
          )

export const applyInputs
  :  (client : RuntimeRestAPI)
  => (wallet : WalletAPI)
  => (contractId : ContractId)
  => (payload : ApplyInputsPayload)
  => TE.TaskEither<Error | DecodingError,ContractId>
  = (client) => (wallet) => (contractId) => (payload) =>
      pipe( getAddressesAndCollaterals (wallet)
          , TE.fromTask
          , TE.chain((addressesAndCollaterals) =>
                client.contracts.contract.transactions.post
                    ( contractId
                    , { inputs: payload.inputs
                      , version: "v1"
                      , tags : payload.tags?payload.tags:{}
                      , metadata: payload.metadata?payload.metadata:{}
                      , invalidBefore: payload.invalidBefore
                      , invalidHereafter: payload.invalidHereafter}
                    , addressesAndCollaterals))
          , TE.chainW((transactionTextEnvelope) =>
                pipe ( wallet.signTxTheCIP30Way(transactionTextEnvelope.tx.cborHex)
                      , TE.chain((hexTransactionWitnessSet) =>
                          client.contracts.contract.transactions.transaction.put( contractId,transactionTextEnvelope.transactionId, hexTransactionWitnessSet))
                      , TE.map (() => transactionTextEnvelope.transactionId)))
          , TE.chainFirstW((transactionId) => wallet.waitConfirmation(pipe(transactionId, Tx.idToTxId)))
          , TE.map (() => contractId))

export const withdraw
    :  (client : RuntimeRestAPI)
    => (wallet : WalletAPI)
    => (payload : WithdrawPayload)
    => TE.TaskEither<Error | DecodingError,Withdrawal.Details>
    = (client) => (wallet) => (payload) =>
        pipe( getAddressesAndCollaterals (wallet)
            , TE.fromTask
            , TE.chain((addressesAndCollaterals) => client.withdrawals.post (payload, addressesAndCollaterals))
            , TE.chainW( (withdrawalTextEnvelope) =>
                pipe ( wallet.signTxTheCIP30Way(withdrawalTextEnvelope.tx.cborHex)
                     , TE.chain ((hexTransactionWitnessSet) => client.withdrawals.withdrawal.put(withdrawalTextEnvelope.withdrawalId,hexTransactionWitnessSet))
                     , TE.map (() => withdrawalTextEnvelope.withdrawalId)))
            , TE.chainFirstW((withdrawalId) => wallet.waitConfirmation(pipe(withdrawalId, WithdrawalId.idToTxId)))
            , TE.chainW ((withdrawalId) => client.withdrawals.withdrawal.get(withdrawalId)) )