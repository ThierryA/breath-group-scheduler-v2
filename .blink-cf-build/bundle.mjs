var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
  };
};

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/body.js
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
};
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
};
var handleParsingNestedValues = (form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};

// node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var _decodeURI = (value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
};
var _getQueryParam = (url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = (str) => tryDecode(str, decodeURIComponent_);
var HonoRequest = class {
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  };
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
};

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
};
var createResponseInstance = (body, init) => new Response(body, init);
var Context = class {
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = (layout) => this.#layout = layout;
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = () => this.#layout;
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = (name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  };
  status = (status) => {
    this.#status = status;
  };
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, { status, headers: responseHeaders });
  }
  newResponse = (...args) => this.#newResponse(...args);
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  };
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = (object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = (location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  };
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = () => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  };
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class _Hono {
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = (request) => request;
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    };
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { basePath: this._basePath, path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  };
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = ((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  });
  this.match = match2;
  return match2(method, path);
}

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class _Node {
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var hasChildren = (children) => {
  for (const _ in children) {
    return true;
  }
  return false;
};
var Node2 = class _Node2 {
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          if (matcher instanceof RegExp) {
            if (partOffsets === null) {
              partOffsets = new Array(len);
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.substring(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (hasChildren(child.#children)) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
var cors = (options) => {
  const defaults = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: []
  };
  const opts = {
    ...defaults,
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        if (opts.credentials) {
          return (origin) => origin || null;
        }
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*" || opts.credentials) {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*" || opts.credentials) {
      c.header("Vary", "Origin", { append: true });
    }
  };
};

// node_modules/@blinkdotnew/sdk/dist/index.mjs
var __require2 = /* @__PURE__ */ ((x) => typeof __require !== "undefined" ? __require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof __require !== "undefined" ? __require : a)[b]
}) : x)(function(x) {
  if (typeof __require !== "undefined") return __require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
function detectPlatform() {
  if (typeof Deno !== "undefined") {
    return "deno";
  }
  if (typeof process !== "undefined" && process.versions?.node) {
    if (typeof navigator !== "undefined" && navigator.product === "ReactNative") {
      return "react-native";
    }
    return "node";
  }
  if (typeof navigator !== "undefined" && navigator.product === "ReactNative") {
    return "react-native";
  }
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    return "web";
  }
  return "node";
}
var platform = detectPlatform();
var isWeb = platform === "web";
var isReactNative = platform === "react-native";
var isDeno = platform === "deno";
var isBrowser = isWeb || isReactNative;
var WebStorageAdapter = class {
  getItem(key) {
    try {
      if (typeof localStorage === "undefined") return null;
      return localStorage.getItem(key);
    } catch (error) {
      console.warn("Failed to get item from localStorage:", error);
      return null;
    }
  }
  setItem(key, value) {
    try {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn("Failed to set item in localStorage:", error);
    }
  }
  removeItem(key) {
    try {
      if (typeof localStorage === "undefined") return;
      localStorage.removeItem(key);
    } catch (error) {
      console.warn("Failed to remove item from localStorage:", error);
    }
  }
  clear() {
    try {
      if (typeof localStorage === "undefined") return;
      localStorage.clear();
    } catch (error) {
      console.warn("Failed to clear localStorage:", error);
    }
  }
};
var NoOpStorageAdapter = class {
  getItem(_key) {
    return null;
  }
  setItem(_key, _value) {
  }
  removeItem(_key) {
  }
  clear() {
  }
};
function getDefaultStorageAdapter() {
  if (isDeno) {
    return new NoOpStorageAdapter();
  }
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem("__test__", "test");
      localStorage.removeItem("__test__");
      return new WebStorageAdapter();
    } catch {
    }
  }
  return new NoOpStorageAdapter();
}
var BlinkError = class extends Error {
  constructor(message, code, status, details) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
    this.name = "BlinkError";
  }
};
var BlinkAuthError = class extends BlinkError {
  code;
  retryable;
  userMessage;
  constructor(code, message, userMessage, details) {
    super(message, code, 401, details);
    this.name = "BlinkAuthError";
    this.code = code;
    this.retryable = ["NETWORK_ERROR", "RATE_LIMITED"].includes(code);
    this.userMessage = userMessage || this.getDefaultUserMessage(code);
  }
  getDefaultUserMessage(code) {
    switch (code) {
      case "INVALID_CREDENTIALS":
        return "Invalid email or password. Please try again.";
      case "EMAIL_NOT_VERIFIED":
        return "Please verify your email address before signing in.";
      case "POPUP_CANCELED":
        return "Sign-in was canceled. Please try again.";
      case "NETWORK_ERROR":
        return "Network error. Please check your connection and try again.";
      case "RATE_LIMITED":
        return "Too many attempts. Please wait a moment and try again.";
      case "AUTH_TIMEOUT":
        return "Authentication timed out. Please try again.";
      case "REDIRECT_FAILED":
        return "Redirect failed. Please try again.";
      case "TOKEN_EXPIRED":
        return "Session expired. Please sign in again.";
      case "USER_NOT_FOUND":
        return "User not found. Please check your email and try again.";
      case "EMAIL_ALREADY_EXISTS":
        return "An account with this email already exists.";
      case "WEAK_PASSWORD":
        return "Password is too weak. Please choose a stronger password.";
      case "INVALID_EMAIL":
        return "Please enter a valid email address.";
      case "MAGIC_LINK_EXPIRED":
        return "Magic link has expired. Please request a new one.";
      case "VERIFICATION_FAILED":
        return "Verification failed. Please try again.";
      default:
        return "Authentication error. Please try again.";
    }
  }
};
var BlinkNetworkError = class extends BlinkError {
  constructor(message, status, details) {
    super(message, "NETWORK_ERROR", status, details);
    this.name = "BlinkNetworkError";
  }
};
var BlinkValidationError = class extends BlinkError {
  constructor(message, details) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "BlinkValidationError";
  }
};
var BlinkStorageError = class extends BlinkError {
  constructor(message, status, details) {
    super(message, "STORAGE_ERROR", status, details);
    this.name = "BlinkStorageError";
  }
};
var BlinkAIError = class extends BlinkError {
  constructor(message, status, details) {
    super(message, "AI_ERROR", status, details);
    this.name = "BlinkAIError";
  }
};
var BlinkDataError = class extends BlinkError {
  constructor(message, status, details) {
    super(message, "DATA_ERROR", status, details);
    this.name = "BlinkDataError";
  }
};
var BlinkRealtimeError = class extends BlinkError {
  constructor(message, status, details) {
    super(message, "REALTIME_ERROR", status, details);
    this.name = "BlinkRealtimeError";
  }
};
var BlinkNotificationsError = class extends BlinkError {
  constructor(message, status, details) {
    super(message, "NOTIFICATIONS_ERROR", status, details);
    this.name = "BlinkNotificationsError";
  }
};
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
function convertFilterKeysToSnakeCase(condition) {
  if (!condition) return condition;
  if ("AND" in condition) {
    return {
      AND: condition.AND?.map(convertFilterKeysToSnakeCase)
    };
  }
  if ("OR" in condition) {
    return {
      OR: condition.OR?.map(convertFilterKeysToSnakeCase)
    };
  }
  const converted = {};
  for (const [field, value] of Object.entries(condition)) {
    const snakeField = camelToSnake(field);
    converted[snakeField] = value;
  }
  return converted;
}
function buildFilterQuery(condition) {
  if (!condition) return "";
  if ("AND" in condition) {
    const andConditions = condition.AND?.map(buildFilterQuery).filter(Boolean) || [];
    return andConditions.length > 0 ? `and=(${andConditions.join(",")})` : "";
  }
  if ("OR" in condition) {
    const orConditions = condition.OR?.map(buildFilterQuery).filter(Boolean) || [];
    return orConditions.length > 0 ? `or=(${orConditions.join(",")})` : "";
  }
  const params = [];
  for (const [field, value] of Object.entries(condition)) {
    if (value === void 0 || value === null) continue;
    if (typeof value === "object" && !Array.isArray(value)) {
      for (const [operator, operatorValue] of Object.entries(value)) {
        const param = buildOperatorQuery(field, operator, operatorValue);
        if (param) params.push(param);
      }
    } else {
      params.push(`${field}=eq.${encodeQueryValue(value)}`);
    }
  }
  return params.join("&");
}
function buildOperatorQuery(field, operator, value) {
  switch (operator) {
    case "eq":
      return `${field}=eq.${encodeQueryValue(value)}`;
    case "neq":
      return `${field}=neq.${encodeQueryValue(value)}`;
    case "gt":
      return `${field}=gt.${encodeQueryValue(value)}`;
    case "gte":
      return `${field}=gte.${encodeQueryValue(value)}`;
    case "lt":
      return `${field}=lt.${encodeQueryValue(value)}`;
    case "lte":
      return `${field}=lte.${encodeQueryValue(value)}`;
    case "like":
      return `${field}=like.${encodeQueryValue(value)}`;
    case "ilike":
      return `${field}=ilike.${encodeQueryValue(value)}`;
    case "is":
      return `${field}=is.${value === null ? "null" : encodeQueryValue(value)}`;
    case "not":
      return `${field}=not.${encodeQueryValue(value)}`;
    case "in":
      if (Array.isArray(value)) {
        const values = value.map(encodeQueryValue).join(",");
        return `${field}=in.(${values})`;
      }
      return "";
    case "not_in":
      if (Array.isArray(value)) {
        const values = value.map(encodeQueryValue).join(",");
        return `${field}=not.in.(${values})`;
      }
      return "";
    default:
      return "";
  }
}
function encodeQueryValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }
  if (typeof value === "number") return value.toString();
  return encodeURIComponent(String(value));
}
function buildQuery(options = {}) {
  const params = {};
  if (options.select && options.select.length > 0) {
    const snakeFields = options.select.map(camelToSnake);
    params.select = snakeFields.join(",");
  } else {
    params.select = "*";
  }
  if (options.where) {
    const convertedWhere = convertFilterKeysToSnakeCase(options.where);
    const filterQuery = buildFilterQuery(convertedWhere);
    if (filterQuery) {
      const filterParams = filterQuery.split("&");
      for (const param of filterParams) {
        const [key, value] = param.split("=", 2);
        if (key && value) {
          params[key] = value;
        }
      }
    }
  }
  if (options.orderBy) {
    if (typeof options.orderBy === "string") {
      params.order = options.orderBy;
    } else {
      const orderClauses = Object.entries(options.orderBy).map(([field, direction]) => `${camelToSnake(field)}.${direction}`);
      params.order = orderClauses.join(",");
    }
  }
  if (options.limit !== void 0) {
    params.limit = options.limit.toString();
  }
  if (options.offset !== void 0) {
    params.offset = options.offset.toString();
  }
  if (options.cursor) {
    params.cursor = options.cursor;
  }
  return params;
}
function camelToSnake2(str) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}
function convertKeysToSnakeCase(obj) {
  if (obj === null || obj === void 0) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(convertKeysToSnakeCase);
  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake2(key);
    converted[snakeKey] = convertKeysToSnakeCase(value);
  }
  return converted;
}
function convertKeysToCamelCase(obj) {
  if (obj === null || obj === void 0) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(convertKeysToCamelCase);
  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key);
    converted[camelKey] = convertKeysToCamelCase(value);
  }
  return converted;
}
var HttpClient = class {
  authUrl = "https://blink.new";
  coreUrl = "https://core.blink.new";
  projectId;
  publishableKey;
  secretKey;
  // Permanent, non-expiring key (like Stripe's sk_live_...)
  getToken;
  getValidToken;
  constructor(config, getToken, getValidToken) {
    this.projectId = config.projectId;
    this.publishableKey = config.publishableKey;
    this.secretKey = config.secretKey || config.serviceToken;
    this.getToken = getToken;
    this.getValidToken = getValidToken;
  }
  shouldAttachPublishableKey(path, method) {
    if (method !== "GET" && method !== "POST") return false;
    if (path.includes("/api/analytics/")) return true;
    if (path.includes("/api/storage/")) return true;
    if (path.includes("/api/db/") && path.includes("/rest/v1/")) return method === "GET";
    return false;
  }
  shouldSkipSecretKey(url) {
    try {
      const parsed = new URL(url);
      return parsed.hostname.endsWith(".functions.blink.new");
    } catch {
      return false;
    }
  }
  getAuthorizationHeader(url, token) {
    if (this.secretKey && !this.shouldSkipSecretKey(url)) {
      return `Bearer ${this.secretKey}`;
    }
    if (token) {
      return `Bearer ${token}`;
    }
    return null;
  }
  /**
   * Make an authenticated request to the Blink API
   */
  async request(path, options = {}) {
    const url = this.buildUrl(path, options.searchParams);
    const token = this.getValidToken ? await this.getValidToken() : this.getToken();
    const method = options.method || "GET";
    const headers = {
      "Content-Type": "application/json",
      ...options.headers
    };
    const auth = this.getAuthorizationHeader(url, token);
    if (auth) {
      headers.Authorization = auth;
    } else if (this.publishableKey && !headers["x-blink-publishable-key"] && this.shouldAttachPublishableKey(path, method)) {
      headers["x-blink-publishable-key"] = this.publishableKey;
    }
    const requestInit = {
      method,
      headers,
      signal: options.signal
    };
    if (options.body && method !== "GET") {
      requestInit.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }
    try {
      const response = await fetch(url, requestInit);
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }
      const data = await this.parseResponse(response);
      return {
        data,
        status: response.status,
        headers: response.headers
      };
    } catch (error) {
      if (error instanceof BlinkError) {
        throw error;
      }
      throw new BlinkNetworkError(
        `Network request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        0,
        { originalError: error }
      );
    }
  }
  /**
   * GET request
   */
  async get(path, searchParams) {
    return this.request(path, { method: "GET", searchParams });
  }
  /**
   * POST request
   */
  async post(path, body, headers) {
    return this.request(path, { method: "POST", body, headers });
  }
  /**
   * PATCH request
   */
  async patch(path, body, headers) {
    return this.request(path, { method: "PATCH", body, headers });
  }
  /**
   * DELETE request
   */
  async delete(path, searchParams) {
    return this.request(path, { method: "DELETE", searchParams });
  }
  /**
   * Database-specific requests
   */
  // Table operations (PostgREST-compatible)
  async dbGet(table, searchParams) {
    const response = await this.get(`/api/db/${this.projectId}/rest/v1/${table}`, searchParams);
    const convertedData = convertKeysToCamelCase(response.data);
    return {
      ...response,
      data: convertedData
    };
  }
  async dbPost(table, body, options = {}) {
    const headers = {};
    if (options.returning) {
      headers.Prefer = "return=representation";
    }
    const convertedBody = convertKeysToSnakeCase(body);
    const response = await this.post(`/api/db/${this.projectId}/rest/v1/${table}`, convertedBody, headers);
    const convertedData = convertKeysToCamelCase(response.data);
    return {
      ...response,
      data: convertedData
    };
  }
  async dbUpsert(table, body, options = {}) {
    const headers = {};
    if (options.returning) {
      headers.Prefer = "return=representation";
    }
    const convertedBody = convertKeysToSnakeCase(body);
    const onConflict = options.onConflict || "id";
    const response = await this.request(
      `/api/db/${this.projectId}/rest/v1/${table}`,
      {
        method: "POST",
        body: convertedBody,
        headers,
        searchParams: { on_conflict: onConflict }
      }
    );
    const convertedData = convertKeysToCamelCase(response.data);
    return {
      ...response,
      data: convertedData
    };
  }
  async dbPatch(table, body, searchParams, options = {}) {
    const headers = {};
    if (options.returning) {
      headers.Prefer = "return=representation";
    }
    const convertedBody = convertKeysToSnakeCase(body);
    const response = await this.request(`/api/db/${this.projectId}/rest/v1/${table}`, {
      method: "PATCH",
      body: convertedBody,
      headers,
      searchParams
    });
    const convertedData = convertKeysToCamelCase(response.data);
    return {
      ...response,
      data: convertedData
    };
  }
  async dbDelete(table, searchParams, options = {}) {
    const headers = {};
    if (options.returning) {
      headers.Prefer = "return=representation";
    }
    const response = await this.request(`/api/db/${this.projectId}/rest/v1/${table}`, {
      method: "DELETE",
      headers,
      searchParams
    });
    const convertedData = convertKeysToCamelCase(response.data);
    return {
      ...response,
      data: convertedData
    };
  }
  // Raw SQL operations
  async dbSql(query, params) {
    const response = await this.post(`/api/db/${this.projectId}/sql`, { query, params });
    const convertedData = {
      ...response.data,
      rows: convertKeysToCamelCase(response.data.rows)
    };
    return {
      ...response,
      data: convertedData
    };
  }
  // Batch SQL operations
  async dbBatch(statements, mode = "write") {
    const response = await this.post(`/api/db/${this.projectId}/batch`, { statements, mode });
    const convertedData = {
      ...response.data,
      results: response.data.results.map((result) => ({
        ...result,
        rows: convertKeysToCamelCase(result.rows)
      }))
    };
    return {
      ...response,
      data: convertedData
    };
  }
  /**
   * Upload file with progress tracking
   */
  async uploadFile(path, file, filePath, options = {}) {
    const url = this.buildUrl(path);
    const token = this.getValidToken ? await this.getValidToken() : this.getToken();
    const formData = new FormData();
    if (file instanceof File) {
      formData.append("file", file);
    } else if (file instanceof Blob) {
      const blobWithType = options.contentType ? new Blob([file], { type: options.contentType }) : file;
      formData.append("file", blobWithType);
    } else if (typeof Buffer !== "undefined" && file instanceof Buffer) {
      const blob = new Blob([new Uint8Array(file)], { type: options.contentType || "application/octet-stream" });
      formData.append("file", blob);
    } else {
      throw new BlinkValidationError("Unsupported file type");
    }
    formData.append("path", filePath);
    const headers = {};
    const auth = this.getAuthorizationHeader(url, token);
    if (auth) {
      headers.Authorization = auth;
    } else if (this.publishableKey && path.includes("/api/storage/") && !headers["x-blink-publishable-key"]) {
      headers["x-blink-publishable-key"] = this.publishableKey;
    }
    try {
      if (typeof XMLHttpRequest !== "undefined" && options.onProgress) {
        return this.uploadWithProgress(url, formData, headers, options.onProgress);
      }
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: formData
      });
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }
      const data = await this.parseResponse(response);
      return {
        data,
        status: response.status,
        headers: response.headers
      };
    } catch (error) {
      if (error instanceof BlinkError) {
        throw error;
      }
      throw new BlinkNetworkError(
        `File upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        0,
        { originalError: error }
      );
    }
  }
  /**
   * Upload with progress tracking using XMLHttpRequest
   */
  uploadWithProgress(url, formData, headers, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percent = Math.round(event.loaded / event.total * 100);
          onProgress(percent);
        }
      });
      xhr.addEventListener("load", async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve({
              data,
              status: xhr.status,
              headers: new Headers()
              // XMLHttpRequest doesn't provide easy access to response headers
            });
          } catch (error) {
            reject(new BlinkNetworkError("Failed to parse response", xhr.status));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            const message = errorData.error?.message || errorData.message || `HTTP ${xhr.status}`;
            switch (xhr.status) {
              case 401:
                reject(new BlinkAuthError(message, errorData));
                break;
              case 400:
                reject(new BlinkValidationError(message, errorData));
                break;
              default:
                reject(new BlinkNetworkError(message, xhr.status, errorData));
            }
          } catch {
            reject(new BlinkNetworkError(`HTTP ${xhr.status}`, xhr.status));
          }
        }
      });
      xhr.addEventListener("error", () => {
        reject(new BlinkNetworkError("Network error during file upload"));
      });
      xhr.open("POST", url);
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
      xhr.send(formData);
    });
  }
  /**
   * AI-specific requests
   */
  async aiText(prompt, options = {}) {
    const { signal, ...body } = options;
    const requestBody = { ...body };
    if (prompt) {
      requestBody.prompt = prompt;
    }
    return this.request(`/api/ai/${this.projectId}/text`, {
      method: "POST",
      body: requestBody,
      signal
    });
  }
  /**
   * Stream AI text generation - uses Vercel AI SDK's pipeUIMessageStreamToResponse (Data Stream Protocol)
   */
  async streamAiText(prompt, options = {}, onChunk) {
    const url = this.buildUrl(`/api/ai/${this.projectId}/text`);
    const token = this.getValidToken ? await this.getValidToken() : this.getToken();
    const headers = {
      "Content-Type": "application/json"
    };
    const auth = this.getAuthorizationHeader(url, token);
    if (auth) headers.Authorization = auth;
    const body = {
      prompt,
      stream: true,
      ...options
    };
    const { signal: _signal, ...jsonBody } = body;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(jsonBody),
        signal: options.signal
      });
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }
      if (!response.body) {
        throw new BlinkNetworkError("No response body for streaming");
      }
      return this.parseDataStreamProtocol(response.body, onChunk);
    } catch (error) {
      if (error instanceof BlinkError) {
        throw error;
      }
      throw new BlinkNetworkError(
        `Streaming request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        0,
        { originalError: error }
      );
    }
  }
  async aiObject(prompt, options = {}) {
    const { signal, ...body } = options;
    const requestBody = { ...body };
    if (prompt) {
      requestBody.prompt = prompt;
    }
    return this.request(`/api/ai/${this.projectId}/object`, {
      method: "POST",
      body: requestBody,
      signal
    });
  }
  /**
   * Stream AI object generation - uses Vercel AI SDK's pipeTextStreamToResponse
   */
  async streamAiObject(prompt, options = {}, onPartial) {
    const url = this.buildUrl(`/api/ai/${this.projectId}/object`);
    const token = this.getValidToken ? await this.getValidToken() : this.getToken();
    const headers = {
      "Content-Type": "application/json"
    };
    const auth = this.getAuthorizationHeader(url, token);
    if (auth) headers.Authorization = auth;
    const body = {
      prompt,
      stream: true,
      ...options
    };
    const { signal: _signal2, ...jsonBody2 } = body;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(jsonBody2),
        signal: options.signal
      });
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }
      if (!response.body) {
        throw new BlinkNetworkError("No response body for streaming");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let latestObject = {};
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          try {
            const parsed = JSON.parse(buffer);
            latestObject = parsed;
            if (onPartial) {
              onPartial(parsed);
            }
          } catch {
          }
        }
        if (buffer) {
          try {
            latestObject = JSON.parse(buffer);
          } catch {
          }
        }
        return { object: latestObject };
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      if (error instanceof BlinkError) {
        throw error;
      }
      throw new BlinkNetworkError(
        `Streaming request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        0,
        { originalError: error }
      );
    }
  }
  async aiImage(prompt, options = {}) {
    const { signal, ...body } = options;
    return this.request(`/api/ai/${this.projectId}/image`, {
      method: "POST",
      body: {
        prompt,
        ...body
      },
      signal
    });
  }
  async aiSpeech(text, options = {}) {
    const { signal, ...body } = options;
    return this.request(`/api/ai/${this.projectId}/speech`, {
      method: "POST",
      body: {
        text,
        ...body
      },
      signal
    });
  }
  async aiTranscribe(audio, options = {}) {
    const { signal, ...body } = options;
    let payloadAudio;
    if (typeof audio === "string" || Array.isArray(audio)) {
      payloadAudio = audio;
    } else if (audio instanceof Uint8Array) {
      payloadAudio = Array.from(audio);
    } else if (audio instanceof ArrayBuffer) {
      payloadAudio = Array.from(new Uint8Array(audio));
    } else if (typeof Buffer !== "undefined" && Buffer.isBuffer(audio)) {
      payloadAudio = Array.from(new Uint8Array(audio));
    } else {
      throw new BlinkValidationError("Unsupported audio input type");
    }
    return this.request(`/api/ai/${this.projectId}/transcribe`, {
      method: "POST",
      body: {
        audio: payloadAudio,
        ...body
      },
      signal
    });
  }
  async aiVideo(prompt, options = {}) {
    const { signal, ...body } = options;
    return this.request(`/api/ai/${this.projectId}/video`, {
      method: "POST",
      body: {
        prompt,
        ...body
      },
      signal
    });
  }
  /**
   * AI Agent request (non-streaming)
   * Returns JSON response with text, steps, usage, and billing
   */
  async aiAgent(requestBody, signal) {
    return this.request(`/api/ai/${this.projectId}/agent`, {
      method: "POST",
      body: requestBody,
      signal
    });
  }
  /**
   * AI Agent streaming request
   * Returns raw Response for SSE streaming (compatible with AI SDK useChat)
   */
  async aiAgentStream(requestBody, signal) {
    const url = this.buildUrl(`/api/ai/${this.projectId}/agent`);
    const token = this.getValidToken ? await this.getValidToken() : this.getToken();
    const headers = {
      "Content-Type": "application/json"
    };
    const auth = this.getAuthorizationHeader(url, token);
    if (auth) headers.Authorization = auth;
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal
    });
    if (!response.ok) {
      await this.handleErrorResponse(response);
    }
    return response;
  }
  /**
   * RAG AI Search streaming request
   * Returns raw Response for SSE streaming
   */
  async ragAiSearchStream(body, signal) {
    const url = this.buildUrl(`/api/rag/${this.projectId}/ai-search`);
    const token = this.getValidToken ? await this.getValidToken() : this.getToken();
    const headers = {
      "Content-Type": "application/json"
    };
    const auth = this.getAuthorizationHeader(url, token);
    if (auth) headers.Authorization = auth;
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal
    });
    if (!response.ok) {
      await this.handleErrorResponse(response);
    }
    return response;
  }
  /**
   * Data-specific requests
   */
  async dataExtractFromUrl(projectId, request) {
    return this.request(`/api/data/${projectId}/extract-from-url`, {
      method: "POST",
      body: JSON.stringify(request)
    });
  }
  async dataExtractFromBlob(projectId, file, chunking, chunkSize) {
    const formData = new FormData();
    formData.append("file", file);
    if (chunking !== void 0) {
      formData.append("chunking", String(chunking));
    }
    if (chunkSize !== void 0) {
      formData.append("chunkSize", String(chunkSize));
    }
    return this.request(`/api/data/${projectId}/extract-from-blob`, {
      method: "POST",
      body: formData
    });
  }
  async dataScrape(projectId, request) {
    return this.request(`/api/data/${projectId}/scrape`, {
      method: "POST",
      body: JSON.stringify(request)
    });
  }
  async dataScreenshot(projectId, request) {
    return this.request(`/api/data/${projectId}/screenshot`, {
      method: "POST",
      body: JSON.stringify(request)
    });
  }
  async dataFetch(projectId, request) {
    return this.post(`/api/data/${projectId}/fetch`, request);
  }
  async dataSearch(projectId, request) {
    return this.post(`/api/data/${projectId}/search`, request);
  }
  /**
   * Connector requests
   */
  formatProviderForPath(provider) {
    return provider.replace("_", "-");
  }
  async connectorStatus(provider) {
    return this.request(`/api/connectors/${this.formatProviderForPath(provider)}/${this.projectId}/status`, {
      method: "GET"
    });
  }
  async connectorExecute(provider, request) {
    const path = request.method.startsWith("/") ? request.method : `/${request.method}`;
    const url = `/api/connectors/${this.formatProviderForPath(provider)}/${this.projectId}${path}`;
    const method = (request.http_method || "GET").toUpperCase();
    if (method === "GET") {
      return this.request(url, {
        method: "GET",
        searchParams: request.params
      });
    }
    return this.request(url, {
      method,
      body: request.params || {}
    });
  }
  async connectorSaveApiKey(provider, request) {
    return this.request(`/api/connectors/${this.formatProviderForPath(provider)}/${this.projectId}/api-key`, {
      method: "POST",
      body: request
    });
  }
  /**
   * Realtime-specific requests
   */
  async realtimePublish(projectId, request) {
    return this.post(`/api/realtime/${projectId}/publish`, request);
  }
  async realtimeGetPresence(projectId, channel) {
    return this.get(`/api/realtime/${projectId}/presence`, { channel });
  }
  async realtimeGetMessages(projectId, options) {
    const { channel, ...searchParams } = options;
    return this.get(`/api/realtime/${projectId}/messages`, {
      channel,
      ...Object.fromEntries(
        Object.entries(searchParams).filter(([k, v]) => v !== void 0).map(([k, v]) => [k, String(v)])
      )
    });
  }
  /**
   * Private helper methods
   */
  buildUrl(path, searchParams) {
    const baseUrl = path.includes("/api/auth/") ? this.authUrl : this.coreUrl;
    const url = new URL(path, baseUrl);
    if (searchParams) {
      Object.entries(searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    return url.toString();
  }
  async parseResponse(response) {
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return response.json();
    }
    if (contentType?.includes("text/")) {
      return response.text();
    }
    return response.blob();
  }
  async handleErrorResponse(response) {
    let errorData;
    try {
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        errorData = await response.json();
      } else {
        errorData = { message: await response.text() };
      }
    } catch {
      errorData = { message: "Unknown error occurred" };
    }
    const message = errorData.error?.message || errorData.message || `HTTP ${response.status}`;
    errorData.error?.code || errorData.code;
    switch (response.status) {
      case 401:
        throw new BlinkAuthError(message, errorData);
      case 400:
        throw new BlinkValidationError(message, errorData);
      default:
        throw new BlinkNetworkError(message, response.status, errorData);
    }
  }
  /**
   * Parse Vercel AI SDK v5 Data Stream Protocol (Server-Sent Events)
   * Supports all event types from the UI Message Stream protocol
   */
  async parseDataStreamProtocol(body, onChunk) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    const finalResult = {
      text: "",
      toolCalls: [],
      toolResults: [],
      sources: [],
      files: [],
      reasoning: []
    };
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          if (line === "[DONE]") {
            continue;
          }
          if (!line.startsWith("data: ")) continue;
          try {
            const jsonStr = line.slice(6);
            const part = JSON.parse(jsonStr);
            switch (part.type) {
              case "text-start":
                break;
              case "text-delta":
                if (part.delta) {
                  finalResult.text += part.delta;
                  if (onChunk) onChunk(part.delta);
                }
                if (part.textDelta) {
                  finalResult.text += part.textDelta;
                  if (onChunk) onChunk(part.textDelta);
                }
                break;
              case "text-end":
                break;
              case "tool-call":
                finalResult.toolCalls.push({
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  args: part.args
                });
                break;
              case "tool-result":
                finalResult.toolResults.push({
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  result: part.result
                });
                break;
              case "source-url":
                finalResult.sources.push({
                  id: part.id,
                  url: part.url,
                  title: part.title
                });
                break;
              case "file":
                finalResult.files.push(part.file);
                break;
              case "reasoning":
                finalResult.reasoning.push(part.content);
                break;
              case "finish":
                finalResult.finishReason = part.finishReason;
                finalResult.usage = part.usage;
                if (part.response) finalResult.response = part.response;
                break;
              case "error":
                finalResult.error = part.error;
                throw new Error(part.error);
              case "data":
                if (!finalResult.customData) finalResult.customData = [];
                finalResult.customData.push(part.value);
                break;
            }
          } catch (e) {
          }
        }
      }
      return finalResult;
    } finally {
      reader.releaseLock();
    }
  }
};
function hasWindow() {
  return typeof window !== "undefined";
}
function hasWindowLocation() {
  return typeof window !== "undefined" && typeof window.location !== "undefined";
}
function hasDocument() {
  return typeof document !== "undefined";
}
function isReactNative2() {
  return typeof navigator !== "undefined" && navigator.product === "ReactNative";
}
function getWindowLocation() {
  if (!hasWindow()) return null;
  try {
    return window.location;
  } catch {
    return null;
  }
}
function getLocationHref() {
  const loc = getWindowLocation();
  if (!loc) return null;
  try {
    return loc.href;
  } catch {
    return null;
  }
}
function getLocationOrigin() {
  const loc = getWindowLocation();
  if (!loc) return null;
  try {
    return loc.origin;
  } catch {
    return null;
  }
}
function getLocationHostname() {
  const loc = getWindowLocation();
  if (!loc) return null;
  try {
    return loc.hostname;
  } catch {
    return null;
  }
}
function getLocationPathname() {
  const loc = getWindowLocation();
  if (!loc) return null;
  try {
    return loc.pathname;
  } catch {
    return null;
  }
}
function getLocationSearch() {
  const loc = getWindowLocation();
  if (!loc) return null;
  try {
    return loc.search;
  } catch {
    return null;
  }
}
function getLocationHash() {
  const loc = getWindowLocation();
  if (!loc) return null;
  try {
    return loc.hash;
  } catch {
    return null;
  }
}
function getLocationProtocol() {
  const loc = getWindowLocation();
  if (!loc) return null;
  try {
    return loc.protocol;
  } catch {
    return null;
  }
}
function getLocationHost() {
  const loc = getWindowLocation();
  if (!loc) return null;
  try {
    return loc.host;
  } catch {
    return null;
  }
}
function constructFullUrl() {
  if (!hasWindow()) return null;
  const protocol = getLocationProtocol();
  const host = getLocationHost();
  const pathname = getLocationPathname();
  const search = getLocationSearch();
  const hash = getLocationHash();
  if (!protocol || !host) return null;
  return `${protocol}//${host}${pathname || ""}${search || ""}${hash || ""}`;
}
function getDocumentReferrer() {
  if (!hasDocument()) return null;
  try {
    return document.referrer || null;
  } catch {
    return null;
  }
}
function getWindowInnerWidth() {
  if (!hasWindow()) return null;
  try {
    return window.innerWidth;
  } catch {
    return null;
  }
}
function isIframe() {
  if (!hasWindow()) return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}
function getSessionStorage() {
  if (!hasWindow()) return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
var BlinkAuth = class {
  config;
  authConfig;
  authState;
  listeners = /* @__PURE__ */ new Set();
  authUrl;
  coreUrl;
  parentWindowTokens = null;
  isIframe = false;
  initializationPromise = null;
  isInitialized = false;
  storage;
  constructor(config) {
    this.config = config;
    if (!config.projectId) {
      throw new Error("projectId is required for authentication");
    }
    this.authConfig = {
      mode: "managed",
      // Default mode
      authUrl: "https://blink.new",
      coreUrl: "https://core.blink.new",
      detectSessionInUrl: true,
      // Default to true for web compatibility
      ...config.auth
    };
    this.authUrl = this.authConfig.authUrl || "https://blink.new";
    this.coreUrl = this.authConfig.coreUrl || "https://core.blink.new";
    const hostname = getLocationHostname();
    if (hostname && this.authUrl === "https://blink.new" && (hostname === "localhost" || hostname === "127.0.0.1")) {
      console.warn("\u26A0\uFE0F Using default authUrl in development. Set auth.authUrl to your app origin for headless auth endpoints to work.");
    }
    if (config.authRequired !== void 0 && !config.auth?.mode) {
      this.authConfig.mode = config.authRequired ? "managed" : "headless";
    }
    this.authState = {
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false
    };
    this.storage = config.auth?.storage || config.storage || getDefaultStorageAdapter();
    if (isWeb) {
      this.isIframe = isIframe();
      this.setupParentWindowListener();
      this.setupCrossTabSync();
      this.initializationPromise = this.initialize();
    } else {
      this.isInitialized = true;
    }
  }
  /**
   * Generate project-scoped storage key
   */
  getStorageKey(suffix) {
    return `blink_${suffix}_${this.config.projectId}`;
  }
  /**
   * Migrate existing global tokens to project-scoped storage
   * DISABLED: We don't migrate global blink_tokens anymore because:
   * 1. Platform uses blink_tokens for platform auth (different user)
   * 2. Migrating platform tokens would cause project to show wrong user
   * 3. Projects should always authenticate fresh via their own flow
   */
  migrateExistingTokens() {
  }
  /**
   * Wait for authentication initialization to complete
   */
  async waitForInitialization() {
    if (this.isInitialized) return;
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
  }
  /**
   * Setup listener for tokens from parent window
   */
  setupParentWindowListener() {
    if (!isWeb || !this.isIframe || !hasWindow()) return;
    window.addEventListener("message", (event) => {
      if (event.origin !== "https://blink.new" && event.origin !== "http://localhost:3000" && event.origin !== "http://localhost:3001") {
        return;
      }
      if (event.data?.type === "BLINK_AUTH_TOKENS") {
        console.log("\u{1F4E5} Received auth tokens from parent window");
        const { tokens } = event.data;
        if (tokens) {
          this.parentWindowTokens = tokens;
          this.setTokens(tokens, false).then(() => {
            console.log("\u2705 Tokens from parent window applied");
          }).catch((error) => {
            console.error("Failed to apply parent window tokens:", error);
          });
        }
      }
      if (event.data?.type === "BLINK_AUTH_LOGOUT") {
        console.log("\u{1F4E4} Received logout command from parent window");
        this.clearTokens();
      }
    });
    if (hasWindow() && window.parent !== window) {
      console.log("\u{1F504} Requesting auth tokens from parent window");
      window.parent.postMessage({
        type: "BLINK_REQUEST_AUTH_TOKENS",
        projectId: this.config.projectId
      }, "*");
    }
  }
  /**
   * Initialize authentication from stored tokens or URL fragments
   */
  async initialize() {
    console.log("\u{1F680} Initializing Blink Auth...");
    this.setLoading(true);
    try {
      this.migrateExistingTokens();
      if (this.isIframe) {
        console.log("\u{1F50D} Detected iframe environment, waiting for parent tokens...");
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (this.parentWindowTokens) {
          console.log("\u2705 Using tokens from parent window");
          await this.setTokens(this.parentWindowTokens, false);
          return;
        }
      }
      if (this.authConfig.detectSessionInUrl !== false) {
        const tokensFromUrl = this.extractTokensFromUrl();
        if (tokensFromUrl) {
          console.log("\u{1F4E5} Found tokens in URL, setting them...");
          await this.setTokens(tokensFromUrl, true);
          this.clearUrlTokens();
          console.log("\u2705 Auth initialization complete (from URL)");
          return;
        }
      }
      const storedTokens = await this.getStoredTokens();
      if (storedTokens) {
        console.log("\u{1F4BE} Found stored tokens, validating...", {
          hasAccessToken: !!storedTokens.access_token,
          hasRefreshToken: !!storedTokens.refresh_token,
          issuedAt: storedTokens.issued_at,
          expiresIn: storedTokens.expires_in,
          refreshExpiresIn: storedTokens.refresh_expires_in,
          currentTime: Math.floor(Date.now() / 1e3)
        });
        this.authState.tokens = storedTokens;
        console.log("\u{1F527} Tokens set in auth state, refresh token available:", !!this.authState.tokens?.refresh_token);
        const isValid = await this.validateStoredTokens(storedTokens);
        if (isValid) {
          console.log("\u2705 Auth initialization complete (from storage)");
          return;
        } else {
          console.log("\u{1F504} Stored tokens invalid, clearing...");
          this.clearTokens();
        }
      }
      console.log("\u274C No tokens found");
      if (this.config.authRequired && hasWindowLocation()) {
        console.log("\u{1F504} Auth required, redirecting to auth page...");
        this.redirectToAuth();
      } else {
        console.log("\u26A0\uFE0F Auth not required or no window.location, continuing without authentication");
      }
    } finally {
      this.setLoading(false);
      this.isInitialized = true;
    }
  }
  /**
   * Redirect to Blink auth page
   */
  login(nextUrl) {
    if (!hasWindowLocation()) {
      console.warn("login() called in non-browser environment (no window.location available)");
      return;
    }
    let redirectUrl = nextUrl || this.authConfig.redirectUrl;
    if (!redirectUrl) {
      const href = getLocationHref();
      if (href && href.startsWith("http")) {
        redirectUrl = href;
      } else {
        redirectUrl = constructFullUrl() || void 0;
      }
    }
    if (redirectUrl) {
      try {
        const url = new URL(redirectUrl);
        url.searchParams.delete("redirect_url");
        url.searchParams.delete("redirect");
        redirectUrl = url.toString();
      } catch (e) {
        console.warn("Failed to parse redirect URL:", e);
      }
    }
    const authUrl = new URL("/auth", this.authUrl);
    authUrl.searchParams.set("redirect_url", redirectUrl || "");
    if (this.config.projectId) {
      authUrl.searchParams.set("project_id", this.config.projectId);
    }
    window.location.href = authUrl.toString();
  }
  /**
   * Logout and clear stored tokens
   */
  logout(redirectUrl) {
    this.clearTokens();
    if (redirectUrl && hasWindowLocation()) {
      window.location.href = redirectUrl;
    }
  }
  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.authState.isAuthenticated;
  }
  /**
   * Get current user (sync)
   */
  currentUser() {
    return this.authState.user;
  }
  /**
   * Get current access token
   */
  getToken() {
    return this.authState.tokens?.access_token || null;
  }
  /**
   * Check if access token is expired based on timestamp
   */
  isAccessTokenExpired() {
    const tokens = this.authState.tokens;
    if (!tokens || !tokens.issued_at) {
      return true;
    }
    const now = Math.floor(Date.now() / 1e3);
    const expiresAt = tokens.issued_at + tokens.expires_in;
    const bufferTime = 30;
    return now >= expiresAt - bufferTime;
  }
  /**
   * Check if refresh token is expired based on timestamp
   */
  isRefreshTokenExpired() {
    const tokens = this.authState.tokens;
    if (!tokens || !tokens.refresh_token || !tokens.issued_at || !tokens.refresh_expires_in) {
      return true;
    }
    const now = Math.floor(Date.now() / 1e3);
    const expiresAt = tokens.issued_at + tokens.refresh_expires_in;
    return now >= expiresAt;
  }
  /**
   * Get a valid access token, refreshing if necessary
   */
  async getValidToken() {
    const tokens = this.authState.tokens;
    if (!tokens) {
      return null;
    }
    if (!this.isAccessTokenExpired()) {
      console.log("\u2705 Access token is still valid");
      return tokens.access_token;
    }
    console.log("\u23F0 Access token expired, attempting refresh...");
    if (this.isRefreshTokenExpired()) {
      console.log("\u274C Refresh token also expired, clearing tokens");
      this.clearTokens();
      if (this.config.authRequired) {
        this.redirectToAuth();
      }
      return null;
    }
    const refreshed = await this.refreshToken();
    if (refreshed) {
      console.log("\u2705 Token refreshed successfully");
      return this.authState.tokens?.access_token || null;
    } else {
      console.log("\u274C Token refresh failed");
      this.clearTokens();
      if (this.config.authRequired) {
        this.redirectToAuth();
      }
      return null;
    }
  }
  /**
   * Fetch current user profile from API
   * Gracefully waits for auth initialization to complete before throwing errors
   */
  async me() {
    await this.waitForInitialization();
    if (this.authState.isAuthenticated && this.authState.user) {
      return this.authState.user;
    }
    if (!this.authState.isAuthenticated) {
      return new Promise((resolve, reject) => {
        if (this.authState.user) {
          resolve(this.authState.user);
          return;
        }
        const timeout = setTimeout(() => {
          unsubscribe();
          reject(new BlinkAuthError("AUTH_TIMEOUT", "Authentication timeout - no user available"));
        }, 5e3);
        const unsubscribe = this.onAuthStateChanged((state) => {
          if (state.user) {
            clearTimeout(timeout);
            unsubscribe();
            resolve(state.user);
          } else if (!state.isLoading && !state.isAuthenticated) {
            clearTimeout(timeout);
            unsubscribe();
            reject(new BlinkAuthError("INVALID_CREDENTIALS", "Not authenticated"));
          }
        });
      });
    }
    let token = this.getToken();
    if (!token) {
      throw new BlinkAuthError("TOKEN_EXPIRED", "No access token available");
    }
    try {
      const response = await fetch(`${this.authUrl}/api/auth/me`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          const refreshed = await this.refreshToken();
          if (refreshed) {
            token = this.getToken();
            if (token) {
              const retryResponse = await fetch(`${this.authUrl}/api/auth/me`, {
                headers: {
                  "Authorization": `Bearer ${token}`
                }
              });
              if (retryResponse.ok) {
                const retryData = await retryResponse.json();
                const user2 = retryData.user;
                this.updateAuthState({
                  ...this.authState,
                  user: user2
                });
                return user2;
              }
            }
          }
          this.clearTokens();
          if (this.config.authRequired) {
            this.redirectToAuth();
          }
        }
        const errorData = await response.json().catch(() => ({}));
        const errorCode = this.mapErrorCodeFromResponse(errorData.code);
        throw new BlinkAuthError(errorCode, errorData.error || `Failed to fetch user: ${response.statusText}`);
      }
      const data = await response.json();
      const user = data.user;
      this.updateAuthState({
        ...this.authState,
        user
      });
      return user;
    } catch (error) {
      if (error instanceof BlinkAuthError) {
        throw error;
      }
      throw new BlinkAuthError("NETWORK_ERROR", `Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * Sign up with email and password (headless mode)
   */
  async signUp(data) {
    if (this.authConfig.mode !== "headless") {
      throw new BlinkAuthError("INVALID_CREDENTIALS", "signUp is only available in headless mode");
    }
    try {
      const response = await fetch(`${this.authUrl}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...data,
          projectId: this.config.projectId
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        const errorCode = this.mapErrorCodeFromResponse(errorData.code);
        throw new BlinkAuthError(errorCode, errorData.error || "Sign up failed");
      }
      const result = await response.json();
      await this.setTokens({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        token_type: result.token_type,
        expires_in: result.expires_in,
        refresh_expires_in: result.refresh_expires_in
      }, true, result.user);
      return result.user;
    } catch (error) {
      if (error instanceof BlinkAuthError) {
        throw error;
      }
      throw new BlinkAuthError("NETWORK_ERROR", `Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * Sign in with email and password (headless mode)
   */
  async signInWithEmail(email, password) {
    if (this.authConfig.mode !== "headless") {
      throw new BlinkAuthError("INVALID_CREDENTIALS", "signInWithEmail is only available in headless mode");
    }
    try {
      const response = await fetch(`${this.authUrl}/api/auth/signin/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password,
          projectId: this.config.projectId
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        const errorCode = this.mapErrorCodeFromResponse(errorData.code);
        throw new BlinkAuthError(errorCode, errorData.error || "Sign in failed");
      }
      const result = await response.json();
      await this.setTokens({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        token_type: result.token_type,
        expires_in: result.expires_in,
        refresh_expires_in: result.refresh_expires_in
      }, true, result.user);
      return result.user;
    } catch (error) {
      if (error instanceof BlinkAuthError) {
        throw error;
      }
      throw new BlinkAuthError("NETWORK_ERROR", `Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * Sign in with Google (headless mode)
   * 
   * **Universal OAuth** - Works on both Web and React Native!
   * 
   * On React Native, requires `webBrowser` to be configured in client:
   * ```typescript
   * const blink = createClient({
   *   auth: { mode: 'headless', webBrowser: WebBrowser }
   * })
   * await blink.auth.signInWithGoogle() // Works on both platforms!
   * ```
   */
  async signInWithGoogle(options) {
    if (this.authConfig.mode !== "headless") {
      throw new BlinkAuthError("INVALID_CREDENTIALS", "signInWithGoogle is only available in headless mode");
    }
    return this.signInWithProvider("google", options);
  }
  /**
   * Sign in with GitHub (headless mode)
   * 
   * **Universal OAuth** - Works on both Web and React Native!
   * See signInWithGoogle() for setup instructions.
   */
  async signInWithGitHub(options) {
    if (this.authConfig.mode !== "headless") {
      throw new BlinkAuthError("INVALID_CREDENTIALS", "signInWithGitHub is only available in headless mode");
    }
    return this.signInWithProvider("github", options);
  }
  /**
   * Sign in with Apple (headless mode)
   * 
   * **Universal OAuth** - Works on both Web and React Native!
   * See signInWithGoogle() for setup instructions.
   */
  async signInWithApple(options) {
    if (this.authConfig.mode !== "headless") {
      throw new BlinkAuthError("INVALID_CREDENTIALS", "signInWithApple is only available in headless mode");
    }
    return this.signInWithProvider("apple", options);
  }
  /**
   * Sign in with Microsoft (headless mode)
   * 
   * **Universal OAuth** - Works on both Web and React Native!
   * See signInWithGoogle() for setup instructions.
   */
  async signInWithMicrosoft(options) {
    if (this.authConfig.mode !== "headless") {
      throw new BlinkAuthError("INVALID_CREDENTIALS", "signInWithMicrosoft is only available in headless mode");
    }
    return this.signInWithProvider("microsoft", options);
  }
  /**
   * Initiate OAuth for mobile without deep linking (expo-web-browser pattern)
   * 
   * This method:
   * 1. Generates a unique session ID
   * 2. Returns OAuth URL with session parameter
   * 3. App opens URL in expo-web-browser
   * 4. App polls checkMobileOAuthSession() until complete
   * 
   * @param provider - OAuth provider (google, github, apple, etc.)
   * @param options - Optional metadata
   * @returns Session ID and OAuth URL
   * 
   * @example
   * // React Native with expo-web-browser
   * import * as WebBrowser from 'expo-web-browser';
   * 
   * const { sessionId, authUrl } = await blink.auth.initiateMobileOAuth('google');
   * 
   * // Open browser
   * await WebBrowser.openAuthSessionAsync(authUrl);
   * 
   * // Poll for completion
   * const user = await blink.auth.pollMobileOAuthSession(sessionId);
   * console.log('Authenticated:', user.email);
   */
  async initiateMobileOAuth(provider, options) {
    if (this.authConfig.mode !== "headless") {
      throw new BlinkAuthError(
        "INVALID_CREDENTIALS",
        "initiateMobileOAuth is only available in headless mode"
      );
    }
    const sessionId = this.generateSessionId();
    const authUrl = new URL("/auth", this.authUrl);
    authUrl.searchParams.set("provider", provider);
    authUrl.searchParams.set("project_id", this.config.projectId);
    authUrl.searchParams.set("mode", "mobile-session");
    authUrl.searchParams.set("session_id", sessionId);
    if (options?.metadata) {
      authUrl.searchParams.set("metadata", JSON.stringify(options.metadata));
    }
    return {
      sessionId,
      authUrl: authUrl.toString()
    };
  }
  /**
   * Check mobile OAuth session status (single check)
   * 
   * @param sessionId - Session ID from initiateMobileOAuth
   * @returns Tokens if session is complete, null if still pending
   */
  async checkMobileOAuthSession(sessionId) {
    try {
      const response = await fetch(`${this.authUrl}/api/auth/mobile-session/${sessionId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      if (response.status === 404 || response.status === 202) {
        return null;
      }
      if (!response.ok) {
        const errorData = await response.json();
        const errorCode = this.mapErrorCodeFromResponse(errorData.code);
        throw new BlinkAuthError(
          errorCode,
          errorData.error || "Failed to check OAuth session"
        );
      }
      const data = await response.json();
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_type: data.token_type || "Bearer",
        expires_in: data.expires_in || 3600,
        refresh_expires_in: data.refresh_expires_in
      };
    } catch (error) {
      if (error instanceof BlinkAuthError) {
        throw error;
      }
      throw new BlinkAuthError(
        "NETWORK_ERROR",
        `Network error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Poll mobile OAuth session until complete (convenience method)
   * 
   * @param sessionId - Session ID from initiateMobileOAuth
   * @param options - Polling options
   * @returns Authenticated user
   * 
   * @example
   * const { sessionId, authUrl } = await blink.auth.initiateMobileOAuth('google');
   * await WebBrowser.openAuthSessionAsync(authUrl);
   * const user = await blink.auth.pollMobileOAuthSession(sessionId, {
   *   maxAttempts: 60,
   *   intervalMs: 1000
   * });
   */
  async pollMobileOAuthSession(sessionId, options) {
    const maxAttempts = options?.maxAttempts || 60;
    const intervalMs = options?.intervalMs || 1e3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const tokens = await this.checkMobileOAuthSession(sessionId);
      if (tokens) {
        await this.setTokens(tokens, true);
        return this.authState.user;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new BlinkAuthError(
      "AUTH_TIMEOUT",
      "Mobile OAuth session timed out"
    );
  }
  /**
   * Sign in with OAuth provider using expo-web-browser (React Native)
   * 
   * This is a convenience method that handles the entire flow:
   * 1. Initiates mobile OAuth session
   * 2. Returns auth URL to open in WebBrowser
   * 3. Provides polling function to call after browser opens
   * 
   * @param provider - OAuth provider
   * @returns Object with authUrl and authenticate function
   * 
   * @example
   * import * as WebBrowser from 'expo-web-browser';
   * 
   * const { authUrl, authenticate } = await blink.auth.signInWithProviderMobile('google');
   * 
   * // Open browser
   * await WebBrowser.openAuthSessionAsync(authUrl);
   * 
   * // Wait for authentication
   * const user = await authenticate();
   */
  async signInWithProviderMobile(provider, options) {
    const { sessionId, authUrl } = await this.initiateMobileOAuth(provider, options);
    return {
      authUrl,
      authenticate: () => this.pollMobileOAuthSession(sessionId, {
        maxAttempts: 60,
        intervalMs: 1e3
      })
    };
  }
  /**
   * Universal OAuth flow using session-based authentication (internal)
   * Works on ALL platforms: Web, iOS, Android
   * Uses expo-web-browser to open auth URL and polls for completion
   */
  async signInWithProviderUniversal(provider, options) {
    const webBrowser = this.authConfig.webBrowser;
    if (!webBrowser) {
      throw new BlinkAuthError(
        "NETWORK_ERROR",
        "webBrowser module is required for universal OAuth flow"
      );
    }
    const { sessionId, authUrl } = await this.initiateMobileOAuth(provider, options);
    console.log("\u{1F510} Opening OAuth browser for", provider);
    const browserPromise = webBrowser.openAuthSessionAsync(authUrl);
    const raceResult = await Promise.race([
      browserPromise.then((result) => ({ closed: true, result })).catch((err) => ({ closed: true, error: err })),
      new Promise(
        (resolve) => setTimeout(() => resolve({ closed: false }), 5e3)
      )
    ]);
    if (raceResult.closed) {
      if ("result" in raceResult) {
        console.log("\u{1F510} Browser closed with result:", raceResult.result.type);
      } else {
        console.log("\u{1F510} Browser closed with error");
      }
    } else {
      console.log("\u{1F510} Browser still open (new tab/stuck popup), starting to poll...");
    }
    const user = await this.pollMobileOAuthSession(sessionId, {
      maxAttempts: 120,
      // 60 seconds (give user time to complete auth)
      intervalMs: 500
    });
    console.log("\u2705 OAuth completed successfully");
    return user;
  }
  /**
   * Generic provider sign-in method (headless mode)
   * 
   * **Universal OAuth** - Works seamlessly on both Web and React Native!
   * 
   * When `webBrowser` is configured in the client, this method automatically
   * uses the session-based OAuth flow that works on ALL platforms.
   * 
   * **Universal Setup (configure once, works everywhere):**
   * ```typescript
   * import * as WebBrowser from 'expo-web-browser'
   * import AsyncStorage from '@react-native-async-storage/async-storage'
   * 
   * const blink = createClient({
   *   projectId: 'your-project',
   *   auth: {
   *     mode: 'headless',
   *     webBrowser: WebBrowser  // Pass the module here
   *   },
   *   storage: new AsyncStorageAdapter(AsyncStorage)
   * })
   * 
   * // Now this works on ALL platforms - no platform checks needed!
   * const user = await blink.auth.signInWithGoogle()
   * ```
   * 
   * @param provider - OAuth provider (google, github, apple, etc.)
   * @param options - Optional redirect URL and metadata
   * @returns Promise that resolves with authenticated user
   */
  async signInWithProvider(provider, options) {
    if (this.authConfig.mode !== "headless") {
      throw new BlinkAuthError("INVALID_CREDENTIALS", "signInWithProvider is only available in headless mode");
    }
    if (this.authConfig.webBrowser) {
      return this.signInWithProviderUniversal(provider, options);
    }
    if (isReactNative2()) {
      throw new BlinkAuthError(
        "NETWORK_ERROR",
        'React Native OAuth requires webBrowser in config!\n\nimport * as WebBrowser from "expo-web-browser";\n\nconst blink = createClient({\n  projectId: "your-project",\n  auth: {\n    mode: "headless",\n    webBrowser: WebBrowser\n  }\n})\n\nawait blink.auth.signInWithGoogle() // Works on all platforms!'
      );
    }
    if (!hasWindow()) {
      throw new BlinkAuthError("NETWORK_ERROR", "signInWithProvider requires a browser environment");
    }
    const shouldPreferRedirect = isWeb && this.isIframe || typeof window !== "undefined" && window.crossOriginIsolated === true;
    const state = this.generateState();
    try {
      const sessionStorage = getSessionStorage();
      if (sessionStorage) {
        sessionStorage.setItem("blink_oauth_state", state);
      }
    } catch {
    }
    const redirectUrl = options?.redirectUrl || getLocationOrigin() || "";
    const buildAuthUrl = (mode) => {
      const url = new URL("/auth", this.authUrl);
      url.searchParams.set("provider", provider);
      url.searchParams.set("project_id", this.config.projectId);
      url.searchParams.set("state", state);
      url.searchParams.set("mode", mode);
      url.searchParams.set("redirect_url", redirectUrl);
      url.searchParams.set("opener_origin", getLocationOrigin() || "");
      return url;
    };
    if (shouldPreferRedirect) {
      window.location.href = buildAuthUrl("redirect").toString();
      return new Promise(() => {
      });
    }
    return new Promise((resolve, reject) => {
      const popupUrl = buildAuthUrl("popup");
      const popup = window.open(
        popupUrl.toString(),
        "blink-auth",
        "width=500,height=600,scrollbars=yes,resizable=yes"
      );
      if (!popup) {
        reject(new BlinkAuthError("POPUP_CANCELED", "Popup was blocked"));
        return;
      }
      let timeoutId;
      let closedIntervalId;
      let cleanedUp = false;
      const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        clearTimeout(timeoutId);
        if (closedIntervalId) clearInterval(closedIntervalId);
        window.removeEventListener("message", messageListener);
      };
      const messageListener = (event) => {
        let allowed = false;
        try {
          const authOrigin = new URL(this.authUrl).origin;
          if (event.origin === authOrigin) allowed = true;
        } catch {
        }
        if (event.origin === "http://localhost:3000" || event.origin === "http://localhost:3001") allowed = true;
        if (!allowed) return;
        if (event.data?.type === "BLINK_AUTH_TOKENS") {
          const { access_token, refresh_token, token_type, expires_in, refresh_expires_in, projectId, state: returnedState } = event.data;
          try {
            const sessionStorage = getSessionStorage();
            const expected = sessionStorage?.getItem("blink_oauth_state");
            if (returnedState && expected && returnedState !== expected) {
              reject(new BlinkAuthError("VERIFICATION_FAILED", "State mismatch"));
              clearTimeout(timeoutId);
              window.removeEventListener("message", messageListener);
              popup.close();
              return;
            }
          } catch {
          }
          if (projectId !== this.config.projectId) {
            reject(new BlinkAuthError("INVALID_CREDENTIALS", "Project ID mismatch"));
            return;
          }
          this.setTokens({
            access_token,
            refresh_token,
            token_type,
            expires_in,
            refresh_expires_in
          }, true).then(() => {
            resolve(this.authState.user);
          }).catch(reject);
          cleanup();
          popup.close();
        } else if (event.data?.type === "BLINK_AUTH_ERROR") {
          const errorCode = this.mapErrorCodeFromResponse(event.data.code);
          reject(new BlinkAuthError(errorCode, event.data.message || "Authentication failed"));
          cleanup();
          popup.close();
        }
      };
      if (popup.opener === null) {
        try {
          popup.close();
        } catch {
        }
        cleanup();
        window.location.href = buildAuthUrl("redirect").toString();
        return;
      }
      timeoutId = setTimeout(() => {
        cleanup();
        if (!popup.closed) {
          popup.close();
        }
        reject(new BlinkAuthError("AUTH_TIMEOUT", "Authentication timed out"));
      }, 3e5);
      closedIntervalId = setInterval(() => {
        if (popup.closed) {
          cleanup();
          reject(new BlinkAuthError("POPUP_CANCELED", "Authentication was canceled"));
        }
      }, 1e3);
      window.addEventListener("message", messageListener);
    });
  }
  /**
   * Generate password reset token (for custom email delivery)
   */
  async generatePasswordResetToken(email) {
    try {
      const response = await fetch(`${this.authUrl}/api/auth/password/reset/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          projectId: this.config.projectId
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        const errorCode = this.mapErrorCodeFromResponse(errorData.code);
        throw new BlinkAuthError(
          errorCode,
          errorData.error || "Failed to generate password reset token",
          errorData.error
        );
      }
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof BlinkAuthError) {
        throw error;
      }
      throw new BlinkAuthError(
        "NETWORK_ERROR",
        "Failed to generate password reset token",
        "Network error occurred"
      );
    }
  }
  /**
   * Send password reset email (using Blink default email service)
   */
  async sendPasswordResetEmail(email, options) {
    try {
      const response = await fetch(`${this.authUrl}/api/auth/password/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          projectId: this.config.projectId,
          redirectUrl: options?.redirectUrl
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        const errorCode = this.mapErrorCodeFromResponse(errorData.code);
        throw new BlinkAuthError(errorCode, errorData.error || "Failed to send password reset email");
      }
    } catch (error) {
      if (error instanceof BlinkAuthError) {
        throw error;
      }
      throw new BlinkAuthError("NETWORK_ERROR", `Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * Confirm password reset with token
   */
  async confirmPasswordReset(token, newPassword) {
    try {
      const response = await fetch(`${this.authUrl}/api/auth/password/reset/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token,
          password: newPassword,
          projectId: this.config.projectId
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        const errorCode = this.mapErrorCodeFromResponse(errorData.code);
        throw new BlinkAuthError(errorCode, errorData.error || "Failed to reset password");
      }
    } catch (error) {
      if (error instanceof BlinkAuthError) {
        throw error;
      }
      throw new BlinkAuthError("NETWORK_ERROR", `Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * Change password (requires current authentication)
   */
  async changePassword(oldPassword, newPassword) {
    const token = await this.getValidToken();
    if (!token) {
      throw new BlinkAuthError("TOKEN_EXPIRED", "No access token available");
    }
    try {
      const response = await fetch(`${this.authUrl}/api/auth/password/change`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          oldPassword,
          newPassword
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        const errorCode = this.mapErrorCodeFromResponse(errorData.code);
        throw new BlinkAuthError(errorCode, errorData.error || "Failed to change password");
      }
    } catch (error) {
      if (error instanceof BlinkAuthError) {
        throw error;
      }
      throw new BlinkAuthError("NETWORK_ERROR", `Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * Generate email verification token (for custom email delivery)
   */
  async generateEmailVerificationToken() {
    const token = await this.getValidToken();
    if (!token) {
      throw new BlinkAuthError("TOKEN_EXPIRED", "No access token available");
    }
    try {
      const response = await fetch(`${this.authUrl}/api/auth/email/verify/generate`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        const errorCode = this.mapErrorCodeFromResponse(errorData.code);
        throw new BlinkAuthError(
          errorCode,
          errorData.error || "Failed to generate email verification token",
          errorData.error
        );
      }
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof BlinkAuthError) {
        throw error;
      }
      throw new BlinkAuthError(
        "NETWORK_ERROR",
        "Failed to generate email verification token",
        "Network error occurred"
      );
    }
  }
  /**
   * Send email verification (using Blink default email service)
   */
  async sendEmailVerification() {
    const token = await this.getValidToken();
    if (!token) {
      throw new BlinkAuthError("TOKEN_EXPIRED", "No access token available");
    }
    try {
      const response = await fetch(`${this.authUrl}/api/auth/email/verify/send`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        const errorCode = this.mapErrorCodeFromResponse(errorData.code);
        throw new BlinkAuthError(errorCode, errorData.error || "Failed to send verification email");
      }
    } catch (error) {
      if (error instanceof BlinkAuthError) {
        throw error;
      }
      throw new BlinkAuthError("NETWORK_ERROR", `Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * Verify email with token
   */
  async verifyEmail(token) {
    try {
      const response = await fetch(`${this.authUrl}/api/auth/email/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token,
          projectId: this.config.projectId
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        const errorCode = this.mapErrorCodeFromResponse(errorData.code);
        throw new BlinkAuthError(errorCode, errorData.error || "Failed to verify email");
      }
    } catch (error) {
      if (error instanceof BlinkAuthError) {
        throw error;
      }
      throw new BlinkAuthError("NETWORK_ERROR", `Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * Generate magic link token (for custom email delivery)
   */
  async generateMagicLinkToken(email, options) {
    try {
      const response = await fetch(`${this.authUrl}/api/auth/signin/magic/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          redirectUrl: options?.redirectUrl,
          projectId: this.config.projectId
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        const errorCode = this.mapErrorCodeFromResponse(errorData.code);
        throw new BlinkAuthError(
          errorCode,
          errorData.error || "Failed to generate magic link token",
          errorData.error
        );
      }
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof BlinkAuthError) {
        throw error;
      }
      throw new BlinkAuthError(
        "NETWORK_ERROR",
        "Failed to generate magic link token",
        "Network error occurred"
      );
    }
  }
  /**
   * Send magic link (using Blink default email service)
   */
  async sendMagicLink(email, options) {
    try {
      const response = await fetch(`${this.authUrl}/api/auth/signin/magic`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          redirectUrl: options?.redirectUrl,
          projectId: this.config.projectId
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        const errorCode = this.mapErrorCodeFromResponse(errorData.code);
        throw new BlinkAuthError(errorCode, errorData.error || "Failed to send magic link");
      }
    } catch (error) {
      if (error instanceof BlinkAuthError) {
        throw error;
      }
      throw new BlinkAuthError("NETWORK_ERROR", `Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * Verify magic link (automatic on redirect)
   */
  async verifyMagicLink(token) {
    const magicToken = token || this.extractMagicTokenFromUrl();
    if (!magicToken) {
      throw new BlinkAuthError("VERIFICATION_FAILED", "No magic link token found");
    }
    try {
      const response = await fetch(`${this.authUrl}/api/auth/signin/magic/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token: magicToken,
          projectId: this.config.projectId
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        const errorCode = this.mapErrorCodeFromResponse(errorData.code);
        throw new BlinkAuthError(errorCode, errorData.error || "Magic link verification failed");
      }
      const result = await response.json();
      await this.setTokens({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        token_type: result.token_type,
        expires_in: result.expires_in,
        refresh_expires_in: result.refresh_expires_in
      }, true, result.user);
      return result.user;
    } catch (error) {
      if (error instanceof BlinkAuthError) {
        throw error;
      }
      throw new BlinkAuthError("NETWORK_ERROR", `Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * Get available providers for the current project
   */
  async getAvailableProviders() {
    try {
      const response = await fetch(`${this.authUrl}/api/auth/providers?projectId=${encodeURIComponent(this.config.projectId)}`);
      if (!response.ok) {
        return ["email", "google"];
      }
      const data = await response.json();
      return data.providers || ["email", "google"];
    } catch (error) {
      return ["email", "google"];
    }
  }
  /**
   * Check if user has a specific role
   */
  hasRole(role) {
    const user = this.authState.user;
    if (!user || !user.role) {
      return false;
    }
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  }
  /**
   * Check if user can perform a specific action
   */
  can(permission, resource) {
    const user = this.authState.user;
    if (!user || !user.role) {
      return false;
    }
    const roles = this.authConfig.roles;
    if (!roles) {
      return false;
    }
    const roleConfig = roles[user.role];
    if (!roleConfig) {
      return false;
    }
    if (roleConfig.permissions.includes("*")) {
      return true;
    }
    const fullPermission = resource ? `${permission}.${resource}` : permission;
    if (roleConfig.permissions.includes(fullPermission)) {
      return true;
    }
    if (roleConfig.permissions.includes(permission)) {
      return true;
    }
    const visited = /* @__PURE__ */ new Set();
    const hasPermissionInRole = (roleName) => {
      if (visited.has(roleName)) return false;
      visited.add(roleName);
      const rc = roles[roleName];
      if (!rc) return false;
      if (rc.permissions.includes("*")) return true;
      const fullPermission2 = resource ? `${permission}.${resource}` : permission;
      if (rc.permissions.includes(fullPermission2) || rc.permissions.includes(permission)) return true;
      if (rc.inherit) {
        for (const parent of rc.inherit) {
          if (hasPermissionInRole(parent)) return true;
        }
      }
      return false;
    };
    if (hasPermissionInRole(user.role)) return true;
    return false;
  }
  /**
   * Sign out (clear local tokens)
   * Note: With stateless tokens, this only clears local storage
   */
  async signOut() {
    this.clearTokens();
  }
  /**
   * @deprecated Use signOut() instead. Kept for backward compatibility.
   */
  async revokeAllSessions() {
    return this.signOut();
  }
  /**
   * Recover auth state (clear corrupted tokens and re-initialize)
   */
  async recoverAuthState() {
    console.log("\u{1F504} Recovering auth state...");
    this.clearTokens();
    this.isInitialized = false;
    this.initializationPromise = null;
    if (typeof window !== "undefined") {
      this.initializationPromise = this.initialize();
      await this.initializationPromise;
    }
    console.log("\u2705 Auth state recovery complete");
  }
  /**
   * Update user profile
   */
  async updateMe(updates) {
    const token = this.getToken();
    if (!token) {
      throw new BlinkAuthError("TOKEN_EXPIRED", "No access token available");
    }
    try {
      const response = await fetch(`${this.authUrl}/api/auth/me`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updates)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorCode = this.mapErrorCodeFromResponse(errorData.code);
        throw new BlinkAuthError(errorCode, errorData.error || `Failed to update user: ${response.statusText}`);
      }
      const data = await response.json();
      const user = data.user;
      this.updateAuthState({
        ...this.authState,
        user
      });
      return user;
    } catch (error) {
      if (error instanceof BlinkAuthError) {
        throw error;
      }
      throw new BlinkAuthError("NETWORK_ERROR", `Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * Manually set tokens (for server-side usage)
   */
  async setToken(jwt, persist = false) {
    const tokens = {
      access_token: jwt,
      token_type: "Bearer",
      expires_in: 15 * 60
      // Default 15 minutes
    };
    await this.setTokens(tokens, persist);
  }
  /**
   * Manually set auth session from tokens (React Native deep link OAuth)
   * 
   * Use this method to set the user session after receiving tokens from a deep link callback.
   * This is the React Native equivalent of automatic URL token detection on web.
   * 
   * @param tokens - Auth tokens received from deep link or OAuth callback
   * @param persist - Whether to persist tokens to storage (default: true)
   * 
   * @example
   * // React Native: Handle deep link OAuth callback
   * import * as Linking from 'expo-linking'
   * 
   * Linking.addEventListener('url', async ({ url }) => {
   *   const { queryParams } = Linking.parse(url)
   *   
   *   if (queryParams.access_token) {
   *     await blink.auth.setSession({
   *       access_token: queryParams.access_token,
   *       refresh_token: queryParams.refresh_token,
   *       expires_in: parseInt(queryParams.expires_in) || 3600,
   *       refresh_expires_in: parseInt(queryParams.refresh_expires_in)
   *     })
   *     
   *     console.log('User authenticated:', blink.auth.currentUser())
   *   }
   * })
   */
  async setSession(tokens, persist = true) {
    const authTokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: "Bearer",
      expires_in: tokens.expires_in || 3600,
      // Default 1 hour
      refresh_expires_in: tokens.refresh_expires_in,
      issued_at: Math.floor(Date.now() / 1e3)
    };
    await this.setTokens(authTokens, persist);
    const user = await this.me();
    return user;
  }
  /**
   * Verify a Blink Auth token using the introspection endpoint.
   * 
   * **Server-side / Edge Function use only.**
   * 
   * This is the recommended way to verify user tokens in Deno Edge Functions
   * and other server-side contexts. It calls the Blink API introspection 
   * endpoint which validates the token without exposing the JWT secret.
   * 
   * @param token - The raw JWT token (without "Bearer " prefix) or full Authorization header
   * @returns Token introspection result with validity and claims
   * 
   * @example
   * // Deno Edge Function usage
   * import { createClient } from "npm:@blinkdotnew/sdk";
   * 
   * const blink = createClient({
   *   projectId: Deno.env.get("BLINK_PROJECT_ID")!,
   *   secretKey: Deno.env.get("BLINK_SECRET_KEY"),
   * });
   * 
   * async function handler(req: Request): Promise<Response> {
   *   const authHeader = req.headers.get("Authorization");
   *   const result = await blink.auth.verifyToken(authHeader);
   *   
   *   if (!result.valid) {
   *     return new Response(JSON.stringify({ error: result.error }), { status: 401 });
   *   }
   *   
   *   // User is authenticated
   *   console.log("User ID:", result.userId);
   *   console.log("Email:", result.email);
   *   console.log("Project:", result.projectId);
   *   
   *   // Continue with your logic...
   * }
   */
  async verifyToken(token) {
    if (!token) {
      return { valid: false, error: "Token required" };
    }
    let cleanToken = token.toLowerCase().startsWith("bearer ") ? token.slice(7) : token;
    cleanToken = cleanToken.trim();
    if (!cleanToken) {
      return { valid: false, error: "Token required" };
    }
    try {
      const response = await fetch(`${this.coreUrl}/api/auth/introspect`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cleanToken}`,
          "Content-Type": "application/json"
        }
      });
      const contentType = response.headers.get("content-type")?.toLowerCase();
      if (!contentType || !contentType.includes("application/json")) {
        return {
          valid: false,
          error: `Server error: ${response.status} ${response.statusText}`
        };
      }
      const result = await response.json();
      if (!result || typeof result !== "object" || typeof result.valid !== "boolean") {
        return {
          valid: false,
          error: result && (result.error || result.message) || `Request failed: ${response.status}`
        };
      }
      return result;
    } catch (error) {
      console.error("[BlinkAuth] Token verification failed:", error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Token verification failed"
      };
    }
  }
  /**
   * Refresh access token using refresh token
   */
  async refreshToken() {
    const refreshToken = this.authState.tokens?.refresh_token;
    if (!refreshToken) {
      return false;
    }
    try {
      const response = await fetch(`${this.authUrl}/api/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          refresh_token: refreshToken
        })
      });
      if (!response.ok) {
        if (response.status === 401) {
          this.clearTokens();
          if (this.config.authRequired) {
            this.redirectToAuth();
          }
        }
        return false;
      }
      const data = await response.json();
      await this.setTokens({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_type: data.token_type,
        expires_in: data.expires_in,
        refresh_expires_in: data.refresh_expires_in
      }, true);
      return true;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return false;
    }
  }
  /**
   * Add auth state change listener
   */
  onAuthStateChanged(callback) {
    this.listeners.add(callback);
    queueMicrotask(() => {
      try {
        callback(this.authState);
      } catch (error) {
        console.error("Error in auth state change callback:", error);
      }
    });
    return () => {
      this.listeners.delete(callback);
    };
  }
  /**
   * Private helper methods
   */
  async validateStoredTokens(tokens) {
    try {
      console.log("\u{1F50D} Validating stored tokens...");
      if (this.isAccessTokenExpired()) {
        console.log("\u23F0 Access token expired based on timestamp, attempting refresh...");
        if (!tokens.refresh_token) {
          console.log("\u274C No refresh token available");
          return false;
        }
        if (this.isRefreshTokenExpired()) {
          console.log("\u274C Refresh token also expired");
          return false;
        }
        const refreshed = await this.refreshToken();
        if (refreshed) {
          console.log("\u2705 Token refreshed successfully during validation");
          return true;
        } else {
          console.log("\u274C Token refresh failed during validation");
          return false;
        }
      }
      const response = await fetch(`${this.authUrl}/api/auth/me`, {
        headers: {
          "Authorization": `Bearer ${tokens.access_token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const user = data.user;
        this.updateAuthState({
          user,
          tokens,
          isAuthenticated: true,
          isLoading: false
        });
        console.log("\u2705 Stored tokens are valid, user authenticated");
        return true;
      } else if (response.status === 401 && tokens.refresh_token) {
        console.log("\u{1F504} Access token expired (server validation), attempting refresh...");
        if (this.isRefreshTokenExpired()) {
          console.log("\u274C Refresh token expired");
          return false;
        }
        const refreshed = await this.refreshToken();
        if (refreshed) {
          console.log("\u2705 Token refreshed successfully after server validation");
          return true;
        } else {
          console.log("\u274C Token refresh failed after server validation");
          return false;
        }
      } else {
        console.log("\u274C Token validation failed:", response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.log("\u{1F4A5} Error validating tokens:", error);
      return false;
    }
  }
  async setTokens(tokens, persist, knownUser) {
    const tokensWithTimestamp = {
      ...tokens,
      issued_at: tokens.issued_at || Math.floor(Date.now() / 1e3)
    };
    console.log("\u{1F510} Setting tokens:", {
      persist,
      hasAccessToken: !!tokensWithTimestamp.access_token,
      hasRefreshToken: !!tokensWithTimestamp.refresh_token,
      expiresIn: tokensWithTimestamp.expires_in,
      issuedAt: tokensWithTimestamp.issued_at,
      hasKnownUser: !!knownUser
    });
    if (persist) {
      try {
        const result = this.storage.setItem(
          this.getStorageKey("tokens"),
          JSON.stringify(tokensWithTimestamp)
        );
        if (result instanceof Promise) {
          await result;
        }
        console.log("\u{1F4BE} Tokens persisted to storage");
      } catch (error) {
        console.log("\u{1F4A5} Error persisting tokens:", error);
      }
    }
    let user = knownUser || null;
    if (!user) {
      try {
        console.log("\u{1F464} Fetching user data...");
        const response = await fetch(`${this.authUrl}/api/auth/me`, {
          headers: {
            "Authorization": `Bearer ${tokensWithTimestamp.access_token}`
          }
        });
        console.log("\u{1F4E1} User fetch response:", {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });
        if (response.ok) {
          const data = await response.json();
          user = data.user;
          console.log("\u2705 User data fetched successfully:", {
            id: user?.id,
            email: user?.email,
            displayName: user?.displayName
          });
        } else {
          console.log("\u274C Failed to fetch user data:", await response.text());
        }
      } catch (error) {
        console.log("\u{1F4A5} Error fetching user data:", error);
      }
    } else {
      console.log("\u2705 Using known user data (skipping /api/auth/me):", {
        id: user?.id,
        email: user?.email
      });
    }
    this.updateAuthState({
      user,
      tokens: tokensWithTimestamp,
      isAuthenticated: !!user,
      isLoading: false
    });
    console.log("\u{1F3AF} Auth state updated:", {
      hasUser: !!user,
      isAuthenticated: !!user,
      isLoading: false
    });
  }
  clearTokens() {
    try {
      const result = this.storage.removeItem(this.getStorageKey("tokens"));
      if (result instanceof Promise) {
        result.catch((error) => {
          console.log("\u{1F4A5} Error clearing tokens from storage:", error);
        });
      }
    } catch (error) {
      console.log("\u{1F4A5} Error clearing tokens:", error);
    }
    this.updateAuthState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false
    });
  }
  async getStoredTokens() {
    if (isWeb && this.isIframe && this.parentWindowTokens) {
      return this.parentWindowTokens;
    }
    try {
      const result = this.storage.getItem(this.getStorageKey("tokens"));
      const stored = result instanceof Promise ? await result : result;
      console.log("\u{1F50D} Checking storage for tokens:", {
        hasStoredData: !!stored,
        storedLength: stored?.length || 0,
        isIframe: isWeb && this.isIframe
      });
      if (stored) {
        const tokens = JSON.parse(stored);
        console.log("\u{1F4E6} Parsed stored tokens:", {
          hasAccessToken: !!tokens.access_token,
          hasRefreshToken: !!tokens.refresh_token,
          tokenType: tokens.token_type,
          expiresIn: tokens.expires_in
        });
        return tokens;
      }
      return null;
    } catch (error) {
      console.log("\u{1F4A5} Error reading tokens from storage:", error);
      return null;
    }
  }
  extractTokensFromUrl() {
    const search = getLocationSearch();
    if (!search) return null;
    const params = new URLSearchParams(search);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    console.log("\u{1F50D} Extracting tokens from URL:", {
      url: getLocationHref(),
      accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : null,
      refreshToken: refreshToken ? `${refreshToken.substring(0, 20)}...` : null,
      allParams: Object.fromEntries(params.entries())
    });
    if (accessToken) {
      const tokens = {
        access_token: accessToken,
        refresh_token: refreshToken || void 0,
        token_type: "Bearer",
        expires_in: 15 * 60,
        // 15 minutes default
        refresh_expires_in: refreshToken ? 30 * 24 * 60 * 60 : void 0,
        // 30 days default
        issued_at: Math.floor(Date.now() / 1e3)
        // Current timestamp
      };
      console.log("\u2705 Tokens extracted successfully:", {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token
      });
      return tokens;
    }
    console.log("\u274C No access token found in URL");
    return null;
  }
  clearUrlTokens() {
    const href = getLocationHref();
    if (!href || !hasWindowLocation()) return;
    const url = new URL(href);
    url.searchParams.delete("access_token");
    url.searchParams.delete("refresh_token");
    url.searchParams.delete("token_type");
    url.searchParams.delete("project_id");
    url.searchParams.delete("expires_in");
    url.searchParams.delete("refresh_expires_in");
    url.searchParams.delete("state");
    url.searchParams.delete("code");
    url.searchParams.delete("error");
    url.searchParams.delete("error_description");
    window.history.replaceState({}, "", url.toString());
    console.log("\u{1F9F9} URL cleaned up, removed auth parameters");
  }
  redirectToAuth() {
    if (hasWindowLocation()) {
      this.login();
    }
  }
  setLoading(loading) {
    this.updateAuthState({
      ...this.authState,
      isLoading: loading
    });
  }
  updateAuthState(newState) {
    this.authState = newState;
    this.listeners.forEach((callback) => {
      try {
        callback(newState);
      } catch (error) {
        console.error("Error in auth state change callback:", error);
      }
    });
  }
  /**
   * Generate secure random state for OAuth flows
   */
  generateState() {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
    } else {
      return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
  }
  /**
   * Generate unique session ID for mobile OAuth
   */
  generateSessionId() {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
    } else {
      return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
  }
  /**
   * Extract magic link token from URL
   */
  extractMagicTokenFromUrl() {
    const search = getLocationSearch();
    if (!search) return null;
    const params = new URLSearchParams(search);
    return params.get("magic_token") || params.get("token");
  }
  /**
   * Map server error codes to BlinkAuthErrorCode
   */
  mapErrorCodeFromResponse(serverCode) {
    switch (serverCode) {
      case "INVALID_CREDENTIALS":
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "INVALID_CREDENTIALS";
      case "EMAIL_NOT_VERIFIED":
      case "auth/email-not-verified":
        return "EMAIL_NOT_VERIFIED";
      case "EMAIL_ALREADY_VERIFIED":
        return "VERIFICATION_FAILED";
      case "POPUP_CANCELED":
      case "auth/popup-closed-by-user":
        return "POPUP_CANCELED";
      case "NETWORK_ERROR":
        return "NETWORK_ERROR";
      case "RATE_LIMITED":
      case "auth/too-many-requests":
        return "RATE_LIMITED";
      case "AUTH_TIMEOUT":
        return "AUTH_TIMEOUT";
      case "REDIRECT_FAILED":
        return "REDIRECT_FAILED";
      case "TOKEN_EXPIRED":
      case "auth/id-token-expired":
        return "TOKEN_EXPIRED";
      case "USER_NOT_FOUND":
        return "USER_NOT_FOUND";
      case "EMAIL_ALREADY_EXISTS":
      case "auth/email-already-in-use":
        return "EMAIL_ALREADY_EXISTS";
      case "WEAK_PASSWORD":
      case "auth/weak-password":
        return "WEAK_PASSWORD";
      case "INVALID_EMAIL":
      case "auth/invalid-email":
        return "INVALID_EMAIL";
      case "MAGIC_LINK_EXPIRED":
        return "MAGIC_LINK_EXPIRED";
      case "VERIFICATION_FAILED":
        return "VERIFICATION_FAILED";
      default:
        return "NETWORK_ERROR";
    }
  }
  /**
   * Setup cross-tab authentication synchronization
   */
  setupCrossTabSync() {
    if (!isWeb || !hasWindow()) return;
    window.addEventListener("storage", (e) => {
      if (e.key === this.getStorageKey("tokens")) {
        const newTokens = e.newValue ? JSON.parse(e.newValue) : null;
        if (newTokens && newTokens !== this.authState.tokens) {
          this.setTokens(newTokens, false).catch((error) => {
            console.error("Failed to sync tokens from other tab:", error);
          });
        } else if (!newTokens && this.authState.tokens) {
          this.clearTokens();
        }
      }
    });
  }
};
function assertServerOnly(methodName) {
  if (typeof window !== "undefined") {
    throw new Error(`${methodName} is server-only. Use Blink CRUD methods (blink.db.<table>.*) instead.`);
  }
}
function camelToSnake3(str) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
function generateSecureId() {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  } else {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    const extraRandom = Math.random().toString(36).substring(2, 15);
    return `${timestamp}_${randomPart}_${extraRandom}`;
  }
}
function ensureRecordId(record) {
  if (!record.id) {
    return { ...record, id: generateSecureId() };
  }
  return record;
}
var BlinkTable = class {
  constructor(tableName, httpClient) {
    this.tableName = tableName;
    this.httpClient = httpClient;
    this.actualTableName = camelToSnake3(tableName);
  }
  actualTableName;
  /**
   * Create a single record
   */
  async create(data, options = {}) {
    const record = ensureRecordId(data);
    const response = await this.httpClient.dbPost(
      this.actualTableName,
      record,
      { returning: options.returning !== false }
    );
    const result = Array.isArray(response.data) ? response.data[0] : response.data;
    if (!result) {
      throw new Error("Failed to create record");
    }
    return result;
  }
  /**
   * Create multiple records
   */
  async createMany(data, options = {}) {
    const records = data.map(ensureRecordId);
    const response = await this.httpClient.dbPost(
      this.actualTableName,
      records,
      { returning: options.returning !== false }
    );
    const results = Array.isArray(response.data) ? response.data : [response.data];
    return results;
  }
  /**
   * Upsert a single record (insert or update on conflict)
   */
  async upsert(data, options = {}) {
    const record = ensureRecordId(data);
    const onConflict = options.onConflict || "id";
    const response = await this.httpClient.dbUpsert(
      this.actualTableName,
      record,
      { onConflict, returning: options.returning !== false }
    );
    const result = Array.isArray(response.data) ? response.data[0] : response.data;
    if (!result) {
      throw new Error("Failed to upsert record");
    }
    return result;
  }
  /**
   * Upsert multiple records
   */
  async upsertMany(data, options = {}) {
    const records = data.map(ensureRecordId);
    const onConflict = options.onConflict || "id";
    const response = await this.httpClient.dbUpsert(
      this.actualTableName,
      records,
      { onConflict, returning: options.returning !== false }
    );
    const results = Array.isArray(response.data) ? response.data : [response.data];
    return results;
  }
  /**
   * Get a single record by ID
   */
  async get(id) {
    const searchParams = {
      id: `eq.${id}`,
      limit: "1"
    };
    const response = await this.httpClient.dbGet(this.actualTableName, searchParams);
    const records = response.data;
    if (records.length === 0) {
      return null;
    }
    return records[0] || null;
  }
  /**
   * List records with filtering, sorting, and pagination
   */
  async list(options = {}) {
    const queryParams = buildQuery(options);
    const searchParams = queryParams;
    const response = await this.httpClient.dbGet(this.actualTableName, searchParams);
    const records = response.data;
    return records;
  }
  /**
   * Update a single record by ID
   */
  async update(id, data, options = {}) {
    const searchParams = {
      id: `eq.${id}`
    };
    const response = await this.httpClient.dbPatch(
      this.actualTableName,
      data,
      searchParams,
      { returning: options.returning !== false }
    );
    const records = response.data;
    if (!records || records.length === 0) {
      throw new Error(`Record with id ${id} not found`);
    }
    return records[0];
  }
  /**
   * Update multiple records
   */
  async updateMany(updates, options = {}) {
    const results = [];
    for (const update of updates) {
      const { id, ...data } = update;
      const result = await this.update(id, data, options);
      results.push(result);
    }
    return results;
  }
  /**
   * Delete a single record by ID
   */
  async delete(id) {
    const searchParams = {
      id: `eq.${id}`
    };
    await this.httpClient.dbDelete(this.actualTableName, searchParams);
  }
  /**
   * Delete multiple records based on filter
   */
  async deleteMany(options) {
    const queryParams = buildQuery({ where: options.where });
    const searchParams = queryParams;
    await this.httpClient.dbDelete(this.actualTableName, searchParams);
  }
  /**
   * Count records matching filter
   */
  async count(options = {}) {
    const queryParams = buildQuery({
      where: options.where,
      select: ["id"]
    });
    const response = await this.httpClient.request(
      `/api/db/${this.httpClient.projectId}/rest/v1/${this.actualTableName}`,
      {
        method: "GET",
        searchParams: queryParams,
        headers: {
          "Prefer": "count=exact"
        }
      }
    );
    const contentRange = response.headers.get("content-range");
    if (contentRange) {
      const match2 = contentRange.match(/\/(\d+)$/);
      if (match2 && match2[1]) {
        return parseInt(match2[1], 10);
      }
    }
    const records = response.data;
    return records.length;
  }
  /**
   * Check if any records exist matching filter
   */
  async exists(options) {
    const count = await this.count(options);
    return count > 0;
  }
  /**
   * Raw SQL query on this table (for advanced use cases)
   */
  async sql(query, params) {
    assertServerOnly("blink.db.<table>.sql");
    const response = await this.httpClient.dbSql(query, params);
    return response.data;
  }
  /**
   * Private helper methods
   */
  extractCursor(record) {
    return record.id || record._id || String(Math.random());
  }
};
var BlinkDatabase = class {
  constructor(httpClient) {
    this.httpClient = httpClient;
    const proxy = new Proxy(this, {
      get(target, prop) {
        if (prop === "table") {
          return target.table.bind(target);
        }
        if (prop in target) {
          const value = target[prop];
          return typeof value === "function" ? value.bind(target) : value;
        }
        if (typeof prop === "string") {
          return target.table(prop);
        }
        return void 0;
      }
    });
    return proxy;
  }
  tables = /* @__PURE__ */ new Map();
  /**
   * Get a table instance for any table name
   */
  table(tableName) {
    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, new BlinkTable(tableName, this.httpClient));
    }
    const table = this.tables.get(tableName);
    if (!table) {
      throw new Error(`Table ${tableName} not found`);
    }
    return table;
  }
  /**
   * Execute raw SQL query
   */
  async sql(query, params) {
    assertServerOnly("blink.db.sql");
    const response = await this.httpClient.dbSql(query, params);
    return response.data;
  }
  /**
   * Execute batch SQL operations
   */
  async batch(statements, mode = "write") {
    assertServerOnly("blink.db.batch");
    const response = await this.httpClient.dbBatch(statements, mode);
    return response.data;
  }
};
var BlinkStorageImpl = class {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }
  /**
   * Upload a file to project storage
   * 
   * @param file - File, Blob, or Buffer to upload
   * @param path - Destination path within project storage (extension will be auto-corrected to match file type)
   * @param options - Upload options including upsert and progress callback
   * @returns Promise resolving to upload response with public URL
   * 
   * @example
   * ```ts
   * // Extension automatically corrected to match actual file type
   * const { publicUrl } = await blink.storage.upload(
   *   pngFile,
   *   `avatars/${user.id}`, // No extension needed!
   *   { upsert: true }
   * );
   * // If file is PNG, final path will be: avatars/user123.png
   * 
   * // Or with extension (will be corrected if wrong)
   * const { publicUrl } = await blink.storage.upload(
   *   pngFile,
   *   `avatars/${user.id}.jpg`, // Wrong extension
   *   { upsert: true }
   * );
   * // Final path will be: avatars/user123.png (auto-corrected!)
   * ```
   */
  async upload(file, path, options = {}) {
    try {
      if (!file) {
        throw new BlinkStorageError("File is required");
      }
      if (!path || typeof path !== "string" || !path.trim()) {
        throw new BlinkStorageError("Path must be a non-empty string");
      }
      const maxSize = 50 * 1024 * 1024;
      let fileSize = 0;
      if (file instanceof File || file instanceof Blob) {
        fileSize = file.size;
      } else if (typeof Buffer !== "undefined" && file instanceof Buffer) {
        fileSize = file.length;
      }
      if (fileSize > maxSize) {
        throw new BlinkStorageError(`File size (${Math.round(fileSize / 1024 / 1024)}MB) exceeds maximum allowed size (50MB)`);
      }
      const { correctedPath, detectedContentType } = await this.detectFileTypeAndCorrectPath(file, path);
      const response = await this.httpClient.uploadFile(
        `/api/storage/${this.httpClient.projectId}/upload`,
        file,
        correctedPath,
        // Use corrected path with proper extension
        {
          onProgress: options.onProgress,
          contentType: detectedContentType
          // Pass detected content type
        }
      );
      if (response.data?.data?.publicUrl) {
        return { publicUrl: response.data.data.publicUrl };
      } else if (response.data?.publicUrl) {
        return { publicUrl: response.data.publicUrl };
      } else {
        throw new BlinkStorageError("Invalid response format: missing publicUrl");
      }
    } catch (error) {
      if (error instanceof BlinkStorageError) {
        throw error;
      }
      if (error instanceof Error && "status" in error) {
        const status = error.status;
        if (status === 409) {
          throw new BlinkStorageError("File already exists.", 409);
        }
        if (status === 400) {
          throw new BlinkStorageError("Invalid request parameters", 400);
        }
      }
      throw new BlinkStorageError(
        `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        void 0,
        { originalError: error }
      );
    }
  }
  /**
   * Detect file type from actual file content and correct path extension
   * This ensures the path extension always matches the actual file type
   */
  async detectFileTypeAndCorrectPath(file, originalPath) {
    try {
      const fileSignature = await this.getFileSignature(file);
      const detectedType = this.detectFileTypeFromSignature(fileSignature);
      let detectedContentType = detectedType.mimeType;
      let detectedExtension = detectedType.extension;
      if (!detectedContentType && file instanceof File && file.type) {
        detectedContentType = file.type;
        detectedExtension = this.getExtensionFromMimeType(file.type);
      }
      if (!detectedContentType) {
        detectedContentType = "application/octet-stream";
        detectedExtension = "bin";
      }
      const pathParts = originalPath.split("/");
      const fileName = pathParts[pathParts.length - 1];
      const directory = pathParts.slice(0, -1).join("/");
      if (!fileName) {
        throw new Error("Invalid path: filename cannot be empty");
      }
      const nameWithoutExt = fileName.includes(".") ? fileName.substring(0, fileName.lastIndexOf(".")) : fileName;
      const correctedFileName = `${nameWithoutExt}.${detectedExtension}`;
      const correctedPath = directory ? `${directory}/${correctedFileName}` : correctedFileName;
      return {
        correctedPath,
        detectedContentType
      };
    } catch (error) {
      return {
        correctedPath: originalPath,
        detectedContentType: "application/octet-stream"
      };
    }
  }
  /**
   * Get the first few bytes of a file to analyze its signature
   */
  async getFileSignature(file) {
    const bytesToRead = 12;
    if (typeof Buffer !== "undefined" && file instanceof Buffer) {
      return new Uint8Array(file.slice(0, bytesToRead));
    }
    if (file instanceof File || file instanceof Blob) {
      const slice = file.slice(0, bytesToRead);
      const arrayBuffer = await slice.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    }
    throw new Error("Unsupported file type for signature detection");
  }
  /**
   * Detect file type from file signature (magic numbers)
   * This is the most reliable way to detect actual file type
   */
  detectFileTypeFromSignature(signature) {
    const hex = Array.from(signature).map((b) => b.toString(16).padStart(2, "0")).join("");
    const signatures = {
      // Images
      "ffd8ff": { mimeType: "image/jpeg", extension: "jpg" },
      "89504e47": { mimeType: "image/png", extension: "png" },
      "47494638": { mimeType: "image/gif", extension: "gif" },
      "52494646": { mimeType: "image/webp", extension: "webp" },
      // RIFF (WebP container)
      "424d": { mimeType: "image/bmp", extension: "bmp" },
      "49492a00": { mimeType: "image/tiff", extension: "tiff" },
      "4d4d002a": { mimeType: "image/tiff", extension: "tiff" },
      // Documents
      "25504446": { mimeType: "application/pdf", extension: "pdf" },
      "504b0304": { mimeType: "application/zip", extension: "zip" },
      // Also used by docx, xlsx
      "d0cf11e0": { mimeType: "application/msword", extension: "doc" },
      // Audio
      "494433": { mimeType: "audio/mpeg", extension: "mp3" },
      "664c6143": { mimeType: "audio/flac", extension: "flac" },
      "4f676753": { mimeType: "audio/ogg", extension: "ogg" },
      // Video
      "000000": { mimeType: "video/mp4", extension: "mp4" },
      // ftyp box
      "1a45dfa3": { mimeType: "video/webm", extension: "webm" },
      // Text
      "efbbbf": { mimeType: "text/plain", extension: "txt" }
      // UTF-8 BOM
    };
    for (const [sig, type] of Object.entries(signatures)) {
      if (hex.startsWith(sig)) {
        return type;
      }
    }
    if (hex.startsWith("52494646") && hex.substring(16, 24) === "57454250") {
      return { mimeType: "image/webp", extension: "webp" };
    }
    if (hex.substring(8, 16) === "66747970") {
      return { mimeType: "video/mp4", extension: "mp4" };
    }
    return { mimeType: "", extension: "" };
  }
  /**
   * Get file extension from MIME type as fallback
   */
  getExtensionFromMimeType(mimeType) {
    const mimeToExt = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/bmp": "bmp",
      "image/svg+xml": "svg",
      "application/pdf": "pdf",
      "text/plain": "txt",
      "text/html": "html",
      "text/css": "css",
      "application/javascript": "js",
      "application/json": "json",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "audio/ogg": "ogg",
      "video/mp4": "mp4",
      "video/webm": "webm",
      "application/zip": "zip"
    };
    return mimeToExt[mimeType] || "bin";
  }
  /**
   * Get a download URL for a file that triggers browser download
   * 
   * @param path - Path to the file in project storage
   * @param options - Download options including custom filename
   * @returns Promise resolving to download response with download URL
   * 
   * @example
   * ```ts
   * // Download with original filename
   * const { downloadUrl, filename } = await blink.storage.download('images/photo.jpg');
   * window.open(downloadUrl, '_blank');
   * 
   * // Download with custom filename
   * const { downloadUrl } = await blink.storage.download(
   *   'images/photo.jpg',
   *   { filename: 'my-photo.jpg' }
   * );
   * 
   * // Create download link in React
   * <a href={downloadUrl} download={filename}>Download Image</a>
   * ```
   */
  async download(path, options = {}) {
    try {
      if (!path || typeof path !== "string" || !path.trim()) {
        throw new BlinkStorageError("Path must be a non-empty string");
      }
      const response = await this.httpClient.request(
        `/api/storage/${this.httpClient.projectId}/download`,
        {
          method: "GET",
          searchParams: {
            path: path.trim(),
            ...options.filename && { filename: options.filename }
          }
        }
      );
      if (response.data?.downloadUrl) {
        return {
          downloadUrl: response.data.downloadUrl,
          filename: response.data.filename || options.filename || path.split("/").pop() || "download",
          contentType: response.data.contentType,
          size: response.data.size
        };
      } else {
        throw new BlinkStorageError("Invalid response format: missing downloadUrl");
      }
    } catch (error) {
      if (error instanceof BlinkStorageError) {
        throw error;
      }
      if (error instanceof Error && "status" in error) {
        const status = error.status;
        if (status === 404) {
          throw new BlinkStorageError("File not found", 404);
        }
        if (status === 400) {
          throw new BlinkStorageError("Invalid request parameters", 400);
        }
      }
      throw new BlinkStorageError(
        `Download failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        void 0,
        { originalError: error }
      );
    }
  }
  /**
   * Remove one or more files from project storage
   * 
   * @param paths - File paths to remove
   * @returns Promise that resolves when files are removed
   * 
   * @example
   * ```ts
   * await blink.storage.remove('avatars/user1.png');
   * await blink.storage.remove('file1.pdf', 'file2.pdf', 'file3.pdf');
   * ```
   */
  async remove(...paths) {
    try {
      if (paths.length === 0) {
        throw new BlinkStorageError("At least one path must be provided");
      }
      for (const path of paths) {
        if (!path || typeof path !== "string") {
          throw new BlinkStorageError("All paths must be non-empty strings");
        }
      }
      await this.httpClient.request(
        `/api/storage/${this.httpClient.projectId}/remove`,
        {
          method: "DELETE",
          body: { paths },
          headers: { "Content-Type": "application/json" }
        }
      );
    } catch (error) {
      if (error instanceof BlinkStorageError) {
        throw error;
      }
      if (error instanceof Error && "status" in error) {
        const status = error.status;
        if (status === 400) {
          throw new BlinkStorageError("Invalid request parameters", 400);
        }
      }
      throw new BlinkStorageError(
        `Failed to remove files: ${error instanceof Error ? error.message : "Unknown error"}`,
        void 0,
        { originalError: error }
      );
    }
  }
};
function serializeTools(tools) {
  return tools;
}
function createStopConditions(maxSteps, stopWhen) {
  if (stopWhen && stopWhen.length > 0) {
    return stopWhen;
  }
  if (maxSteps && maxSteps > 0) {
    return [{ type: "step_count_is", count: maxSteps }];
  }
  return void 0;
}
var Agent = class {
  httpClient = null;
  config;
  /**
   * Create a new Agent instance.
   * Auto-binds to default client if createClient() was called.
   * 
   * @param options - Agent configuration options
   */
  constructor(options) {
    if (!options.model) {
      throw new BlinkAIError("Agent model is required");
    }
    this.config = options;
    try {
      this.httpClient = _getDefaultHttpClient();
    } catch {
    }
  }
  /**
   * Internal: Set the HTTP client (called by BlinkClient)
   */
  _setHttpClient(client) {
    this.httpClient = client;
  }
  /**
   * Internal: Get the agent config for API requests
   */
  getAgentConfig() {
    const { model, system, instructions, tools, webhookTools, clientTools, toolChoice, stopWhen, maxSteps } = this.config;
    const serializedTools = tools ? serializeTools(tools) : void 0;
    const stopConditions = createStopConditions(maxSteps, stopWhen);
    return {
      model,
      system: system || instructions,
      tools: serializedTools,
      webhook_tools: webhookTools,
      client_tools: clientTools,
      tool_choice: toolChoice,
      stop_when: stopConditions
    };
  }
  /**
   * Generate a response (non-streaming)
   * 
   * @param options - Generation options (prompt or messages)
   * @returns Promise<AgentResponse> with text, steps, usage, and billing
   * 
   * @example
   * ```ts
   * const result = await agent.generate({
   *   prompt: 'What is the weather in San Francisco?',
   * })
   * console.log(result.text)
   * console.log(result.steps)
   * ```
   */
  async generate(options) {
    if (!this.httpClient) {
      throw new BlinkAIError(
        "Agent not initialized. Call createClient() first, or use useAgent() in React."
      );
    }
    if (!options.prompt && !options.messages) {
      throw new BlinkAIError("Either prompt or messages is required");
    }
    if (options.prompt && options.messages) {
      throw new BlinkAIError("prompt and messages are mutually exclusive");
    }
    try {
      const requestBody = {
        stream: false,
        agent: this.getAgentConfig()
      };
      if (options.prompt) {
        requestBody.prompt = options.prompt;
      } else if (options.messages) {
        requestBody.messages = options.messages;
      }
      if (options.sandbox) {
        requestBody.sandbox_id = typeof options.sandbox === "string" ? options.sandbox : options.sandbox.id;
      }
      const response = await this.httpClient.aiAgent(requestBody, options.signal);
      return response.data;
    } catch (error) {
      console.error("[Agent] generate failed:", error);
      if (error instanceof BlinkAIError) {
        throw error;
      }
      throw new BlinkAIError(
        `Agent generate failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        void 0,
        { originalError: error }
      );
    }
  }
  /**
   * Stream a response (real-time)
   * 
   * @param options - Stream options (prompt or messages)
   * @returns Promise<Response> - AI SDK UI Message Stream for useChat compatibility
   * 
   * @example
   * ```ts
   * const stream = await agent.stream({
   *   prompt: 'Tell me a story',
   * })
   * 
   * // Process stream
   * for await (const chunk of stream.body) {
   *   // Handle chunk
   * }
   * ```
   */
  async stream(options) {
    if (!this.httpClient) {
      throw new BlinkAIError(
        "Agent not initialized. Call createClient() first, or use useAgent() in React."
      );
    }
    if (!options.prompt && !options.messages) {
      throw new BlinkAIError("Either prompt or messages is required");
    }
    if (options.prompt && options.messages) {
      throw new BlinkAIError("prompt and messages are mutually exclusive");
    }
    try {
      const requestBody = {
        stream: true,
        agent: this.getAgentConfig()
      };
      if (options.prompt) {
        requestBody.prompt = options.prompt;
      } else if (options.messages) {
        requestBody.messages = options.messages;
      }
      if (options.sandbox) {
        requestBody.sandbox_id = typeof options.sandbox === "string" ? options.sandbox : options.sandbox.id;
      }
      return await this.httpClient.aiAgentStream(requestBody, options.signal);
    } catch (error) {
      console.error("[Agent] stream failed:", error);
      if (error instanceof BlinkAIError) {
        throw error;
      }
      throw new BlinkAIError(
        `Agent stream failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        void 0,
        { originalError: error }
      );
    }
  }
  /**
   * Get the agent's model
   */
  get model() {
    return this.config.model;
  }
  /**
   * Get the agent's system prompt
   */
  get system() {
    return this.config.system || this.config.instructions;
  }
  /**
   * Get the agent's tools
   */
  get tools() {
    return this.config.tools;
  }
};
var BlinkAIImpl = class {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }
  // Supported image formats for validation
  SUPPORTED_IMAGE_FORMATS = ["jpg", "jpeg", "png", "gif", "webp"];
  /**
   * Validates if a URL is a valid HTTPS image URL
   */
  validateImageUrl(url) {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== "https:") {
        return { isValid: false, error: "Image URLs must use HTTPS protocol" };
      }
      const pathname = parsedUrl.pathname.toLowerCase();
      const hasValidExtension = this.SUPPORTED_IMAGE_FORMATS.some(
        (format) => pathname.endsWith(`.${format}`)
      );
      if (!hasValidExtension) {
        return {
          isValid: false,
          error: `Image URL must end with a supported format: ${this.SUPPORTED_IMAGE_FORMATS.join(", ")}`
        };
      }
      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: "Invalid URL format" };
    }
  }
  /**
   * Validates messages for image content
   */
  validateMessages(messages) {
    const errors = [];
    messages.forEach((message, messageIndex) => {
      if (Array.isArray(message.content)) {
        message.content.forEach((item, contentIndex) => {
          if (item.type === "image") {
            if (!item.image || typeof item.image !== "string") {
              errors.push(`Message ${messageIndex}, content ${contentIndex}: Image content must have a valid image URL`);
            } else {
              const validation = this.validateImageUrl(item.image);
              if (!validation.isValid) {
                errors.push(`Message ${messageIndex}, content ${contentIndex}: ${validation.error}`);
              }
            }
          }
        });
      }
    });
    return { isValid: errors.length === 0, errors };
  }
  /**
   * Get MIME type for audio format
   */
  getMimeTypeForFormat(format) {
    const mimeTypes = {
      mp3: "audio/mpeg",
      opus: "audio/opus",
      aac: "audio/aac",
      flac: "audio/flac",
      wav: "audio/wav",
      pcm: "audio/pcm"
    };
    return mimeTypes[format] || "audio/mpeg";
  }
  /**
   * Generates a text response using the Blink AI engine.
   * 
   * @param options - An object containing either:
   *   - `prompt`: a simple string prompt
   *   - OR `messages`: an array of chat messages for conversation
   *   - Plus optional model, search, maxSteps, experimental_continueSteps, maxTokens, temperature, signal parameters
   * 
   * @example
   * ```ts
   * // Simple prompt
   * const { text } = await blink.ai.generateText({ 
   *   prompt: "Write a poem about coding" 
   * });
   * 
   * // Chat messages (text only)
   * const { text } = await blink.ai.generateText({
   *   messages: [
   *     { role: "system", content: "You are a helpful assistant" },
   *     { role: "user", content: "Explain quantum computing" }
   *   ]
   * });
   * 
   * // With image content
   * const { text } = await blink.ai.generateText({
   *   messages: [
   *     { 
   *       role: "user", 
   *       content: [
   *         { type: "text", text: "What do you see in this image?" },
   *         { type: "image", image: "https://example.com/photo.jpg" }
   *       ]
   *     }
   *   ]
   * });
   * 
   * // Mixed content with multiple images
   * const { text } = await blink.ai.generateText({
   *   messages: [
   *     { 
   *       role: "user", 
   *       content: [
   *         { type: "text", text: "Compare these two images:" },
   *         { type: "image", image: "https://example.com/image1.jpg" },
   *         { type: "image", image: "https://example.com/image2.jpg" }
   *       ]
   *     }
   *   ]
   * });
   * 
   * // With options
   * const { text, usage } = await blink.ai.generateText({
   *   prompt: "Summarize this article",
   *   model: "gpt-4.1-mini",
   *   maxTokens: 150,
   *   temperature: 0.7
   * });
   * 
   * // With web search (OpenAI models only)
   * const { text, sources } = await blink.ai.generateText({
   *   prompt: "What are the latest developments in AI?",
   *   model: "gpt-4.1-mini",
   *   search: true // Enables web search
   * });
   * 
   * // With advanced multi-step configuration
   * const { text } = await blink.ai.generateText({
   *   prompt: "Research and analyze recent tech trends",
   *   model: "gpt-4o",
   *   search: true,
   *   maxSteps: 10, // Allow up to 10 reasoning steps
   *   experimental_continueSteps: true // Enable continued reasoning
   * });
   * ```
   * 
   * @returns Promise<TextGenerationResponse> - Object containing:
   *   - `text`: Generated text string
   *   - `usage`: Token usage information
   *   - `finishReason`: Why generation stopped ("stop", "length", etc.)
   */
  async generateText(options) {
    try {
      if (!options.prompt && !options.messages) {
        throw new BlinkAIError("Either prompt or messages is required");
      }
      if (options.messages) {
        const validation = this.validateMessages(options.messages);
        if (!validation.isValid) {
          throw new BlinkAIError(`Message validation failed: ${validation.errors.join("; ")}`);
        }
      }
      const requestBody = {
        model: options.model,
        stream: false,
        search: options.search,
        maxSteps: options.maxSteps,
        experimental_continueSteps: options.experimental_continueSteps,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
        signal: options.signal
      };
      if (options.prompt) {
        requestBody.prompt = options.prompt;
      }
      if (options.messages) {
        requestBody.messages = options.messages;
      }
      const response = await this.httpClient.aiText(
        options.prompt || "",
        requestBody
      );
      return response.data;
    } catch (error) {
      if (error instanceof BlinkAIError) {
        throw error;
      }
      throw new BlinkAIError(
        `Text generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        void 0,
        { originalError: error }
      );
    }
  }
  /**
   * Streams text generation with real-time updates as the AI generates content.
   * 
   * @param options - Same as generateText: either `prompt` or `messages` with optional parameters including search, maxSteps, experimental_continueSteps
   * @param onChunk - Callback function that receives each text chunk as it's generated
   * 
   * @example
   * ```ts
   * // Stream with prompt
   * await blink.ai.streamText(
   *   { prompt: "Write a short story about space exploration" },
   *   (chunk) => {
   *     process.stdout.write(chunk); // Real-time output
   *   }
   * );
   * 
   * // Stream with messages
   * await blink.ai.streamText(
   *   { 
   *     messages: [
   *       { role: "system", content: "You are a creative writer" },
   *       { role: "user", content: "Write a haiku about programming" }
   *     ]
   *   },
   *   (chunk) => updateUI(chunk)
   * );
   * ```
   * 
   * @returns Promise<TextGenerationResponse> - Final complete response with full text and metadata
   */
  async streamText(options, onChunk) {
    try {
      if (!options.prompt && !options.messages) {
        throw new BlinkAIError("Either prompt or messages is required");
      }
      if (options.messages) {
        const validation = this.validateMessages(options.messages);
        if (!validation.isValid) {
          throw new BlinkAIError(`Message validation failed: ${validation.errors.join("; ")}`);
        }
      }
      const result = await this.httpClient.streamAiText(
        options.prompt || "",
        {
          model: options.model,
          messages: options.messages,
          search: options.search,
          maxSteps: options.maxSteps,
          experimental_continueSteps: options.experimental_continueSteps,
          maxTokens: options.maxTokens,
          temperature: options.temperature,
          signal: options.signal
        },
        onChunk
      );
      return {
        text: result.text || "",
        finishReason: result.finishReason || "stop",
        usage: result.usage,
        toolCalls: result.toolCalls,
        toolResults: result.toolResults,
        sources: result.sources,
        files: result.files,
        reasoningDetails: result.reasoning,
        response: result.response
      };
    } catch (error) {
      if (error instanceof BlinkAIError) {
        throw error;
      }
      throw new BlinkAIError(
        `Text streaming failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        void 0,
        { originalError: error }
      );
    }
  }
  /**
   * Generates structured JSON objects using AI with schema validation.
   * 
   * @param options - Object containing:
   *   - `prompt`: Description of what object to generate (required)
   *   - `schema`: JSON Schema to validate the generated object
   *   - `output`: Type of output ("object", "array", "enum")
   *   - `enum`: Array of allowed values for enum output
   *   - Plus optional model, signal parameters
   * 
   * @example
   * ```ts
   * // Generate user profile
   * const { object } = await blink.ai.generateObject({
   *   prompt: "Generate a user profile for a software developer",
   *   schema: {
   *     type: "object",
   *     properties: {
   *       name: { type: "string" },
   *       age: { type: "number" },
   *       skills: { type: "array", items: { type: "string" } },
   *       experience: { type: "number" }
   *     },
   *     required: ["name", "skills"]
   *   }
   * });
   * 
   * // Generate array of items
   * const { object } = await blink.ai.generateObject({
   *   prompt: "List 5 programming languages",
   *   output: "array",
   *   schema: {
   *     type: "array",
   *     items: { type: "string" }
   *   }
   * });
   * 
   * // Generate enum value
   * const { object } = await blink.ai.generateObject({
   *   prompt: "Choose the best programming language for web development",
   *   output: "enum",
   *   enum: ["JavaScript", "Python", "TypeScript", "Go"]
   * });
   * ```
   * 
   * @returns Promise<ObjectGenerationResponse> - Object containing:
   *   - `object`: The generated and validated JSON object/array/enum
   *   - `usage`: Token usage information
   *   - `finishReason`: Why generation stopped
   */
  async generateObject(options) {
    try {
      if (!options.prompt) {
        throw new BlinkAIError("Prompt is required");
      }
      const response = await this.httpClient.aiObject(
        options.prompt,
        {
          model: options.model,
          output: options.output,
          schema: options.schema,
          enum: options.enum,
          stream: false,
          signal: options.signal
        }
      );
      return response.data;
    } catch (error) {
      if (error instanceof BlinkAIError) {
        throw error;
      }
      throw new BlinkAIError(
        `Object generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        void 0,
        { originalError: error }
      );
    }
  }
  /**
   * Streams structured object generation with real-time partial updates as the AI builds the object.
   * 
   * @param options - Same as generateObject: prompt, schema, output type, etc.
   * @param onPartial - Callback function that receives partial object updates as they're generated
   * 
   * @example
   * ```ts
   * // Stream object generation with schema
   * await blink.ai.streamObject(
   *   {
   *     prompt: "Generate a detailed product catalog entry",
   *     schema: {
   *       type: "object",
   *       properties: {
   *         name: { type: "string" },
   *         price: { type: "number" },
   *         description: { type: "string" },
   *         features: { type: "array", items: { type: "string" } }
   *       }
   *     }
   *   },
   *   (partial) => {
   *     console.log("Partial update:", partial);
   *     updateProductForm(partial); // Update UI in real-time
   *   }
   * );
   * ```
   * 
   * @returns Promise<ObjectGenerationResponse> - Final complete object with metadata
   */
  async streamObject(options, onPartial) {
    try {
      if (!options.prompt) {
        throw new BlinkAIError("Prompt is required");
      }
      const result = await this.httpClient.streamAiObject(
        options.prompt,
        {
          model: options.model,
          output: options.output,
          schema: options.schema,
          enum: options.enum,
          signal: options.signal
        },
        onPartial
      );
      return {
        object: result.object || {},
        finishReason: "stop",
        usage: result.usage
      };
    } catch (error) {
      if (error instanceof BlinkAIError) {
        throw error;
      }
      throw new BlinkAIError(
        `Object streaming failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        void 0,
        { originalError: error }
      );
    }
  }
  /**
   * Generates images from text descriptions using AI image models.
   * 
   * @param options - Object containing:
   *   - `prompt`: Text description of the desired image (required, up to 100k characters)
   *   - `model`: AI model to use (optional). Available models:
   *       **Fal.ai Models (Recommended):**
   *       - `"fal-ai/nano-banana"` (default) - Gemini 2.5 Flash Image (Fast)
   *       - `"fal-ai/nano-banana-pro"` - Gemini 3 Pro Image (High quality)
   *       - `"fal-ai/gemini-25-flash-image"` - Alias for nano-banana
   *       - `"fal-ai/gemini-3-pro-image-preview"` - Alias for nano-banana-pro
   *       **Legacy Gemini Models:**
   *       - `"gemini-2.5-flash-image-preview"` - Direct Gemini API
   *       - `"gemini-3-pro-image-preview"` - Direct Gemini API
   *   - `n`: Number of images to generate (default: 1)
   *   - `size`: Image dimensions (e.g., "1024x1024", "512x512")
   *   - Plus optional signal parameter
   * 
   * @example
   * ```ts
   * // Basic image generation (uses default fast model)
   * const { data } = await blink.ai.generateImage({
   *   prompt: "A serene landscape with mountains and a lake at sunset"
   * });
   * console.log("Image URL:", data[0].url);
   * 
   * // High quality generation with Pro model
   * const { data } = await blink.ai.generateImage({
   *   prompt: "A detailed infographic about AI with charts and diagrams",
   *   model: "fal-ai/nano-banana-pro",
   *   n: 2
   * });
   * 
   * // Fast generation with specific size
   * const { data } = await blink.ai.generateImage({
   *   prompt: "A futuristic city skyline with flying cars",
   *   model: "fal-ai/nano-banana",
   *   size: "1024x1024",
   *   n: 3
   * });
   * data.forEach((img, i) => console.log(`Image ${i+1}:`, img.url));
   * 
   * // Using legacy Gemini model
   * const { data } = await blink.ai.generateImage({
   *   prompt: "A cute robot mascot for a tech company",
   *   model: "gemini-2.5-flash-image-preview"
   * });
   * ```
   * 
   * @returns Promise<ImageGenerationResponse> - Object containing:
   *   - `data`: Array of generated images with URLs
   *   - `created`: Timestamp of generation
   *   - `model`: The model used for generation
   */
  async generateImage(options) {
    try {
      if (!options.prompt) {
        throw new BlinkAIError("Prompt is required");
      }
      const response = await this.httpClient.aiImage(
        options.prompt,
        {
          model: options.model,
          n: options.n,
          size: options.size,
          signal: options.signal
        }
      );
      let imageResponse;
      if (response.data?.result?.data) {
        imageResponse = response.data.result;
      } else if (response.data?.data) {
        imageResponse = response.data;
      } else {
        throw new BlinkAIError("Invalid response format: missing image data");
      }
      if (!Array.isArray(imageResponse.data)) {
        throw new BlinkAIError("Invalid response format: data should be an array");
      }
      imageResponse.data = imageResponse.data.map((item) => {
        if (typeof item === "string") {
          return { url: item };
        } else if (item.url) {
          return item;
        } else {
          throw new BlinkAIError("Invalid image response format");
        }
      });
      return imageResponse;
    } catch (error) {
      if (error instanceof BlinkAIError) {
        throw error;
      }
      throw new BlinkAIError(
        `Image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        void 0,
        { originalError: error }
      );
    }
  }
  /**
   * Modifies existing images using AI image editing models with text prompts for image-to-image editing.
   * 
   * @param options - Object containing:
   *   - `images`: Array of public image URLs to modify (required, up to 50 images)
   *   - `prompt`: Text description of desired modifications (required, up to 100k characters)
   *   - `model`: AI model to use (optional). Available editing models:
   *       **Fal.ai Editing Models (Recommended):**
   *       - `"fal-ai/nano-banana/edit"` (default) - Flash editing (Fast)
   *       - `"fal-ai/nano-banana-pro/edit"` - Pro editing (High quality)
   *       - `"fal-ai/gemini-25-flash-image/edit"` - Alias for nano-banana/edit
   *       - `"fal-ai/gemini-3-pro-image-preview/edit"` - Alias for nano-banana-pro/edit
   *       **Legacy Gemini Models:**
   *       - `"gemini-2.5-flash-image-preview"` - Direct Gemini API
   *       - `"gemini-3-pro-image-preview"` - Direct Gemini API
   *   - `n`: Number of output images to generate (default: 1)
   *   - Plus optional signal parameter
   * 
   * @example
   * ```ts
   * // Fast editing with default model
   * const { data } = await blink.ai.modifyImage({
   *   images: ["https://storage.example.com/photo.jpg"],
   *   prompt: "make it green"
   * });
   * 
   * // High quality editing with Pro model
   * const { data } = await blink.ai.modifyImage({
   *   images: ["https://storage.example.com/landscape.jpg"],
   *   prompt: "add a tree in the background",
   *   model: "fal-ai/nano-banana-pro/edit"
   * });
   * 
   * // Professional headshots from casual photos
   * const { data } = await blink.ai.modifyImage({
   *   images: [
   *     "https://storage.example.com/user-photo-1.jpg",
   *     "https://storage.example.com/user-photo-2.jpg"
   *   ],
   *   prompt: "Transform into professional business headshots with studio lighting",
   *   model: "fal-ai/nano-banana/edit",
   *   n: 4
   * });
   * data.forEach((img, i) => console.log(`Headshot ${i+1}:`, img.url));
   * 
   * // Artistic style transformation
   * const { data } = await blink.ai.modifyImage({
   *   images: ["https://storage.example.com/portrait.jpg"],
   *   prompt: "Transform into oil painting style with dramatic lighting",
   *   model: "fal-ai/nano-banana-pro/edit"
   * });
   * 
   * // Background replacement
   * const { data } = await blink.ai.modifyImage({
   *   images: ["https://storage.example.com/product.jpg"],
   *   prompt: "Remove background and place on clean white studio background",
   *   n: 2
   * });
   * 
   * // Batch processing multiple photos
   * const userPhotos = [
   *   "https://storage.example.com/photo1.jpg",
   *   "https://storage.example.com/photo2.jpg",
   *   "https://storage.example.com/photo3.jpg"
   * ];
   * const { data } = await blink.ai.modifyImage({
   *   images: userPhotos,
   *   prompt: "Convert to black and white vintage style photographs"
   * });
   * 
   * // 🎨 Style Transfer - IMPORTANT: Provide all images in array
   * // ❌ WRONG - Don't reference other images in prompt
   * const wrong = await blink.ai.modifyImage({
   *   images: [userPhotoUrl],
   *   prompt: `Apply hairstyle from ${referenceUrl}`
   * });
   * 
   * // ✅ CORRECT - Provide all images in array
   * const { data } = await blink.ai.modifyImage({
   *   images: [userPhotoUrl, hairstyleReferenceUrl],
   *   prompt: "Apply the hairstyle from the second image to the person in the first image"
   * });
   * ```
   * 
   * @returns Promise<ImageGenerationResponse> - Object containing:
   *   - `data`: Array of modified images with URLs
   *   - `created`: Timestamp of generation
   *   - `model`: The model used for editing
   */
  async modifyImage(options) {
    try {
      if (!options.prompt) {
        throw new BlinkAIError("Prompt is required");
      }
      if (!options.images || !Array.isArray(options.images) || options.images.length === 0) {
        throw new BlinkAIError("Images array is required and must contain at least one image URL");
      }
      if (options.images.length > 50) {
        throw new BlinkAIError("Maximum 50 images allowed");
      }
      for (let i = 0; i < options.images.length; i++) {
        const validation = this.validateImageUrl(options.images[i]);
        if (!validation.isValid) {
          throw new BlinkAIError(`Image ${i + 1}: ${validation.error}`);
        }
      }
      const response = await this.httpClient.aiImage(
        options.prompt,
        // Non-null assertion since we validated above
        {
          model: options.model,
          images: options.images,
          n: options.n,
          signal: options.signal
        }
      );
      let imageResponse;
      if (response.data?.result?.data) {
        imageResponse = response.data.result;
      } else if (response.data?.data) {
        imageResponse = response.data;
      } else {
        throw new BlinkAIError("Invalid response format: missing image data");
      }
      if (!Array.isArray(imageResponse.data)) {
        throw new BlinkAIError("Invalid response format: data should be an array");
      }
      imageResponse.data = imageResponse.data.map((item) => {
        if (typeof item === "string") {
          return { url: item };
        } else if (item.url) {
          return item;
        } else {
          throw new BlinkAIError("Invalid image response format");
        }
      });
      return imageResponse;
    } catch (error) {
      if (error instanceof BlinkAIError) {
        throw error;
      }
      throw new BlinkAIError(
        `Image modification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        void 0,
        { originalError: error }
      );
    }
  }
  /**
   * Generates videos from text prompts or images using AI video generation models.
   * 
   * @param options - Object containing:
   *   - `prompt`: Text description of the video to generate (required)
   *   - `model`: Video model to use (optional). Available models:
   *       **Text-to-Video Models:**
   *       - `"fal-ai/veo3.1"` - Google Veo 3.1 (best quality)
   *       - `"fal-ai/veo3.1/fast"` (default) - Veo 3.1 fast mode (faster, cheaper)
   *       - `"fal-ai/sora-2/text-to-video/pro"` - OpenAI Sora 2
   *       - `"fal-ai/kling-video/v2.6/pro/text-to-video"` - Kling 2.6
   *       **Image-to-Video Models:**
   *       - `"fal-ai/veo3.1/image-to-video"` - Veo 3.1 I2V
   *       - `"fal-ai/veo3.1/fast/image-to-video"` - Veo 3.1 fast I2V
   *       - `"fal-ai/sora-2/image-to-video/pro"` - Sora 2 I2V
   *       - `"fal-ai/kling-video/v2.6/pro/image-to-video"` - Kling 2.6 I2V
   *   - `image_url`: Source image URL for image-to-video (required for I2V models)
   *   - `duration`: Video duration ("4s", "5s", "6s", "8s", "10s", "12s")
   *   - `aspect_ratio`: Aspect ratio ("16:9", "9:16", "1:1")
   *   - `resolution`: Resolution ("720p", "1080p") - Veo/Sora only
   *   - `negative_prompt`: What to avoid in generation - Veo/Kling only
   *   - `generate_audio`: Generate audio with video (default: true)
   *   - `seed`: For reproducibility - Veo only
   *   - `cfg_scale`: Guidance scale (0-1) - Kling only
   *   - Plus optional signal parameter
   * 
   * @example
   * ```ts
   * // Basic text-to-video generation (uses default fast model)
   * const { result } = await blink.ai.generateVideo({
   *   prompt: "A serene sunset over the ocean with gentle waves"
   * });
   * console.log("Video URL:", result.video.url);
   * 
   * // High quality with Veo 3.1
   * const { result } = await blink.ai.generateVideo({
   *   prompt: "A cinematic shot of a futuristic city at night",
   *   model: "fal-ai/veo3.1",
   *   resolution: "1080p",
   *   aspect_ratio: "16:9"
   * });
   * 
   * // Image-to-video animation
   * const { result } = await blink.ai.generateVideo({
   *   prompt: "Animate this image with gentle camera movement",
   *   model: "fal-ai/veo3.1/fast/image-to-video",
   *   image_url: "https://example.com/my-image.jpg",
   *   duration: "5s"
   * });
   * 
   * // Using Sora 2 for creative videos
   * const { result } = await blink.ai.generateVideo({
   *   prompt: "A magical forest with glowing fireflies",
   *   model: "fal-ai/sora-2/text-to-video/pro",
   *   duration: "8s"
   * });
   * 
   * // Using Kling for detailed videos
   * const { result, usage } = await blink.ai.generateVideo({
   *   prompt: "A professional cooking tutorial scene",
   *   model: "fal-ai/kling-video/v2.6/pro/text-to-video",
   *   negative_prompt: "blur, distort, low quality",
   *   cfg_scale: 0.7
   * });
   * console.log("Credits charged:", usage?.creditsCharged);
   * ```
   * 
   * @returns Promise<VideoGenerationResponse> - Object containing:
   *   - `result.video.url`: URL to the generated video
   *   - `result.video.content_type`: MIME type (video/mp4)
   *   - `result.video.file_name`: Generated filename
   *   - `result.video.file_size`: File size in bytes
   *   - `metadata`: Generation metadata (projectId, timestamp, model)
   *   - `usage`: Credits charged and cost information
   */
  async generateVideo(options) {
    try {
      if (!options.prompt) {
        throw new BlinkAIError("Prompt is required");
      }
      const i2vModels = [
        "fal-ai/veo3.1/image-to-video",
        "fal-ai/veo3.1/fast/image-to-video",
        "fal-ai/sora-2/image-to-video/pro",
        "fal-ai/kling-video/v2.6/pro/image-to-video"
      ];
      if (options.model && i2vModels.includes(options.model) && !options.image_url) {
        throw new BlinkAIError("image_url is required for image-to-video models");
      }
      if (options.image_url) {
        const validation = this.validateImageUrl(options.image_url);
        if (!validation.isValid) {
          throw new BlinkAIError(`Invalid image_url: ${validation.error}`);
        }
      }
      const response = await this.httpClient.aiVideo(
        options.prompt,
        {
          model: options.model,
          image_url: options.image_url,
          duration: options.duration,
          aspect_ratio: options.aspect_ratio,
          resolution: options.resolution,
          negative_prompt: options.negative_prompt,
          generate_audio: options.generate_audio,
          seed: options.seed,
          cfg_scale: options.cfg_scale,
          signal: options.signal
        }
      );
      if (!response.data?.result?.video?.url) {
        throw new BlinkAIError("Invalid response format: missing video URL");
      }
      return response.data;
    } catch (error) {
      if (error instanceof BlinkAIError) {
        throw error;
      }
      throw new BlinkAIError(
        `Video generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        void 0,
        { originalError: error }
      );
    }
  }
  /**
   * Converts text to speech using AI voice synthesis models.
   * 
   * @param options - Object containing:
   *   - `text`: Text content to convert to speech (required)
   *   - `voice`: Voice to use ("alloy", "echo", "fable", "onyx", "nova", "shimmer")
   *   - `response_format`: Audio format ("mp3", "opus", "aac", "flac", "wav", "pcm")
   *   - `speed`: Speech speed (0.25 to 4.0, default: 1.0)
   *   - Plus optional model, signal parameters
   * 
   * @example
   * ```ts
   * // Basic text-to-speech
   * const { url } = await blink.ai.generateSpeech({
   *   text: "Hello, welcome to our AI-powered application!"
   * });
   * console.log("Audio URL:", url);
   * 
   * // Custom voice and format
   * const { url, voice, format } = await blink.ai.generateSpeech({
   *   text: "This is a demonstration of our speech synthesis capabilities.",
   *   voice: "nova",
   *   response_format: "wav",
   *   speed: 1.2
   * });
   * console.log(`Generated ${format} audio with ${voice} voice:`, url);
   * 
   * // Slow, clear speech for accessibility
   * const { url } = await blink.ai.generateSpeech({
   *   text: "Please listen carefully to these important instructions.",
   *   voice: "echo",
   *   speed: 0.8
   * });
   * ```
   * 
   * @returns Promise<SpeechGenerationResponse> - Object containing:
   *   - `url`: URL to the generated audio file
   *   - `voice`: Voice used for generation
   *   - `format`: Audio format
   *   - `mimeType`: MIME type of the audio
   */
  async generateSpeech(options) {
    try {
      if (!options.text) {
        throw new BlinkAIError("Text is required");
      }
      const response = await this.httpClient.aiSpeech(
        options.text,
        {
          model: options.model,
          voice: options.voice,
          response_format: options.response_format,
          speed: options.speed,
          signal: options.signal
        }
      );
      let speechResponse;
      if (response.data?.result) {
        speechResponse = response.data.result;
      } else if (response.data?.url) {
        speechResponse = response.data;
      } else {
        throw new BlinkAIError("Invalid response format: missing speech data");
      }
      if (!speechResponse.url) {
        if (typeof response.data === "string") {
          speechResponse = {
            url: response.data,
            voice: options.voice || "alloy",
            format: options.response_format || "mp3",
            mimeType: this.getMimeTypeForFormat(options.response_format || "mp3")
          };
        } else if (response.data?.data) {
          speechResponse = {
            url: response.data.data,
            voice: options.voice || "alloy",
            format: options.response_format || "mp3",
            mimeType: this.getMimeTypeForFormat(options.response_format || "mp3")
          };
        } else {
          throw new BlinkAIError("Invalid response format: no audio URL found");
        }
      }
      if (!speechResponse.voice) {
        speechResponse.voice = options.voice || "alloy";
      }
      if (!speechResponse.format) {
        speechResponse.format = options.response_format || "mp3";
      }
      if (!speechResponse.mimeType) {
        speechResponse.mimeType = this.getMimeTypeForFormat(speechResponse.format);
      }
      return speechResponse;
    } catch (error) {
      if (error instanceof BlinkAIError) {
        throw error;
      }
      throw new BlinkAIError(
        `Speech generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        void 0,
        { originalError: error }
      );
    }
  }
  /**
   * Transcribes audio content to text using AI speech recognition models.
   * 
   * @param options - Object containing:
   *   - `audio`: Audio input as URL string, base64 string, or number array buffer (required)
   *   - `language`: Language code for transcription (e.g., "en", "es", "fr")
   *   - `response_format`: Output format ("json", "text", "srt", "verbose_json", "vtt")
   *   - Plus optional model, signal parameters
   * 
   * @example
   * ```ts
   * // Transcribe from URL
   * const { text } = await blink.ai.transcribeAudio({
   *   audio: "https://example.com/meeting-recording.mp3"
   * });
   * console.log("Transcription:", text);
   * 
   * // Transcribe with language hint
   * const { text, language } = await blink.ai.transcribeAudio({
   *   audio: "https://example.com/spanish-audio.wav",
   *   language: "es"
   * });
   * console.log(`Transcribed ${language}:`, text);
   * 
   * // Transcribe with timestamps (verbose format)
   * const result = await blink.ai.transcribeAudio({
   *   audio: audioFileUrl,
   *   response_format: "verbose_json"
   * });
   * result.segments?.forEach(segment => {
   *   console.log(`${segment.start}s - ${segment.end}s: ${segment.text}`);
   * });
   * 
   * // Transcribe from audio buffer
   * const audioBuffer = new Array(1024).fill(0); // Your audio data
   * const { text } = await blink.ai.transcribeAudio({
   *   audio: audioBuffer,
   *   language: "en"
   * });
   * ```
   * 
   * @returns Promise<TranscriptionResponse> - Object containing:
   *   - `text`: Transcribed text content
   *   - `transcript`: Alias for text
   *   - `segments`: Array of timestamped segments (if verbose format)
   *   - `language`: Detected language
   *   - `duration`: Audio duration in seconds
   */
  async transcribeAudio(options) {
    try {
      if (!options.audio) {
        throw new BlinkAIError("Audio is required");
      }
      const response = await this.httpClient.aiTranscribe(
        options.audio,
        {
          model: options.model,
          language: options.language,
          response_format: options.response_format,
          signal: options.signal
        }
      );
      if (response.data?.result) {
        return response.data.result;
      } else if (response.data?.text || response.data?.transcript) {
        return {
          text: response.data.text || response.data.transcript,
          transcript: response.data.transcript || response.data.text,
          ...response.data
        };
      } else {
        throw new BlinkAIError("Invalid response format: missing transcription text");
      }
    } catch (error) {
      if (error instanceof BlinkAIError) {
        throw error;
      }
      throw new BlinkAIError(
        `Audio transcription failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        void 0,
        { originalError: error }
      );
    }
  }
  async agent(options) {
    try {
      if (!options.agent?.model) {
        throw new BlinkAIError("agent.model is required");
      }
      if (!options.prompt && !options.messages) {
        throw new BlinkAIError("Either prompt or messages is required");
      }
      if (options.prompt && options.messages) {
        throw new BlinkAIError("prompt and messages are mutually exclusive");
      }
      const serializedTools = options.agent.tools ? serializeTools(options.agent.tools) : void 0;
      const requestBody = {
        stream: options.stream,
        agent: {
          model: options.agent.model,
          system: options.agent.system,
          tools: serializedTools,
          webhook_tools: options.agent.webhook_tools,
          client_tools: options.agent.client_tools,
          tool_choice: options.agent.tool_choice,
          stop_when: options.agent.stop_when,
          prepare_step: options.agent.prepare_step
        }
      };
      if (options.prompt) {
        requestBody.prompt = options.prompt;
      } else if (options.messages) {
        requestBody.messages = options.messages;
      }
      if (options.stream) {
        return await this.httpClient.aiAgentStream(requestBody, options.signal);
      } else {
        const response = await this.httpClient.aiAgent(requestBody, options.signal);
        return response.data;
      }
    } catch (error) {
      if (error instanceof BlinkAIError) {
        throw error;
      }
      throw new BlinkAIError(
        `Agent request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        void 0,
        { originalError: error }
      );
    }
  }
  // ============================================================================
  // Agent Factory
  // ============================================================================
  /**
   * Creates a reusable Agent instance with the Vercel AI SDK pattern.
   * 
   * The Agent can be used multiple times with different prompts:
   * - `agent.generate({ prompt })` for non-streaming
   * - `agent.stream({ prompt })` for streaming
   * 
   * @param options - Agent configuration (model, tools, system, etc.)
   * @returns Agent instance
   * 
   * @example
   * ```ts
   * const weatherAgent = blink.ai.createAgent({
   *   model: 'anthropic/claude-sonnet-4-20250514',
   *   system: 'You are a helpful weather assistant.',
   *   tools: [webSearch, fetchUrl],
   *   maxSteps: 10,
   * })
   * 
   * // Non-streaming
   * const result = await weatherAgent.generate({
   *   prompt: 'What is the weather in San Francisco?',
   * })
   * 
   * // Streaming
   * const stream = await weatherAgent.stream({
   *   prompt: 'Tell me about weather patterns',
   * })
   * ```
   */
  createAgent(options) {
    const agent = new Agent(options);
    agent._setHttpClient(this.httpClient);
    return agent;
  }
  /**
   * Binds an existing Agent instance to this client's HTTP client.
   * 
   * Used internally by useAgent() when an Agent instance is passed.
   * This allows agents created with `new Agent()` to be used with the hook.
   * 
   * @param agent - Existing Agent instance
   * @returns The same Agent instance (with httpClient set)
   */
  bindAgent(agent) {
    agent._setHttpClient(this.httpClient);
    return agent;
  }
};
var BlinkDataImpl = class {
  constructor(httpClient, projectId) {
    this.httpClient = httpClient;
    this.projectId = projectId;
  }
  async extractFromUrl(url, options = {}) {
    const { chunking = false, chunkSize } = options;
    const request = { url, chunking, chunkSize };
    const response = await this.httpClient.dataExtractFromUrl(this.projectId, request);
    return chunking ? response.data.chunks : response.data.text;
  }
  async extractFromBlob(file, options = {}) {
    const { chunking = false, chunkSize } = options;
    const response = await this.httpClient.dataExtractFromBlob(this.projectId, file, chunking, chunkSize);
    return chunking ? response.data.chunks : response.data.text;
  }
  async scrape(url) {
    const request = {
      url,
      formats: ["markdown", "html", "links", "extract", "metadata"]
    };
    const response = await this.httpClient.dataScrape(this.projectId, request);
    const data = response.data;
    return {
      markdown: data.markdown || "",
      html: data.html || "",
      metadata: {
        title: data.metadata?.title || "",
        description: data.metadata?.description || "",
        url: data.metadata?.url || url,
        domain: data.metadata?.domain || new URL(url).hostname,
        favicon: data.metadata?.favicon,
        image: data.metadata?.image,
        author: data.metadata?.author,
        publishedTime: data.metadata?.publishedTime,
        modifiedTime: data.metadata?.modifiedTime,
        type: data.metadata?.type,
        siteName: data.metadata?.siteName,
        locale: data.metadata?.locale,
        keywords: data.metadata?.keywords || []
      },
      links: data.links || [],
      extract: {
        title: data.extract?.title || data.metadata?.title || "",
        description: data.extract?.description || data.metadata?.description || "",
        headings: data.extract?.headings || [],
        text: data.extract?.text || data.markdown || ""
      }
    };
  }
  async screenshot(url, options = {}) {
    const request = { url, ...options };
    const response = await this.httpClient.dataScreenshot(this.projectId, request);
    return response.data.url;
  }
  async fetch(request) {
    const response = await this.httpClient.dataFetch(this.projectId, request);
    if ("status" in response.data && "headers" in response.data) {
      return response.data;
    }
    throw new BlinkDataError("Unexpected response format from fetch endpoint");
  }
  async fetchAsync(request) {
    const asyncRequest = { ...request, async: true };
    const response = await this.httpClient.dataFetch(this.projectId, asyncRequest);
    if ("status" in response.data && response.data.status === "triggered") {
      return response.data;
    }
    throw new BlinkDataError("Unexpected response format from async fetch endpoint");
  }
  async search(query, options) {
    const normalizeType = (type) => {
      switch (type) {
        case "news":
          return "nws";
        case "images":
        case "image":
          return "isch";
        case "videos":
        case "video":
          return "vid";
        case "shopping":
        case "shop":
          return "shop";
        default:
          return void 0;
      }
    };
    const request = {
      q: query,
      location: options?.location,
      hl: options?.language || "en",
      tbm: normalizeType(options?.type),
      num: options?.limit
    };
    const response = await this.httpClient.dataSearch(this.projectId, request);
    return response.data;
  }
};
var getWebSocketClass = () => {
  if (typeof WebSocket !== "undefined") {
    return WebSocket;
  }
  try {
    const WS = __require2("ws");
    return WS;
  } catch (error) {
    throw new BlinkRealtimeError('WebSocket is not available. Install "ws" package for Node.js environments.');
  }
};
var RealtimeConnection = class {
  constructor(httpClient, projectId) {
    this.httpClient = httpClient;
    this.projectId = projectId;
  }
  websocket = null;
  isConnected = false;
  isConnecting = false;
  reconnectTimer = null;
  heartbeatTimer = null;
  reconnectAttempts = 0;
  connectionPromise = null;
  // Channel management
  channels = /* @__PURE__ */ new Map();
  pendingSubscriptions = /* @__PURE__ */ new Map();
  // Message queue for when socket not ready
  messageQueue = [];
  /**
   * Check if connection is ready
   */
  isReady() {
    return this.isConnected && this.websocket?.readyState === 1;
  }
  /**
   * Ensure WebSocket connection is established
   */
  async connect() {
    if (this.isConnected && this.websocket?.readyState === 1) {
      return;
    }
    if (this.connectionPromise) {
      return this.connectionPromise;
    }
    this.connectionPromise = this.connectWebSocket();
    try {
      await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
    }
  }
  /**
   * Join a channel (subscribe)
   */
  async joinChannel(channelName, handler, options = {}) {
    await this.connect();
    this.channels.set(channelName, { handler, options });
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingSubscriptions.delete(channelName);
        this.channels.delete(channelName);
        reject(new BlinkRealtimeError("Subscription timeout - no acknowledgment from server"));
      }, 1e4);
      this.pendingSubscriptions.set(channelName, { resolve, reject, timeout });
      const subscribeMessage = {
        type: "subscribe",
        payload: {
          channel: channelName,
          userId: options.userId,
          metadata: options.metadata
        }
      };
      try {
        this.sendRaw(JSON.stringify(subscribeMessage));
      } catch (error) {
        clearTimeout(timeout);
        this.pendingSubscriptions.delete(channelName);
        this.channels.delete(channelName);
        reject(error);
      }
    });
  }
  /**
   * Leave a channel (unsubscribe)
   */
  async leaveChannel(channelName) {
    this.channels.delete(channelName);
    const pending = this.pendingSubscriptions.get(channelName);
    if (pending) {
      clearTimeout(pending.timeout);
      pending.reject(new BlinkRealtimeError("Subscription cancelled"));
      this.pendingSubscriptions.delete(channelName);
    }
    if (this.websocket && this.websocket.readyState === 1) {
      const unsubscribeMessage = {
        type: "unsubscribe",
        payload: { channel: channelName }
      };
      this.websocket.send(JSON.stringify(unsubscribeMessage));
    }
    if (this.channels.size === 0) {
      this.disconnect();
    }
  }
  /**
   * Send a message to a channel
   */
  async send(channelName, type, data, options = {}) {
    await this.connect();
    const publishMessage = {
      type: "publish",
      payload: {
        channel: channelName,
        type,
        data,
        userId: options.userId,
        metadata: options.metadata
      }
    };
    return this.sendWithResponse(JSON.stringify(publishMessage), channelName);
  }
  /**
   * Disconnect and cleanup
   */
  disconnect() {
    this.isConnected = false;
    this.isConnecting = false;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.messageQueue.forEach((q) => {
      clearTimeout(q.timeout);
      q.reject(new BlinkRealtimeError("Connection closed"));
    });
    this.messageQueue = [];
    this.pendingSubscriptions.forEach((pending, channel) => {
      clearTimeout(pending.timeout);
      pending.reject(new BlinkRealtimeError("Connection closed"));
    });
    this.pendingSubscriptions.clear();
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }
  /**
   * Get count of active channels
   */
  getChannelCount() {
    return this.channels.size;
  }
  // Private methods
  async connectWebSocket() {
    if (this.websocket && this.websocket.readyState === 1) {
      this.isConnected = true;
      return;
    }
    if (this.isConnecting) {
      return new Promise((resolve, reject) => {
        const checkConnection = () => {
          if (this.isConnected) {
            resolve();
          } else if (!this.isConnecting) {
            reject(new BlinkRealtimeError("Connection failed"));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }
    this.isConnecting = true;
    this.isConnected = false;
    return new Promise((resolve, reject) => {
      try {
        const httpClient = this.httpClient;
        const coreUrl = httpClient.coreUrl || "https://core.blink.new";
        const baseUrl = coreUrl.replace("https://", "wss://").replace("http://", "ws://");
        const wsUrl = `${baseUrl}?project_id=${this.projectId}`;
        console.log(`\u{1F517} Connecting to realtime: ${wsUrl}`);
        const WSClass = getWebSocketClass();
        this.websocket = new WSClass(wsUrl);
        if (!this.websocket) {
          this.isConnecting = false;
          reject(new BlinkRealtimeError("Failed to create WebSocket instance"));
          return;
        }
        this.websocket.onopen = () => {
          console.log(`\u{1F517} Connected to realtime for project ${this.projectId}`);
          this.isConnecting = false;
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.flushMessageQueue();
          resolve();
        };
        this.websocket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }
        };
        this.websocket.onclose = () => {
          console.log(`\u{1F50C} Disconnected from realtime for project ${this.projectId}`);
          this.isConnecting = false;
          this.isConnected = false;
          this.rejectQueuedMessages(new BlinkRealtimeError("WebSocket connection closed"));
          this.scheduleReconnect();
        };
        this.websocket.onerror = (error) => {
          console.error("WebSocket error:", error);
          this.isConnecting = false;
          this.isConnected = false;
          reject(new BlinkRealtimeError(`WebSocket connection failed to ${wsUrl}`));
        };
        setTimeout(() => {
          if (this.websocket?.readyState !== 1) {
            this.isConnecting = false;
            reject(new BlinkRealtimeError("WebSocket connection timeout"));
          }
        }, 1e4);
      } catch (error) {
        this.isConnecting = false;
        reject(new BlinkRealtimeError(`Failed to create WebSocket connection: ${error instanceof Error ? error.message : "Unknown error"}`));
      }
    });
  }
  handleMessage(message) {
    const channelName = message.payload?.channel;
    switch (message.type) {
      case "connected":
        console.log(`\u2705 WebSocket connected: ${message.payload?.socketId}`);
        break;
      case "subscribed":
        console.log(`\u2705 Subscribed to channel: ${channelName}`);
        const pendingSub = this.pendingSubscriptions.get(channelName);
        if (pendingSub) {
          clearTimeout(pendingSub.timeout);
          pendingSub.resolve();
          this.pendingSubscriptions.delete(channelName);
        }
        const subHandler = this.channels.get(channelName);
        if (subHandler) {
          subHandler.handler.onSubscribed();
        }
        break;
      case "message":
        const msgChannel = this.channels.get(message.payload?.channel);
        if (msgChannel) {
          msgChannel.handler.onMessage(message.payload);
        }
        break;
      case "presence":
        const presChannel = this.channels.get(message.payload?.channel);
        if (presChannel) {
          const users = message.payload?.data?.users || [];
          presChannel.handler.onPresence(users);
        }
        break;
      case "published":
        break;
      case "pong":
        break;
      case "error":
        console.error("Realtime error:", message.payload?.error);
        const errChannel = this.channels.get(channelName);
        if (errChannel) {
          errChannel.handler.onError(message.payload?.error);
        }
        const pendingErr = this.pendingSubscriptions.get(channelName);
        if (pendingErr) {
          clearTimeout(pendingErr.timeout);
          pendingErr.reject(new BlinkRealtimeError(`Subscription error: ${message.payload?.error}`));
          this.pendingSubscriptions.delete(channelName);
        }
        break;
      case "unsubscribed":
        console.log(`\u274C Unsubscribed from channel: ${channelName}`);
        break;
      default:
        console.log("Unknown message type:", message.type);
    }
  }
  sendRaw(message) {
    if (this.websocket && this.websocket.readyState === 1) {
      this.websocket.send(message);
    } else {
      throw new BlinkRealtimeError("Cannot send message: WebSocket not connected");
    }
  }
  sendWithResponse(message, channelName) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.messageQueue.findIndex((q) => q.resolve === resolve);
        if (index > -1) {
          this.messageQueue.splice(index, 1);
        }
        reject(new BlinkRealtimeError("Message send timeout - no response from server"));
      }, 1e4);
      if (this.websocket && this.websocket.readyState === 1) {
        const handleResponse = (event) => {
          try {
            const response = JSON.parse(event.data);
            if (response.type === "published" && response.payload.channel === channelName) {
              clearTimeout(timeout);
              this.websocket.removeEventListener("message", handleResponse);
              resolve(response.payload.messageId);
            } else if (response.type === "error") {
              clearTimeout(timeout);
              this.websocket.removeEventListener("message", handleResponse);
              reject(new BlinkRealtimeError(`Server error: ${response.payload.error}`));
            }
          } catch (err) {
          }
        };
        this.websocket.addEventListener("message", handleResponse);
        this.websocket.send(message);
      } else {
        this.messageQueue.push({ message, resolve, reject, timeout });
      }
    });
  }
  flushMessageQueue() {
    if (!this.websocket || this.websocket.readyState !== 1) return;
    const queue = [...this.messageQueue];
    this.messageQueue = [];
    queue.forEach((q) => {
      try {
        this.websocket.send(q.message);
      } catch (error) {
        clearTimeout(q.timeout);
        q.reject(new BlinkRealtimeError("Failed to send queued message"));
      }
    });
  }
  rejectQueuedMessages(error) {
    const queue = [...this.messageQueue];
    this.messageQueue = [];
    queue.forEach((q) => {
      clearTimeout(q.timeout);
      q.reject(error);
    });
  }
  startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    this.heartbeatTimer = globalThis.setInterval(() => {
      if (this.websocket && this.websocket.readyState === 1) {
        this.websocket.send(JSON.stringify({ type: "ping", payload: {} }));
      }
    }, 25e3);
  }
  scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.channels.size === 0) {
      return;
    }
    this.reconnectAttempts++;
    const baseDelay = Math.min(3e4, Math.pow(2, this.reconnectAttempts) * 1e3);
    const jitter = Math.random() * 1e3;
    const delay = baseDelay + jitter;
    console.log(`\u{1F504} Scheduling reconnect attempt ${this.reconnectAttempts} in ${Math.round(delay)}ms`);
    this.reconnectTimer = globalThis.setTimeout(async () => {
      if (this.channels.size === 0) return;
      try {
        await this.connectWebSocket();
        await this.resubscribeAllChannels();
      } catch (error) {
        console.error("Reconnection failed:", error);
        this.scheduleReconnect();
      }
    }, delay);
  }
  async resubscribeAllChannels() {
    console.log(`\u{1F504} Resubscribing ${this.channels.size} channels...`);
    for (const [channelName, subscription] of this.channels) {
      try {
        const subscribeMessage = {
          type: "subscribe",
          payload: {
            channel: channelName,
            userId: subscription.options.userId,
            metadata: subscription.options.metadata
          }
        };
        if (this.websocket && this.websocket.readyState === 1) {
          this.websocket.send(JSON.stringify(subscribeMessage));
        }
      } catch (error) {
        console.error(`Failed to resubscribe to ${channelName}:`, error);
      }
    }
  }
};
var BlinkRealtimeChannel = class {
  constructor(channelName, connection, httpClient, projectId) {
    this.channelName = channelName;
    this.connection = connection;
    this.httpClient = httpClient;
    this.projectId = projectId;
  }
  messageCallbacks = [];
  presenceCallbacks = [];
  isSubscribed = false;
  subscribeOptions = {};
  /**
   * Check if channel is ready for publishing
   */
  isReady() {
    return this.isSubscribed && this.connection.isReady();
  }
  async subscribe(options = {}) {
    if (this.isSubscribed) {
      return;
    }
    this.subscribeOptions = options;
    const handler = {
      onMessage: (message) => {
        this.messageCallbacks.forEach((callback) => {
          try {
            callback(message);
          } catch (error) {
            console.error("Error in message callback:", error);
          }
        });
      },
      onPresence: (users) => {
        this.presenceCallbacks.forEach((callback) => {
          try {
            callback(users);
          } catch (error) {
            console.error("Error in presence callback:", error);
          }
        });
      },
      onSubscribed: () => {
        this.isSubscribed = true;
      },
      onError: (error) => {
        console.error(`Channel ${this.channelName} error:`, error);
      }
    };
    await this.connection.joinChannel(this.channelName, handler, options);
    this.isSubscribed = true;
  }
  async unsubscribe() {
    if (!this.isSubscribed) {
      return;
    }
    await this.connection.leaveChannel(this.channelName);
    this.cleanup();
  }
  async publish(type, data, options = {}) {
    return this.connection.send(this.channelName, type, data, options);
  }
  onMessage(callback) {
    this.messageCallbacks.push(callback);
    return () => {
      const index = this.messageCallbacks.indexOf(callback);
      if (index > -1) {
        this.messageCallbacks.splice(index, 1);
      }
    };
  }
  onPresence(callback) {
    this.presenceCallbacks.push(callback);
    return () => {
      const index = this.presenceCallbacks.indexOf(callback);
      if (index > -1) {
        this.presenceCallbacks.splice(index, 1);
      }
    };
  }
  async getPresence() {
    try {
      const response = await this.httpClient.realtimeGetPresence(this.projectId, this.channelName);
      return response.data.users || [];
    } catch (error) {
      throw new BlinkRealtimeError(
        `Failed to get presence for channel ${this.channelName}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  async getMessages(options = {}) {
    try {
      const response = await this.httpClient.realtimeGetMessages(this.projectId, {
        channel: this.channelName,
        limit: options.limit,
        start: options.after || "-",
        end: options.before || "+"
      });
      return response.data.messages || [];
    } catch (error) {
      throw new BlinkRealtimeError(
        `Failed to get messages for channel ${this.channelName}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  cleanup() {
    this.isSubscribed = false;
    this.subscribeOptions = {};
    this.messageCallbacks = [];
    this.presenceCallbacks = [];
  }
};
var BlinkRealtimeImpl = class {
  constructor(httpClient, projectId) {
    this.httpClient = httpClient;
    this.projectId = projectId;
    this.connection = new RealtimeConnection(httpClient, projectId);
  }
  connection;
  channels = /* @__PURE__ */ new Map();
  handlers = {};
  channel(name) {
    if (!this.channels.has(name)) {
      this.channels.set(name, new BlinkRealtimeChannel(name, this.connection, this.httpClient, this.projectId));
    }
    return this.channels.get(name);
  }
  async subscribe(channelName, callback, options = {}) {
    const channel = this.channel(channelName);
    await channel.subscribe(options);
    const state = this.handlers[channelName] ??= {
      msgHandlers: /* @__PURE__ */ new Set(),
      presHandlers: /* @__PURE__ */ new Set(),
      subscribed: true
    };
    state.msgHandlers.add(callback);
    const messageUnsub = channel.onMessage(callback);
    return () => {
      messageUnsub();
      state.msgHandlers.delete(callback);
      if (state.msgHandlers.size === 0 && state.presHandlers.size === 0) {
        channel.unsubscribe();
        delete this.handlers[channelName];
      }
    };
  }
  async publish(channelName, type, data, options = {}) {
    const channel = this.channel(channelName);
    return channel.publish(type, data, options);
  }
  async presence(channelName) {
    const channel = this.channel(channelName);
    return channel.getPresence();
  }
  onPresence(channelName, callback) {
    const channel = this.channel(channelName);
    const state = this.handlers[channelName] ??= {
      msgHandlers: /* @__PURE__ */ new Set(),
      presHandlers: /* @__PURE__ */ new Set(),
      subscribed: false
    };
    state.presHandlers.add(callback);
    const presenceUnsub = channel.onPresence(callback);
    return () => {
      presenceUnsub();
      state.presHandlers.delete(callback);
      if (state.msgHandlers.size === 0 && state.presHandlers.size === 0) {
        channel.unsubscribe();
        delete this.handlers[channelName];
      }
    };
  }
  /**
   * Get the number of active WebSocket connections (should always be 0 or 1)
   */
  getConnectionCount() {
    return this.connection.isReady() ? 1 : 0;
  }
  /**
   * Get the number of active channels
   */
  getChannelCount() {
    return this.connection.getChannelCount();
  }
};
var BlinkNotificationsImpl = class {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }
  /**
   * Sends an email using the Blink Notifications API.
   *
   * @param params - An object containing the details for the email.
   *   - `to`: The recipient's email address or an array of addresses.
   *   - `subject`: The subject line of the email.
   *   - `html`: The HTML body of the email. For best results across all email
   *             clients (like Gmail, Outlook), use inline CSS and table-based layouts.
   *   - `text`: A plain-text version of the email body (optional).
   *   - `from`: A custom sender name (e.g., "Acme Inc"). The email address will
   *             be auto-generated by the project (e.g., "noreply@project.blink-email.com").
   *   - `replyTo`: An email address for recipients to reply to (optional).
   *   - `cc`: A CC recipient's email address or an array of addresses (optional).
   *   - `bcc`: A BCC recipient's email address or an array of addresses (optional).
   *   - `attachments`: An array of objects for files to attach, each with a `url`.
   *                    The file at the URL will be fetched and attached by the server.
   *
   * @example
   * ```ts
   * // Send a simple email
   * const { success, messageId } = await blink.notifications.email({
   *   to: 'customer@example.com',
   *   subject: 'Your order has shipped!',
   *   html: '<h1>Order Confirmation</h1><p>Your order #12345 is on its way.</p>'
   * });
   *
   * // Send an email with attachments and a custom from name
   * const { success } = await blink.notifications.email({
   *   to: ['team@example.com', 'manager@example.com'],
   *   subject: 'New Invoice',
   *   from: 'Blink Invoicing',
   *   html: '<p>Please find the invoice attached.</p>',
   *   attachments: [
   *     { url: 'https://example.com/invoice.pdf', filename: 'invoice.pdf' }
   *   ]
   * });
   * ```
   *
   * @returns A promise that resolves with an object containing the status of the email send.
   *   - `success`: A boolean indicating if the email was sent successfully.
   *   - `messageId`: The unique ID of the message from the email provider.
   */
  async email(params) {
    try {
      if (!params.to || !params.subject || !params.html && !params.text) {
        throw new BlinkNotificationsError('The "to", "subject", and either "html" or "text" fields are required.');
      }
      const response = await this.httpClient.post(`/api/notifications/${this.httpClient.projectId}/email`, params);
      if (!response.data || typeof response.data.success !== "boolean") {
        throw new BlinkNotificationsError("Invalid response from email API");
      }
      return response.data;
    } catch (error) {
      if (error instanceof BlinkNotificationsError) {
        throw error;
      }
      const errorMessage = error.response?.data?.error?.message || error.message || "An unknown error occurred";
      throw new BlinkNotificationsError(`Failed to send email: ${errorMessage}`, error.response?.status, error.response?.data?.error);
    }
  }
};
var SESSION_DURATION = 30 * 60 * 1e3;
var MAX_BATCH_SIZE = 10;
var BATCH_TIMEOUT = 3e3;
var MAX_STRING_LENGTH = 256;
var BlinkAnalyticsImpl = class {
  httpClient;
  projectId;
  queue = [];
  timer = null;
  enabled = true;
  userId = null;
  userEmail = null;
  hasTrackedPageview = false;
  utmParams = {};
  persistedAttribution = {};
  constructor(httpClient, projectId) {
    this.httpClient = httpClient;
    this.projectId = projectId;
    if (!isWeb) {
      this.enabled = false;
      return;
    }
    if (navigator.doNotTrack === "1") {
      this.enabled = false;
      return;
    }
    this.loadPersistedAttribution();
    this.captureUTMParams();
    this.loadQueue();
    if (typeof window !== "undefined" && window.__BLINK_ANALYTICS_PRESENT) {
      this.hasTrackedPageview = true;
    }
    this.trackPageview();
    this.setupRouteChangeListener();
    this.setupUnloadListener();
  }
  /**
   * Generate project-scoped storage key for analytics
   */
  getStorageKey(suffix) {
    return `blinkAnalytics${suffix}_${this.projectId}`;
  }
  /**
   * Log a custom analytics event
   */
  log(eventName, data = {}) {
    if (!this.enabled || !isWeb) {
      return;
    }
    const event = this.buildEvent(eventName, data);
    this.enqueue(event);
  }
  /**
   * Disable analytics tracking
   */
  disable() {
    this.enabled = false;
    this.clearTimer();
  }
  /**
   * Cleanup analytics instance (remove from global tracking)
   */
  destroy() {
    this.disable();
    if (typeof window !== "undefined") {
      window.__blinkAnalyticsInstances?.delete(this);
    }
  }
  /**
   * Enable analytics tracking
   */
  enable() {
    this.enabled = true;
  }
  /**
   * Check if analytics is enabled
   */
  isEnabled() {
    return this.enabled;
  }
  /**
   * Set the user ID for analytics events
   */
  setUserId(userId) {
    this.userId = userId;
  }
  /**
   * Set the user email for analytics events
   */
  setUserEmail(email) {
    this.userEmail = email;
  }
  /**
   * Clear persisted attribution data
   */
  clearAttribution() {
    this.persistedAttribution = {};
    try {
      localStorage.removeItem(this.getStorageKey("Attribution"));
    } catch {
    }
  }
  // Private methods
  buildEvent(type, data = {}) {
    const sessionId = this.getOrCreateSessionId();
    const channel = this.detectChannel();
    return {
      type,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      project_id: this.projectId,
      user_id: this.userId,
      user_email: this.userEmail,
      session_id: sessionId,
      pathname: getLocationPathname(),
      referrer: getDocumentReferrer(),
      screen_width: getWindowInnerWidth(),
      channel,
      utm_source: this.utmParams.utm_source || this.persistedAttribution.utm_source || null,
      utm_medium: this.utmParams.utm_medium || this.persistedAttribution.utm_medium || null,
      utm_campaign: this.utmParams.utm_campaign || this.persistedAttribution.utm_campaign || null,
      utm_content: this.utmParams.utm_content || this.persistedAttribution.utm_content || null,
      utm_term: this.utmParams.utm_term || this.persistedAttribution.utm_term || null,
      ...this.sanitizeData(data)
    };
  }
  sanitizeData(data) {
    if (typeof data === "string") {
      return data.length > MAX_STRING_LENGTH ? data.slice(0, MAX_STRING_LENGTH - 3) + "..." : data;
    }
    if (typeof data === "object" && data !== null) {
      const result = {};
      for (const key in data) {
        result[key] = this.sanitizeData(data[key]);
      }
      return result;
    }
    return data;
  }
  enqueue(event) {
    this.queue.push(event);
    this.persistQueue();
    if (this.queue.length >= MAX_BATCH_SIZE) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), BATCH_TIMEOUT);
    }
  }
  async flush() {
    this.clearTimer();
    if (this.queue.length === 0) {
      return;
    }
    const events = this.queue.slice(0, MAX_BATCH_SIZE);
    this.queue = this.queue.slice(MAX_BATCH_SIZE);
    this.persistQueue();
    try {
      await this.httpClient.post(`/api/analytics/${this.projectId}/log`, { events });
    } catch (error) {
      this.queue = [...events, ...this.queue];
      this.persistQueue();
    }
    if (this.queue.length > 0) {
      this.timer = setTimeout(() => this.flush(), BATCH_TIMEOUT);
    }
  }
  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
  getOrCreateSessionId() {
    try {
      const stored = localStorage.getItem(this.getStorageKey("Session"));
      if (stored) {
        const session = JSON.parse(stored);
        const now = Date.now();
        if (now - session.lastActivityAt > SESSION_DURATION) {
          return this.createNewSession();
        }
        session.lastActivityAt = now;
        localStorage.setItem(this.getStorageKey("Session"), JSON.stringify(session));
        return session.id;
      }
      return this.createNewSession();
    } catch {
      return null;
    }
  }
  createNewSession() {
    const now = Date.now();
    const randomId = Math.random().toString(36).substring(2, 10);
    const session = {
      id: `sess_${now}_${randomId}`,
      startedAt: now,
      lastActivityAt: now
    };
    try {
      localStorage.setItem(this.getStorageKey("Session"), JSON.stringify(session));
    } catch {
    }
    return session.id;
  }
  loadQueue() {
    try {
      const stored = localStorage.getItem(this.getStorageKey("Queue"));
      if (stored) {
        this.queue = JSON.parse(stored);
        if (this.queue.length > 0) {
          this.timer = setTimeout(() => this.flush(), BATCH_TIMEOUT);
        }
      }
    } catch {
      this.queue = [];
    }
  }
  persistQueue() {
    try {
      if (this.queue.length === 0) {
        localStorage.removeItem(this.getStorageKey("Queue"));
      } else {
        localStorage.setItem(this.getStorageKey("Queue"), JSON.stringify(this.queue));
      }
    } catch {
    }
  }
  trackPageview() {
    if (!this.hasTrackedPageview) {
      this.log("pageview");
      this.hasTrackedPageview = true;
    }
  }
  setupRouteChangeListener() {
    if (!isWeb) return;
    if (!window.__blinkAnalyticsSetup) {
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
      const analyticsInstances = /* @__PURE__ */ new Set();
      window.__blinkAnalyticsInstances = analyticsInstances;
      history.pushState = (...args) => {
        originalPushState.apply(history, args);
        analyticsInstances.forEach((instance) => {
          if (instance.isEnabled()) {
            instance.log("pageview");
          }
        });
      };
      history.replaceState = (...args) => {
        originalReplaceState.apply(history, args);
        analyticsInstances.forEach((instance) => {
          if (instance.isEnabled()) {
            instance.log("pageview");
          }
        });
      };
      window.addEventListener("popstate", () => {
        analyticsInstances.forEach((instance) => {
          if (instance.isEnabled()) {
            instance.log("pageview");
          }
        });
      });
      window.__blinkAnalyticsSetup = true;
    }
    window.__blinkAnalyticsInstances?.add(this);
  }
  setupUnloadListener() {
    if (!isWeb || !hasWindow()) return;
    window.addEventListener("pagehide", () => {
      this.flush();
    });
    window.addEventListener("unload", () => {
      this.flush();
    });
  }
  captureUTMParams() {
    if (!isWeb) return;
    const search = getLocationSearch();
    if (!search) {
      this.utmParams = {};
      return;
    }
    const urlParams = new URLSearchParams(search);
    this.utmParams = {
      utm_source: urlParams.get("utm_source"),
      utm_medium: urlParams.get("utm_medium"),
      utm_campaign: urlParams.get("utm_campaign"),
      utm_content: urlParams.get("utm_content"),
      utm_term: urlParams.get("utm_term")
    };
    const hasNewParams = Object.values(this.utmParams).some((v) => v !== null);
    if (hasNewParams) {
      this.persistAttribution();
    }
  }
  loadPersistedAttribution() {
    try {
      const stored = localStorage.getItem(this.getStorageKey("Attribution"));
      if (stored) {
        this.persistedAttribution = JSON.parse(stored);
      }
    } catch {
      this.persistedAttribution = {};
    }
  }
  persistAttribution() {
    try {
      const attribution = {
        ...this.persistedAttribution,
        ...Object.fromEntries(
          Object.entries(this.utmParams).filter(([_, v]) => v !== null)
        )
      };
      localStorage.setItem(this.getStorageKey("Attribution"), JSON.stringify(attribution));
      this.persistedAttribution = attribution;
    } catch {
    }
  }
  detectChannel() {
    const referrer = getDocumentReferrer();
    const utmMedium = this.utmParams.utm_medium;
    this.utmParams.utm_source;
    if (utmMedium) {
      if (utmMedium === "cpc" || utmMedium === "ppc") return "Paid Search";
      if (utmMedium === "email") return "Email";
      if (utmMedium === "social") return "Social";
      if (utmMedium === "referral") return "Referral";
      if (utmMedium === "display") return "Display";
      if (utmMedium === "affiliate") return "Affiliate";
    }
    if (!referrer) return "Direct";
    try {
      const referrerUrl = new URL(referrer);
      const referrerDomain = referrerUrl.hostname.toLowerCase();
      if (/google\.|bing\.|yahoo\.|duckduckgo\.|baidu\.|yandex\./.test(referrerDomain)) {
        return "Organic Search";
      }
      if (/facebook\.|twitter\.|linkedin\.|instagram\.|youtube\.|tiktok\.|reddit\./.test(referrerDomain)) {
        return "Social";
      }
      if (/mail\.|outlook\.|gmail\./.test(referrerDomain)) {
        return "Email";
      }
      return "Referral";
    } catch {
      return "Direct";
    }
  }
};
var BlinkConnectorsImpl = class {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }
  async status(provider, options) {
    const response = await this.httpClient.connectorStatus(provider);
    return response.data;
  }
  async execute(provider, request) {
    const response = await this.httpClient.connectorExecute(provider, request);
    return response.data;
  }
  async saveApiKey(provider, request) {
    const response = await this.httpClient.connectorSaveApiKey(provider, request);
    return response.data;
  }
};
var BlinkFunctionsImpl = class {
  httpClient;
  projectId;
  constructor(httpClient, projectId, _getToken) {
    this.httpClient = httpClient;
    this.projectId = projectId;
  }
  /**
   * Get the project suffix from the full project ID.
   * Project IDs are formatted as: prj_xxxxx
   * The suffix is the last 8 characters used in function URLs.
   */
  getProjectSuffix() {
    return this.projectId.slice(-8);
  }
  /**
   * Build the full function URL
   */
  buildFunctionUrl(functionSlug, searchParams) {
    const suffix = this.getProjectSuffix();
    const baseUrl = `https://${suffix}--${functionSlug}.functions.blink.new`;
    if (!searchParams || Object.keys(searchParams).length === 0) {
      return baseUrl;
    }
    const url = new URL(baseUrl);
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return url.toString();
  }
  async invoke(functionSlug, options = {}) {
    const { method = "POST", body, headers = {}, searchParams } = options;
    const url = this.buildFunctionUrl(functionSlug, searchParams);
    const res = await this.httpClient.request(url, { method, body, headers });
    return { data: res.data, status: res.status, headers: res.headers };
  }
};
function removeUndefined(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== void 0)
  );
}
function convertCollection(api) {
  return {
    id: api.id,
    name: api.name,
    description: api.description,
    embeddingModel: api.embedding_model,
    embeddingDimensions: api.embedding_dimensions,
    indexMetric: api.index_metric,
    chunkMaxTokens: api.chunk_max_tokens,
    chunkOverlapTokens: api.chunk_overlap_tokens,
    documentCount: api.document_count,
    chunkCount: api.chunk_count,
    shared: api.shared,
    createdAt: api.created_at,
    updatedAt: api.updated_at
  };
}
function convertDocument(api) {
  return {
    id: api.id,
    collectionId: api.collection_id,
    filename: api.filename,
    sourceType: api.source_type,
    sourceUrl: api.source_url,
    contentType: api.content_type,
    fileSize: api.file_size,
    status: api.status,
    errorMessage: api.error_message,
    processingStartedAt: api.processing_started_at,
    processingCompletedAt: api.processing_completed_at,
    chunkCount: api.chunk_count,
    tokenCount: api.token_count,
    metadata: api.metadata,
    createdAt: api.created_at,
    updatedAt: api.updated_at
  };
}
function convertPartialDocument(api, options) {
  let sourceType = "text";
  if (options.url) sourceType = "url";
  if (options.file) sourceType = "file";
  return {
    id: api.id || "",
    collectionId: api.collection_id || options.collectionId || "",
    filename: api.filename || options.filename,
    sourceType: api.source_type || sourceType,
    sourceUrl: api.source_url ?? options.url ?? null,
    contentType: api.content_type ?? options.file?.contentType ?? null,
    fileSize: api.file_size ?? null,
    status: api.status || "pending",
    errorMessage: api.error_message ?? null,
    processingStartedAt: api.processing_started_at ?? null,
    processingCompletedAt: api.processing_completed_at ?? null,
    chunkCount: api.chunk_count ?? 0,
    tokenCount: api.token_count ?? null,
    metadata: api.metadata || options.metadata || {},
    createdAt: api.created_at || (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: api.updated_at || api.created_at || (/* @__PURE__ */ new Date()).toISOString()
  };
}
function convertSearchResult(api) {
  return {
    chunkId: api.chunk_id,
    documentId: api.document_id,
    filename: api.filename,
    content: api.content,
    score: api.score,
    chunkIndex: api.chunk_index,
    metadata: api.metadata
  };
}
function convertSearchResponse(api) {
  return {
    results: api.results.map(convertSearchResult),
    query: api.query,
    collectionId: api.collection_id,
    totalResults: api.total_results
  };
}
function convertAISearchSource(api) {
  return {
    documentId: api.document_id,
    filename: api.filename,
    chunkId: api.chunk_id,
    excerpt: api.excerpt,
    score: api.score
  };
}
function convertAISearchResult(api) {
  return {
    answer: api.answer,
    sources: api.sources.map(convertAISearchSource),
    query: api.query,
    model: api.model,
    usage: {
      inputTokens: api.usage.input_tokens,
      outputTokens: api.usage.output_tokens
    }
  };
}
var BlinkRAGImpl = class {
  constructor(httpClient) {
    this.httpClient = httpClient;
    this.projectId = httpClient.projectId;
  }
  projectId;
  /**
   * Build URL with project_id prefix
   */
  url(path) {
    return `/api/rag/${this.projectId}${path}`;
  }
  // ============================================================================
  // Collections
  // ============================================================================
  /**
   * Create a new RAG collection
   */
  async createCollection(options) {
    const body = removeUndefined({
      name: options.name,
      description: options.description,
      embedding_model: options.embeddingModel,
      embedding_dimensions: options.embeddingDimensions,
      index_metric: options.indexMetric,
      chunk_max_tokens: options.chunkMaxTokens,
      chunk_overlap_tokens: options.chunkOverlapTokens,
      shared: options.shared
    });
    const response = await this.httpClient.post(this.url("/collections"), body);
    return convertCollection(response.data);
  }
  /**
   * List all collections accessible to the current user
   */
  async listCollections() {
    const response = await this.httpClient.get(this.url("/collections"));
    return response.data.collections.map(convertCollection);
  }
  /**
   * Get a specific collection by ID
   */
  async getCollection(collectionId) {
    const response = await this.httpClient.get(this.url(`/collections/${collectionId}`));
    return convertCollection(response.data);
  }
  /**
   * Delete a collection and all its documents
   */
  async deleteCollection(collectionId) {
    await this.httpClient.delete(this.url(`/collections/${collectionId}`));
  }
  // ============================================================================
  // Documents
  // ============================================================================
  /**
   * Upload a document for processing
   * 
   * @example
   * // Upload text content
   * const doc = await blink.rag.upload({
   *   collectionName: 'docs',
   *   filename: 'notes.txt',
   *   content: 'My document content...'
   * })
   * 
   * @example
   * // Upload from URL
   * const doc = await blink.rag.upload({
   *   collectionId: 'col_abc123',
   *   filename: 'article.html',
   *   url: 'https://example.com/article'
   * })
   * 
   * @example
   * // Upload a file (base64)
   * const doc = await blink.rag.upload({
   *   collectionName: 'docs',
   *   filename: 'report.pdf',
   *   file: { data: base64Data, contentType: 'application/pdf' }
   * })
   */
  async upload(options) {
    if (!options.collectionId && !options.collectionName) {
      throw new Error("collectionId or collectionName is required");
    }
    const body = removeUndefined({
      collection_id: options.collectionId,
      collection_name: options.collectionName,
      filename: options.filename,
      content: options.content,
      url: options.url,
      metadata: options.metadata
    });
    if (options.file) {
      body.file = {
        data: options.file.data,
        content_type: options.file.contentType
      };
    }
    const response = await this.httpClient.post(this.url("/documents"), body);
    return convertPartialDocument(response.data, options);
  }
  /**
   * Get document status and metadata
   */
  async getDocument(documentId) {
    const response = await this.httpClient.get(this.url(`/documents/${documentId}`));
    return convertDocument(response.data);
  }
  /**
   * List documents, optionally filtered by collection or status
   */
  async listDocuments(options) {
    const params = {};
    if (options?.collectionId) params.collection_id = options.collectionId;
    if (options?.status) params.status = options.status;
    const queryString = Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : "";
    const response = await this.httpClient.get(
      this.url(`/documents${queryString}`)
    );
    return response.data.documents.map(convertDocument);
  }
  /**
   * Delete a document and its chunks
   */
  async deleteDocument(documentId) {
    await this.httpClient.delete(this.url(`/documents/${documentId}`));
  }
  /**
   * Wait for a document to finish processing
   * 
   * @example
   * const doc = await blink.rag.upload({ ... })
   * const readyDoc = await blink.rag.waitForReady(doc.id)
   * console.log(`Processed ${readyDoc.chunkCount} chunks`)
   */
  async waitForReady(documentId, options) {
    const { timeoutMs = 12e4, pollIntervalMs = 2e3 } = options || {};
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const doc = await this.getDocument(documentId);
      if (doc.status === "ready") {
        return doc;
      }
      if (doc.status === "error") {
        throw new Error(`Document processing failed: ${doc.errorMessage}`);
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
    throw new Error(`Document processing timeout after ${timeoutMs}ms`);
  }
  // ============================================================================
  // Search
  // ============================================================================
  /**
   * Search for similar chunks using vector similarity
   * 
   * @example
   * const results = await blink.rag.search({
   *   collectionName: 'docs',
   *   query: 'How do I configure authentication?',
   *   maxResults: 5
   * })
   */
  async search(options) {
    if (!options.collectionId && !options.collectionName) {
      throw new Error("collectionId or collectionName is required");
    }
    const body = removeUndefined({
      collection_id: options.collectionId,
      collection_name: options.collectionName,
      query: options.query,
      max_results: options.maxResults,
      score_threshold: options.scoreThreshold,
      filters: options.filters,
      include_content: options.includeContent
    });
    const response = await this.httpClient.post(this.url("/search"), body);
    return convertSearchResponse(response.data);
  }
  async aiSearch(options) {
    if (!options.collectionId && !options.collectionName) {
      throw new Error("collectionId or collectionName is required");
    }
    const body = removeUndefined({
      collection_id: options.collectionId,
      collection_name: options.collectionName,
      query: options.query,
      model: options.model,
      max_context_chunks: options.maxContextChunks,
      score_threshold: options.scoreThreshold,
      system_prompt: options.systemPrompt,
      stream: options.stream
    });
    if (options.stream) {
      const response2 = await this.httpClient.ragAiSearchStream(body, options.signal);
      return response2.body;
    }
    const response = await this.httpClient.post(this.url("/ai-search"), body);
    return convertAISearchResult(response.data);
  }
};
var SandboxConnectionError = class extends Error {
  sandboxId;
  constructor(sandboxId, cause) {
    super(`Failed to connect to sandbox ${sandboxId}`);
    this.name = "SandboxConnectionError";
    this.sandboxId = sandboxId;
    if (cause) {
      this.cause = cause;
    }
  }
};
var SandboxImpl = class {
  constructor(id, template, hostPattern) {
    this.id = id;
    this.template = template;
    this.hostPattern = hostPattern;
  }
  getHost(port) {
    return this.hostPattern.replace("{port}", String(port));
  }
};
var MAX_RETRIES = 3;
var INITIAL_RETRY_DELAY_MS = 250;
var BlinkSandboxImpl = class {
  constructor(httpClient) {
    this.httpClient = httpClient;
    this.projectId = httpClient.projectId;
  }
  projectId;
  /**
   * Build URL with project_id prefix
   */
  url(path) {
    return `/api/sandbox/${this.projectId}${path}`;
  }
  async create(options = {}) {
    const body = {
      template: options.template,
      timeout_ms: options.timeoutMs,
      metadata: options.metadata,
      secrets: options.secrets
    };
    const response = await this.httpClient.post(this.url("/create"), body);
    const { id, template, host_pattern } = response.data;
    return new SandboxImpl(id, template, host_pattern);
  }
  async connect(sandboxId, options = {}) {
    let lastError;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const body = {
          sandbox_id: sandboxId,
          timeout_ms: options.timeoutMs
        };
        const response = await this.httpClient.post(this.url("/connect"), body);
        const { id, template, host_pattern } = response.data;
        return new SandboxImpl(id, template, host_pattern);
      } catch (error) {
        console.error(`[Sandbox] Connect attempt ${attempt + 1} failed:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        if (lastError.message.includes("404") || lastError.message.includes("not found") || lastError.message.includes("unauthorized")) {
          throw new SandboxConnectionError(sandboxId, lastError);
        }
        if (attempt < MAX_RETRIES - 1) {
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    console.error(`[Sandbox] All ${MAX_RETRIES} connection attempts failed for sandbox ${sandboxId}`);
    throw new SandboxConnectionError(sandboxId, lastError);
  }
  async kill(sandboxId) {
    await this.httpClient.post(this.url("/kill"), { sandbox_id: sandboxId });
  }
};
var defaultClient = null;
function getDefaultClient() {
  if (!defaultClient) {
    throw new Error(
      "No Blink client initialized. Call createClient() first before using Agent or other SDK features."
    );
  }
  return defaultClient;
}
function _getDefaultHttpClient() {
  return getDefaultClient()._httpClient;
}
var BlinkClientImpl = class {
  auth;
  db;
  storage;
  ai;
  data;
  realtime;
  notifications;
  analytics;
  connectors;
  functions;
  rag;
  sandbox;
  /** @internal HTTP client for Agent auto-binding */
  _httpClient;
  constructor(config) {
    if ((config.secretKey || config.serviceToken) && isBrowser) {
      throw new Error("secretKey/serviceToken is server-only. Do not provide it in browser/React Native clients.");
    }
    this.auth = new BlinkAuth(config);
    this._httpClient = new HttpClient(
      config,
      () => this.auth.getToken(),
      () => this.auth.getValidToken()
    );
    this.db = new BlinkDatabase(this._httpClient);
    this.storage = new BlinkStorageImpl(this._httpClient);
    this.ai = new BlinkAIImpl(this._httpClient);
    this.data = new BlinkDataImpl(this._httpClient, config.projectId);
    this.realtime = new BlinkRealtimeImpl(this._httpClient, config.projectId);
    this.notifications = new BlinkNotificationsImpl(this._httpClient);
    this.analytics = new BlinkAnalyticsImpl(this._httpClient, config.projectId);
    this.connectors = new BlinkConnectorsImpl(this._httpClient);
    this.functions = new BlinkFunctionsImpl(
      this._httpClient,
      config.projectId,
      () => this.auth.getValidToken()
    );
    this.rag = new BlinkRAGImpl(this._httpClient);
    this.sandbox = new BlinkSandboxImpl(this._httpClient);
    this.auth.onAuthStateChanged((state) => {
      if (state.isAuthenticated && state.user) {
        this.analytics.setUserId(state.user.id);
        this.analytics.setUserEmail(state.user.email);
      } else {
        this.analytics.setUserId(null);
        this.analytics.setUserEmail(null);
      }
    });
  }
};
function createClient(config) {
  if (!config.projectId) {
    throw new Error("projectId is required");
  }
  const client = new BlinkClientImpl(config);
  defaultClient = client;
  return client;
}

// .blink-cf-build/web-push.ts
var encoder = new TextEncoder();
function b64url(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function b64urlDecode(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "=".repeat((4 - s.length % 4) % 4);
  const bin = atob(s + pad);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}
function concat(...arrs) {
  const len = arrs.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const a of arrs) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}
async function importVapidKeys(privateKeyB64, publicKeyB64) {
  const rawPrivate = b64urlDecode(privateKeyB64);
  const rawPublic = b64urlDecode(publicKeyB64);
  const x = b64url(rawPublic.slice(1, 33));
  const y = b64url(rawPublic.slice(33, 65));
  const d = b64url(rawPrivate);
  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y, d },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  return { privateKey: key, publicKeyRaw: rawPublic };
}
async function createVapidHeaders(endpoint, vapidSubject, vapidPrivateKeyB64, vapidPublicKeyB64) {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const headerB64 = b64url(
    encoder.encode(JSON.stringify({ typ: "JWT", alg: "ES256" }))
  );
  const payloadB64 = b64url(
    encoder.encode(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1e3) + 12 * 60 * 60,
        sub: vapidSubject
      })
    )
  );
  const { privateKey, publicKeyRaw } = await importVapidKeys(
    vapidPrivateKeyB64,
    vapidPublicKeyB64
  );
  const sigInput = encoder.encode(`${headerB64}.${payloadB64}`);
  const sigRaw = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    sigInput
  );
  const sigBytes = new Uint8Array(sigRaw);
  const jwt = `${headerB64}.${payloadB64}.${b64url(sigBytes)}`;
  return {
    authorization: `vapid t=${jwt}, k=${b64url(publicKeyRaw)}`,
    cryptoKeyHeader: `p256ecdsa=${b64url(publicKeyRaw)}`
  };
}
async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey(
    "raw",
    salt.length ? salt : new Uint8Array(32),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const prk = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, ikm)
  );
  const prkKey = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const infoWithCounter = concat(info, new Uint8Array([1]));
  const okm = new Uint8Array(
    await crypto.subtle.sign("HMAC", prkKey, infoWithCounter)
  );
  return okm.slice(0, length);
}
async function encryptPayload(payload, subscriptionP256dhB64, subscriptionAuthB64) {
  const subscriberPublicKey = b64urlDecode(subscriptionP256dhB64);
  const subscriberAuth = b64urlDecode(subscriptionAuthB64);
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );
  const subscriberKey = await crypto.subtle.importKey(
    "raw",
    subscriberPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: subscriberKey },
      localKeyPair.privateKey,
      256
    )
  );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const ikmInfo = concat(
    encoder.encode("WebPush: info\0"),
    subscriberPublicKey,
    localPublicKeyRaw
  );
  const ikm = await hkdf(subscriberAuth, sharedSecret, ikmInfo, 32);
  const cekInfo = encoder.encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = encoder.encode("Content-Encoding: nonce\0");
  const cek = await hkdf(salt, ikm, cekInfo, 16);
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);
  const plaintextBytes = encoder.encode(payload);
  const padded = concat(plaintextBytes, new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey(
    "raw",
    cek,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      aesKey,
      padded
    )
  );
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  const idLen = new Uint8Array([65]);
  const ciphertext = concat(salt, rs, idLen, localPublicKeyRaw, encrypted);
  return { ciphertext, localPublicKey: localPublicKeyRaw, salt };
}
async function sendWebPush(subscription, payload, vapid) {
  try {
    const { authorization } = await createVapidHeaders(
      subscription.endpoint,
      vapid.subject,
      vapid.privateKey,
      vapid.publicKey
    );
    const { ciphertext } = await encryptPayload(
      payload,
      subscription.p256dh,
      subscription.auth
    );
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1e4);
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        TTL: "86400",
        Urgency: "normal"
      },
      body: ciphertext,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return {
      endpoint: subscription.endpoint,
      success: response.status >= 200 && response.status < 300,
      status: response.status
    };
  } catch (err) {
    return {
      endpoint: subscription.endpoint,
      success: false,
      error: err?.message ?? "push send failed"
    };
  }
}

// .blink-cf-build/index.ts
var app = new Hono2();
app.use("*", cors());
function getBlink(env) {
  return createClient({
    projectId: env.BLINK_PROJECT_ID,
    secretKey: env.BLINK_SECRET_KEY
  });
}
function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function buildGoogleCalUrl(entry) {
  const title = "Breath Group - " + entry.name + " (" + (entry.role === "breather" ? "Breather" : "Sitter") + ")";
  const start = entry.date.replace(/-/g, "") + "T" + entry.startTime.replace(/:/g, "") + "00";
  const end = entry.date.replace(/-/g, "") + "T" + entry.endTime.replace(/:/g, "") + "00";
  const details = "Role: " + (entry.role === "breather" ? "Breather" : "Sitter") + (entry.notes ? "\nNotes: " + entry.notes : "") + "\n\nScheduled via Breath Group";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: start + "/" + end,
    details,
    ctz: entry.timezone || "UTC"
  });
  return "https://calendar.google.com/calendar/render?" + params.toString();
}
function buildEmailHtml(p) {
  function fmtTime(t) {
    const parts = t.split(":");
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return h12 + ":" + (m < 10 ? "0" + m : "" + m) + " " + ampm;
  }
  function fmtDate(d) {
    const dt = /* @__PURE__ */ new Date(d + "T00:00:00");
    return dt.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }
  let entryHtml = "";
  if (p.entry) {
    const roleColor = p.entry.role === "breather" ? "#CC5A28" : "#4B8661";
    const roleLabel = p.entry.role === "breather" ? "Breather" : "Sitter";
    let attendeesHtml = "";
    if (p.attendees && p.attendees.length > 0) {
      const listItems = p.attendees.map(
        (a) => '<li style="padding:3px 0;color:#7C6B5D;font-size:12px;">&#8226; ' + a.name + "</li>"
      ).join("");
      attendeesHtml = '<tr><td style="padding-top:10px;"><p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#B8A99A;">Breathers attending (' + p.attendees.length + ')</p><ul style="margin:0;padding:0;list-style:none;">' + listItems + "</ul></td></tr>";
    } else if (p.entry.role === "sitter") {
      attendeesHtml = '<tr><td style="padding-top:10px;"><p style="margin:0;font-size:12px;color:#B8A99A;font-style:italic;">No breathers have joined yet.</p></td></tr>';
    }
    entryHtml = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr><td style="background:#F6ECE0;border-radius:8px;padding:16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding-bottom:8px;"><span style="display:inline-block;background:' + roleColor + ';color:#fff;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;padding:3px 10px;border-radius:12px;">' + roleLabel + '</span></td></tr><tr><td style="color:#4B3B30;font-size:15px;font-weight:600;padding-bottom:4px;">' + p.entry.name + '</td></tr><tr><td style="color:#7C6B5D;font-size:13px;">&#128197; ' + fmtDate(p.entry.date) + "<br/>&#128336; " + fmtTime(p.entry.startTime) + " - " + fmtTime(p.entry.endTime) + "</td></tr>" + (p.entry.notes ? '<tr><td style="color:#7C6B5D;font-size:12px;padding-top:6px;font-style:italic;">' + p.entry.notes + "</td></tr>" : "") + attendeesHtml + "</table></td></tr></table>";
  }
  let viewBtn = "";
  if (p.viewUrl) {
    viewBtn = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;"><tr><td align="center"><a href="' + p.viewUrl + '" target="_blank" rel="noopener" style="display:inline-block;background:#CC5A28;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:10px 24px;border-radius:8px;">&#128279; View Session</a></td></tr></table>';
  }
  let calBtn = "";
  if (p.calendarUrl) {
    calBtn = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;"><tr><td align="center"><a href="' + p.calendarUrl + '" target="_blank" rel="noopener" style="display:inline-block;background:#4B8661;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:10px 24px;border-radius:8px;">&#128197; Add to Google Calendar</a></td></tr></table>';
  }
  return '<div style="font-family:DM Sans,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#CC5A28;padding:24px 28px;border-radius:10px 10px 0 0;"><span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.01em;">&#127788;&#65039; Breath Group</span></td></tr><tr><td style="background:#FBF8F4;padding:28px;border:1px solid #F6ECE0;border-top:none;border-radius:0 0 10px 10px;"><p style="color:#4B3B30;font-size:15px;line-height:1.65;margin:0 0 4px;">' + p.message + "</p>" + entryHtml + viewBtn + calBtn + `<p style="color:#B8A99A;font-size:12px;line-height:1.5;margin:20px 0 0;padding-top:16px;border-top:1px solid #F0E6D9;">You're receiving this because you're a member of Breath Group.</p></td></tr></table></div>`;
}
function buildPasswordResetEmail(resetUrl) {
  return '<div style="font-family:DM Sans,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#CC5A28;padding:24px 28px;border-radius:10px 10px 0 0;"><span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.01em;">&#127788;&#65039; Breath Group</span></td></tr><tr><td style="background:#FBF8F4;padding:28px;border:1px solid #F6ECE0;border-top:none;border-radius:0 0 10px 10px;"><p style="color:#4B3B30;font-size:15px;line-height:1.65;margin:0 0 20px;">We received a request to reset the password for your Breath Group account. Click the button below to choose a new password.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td align="center"><a href="' + resetUrl + '" target="_blank" rel="noopener" style="display:inline-block;background:#CC5A28;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">&#128273; Reset Password</a></td></tr></table><p style="color:#B8A99A;font-size:12px;text-align:center;margin:0 0 20px;">This link expires in 1 hour. If you didn\u2019t request a password reset, you can safely ignore this email.</p><p style="color:#B8A99A;font-size:12px;line-height:1.5;margin:20px 0 0;padding-top:16px;border-top:1px solid #F0E6D9;">You\u2019re receiving this because you\u2019re a member of Breath Group.</p></td></tr></table></div>';
}
async function createNotification(blink, params, env = {}) {
  const notif = await blink.db.notifications.create({
    id: genId("ntf"),
    userId: params.userId,
    type: params.type,
    entryId: params.entryId ?? null,
    actorName: params.actorName,
    actorEmail: params.actorEmail ?? null,
    message: params.message,
    read: 0,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  try {
    const users = await blink.db.users.list();
    const recipient = users.find(
      (u) => u.id === params.userId
    );
    if (recipient?.email) {
      let entryData = null;
      let entryAttendees = [];
      if (params.entryId) {
        try {
          const entries = await blink.db.availabilityEntries.list();
          const found = entries.find(
            (e) => e.id === params.entryId
          );
          if (found) {
            entryData = {
              date: found.date,
              startTime: found.startTime,
              endTime: found.endTime,
              timezone: found.timezone || "UTC",
              name: found.name,
              role: found.role,
              notes: found.notes
            };
          }
        } catch (_e) {
        }
        try {
          const allAttendees = await blink.db.sessionAttendees.list();
          entryAttendees = allAttendees.filter((a) => a.entryId === params.entryId).map((a) => ({ name: a.name, email: a.email }));
        } catch (_e) {
        }
      }
      const appBaseUrl = "https://breath-scheduler.blinkpowered.com";
      const viewUrl = params.entryId ? `${appBaseUrl}/?entry=${params.entryId}` : null;
      const showCalendar = entryData && params.type !== "attendee_left";
      const calendarUrl = showCalendar ? buildGoogleCalUrl(entryData) : null;
      await sendEmail(blink, {
        to: recipient.email,
        subject: "Breath Group: " + params.message,
        html: buildEmailHtml({
          message: params.message,
          type: params.type,
          entry: entryData,
          calendarUrl,
          attendees: entryAttendees,
          viewUrl
        }),
        text: params.message,
        type: "session_event"
      });
    }
  } catch (emailErr) {
    console.error("[notify] email send failed (non-fatal)", emailErr);
  }
  try {
    await sendPushToUser(blink, params.userId, params.message, env);
  } catch (pushErr) {
    console.error("[notify] push send failed (non-fatal)", pushErr);
  }
  return notif;
}
async function sendPushToUser(blink, userId, message, env) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    console.warn("[push] VAPID keys not configured, skipping push");
    return;
  }
  const all = await blink.db.pushSubscriptions.list();
  const subs = all.filter((s) => s.userId === userId);
  if (subs.length === 0) return;
  const vapid = {
    subject: env.VAPID_SUBJECT,
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY
  };
  const payload = JSON.stringify({
    title: "Breath Group",
    body: message,
    icon: "/icon-192.png",
    badge: "/icon-192.png"
  });
  const results = await Promise.allSettled(
    subs.map(
      (sub) => sendWebPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload,
        vapid
      )
    )
  );
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled" && (r.value.status === 410 || r.value.status === 404)) {
      try {
        await blink.db.pushSubscriptions.delete(subs[i].id);
        console.log("[push] removed expired subscription", subs[i].id);
      } catch (_e) {
      }
    }
  }
}
app.get("/health", (c) => c.json({ ok: true }));
async function sendEmail(blink, params) {
  const recipients = Array.isArray(params.to) ? params.to : [params.to];
  for (const toEmail of recipients) {
    const logId = genId("eml");
    try {
      await blink.notifications.email({
        to: toEmail,
        subject: params.subject,
        html: params.html,
        text: params.text
      });
      blink.db.emailLog.create({
        id: logId,
        sentAt: (/* @__PURE__ */ new Date()).toISOString(),
        toEmail,
        subject: params.subject,
        type: params.type,
        status: "sent",
        error: null,
        memberId: params.memberId ?? null
      }).catch((e) => console.error("[email-log] log write failed", e));
    } catch (err) {
      blink.db.emailLog.create({
        id: logId,
        sentAt: (/* @__PURE__ */ new Date()).toISOString(),
        toEmail,
        subject: params.subject,
        type: params.type,
        status: "failed",
        error: String(err?.message ?? err ?? "unknown error").slice(0, 500),
        memberId: params.memberId ?? null
      }).catch((e) => console.error("[email-log] log write failed", e));
      throw err;
    }
  }
}
app.get("/api/email-log", async (c) => {
  try {
    const blink = getBlink(c.env);
    const all = await blink.db.emailLog.list({ orderBy: { sentAt: "desc" } });
    return c.json(all.slice(0, 500));
  } catch (err) {
    return c.json({ error: err?.message ?? "email log fetch failed" }, 500);
  }
});
app.get("/api/notifications", async (c) => {
  try {
    const blink = getBlink(c.env);
    const userId = c.req.query("userId");
    if (!userId) return c.json({ error: "userId required" }, 400);
    const all = await blink.db.notifications.list({
      orderBy: { createdAt: "desc" }
    });
    const filtered = all.filter(
      (n) => n.userId === userId
    );
    return c.json(filtered.slice(0, 50));
  } catch (err) {
    return c.json({ error: err?.message ?? "list notifications failed" }, 500);
  }
});
app.patch("/api/notifications/:id/read", async (c) => {
  try {
    const blink = getBlink(c.env);
    const id = c.req.param("id");
    const updated = await blink.db.notifications.update(id, { read: 1 });
    return c.json(updated);
  } catch (err) {
    return c.json({ error: err?.message ?? "mark read failed" }, 500);
  }
});
app.post("/api/notifications/mark-all-read", async (c) => {
  try {
    const blink = getBlink(c.env);
    const { userId } = await c.req.json();
    if (!userId) return c.json({ error: "userId required" }, 400);
    const all = await blink.db.notifications.list();
    const unread = all.filter((n) => n.userId === userId && Number(n.read) === 0);
    await Promise.all(
      unread.map((n) => blink.db.notifications.update(n.id, { read: 1 }))
    );
    return c.json({ ok: true, count: unread.length });
  } catch (err) {
    return c.json({ error: err?.message ?? "mark all read failed" }, 500);
  }
});
app.post("/api/entries", async (c) => {
  try {
    const blink = getBlink(c.env);
    const body = await c.req.json();
    const entry = await blink.db.availabilityEntries.create(body);
    if (body.role === "sitter" && body.date && body.startTime && body.endTime) {
      try {
        const allEntries = await blink.db.availabilityEntries.list();
        const breathers = allEntries.filter(
          (e) => e.role === "breather" && e.date === body.date && e.startTime < body.endTime && body.startTime < e.endTime && e.userId && e.userId !== body.userId
        );
        const sitterName = body.name || "Someone";
        for (const breather of breathers) {
          await createNotification(blink, {
            userId: breather.userId,
            type: "sitter_created",
            entryId: entry.id,
            actorName: sitterName,
            actorEmail: body.email,
            message: sitterName + " created a sitter session covering your breather slot on " + body.date
          }, c.env);
        }
      } catch (notifErr) {
        console.error(
          "[notify] sitter_created notification failed",
          notifErr
        );
      }
    }
    return c.json(entry);
  } catch (err) {
    return c.json({ error: err?.message ?? "create failed" }, 500);
  }
});
app.patch("/api/entries/:id", async (c) => {
  try {
    const blink = getBlink(c.env);
    const id = c.req.param("id");
    const body = await c.req.json();
    const entry = await blink.db.availabilityEntries.update(id, body);
    return c.json(entry);
  } catch (err) {
    return c.json({ error: err?.message ?? "update failed" }, 500);
  }
});
app.delete("/api/entries/:id", async (c) => {
  try {
    const blink = getBlink(c.env);
    const id = c.req.param("id");
    await blink.db.availabilityEntries.delete(id);
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: err?.message ?? "delete failed" }, 500);
  }
});
app.post("/api/attendees", async (c) => {
  try {
    const blink = getBlink(c.env);
    const body = await c.req.json();
    const attendee = await blink.db.sessionAttendees.create(body);
    try {
      const entries = await blink.db.availabilityEntries.list();
      const entry = entries.find((e) => e.id === body.entryId);
      if (entry?.userId) {
        const joinerName = body.name || "Someone";
        await createNotification(blink, {
          userId: entry.userId,
          type: "attendee_joined",
          entryId: body.entryId,
          actorName: joinerName,
          actorEmail: body.email,
          message: joinerName + " joined your sitter session on " + entry.date
        }, c.env);
      }
    } catch (notifErr) {
      console.error(
        "[notify] attendee_joined notification failed",
        notifErr
      );
    }
    return c.json(attendee);
  } catch (err) {
    return c.json(
      { error: err?.message ?? "create attendee failed" },
      500
    );
  }
});
app.delete("/api/attendees/:id", async (c) => {
  try {
    const blink = getBlink(c.env);
    const id = c.req.param("id");
    let attendeeInfo = null;
    try {
      const allAttendees = await blink.db.sessionAttendees.list();
      attendeeInfo = allAttendees.find((a) => a.id === id) ?? null;
    } catch (_e2) {
    }
    await blink.db.sessionAttendees.delete(id);
    if (attendeeInfo) {
      try {
        const entries = await blink.db.availabilityEntries.list();
        const entry = entries.find((e) => e.id === attendeeInfo.entryId);
        if (entry?.userId) {
          const leaverName = attendeeInfo.name || "Someone";
          await createNotification(blink, {
            userId: entry.userId,
            type: "attendee_left",
            entryId: attendeeInfo.entryId,
            actorName: leaverName,
            actorEmail: attendeeInfo.email,
            message: leaverName + " left your sitter session on " + entry.date
          }, c.env);
        }
      } catch (notifErr) {
        console.error(
          "[notify] attendee_left notification failed",
          notifErr
        );
      }
    }
    return c.json({ ok: true });
  } catch (err) {
    return c.json(
      { error: err?.message ?? "delete attendee failed" },
      500
    );
  }
});
app.post("/api/members", async (c) => {
  try {
    const blink = getBlink(c.env);
    const body = await c.req.json();
    const member = await blink.db.appMembers.create(body);
    return c.json(member);
  } catch (err) {
    return c.json({ error: err?.message ?? "create member failed" }, 500);
  }
});
app.patch("/api/members/:id", async (c) => {
  try {
    const blink = getBlink(c.env);
    const id = c.req.param("id");
    const body = await c.req.json();
    const member = await blink.db.appMembers.update(id, body);
    return c.json(member);
  } catch (err) {
    return c.json({ error: err?.message ?? "update member failed" }, 500);
  }
});
app.post("/api/members/:id/resend-welcome", async (c) => {
  try {
    const blink = getBlink(c.env);
    const id = c.req.param("id");
    const allMembers = await blink.db.appMembers.list();
    const member = allMembers.find((m) => m.id === id);
    if (!member) return c.json({ error: "not_found" }, 404);
    if (member.status === "blocked") return c.json({ error: "member_blocked" }, 403);
    const firstName = member.displayName ? member.displayName.split(" ")[0] : null;
    const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
    const html = buildRequestEmailHtml({
      headerText: "Welcome to Breath Group! \u{1F32C}\uFE0F",
      bodyHtml: `${greeting}<br/><br/>Your access to the Breath Group Scheduler has been confirmed! \u{1F389}<br/>You can sign in anytime to submit your availability for sessions.`,
      primaryBtnText: "Sign In Now",
      primaryBtnUrl: `${APP_BASE_URL}/`,
      footerText: "You're receiving this because you're a member of Breath Group."
    });
    const text = `${greeting}

Your access to the Breath Group Scheduler has been confirmed!

Sign in here: ${APP_BASE_URL}/

You're receiving this because you're a member of Breath Group.`;
    await sendEmail(blink, {
      to: member.email,
      subject: firstName ? `Welcome, ${firstName}! Your Breath Group access is confirmed` : "Welcome to Breath Group! Your access is confirmed",
      html,
      text,
      type: "resend_welcome",
      memberId: id
    });
    const newCount = (Number(member.welcomeEmailCount) || 0) + 1;
    await blink.db.appMembers.update(id, { welcomeEmailCount: newCount });
    return c.json({ ok: true, welcomeEmailCount: newCount });
  } catch (err) {
    console.error("[members] resend-welcome error", err);
    return c.json({ error: err?.message ?? "resend failed" }, 500);
  }
});
app.delete("/api/members/:id", async (c) => {
  try {
    const blink = getBlink(c.env);
    const id = c.req.param("id");
    const { userId } = await c.req.json().catch(() => ({}));
    if (userId) {
      const entries = await blink.db.availabilityEntries.list({
        where: { userId }
      });
      for (const entry of entries) {
        const attendees = await blink.db.sessionAttendees.list({
          where: { entryId: entry.id }
        });
        for (const a of attendees) {
          await blink.db.sessionAttendees.delete(a.id);
        }
        await blink.db.availabilityEntries.delete(entry.id);
      }
    }
    await blink.db.appMembers.delete(id);
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: err?.message ?? "delete member failed" }, 500);
  }
});
var ADMIN_EMAIL = "thierrya@breathe-today.life";
var APP_BASE_URL = "https://breathe-today.life";
var BACKEND_BASE_URL = "https://60lyovrv.backend.blink.new";
function buildRequestEmailHtml(opts) {
  const primaryBtn = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 8px;"><tr><td align="center"><a href="' + opts.primaryBtnUrl + '" target="_blank" rel="noopener" style="display:inline-block;background:#CC5A28;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">' + opts.primaryBtnText + "</a></td></tr></table>";
  const secondaryBtn = opts.secondaryBtnText && opts.secondaryBtnUrl ? '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 16px;"><tr><td align="center"><a href="' + opts.secondaryBtnUrl + '" target="_blank" rel="noopener" style="display:inline-block;background:#9E9189;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;padding:10px 24px;border-radius:8px;">' + opts.secondaryBtnText + "</a></td></tr></table>" : "";
  return '<div style="font-family:DM Sans,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#CC5A28;padding:24px 28px;border-radius:10px 10px 0 0;"><span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.01em;">\u{1F32C}\uFE0F Breath Group \u2014 ' + opts.headerText + '</span></td></tr><tr><td style="background:#FBF8F4;padding:28px;border:1px solid #F6ECE0;border-top:none;border-radius:0 0 10px 10px;"><p style="color:#4B3B30;font-size:15px;line-height:1.65;margin:0 0 12px;">' + opts.bodyHtml + "</p>" + primaryBtn + secondaryBtn + '<p style="color:#B8A99A;font-size:12px;line-height:1.5;margin:20px 0 0;padding-top:16px;border-top:1px solid #F0E6D9;">' + opts.footerText + "</p></td></tr></table></div>";
}
app.post("/api/member-requests", async (c) => {
  try {
    const blink = getBlink(c.env);
    const body = await c.req.json();
    const rawEmail = (body.email ?? "").trim();
    const firstName = (body.firstName ?? "").trim();
    const lastName = (body.lastName ?? "").trim();
    if (!rawEmail) {
      return c.json({ error: "email is required" }, 400);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(rawEmail)) {
      return c.json({ error: "invalid email format" }, 400);
    }
    const email = rawEmail.toLowerCase();
    const displayName = [firstName, lastName].filter(Boolean).join(" ") || null;
    const allMembers = await blink.db.appMembers.list();
    const existing = allMembers.find(
      (m) => m.email.toLowerCase() === email
    );
    if (existing) {
      return c.json({ error: "already_exists" }, 409);
    }
    const memberId = genId("mbr");
    const member = await blink.db.appMembers.create({
      id: memberId,
      email,
      appRole: "member",
      capabilities: "both",
      status: "requested",
      userId: null,
      displayName,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    try {
      const acceptUrl = `${BACKEND_BASE_URL}/api/member-requests/${memberId}/accept`;
      const declineUrl = `${BACKEND_BASE_URL}/api/member-requests/${memberId}/decline`;
      const nameLabel = displayName ? `<strong>${displayName}</strong> (${email})` : `<strong>${email}</strong>`;
      const html = buildRequestEmailHtml({
        headerText: "New Access Request",
        bodyHtml: nameLabel + " has requested access to the Breath Group Scheduler.",
        primaryBtnText: "\u2705 Accept Request",
        primaryBtnUrl: acceptUrl,
        secondaryBtnText: "\u274C Decline",
        secondaryBtnUrl: declineUrl,
        footerText: "You're receiving this as admin of Breath Group."
      });
      const nameText = displayName ? `${displayName} (${email})` : email;
      const text = `New access request from: ${nameText}

Accept: ${acceptUrl}
Decline: ${declineUrl}

You're receiving this as admin of Breath Group.`;
      const adminEmails = allMembers.filter((m) => m.appRole === "admin" && m.status === "active").map((m) => m.email);
      if (!adminEmails.includes(ADMIN_EMAIL)) adminEmails.push(ADMIN_EMAIL);
      await sendEmail(blink, {
        to: adminEmails,
        subject: `New access request: ${nameText}`,
        html,
        text,
        type: "access_request",
        memberId
      });
    } catch (emailErr) {
      console.error("[member-requests] admin email failed (non-fatal)", emailErr);
    }
    return c.json({ ok: true, id: member.id }, 201);
  } catch (err) {
    return c.json({ error: err?.message ?? "member request failed" }, 500);
  }
});
app.get("/api/member-requests/:id/accept", async (c) => {
  try {
    const blink = getBlink(c.env);
    const id = c.req.param("id");
    const allMembers = await blink.db.appMembers.list();
    const member = allMembers.find((m) => m.id === id);
    if (!member) {
      return c.redirect(`${APP_BASE_URL}/?request=notfound`);
    }
    if (member.status !== "requested") {
      return c.redirect(`${APP_BASE_URL}/?request=already`);
    }
    await blink.db.appMembers.update(id, { status: "active" });
    try {
      const firstName = member.displayName ? member.displayName.split(" ")[0] : null;
      const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
      const html = buildRequestEmailHtml({
        headerText: "Welcome to Breath Group! \u{1F32C}\uFE0F",
        bodyHtml: `${greeting}<br/><br/>Your access request has been approved! \u{1F389}<br/>You can now sign in to the Breath Group Scheduler and start submitting your availability for sessions.`,
        primaryBtnText: "Sign In Now",
        primaryBtnUrl: `${APP_BASE_URL}/`,
        footerText: "You're receiving this because you requested access to Breath Group."
      });
      const text = `${greeting}

Your access request has been approved!

You can now sign in to the Breath Group Scheduler:
${APP_BASE_URL}/

You're receiving this because you requested access to Breath Group.`;
      await sendEmail(blink, {
        to: member.email,
        subject: firstName ? `Welcome, ${firstName}! Your Breath Group access is approved` : "Welcome to Breath Group! Your access is approved",
        html,
        text,
        type: "welcome",
        memberId: id
      });
      const currentCount = Number(member.welcomeEmailCount) || 0;
      await blink.db.appMembers.update(id, { welcomeEmailCount: currentCount + 1 });
    } catch (emailErr) {
      console.error("[member-requests] welcome email failed (non-fatal)", emailErr);
    }
    return c.redirect(`${APP_BASE_URL}/?request=accepted`);
  } catch (err) {
    console.error("[member-requests] accept error", err);
    return c.redirect(`${APP_BASE_URL}/?request=error`);
  }
});
app.post("/api/member-requests/:id/accept", async (c) => {
  try {
    const blink = getBlink(c.env);
    const id = c.req.param("id");
    const allMembers = await blink.db.appMembers.list();
    const member = allMembers.find((m) => m.id === id);
    if (!member) {
      return c.json({ error: "not_found" }, 404);
    }
    if (member.status !== "requested") {
      return c.json({ error: "already_processed" }, 409);
    }
    await blink.db.appMembers.update(id, { status: "active" });
    try {
      const firstName = member.displayName ? member.displayName.split(" ")[0] : null;
      const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
      const html = buildRequestEmailHtml({
        headerText: "Welcome to Breath Group! \u{1F32C}\uFE0F",
        bodyHtml: `${greeting}<br/><br/>Your access request has been approved! \u{1F389}<br/>You can now sign in to the Breath Group Scheduler and start submitting your availability for sessions.`,
        primaryBtnText: "Sign In Now",
        primaryBtnUrl: `${APP_BASE_URL}/`,
        footerText: "You're receiving this because you requested access to Breath Group."
      });
      const text = `${greeting}

Your access request has been approved!

You can now sign in to the Breath Group Scheduler:
${APP_BASE_URL}/

You're receiving this because you requested access to Breath Group.`;
      await sendEmail(blink, {
        to: member.email,
        subject: firstName ? `Welcome, ${firstName}! Your Breath Group access is approved` : "Welcome to Breath Group! Your access is approved",
        html,
        text,
        type: "welcome",
        memberId: id
      });
      const currentCount = Number(member.welcomeEmailCount) || 0;
      await blink.db.appMembers.update(id, { welcomeEmailCount: currentCount + 1 });
    } catch (emailErr) {
      console.error("[member-requests] welcome email failed (non-fatal)", emailErr);
    }
    return c.json({ ok: true });
  } catch (err) {
    console.error("[member-requests] accept (POST) error", err);
    return c.json({ error: err?.message ?? "accept failed" }, 500);
  }
});
app.get("/api/member-requests/:id/decline", async (c) => {
  try {
    const blink = getBlink(c.env);
    const id = c.req.param("id");
    const allMembers = await blink.db.appMembers.list();
    const member = allMembers.find((m) => m.id === id);
    if (!member || member.status !== "requested") {
      return c.redirect(`${APP_BASE_URL}/?request=notfound`);
    }
    await blink.db.appMembers.delete(id);
    return c.redirect(`${APP_BASE_URL}/?request=declined`);
  } catch (err) {
    console.error("[member-requests] decline error", err);
    return c.redirect(`${APP_BASE_URL}/?request=error`);
  }
});
app.post("/api/push/subscribe", async (c) => {
  try {
    const blink = getBlink(c.env);
    const { userId, endpoint, p256dh, auth } = await c.req.json();
    if (!userId || !endpoint)
      return c.json({ error: "userId and endpoint required" }, 400);
    const all = await blink.db.pushSubscriptions.list();
    const existing = all.find(
      (s) => s.userId === userId && s.endpoint === endpoint
    );
    if (existing) {
      await blink.db.pushSubscriptions.update(existing.id, {
        p256dh: p256dh || "",
        auth: auth || ""
      });
      return c.json({ ok: true, id: existing.id });
    }
    const sub = await blink.db.pushSubscriptions.create({
      id: genId("push"),
      userId,
      endpoint,
      p256dh: p256dh || "",
      auth: auth || "",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    return c.json({ ok: true, id: sub.id });
  } catch (err) {
    return c.json({ error: err?.message ?? "subscribe failed" }, 500);
  }
});
app.post("/api/push/unsubscribe", async (c) => {
  try {
    const blink = getBlink(c.env);
    const { userId, endpoint } = await c.req.json();
    if (!userId || !endpoint)
      return c.json({ error: "userId and endpoint required" }, 400);
    const all = await blink.db.pushSubscriptions.list();
    const matches = all.filter(
      (s) => s.userId === userId && s.endpoint === endpoint
    );
    for (const m of matches) {
      await blink.db.pushSubscriptions.delete(m.id);
    }
    return c.json({ ok: true, deleted: matches.length });
  } catch (err) {
    return c.json({ error: err?.message ?? "unsubscribe failed" }, 500);
  }
});
app.get("/api/push/vapid-public-key", (c) => {
  const env = c.env;
  return c.json({ key: env.VAPID_PUBLIC_KEY || "" });
});
app.get("/api/analytics", async (c) => {
  try {
    const blink = getBlink(c.env);
    const [members, entries, attendees] = await Promise.all([
      blink.db.appMembers.list(),
      blink.db.availabilityEntries.list(),
      blink.db.sessionAttendees.list()
    ]);
    const memberList = members;
    const entryList = entries;
    const attendeeList = attendees;
    const totalMembers = memberList.length;
    const activeMembers = memberList.filter((m) => m.status === "active").length;
    const adminMembers = memberList.filter((m) => m.appRole === "admin").length;
    const totalSessions = entryList.length;
    const sitterSessions = entryList.filter((e) => e.role === "sitter").length;
    const breatherSessions = entryList.filter((e) => e.role === "breather").length;
    const sitterEntryIds = new Set(entryList.filter((e) => e.role === "sitter").map((e) => e.id));
    const entryIdsWithAttendees = new Set(attendeeList.map((a) => a.entryId));
    const sitterSessionsWithAttendees = [...sitterEntryIds].filter(
      (id) => entryIdsWithAttendees.has(id)
    ).length;
    const avgAttendeesPerSession = sitterSessions > 0 ? Math.round(attendeeList.length / sitterSessions * 10) / 10 : 0;
    const totalAttendeeJoins = attendeeList.length;
    const recurringGroups = new Set(
      entryList.filter((e) => e.recurringGroupId).map((e) => e.recurringGroupId)
    ).size;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3).toISOString().slice(0, 10);
    const recentSessions = entryList.filter((e) => e.date >= thirtyDaysAgo).length;
    const recentMembers = memberList.filter(
      (m) => m.createdAt && m.createdAt.slice(0, 10) >= thirtyDaysAgo
    ).length;
    return c.json({
      members: {
        total: totalMembers,
        active: activeMembers,
        admins: adminMembers,
        recentJoins: recentMembers
      },
      sessions: {
        total: totalSessions,
        sitter: sitterSessions,
        breather: breatherSessions,
        withAttendees: sitterSessionsWithAttendees,
        recurring: recurringGroups,
        last30Days: recentSessions
      },
      attendees: {
        total: totalAttendeeJoins,
        avgPerSitterSession: avgAttendeesPerSession
      }
    });
  } catch (err) {
    return c.json({ error: err?.message ?? "analytics failed" }, 500);
  }
});
app.post("/api/send-password-reset", async (c) => {
  try {
    const blink = getBlink(c.env);
    const { email } = await c.req.json();
    if (!email) return c.json({ error: "email required" }, 400);
    const { token } = await blink.auth.generatePasswordResetToken(email);
    const appResetUrl = `https://breathe-today.life/?reset_token=${token}`;
    const html = buildPasswordResetEmail(appResetUrl);
    await sendEmail(blink, {
      to: email,
      subject: "Breath Group: Reset your password",
      html,
      text: `Reset your Breath Group password by visiting this link (expires in 1 hour):

${appResetUrl}

If you didn't request a reset, ignore this email.`,
      type: "password_reset"
    });
    return c.json({ ok: true });
  } catch (err) {
    console.error("[password-reset] failed", err?.message);
    return c.json({ ok: true });
  }
});
var index_default = app;

// .blink-cf-build/__blink_worker__.ts
var blink_worker_default = {
  async fetch(request, env, ctx) {
    if (!globalThis.__blink_env_init__) {
      const _env = env;
      globalThis.Deno = {
        env: {
          get: (k) => _env[k] ?? null,
          toObject: () => ({ ..._env })
        },
        serve: () => {
        }
      };
      globalThis.__blink_env_init__ = true;
    }
    const __start = Date.now();
    const __url = new URL(request.url);
    let __response;
    let __error;
    const __reqClone = request.clone();
    try {
      __response = await index_default.fetch(request, env, ctx);
    } catch (__err) {
      __error = __err instanceof Error ? __err.message : String(__err);
      __response = new Response(JSON.stringify({ error: __error }), {
        status: 500,
        headers: { "content-type": "application/json" }
      });
    }
    const __resClone = __response.clone();
    const __routeMap = JSON.parse(env.BLINK_ROUTE_MAP || "{}");
    const __parts = __url.pathname.split("/").filter(Boolean);
    const __seg = __parts[0] === "api" ? __parts[1] : __parts[0];
    const __slug = __seg && __routeMap[__seg] || env.BLINK_ENTRY_SLUG || "index";
    const __logUrl = `${env.BLINK_APP_URL || "https://core.blink.new"}/api/analytics/fn-log`;
    ctx.waitUntil((async () => {
      const __REDACT_KEYS = ["authorization", "cookie", "set-cookie", "x-api-key", "x-secret-key", "blink-secret-key"];
      const __redactHeaders = (h) => {
        const obj = {};
        h.forEach((v, k) => {
          obj[k] = __REDACT_KEYS.includes(k.toLowerCase()) ? "[REDACTED]" : v;
        });
        return obj;
      };
      const __resContentType = __response.headers.get("content-type") || "";
      const __isStreaming = __response.headers.get("transfer-encoding") === "chunked" || __resContentType.includes("text/event-stream");
      const __isTextual = __resContentType.startsWith("text/") || __resContentType.includes("application/json") || __resContentType.includes("application/xml") || __resContentType === "";
      const __reqBody = await __reqClone.text().catch(() => null);
      const __resBody = __isStreaming ? "[streaming]" : !__isTextual ? "[binary]" : await __resClone.text().catch(() => null);
      await fetch(__logUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${env.RUNTIME_SECRET || ""}`
        },
        body: JSON.stringify({
          project_id: env.BLINK_PROJECT_ID || "",
          function_slug: __slug,
          method: request.method,
          path: __url.pathname,
          status_code: __response.status,
          latency_ms: Date.now() - __start,
          error: __error || null,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          request_headers: JSON.stringify(__redactHeaders(request.headers)).slice(0, 4096),
          request_body: (__reqBody || "").slice(0, 4096),
          response_headers: JSON.stringify(__redactHeaders(__response.headers)).slice(0, 4096),
          response_body: (__resBody || "").slice(0, 4096)
        })
      }).catch(() => {
      });
    })());
    return __response;
  }
};
export {
  blink_worker_default as default
};
