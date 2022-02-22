import type { OSC } from "./osc";
import type { OSCTransport } from "./osc-transports";

declare module "osc" {
  const osc: OSC & OSCTransport;
  export = osc;
  export * from "./osc";
  export * from "./osc-transports";
}
