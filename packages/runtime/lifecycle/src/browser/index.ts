import {
  SupportedWalletName,
  mkBrowserWallet,
} from "@marlowe.io/wallet/browser";
import * as Generic from "../generic/runtime.js";

import { mkFPTSRestClient } from "@marlowe.io/runtime-rest-client";

/**
 * Options for creating a RuntimeLifecycle instance using the browser wallet.
 */
export interface BrowserRuntimeLifecycleOptions {
  // DISCUSSION: should we pass a Map of urls instead? Ideally we could distinguish between
  //             preprod and preview, but the CIP30 standard doesn't allow that
  /**
   * The URL of an available Marlowe runtime.
   */
  runtimeURL: string;
  /**
   * The name of the wallet to connect to.
   */
  walletName: SupportedWalletName;
}

/**
 * Creates an instance of RuntimeLifecycle using the browser wallet.
 * @param options
 */
export async function mkRuntimeLifecycle({
  runtimeURL,
  walletName,
}: BrowserRuntimeLifecycleOptions) {
  const wallet = await mkBrowserWallet(walletName);
  const restClient = mkFPTSRestClient(runtimeURL);
  return Generic.mkRuntimeLifecycle(restClient, wallet);
}
