/// <reference types="node" />
interface InvokeSession {
    request: import('fastify').FastifyRequest;
    response: import('fastify').FastifyReply;
}
interface CallHandler {
    (this: InvokeSession, ...args: any[]): Promise<any> | any;
}
interface CallMap {
    [call: string]: CallHandler | {
        handler: CallHandler;
        args_checker?: {
            (this: InvokeSession, ...args: any[]): true | string[];
        };
    };
}
interface TinyRPCOptions {
    handlers?: CallMap;
    size_limit?: number;
}
declare const _default: import("fastify").FastifyPluginAsync<TinyRPCOptions, import("http").Server, import("fastify").FastifyTypeProviderDefault>;
export = _default;
