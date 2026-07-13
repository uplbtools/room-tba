import { register as registerOtel } from "../../../instrumentation";
import { installServerLogForwarder } from "./server-log";

let bootstrapped = false;

export function bootstrapObservability(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  registerOtel();
  installServerLogForwarder();
}
