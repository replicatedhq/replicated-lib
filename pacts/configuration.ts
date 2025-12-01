import { PactV2 } from "@pact-foundation/pact";

globalThis.provider = new PactV2({
    consumer: 'npm_consumer',
    provider: 'vp_service',
});
