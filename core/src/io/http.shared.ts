import { RequestOptions as HttpRequestOptions } from 'http';
import { RequestOptions as HttpsRequestOptions } from 'https';
import { Omit } from '../utils/typescript.utils';

export interface HttpCallOptions {
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	params?: Record<string, any>;
	headers?: HttpRequestOptions['headers'];
	options?: Omit<HttpRequestOptions, 'method' | 'path' | 'headers' | 'hostname' | 'protocol'>;
}

export interface HttpsCallOptions extends HttpCallOptions {
	options?: Omit<HttpsRequestOptions, 'method' | 'path' | 'headers' | 'hostname' | 'protocol'>;
}
