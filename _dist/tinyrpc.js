"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const beson_1 = __importDefault(require("beson"));
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const DEFAULT_SIZE_LIMIT = 10 * 1024 * 1024;
;
;
const plugin = (fastify, options) => __awaiter(void 0, void 0, void 0, function* () {
    const HandlerMap = (options.handlers || {});
    fastify.addContentTypeParser('application/beson', { parseAs: 'buffer', bodyLimit: options.size_limit || DEFAULT_SIZE_LIMIT }, (request, body, done) => {
        const payload = beson_1.default.Deserialize(body);
        if (payload === undefined) {
            throw Error("Given payload is not formatted in BESON!");
        }
        done(payload);
    });
    fastify.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const payload = req.body;
        if (Object(payload) !== payload) {
            return res.status(400).send({
                rpc: '1.0',
                error: {
                    code: 'rpc#invalid-payload-format',
                    message: 'Request body must be an object'
                }
            });
        }
        const { rpc, id, call, args } = req.body;
        if (rpc !== undefined) {
            if (typeof rpc !== "string") {
                return res.status(400).send({
                    rpc: '1.0',
                    error: {
                        code: 'rpc#invalid-payload-format',
                        message: 'Field `rpc` is not a valid version string!'
                    }
                });
            }
            if (rpc !== "1.0") {
                return res.status(400).send({
                    rpc: '1.0',
                    error: {
                        code: 'rpc#invalid-payload-format',
                        message: 'Field `rpc` only support "1.0" version!'
                    }
                });
            }
        }
        if (id !== undefined) {
            if (typeof id !== "string" && typeof id !== "number") {
                return res.status(400).send({
                    rpc: '1.0',
                    error: {
                        code: 'rpc#invalid-payload-format',
                        message: 'Field `id` only accepts strings and integers!'
                    }
                });
            }
            if (typeof id === "number" && !Number.isInteger(id)) {
                return res.status(400).send({
                    rpc: '1.0',
                    error: {
                        code: 'rpc#invalid-payload-format',
                        message: 'Field `id` must be an integer!'
                    }
                });
            }
        }
        if (typeof call !== "string") {
            return res.status(400).send({
                rpc: '1.0',
                error: {
                    code: 'rpc#invalid-payload-format',
                    message: 'Field `call` must be an string!'
                }
            });
        }
        if (!Array.isArray(args)) {
            return res.status(400).send({
                rpc: '1.0',
                error: {
                    code: 'rpc#invalid-payload-format',
                    message: 'Field `args` must be an array!'
                }
            });
        }
        const rpc_info = HandlerMap[call];
        if (rpc_info === undefined || Object(rpc_info) !== rpc_info || (typeof rpc_info !== "function" && typeof rpc_info.handler !== "function")) {
            return res.send({
                rpc: '1.0',
                id,
                error: {
                    code: 'rpc#call-not-found',
                    message: 'Request call is not defined!',
                    data: { call, args }
                }
            });
        }
        const request_session = { request: req, response: res };
        let handler;
        if (typeof rpc_info === "function") {
            handler = rpc_info;
        }
        else {
            handler = rpc_info.handler;
            if (rpc_info.args_checker) {
                try {
                    const result = rpc_info.args_checker.call(request_session, ...args);
                    if (result !== true) {
                        return res.send({
                            rpc: '1.0',
                            id,
                            error: {
                                code: 'rpc#invalid-call-args',
                                message: "Some of the arguments are invalid!",
                                data: result
                            }
                        });
                    }
                }
                catch (e) {
                    const err = e;
                    return res.send({
                        rpc: '1.0',
                        id,
                        error: {
                            code: 'rpc#invalid-call-args',
                            message: err.message,
                            data: err.detail || undefined
                        }
                    });
                }
            }
        }
        const result = yield Promise.resolve().then(() => handler.call(request_session, ...args)).catch((e) => e);
        if (result instanceof Error) {
            const err = result;
            return res.send({
                rpc: '1.0',
                id,
                error: {
                    code: err.code || 'rpc#call-exec-error',
                    message: err.message,
                    data: err.detail || undefined
                }
            });
        }
        return res.send({
            rpc: '1.0',
            id,
            result
        });
    }));
    fastify.setErrorHandler((error, req, res) => __awaiter(void 0, void 0, void 0, function* () {
        return res.status(400).send({
            rpc: '1.0',
            error: {
                code: 'rpc#invalid-payload-format',
                message: error.message
            }
        });
    }));
});
module.exports = (0, fastify_plugin_1.default)(plugin);
