import { mkFPTSRestClient } from "@marlowe.io/runtime-rest-client";
import * as S from "@marlowe.io/wallet/nodejs";
import * as Generic from "../generic/runtime.js";

export async function mkRuntimeLifecycle({
  runtimeURL,
  context,
  privateKeyBech32,
}: {
  runtimeURL: string;
  context: S.Context;
  privateKeyBech32: string;
}) {
  const wallet = await S.SingleAddressWallet.Initialise(
    context,
    privateKeyBech32
  );

  const restClient = mkFPTSRestClient(runtimeURL);
  return Generic.mkRuntimeLifecycle(restClient, wallet);
}
