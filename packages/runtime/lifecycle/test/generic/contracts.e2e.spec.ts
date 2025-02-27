import { pipe } from "fp-ts/lib/function.js";
import * as O from "fp-ts/lib/Option.js";
import { addDays } from "date-fns";

import {
  datetoTimeout,
  inputNotify,
  close,
} from "@marlowe.io/language-core-v1";
import { oneNotifyTrue } from "@marlowe.io/language-examples";
import { mkFPTSRestClient } from "@marlowe.io/runtime-rest-client/index.js";

import {
  getBankPrivateKey,
  getBlockfrostContext,
  getMarloweRuntimeUrl,
} from "../context.js";
import { initialiseBankAndverifyProvisionning } from "../provisionning.js";
import console from "console";
import { unsafeTaskEither } from "@marlowe.io/adapter/fp-ts";
import { MINUTES } from "@marlowe.io/adapter/time";

global.console = console;

describe("Runtime Contract Lifecycle ", () => {
  it(
    "can create a Marlowe Contract ",
    async () => {
      const restClient = mkFPTSRestClient(getMarloweRuntimeUrl());
      const { runtime } = await initialiseBankAndverifyProvisionning(
        restClient,
        getBlockfrostContext(),
        getBankPrivateKey()
      );
      const [contractId, txIdContractCreated] =
        await runtime.contracts.createContract({ contract: close });
      await runtime.wallet.waitConfirmation(txIdContractCreated);
      console.log("contractID created", contractId);
    },
    10 * MINUTES
  ),
    it(
      "can Apply Inputs to a Contract",
      async () => {
        const restClient = mkFPTSRestClient(getMarloweRuntimeUrl());
        const { runtime } = await initialiseBankAndverifyProvisionning(
          restClient,
          getBlockfrostContext(),
          getBankPrivateKey()
        );
        const notifyTimeout = pipe(addDays(Date.now(), 1), datetoTimeout);
        const [contractId, txIdContractCreated] =
          await runtime.contracts.createContract({
            contract: oneNotifyTrue(notifyTimeout),
          });
        await runtime.wallet.waitConfirmation(txIdContractCreated);

        const txIdInputsApplied = await runtime.contracts.applyInputs(
          contractId,
          {
            inputs: [inputNotify],
          }
        );
        await runtime.wallet.waitConfirmation(txIdInputsApplied);

        const result = await unsafeTaskEither(
          restClient.contracts.contract.transactions.getHeadersByRange(
            contractId,
            O.none
          )
        );
        expect(result.headers.length).toBe(1);
      },
      10 * MINUTES
    );
});
