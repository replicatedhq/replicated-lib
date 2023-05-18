import { Pact } from "@pact-foundation/pact";


globalThis.provider = new Pact({
    consumer: 'npm_consumer',
    provider: 'vp_service',
  });
