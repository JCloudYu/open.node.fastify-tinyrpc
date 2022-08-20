/// <reference types="node" />
interface CallHandler {
    (...args: any[]): Promise<any> | any;
}
interface CallMap {
    [call: string]: CallHandler | {
        handler: CallHandler;
        args_checker?: {
            (...args: any[]): true | string[];
        };
    };
}
interface TinyRPCOptions {
    handlers?: CallMap;
    size_limit?: number;
}
declare const _default: import("fastify").FastifyPluginAsync<TinyRPCOptions, import("http").Server, import("fastify").FastifyTypeProviderDefault>;
export = _default;
