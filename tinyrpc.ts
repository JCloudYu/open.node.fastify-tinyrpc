import beson from "beson";
import fp from "fastify-plugin";



const DEFAULT_SIZE_LIMIT = 10 * 1024 * 1024;

interface InvokeSession { request:import('fastify').FastifyRequest; response:import('fastify').FastifyReply; }
interface CallHandler {(this:InvokeSession, ...args:any[]):Promise<any>|any};
interface CallMap {
	[call:string]:CallHandler|{
		handler:CallHandler;
		args_checker?:{(this:InvokeSession, ...args:any[]):true|string[]};
	};
}
interface TinyRPCOptions {
	handlers?:CallMap;
	size_limit?:number;
};


const plugin:import('fastify').FastifyPluginAsync<TinyRPCOptions> = async(fastify, options)=>{
	const HandlerMap = (options.handlers||{}) as CallMap;
	
	fastify.addContentTypeParser('application/beson', {parseAs:'buffer', bodyLimit:options.size_limit||DEFAULT_SIZE_LIMIT}, (request, body, done)=>{
		const payload = beson.Deserialize(body as Buffer);
		if ( payload === undefined ) {
			throw Error("Given payload is not formatted in BESON!");
		}
		done(payload);
	});
	
	type PayloadType = {
		rpc?:'1.0';
		id?:string;
		call:string;
		args:Array<any>
	};
	fastify.post<{Body:PayloadType}>('/', async(req, res)=>{
		const payload = req.body;
		if ( Object(payload) !== payload ) {
			return res.status(400).send({
				rpc:'1.0',
				error: {
					code: 'rpc#invalid-payload-format',
					message: 'Request body must be an object'
				}
			});
		}

		const {rpc, id, call, args} = req.body;
		if ( rpc !== undefined ) {
			if ( typeof rpc !== "string" ) {
				return res.status(400).send({
					rpc:'1.0',
					error: {
						code: 'rpc#invalid-payload-format',
						message: 'Field `rpc` is not a valid version string!'
					}
				});
			}

			if ( rpc !== "1.0" ) {
				return res.status(400).send({
					rpc:'1.0',
					error: {
						code: 'rpc#invalid-payload-format',
						message: 'Field `rpc` only support "1.0" version!'
					}
				});
			}
		}

		if ( id !== undefined ) {
			if ( typeof id !== "string" && typeof id !== "number" ) {
				return res.status(400).send({
					rpc:'1.0',
					error: {
						code: 'rpc#invalid-payload-format',
						message: 'Field `id` only accepts strings and integers!'
					}
				});
			}

			if ( typeof id === "number" && !Number.isInteger(id) ) {
				return res.status(400).send({
					rpc:'1.0',
					error: {
						code: 'rpc#invalid-payload-format',
						message: 'Field `id` must be an integer!'
					}
				});
			}
		}

		if ( typeof call !== "string" ) {
			return res.status(400).send({
				rpc:'1.0',
				error: {
					code: 'rpc#invalid-payload-format',
					message: 'Field `call` must be an string!'
				}
			});
		}

		if ( !Array.isArray(args) ) {
			return res.status(400).send({
				rpc:'1.0',
				error: {
					code: 'rpc#invalid-payload-format',
					message: 'Field `args` must be an array!'
				}
			});
		}



		const rpc_info = HandlerMap[call];
		if ( rpc_info === undefined || Object(rpc_info) !== rpc_info || (typeof rpc_info !== "function" && typeof rpc_info.handler !== "function") ) {
			return res.send({
				rpc:'1.0',
				id,
				error: {
					code: 'rpc#call-not-found',
					message:'Request call is not defined!',
					data: {call, args}
				}
			});
		}

		
		const request_session:InvokeSession = {request:req, response:res};
		let handler:CallHandler;
		if ( typeof rpc_info === "function" ) {
			handler = rpc_info;
		}
		else {
			handler = rpc_info.handler;

			if ( rpc_info.args_checker ) {
				try {
					const result = rpc_info.args_checker.call(request_session, ...args);
					if ( result !== true ) {
						return res.send({
							rpc:'1.0',
							id,
							error: {
								code: 'rpc#invalid-call-args',
								message: "Some of the arguments are invalid!",
								data: result
							}
						});
					}
				}
				catch(e:any) {
					const err:Error&{detail?:any} = e;
					return res.send({
						rpc:'1.0',
						id,
						error: {
							code: 'rpc#invalid-call-args',
							message: err.message,
							data: err.detail||undefined
						}
					});
				}
			}
		}

		const result = await Promise.resolve().then(()=>handler.call(request_session, ...args)).catch((e:any)=>e);
		if ( result instanceof Error ) {
			const err:Error&{code?:string;detail?:any} = result;
			return res.send({
				rpc:'1.0',
				id,
				error: {
					code: err.code||'rpc#call-exec-error',
					message: err.message,
					data: err.detail||undefined
				}
			});
		}


		return res.send({
			rpc:'1.0',
			id,
			result
		});
	});

	fastify.setErrorHandler(async(error, req, res)=>{
		return res.status(400).send({
			rpc:'1.0',
			error: {
				code: 'rpc#invalid-payload-format',
				message: error.message
			}
		});
	});
};

export = fp(plugin);