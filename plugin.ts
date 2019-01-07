import { IEmitterDictionary, IMiddleware, IWebcheck } from "./webcheck";

export interface IPlugin {
    enable(): this;
    disable(): this;
    register(handle: IWebcheck): this;

    // protected handle?: IWebcheck;
    // protected on?: IEmitterDictionary;
    // protected once?: IEmitterDictionary;
    // protected middleware?: IMiddleware;
    // protected init?: Function;
}

export abstract class Plugin implements IPlugin {
    protected handle?: IWebcheck;
    protected on?: IEmitterDictionary = {};
    protected once?: IEmitterDictionary = {};
    protected middleware?: IMiddleware;
    protected init?: () => void;

    public enable(...args: any[]): this {
        if (!this.handle) {
            throw new Error("You have to register the plugin in Webcheck first");
        }

        this.handle.emit("enablePlugin", this);
        for (const hash in this.on) {
            if (this.on.hasOwnProperty(hash)) {
                this.handle.on(hash, this.on[hash]);
            }
        }
        for (const hash in this.once) {
            if (this.once.hasOwnProperty(hash)) {
                this.handle.once(hash, this.once[hash]);
            }
        }
        if (this.middleware) {
            this.handle.middlewares.push(this.middleware);
        }

        if (typeof this.init === "function") {
            this.init.apply(this, args as any);
        }
        return this;
    }
    public disable(): this {
        if (!this.handle) {
            throw new Error("You have to register the plugin in Webcheck first");
        }

        this.handle.emit("disablePlugin", this);
        for (const hash in this.on) {
            if (this.on.hasOwnProperty(hash)) {
                this.handle.removeListener(hash, this.on[hash]);
            }
        }
        for (const hash in this.once) {
            if (this.once.hasOwnProperty(hash)) {
                this.handle.removeListener(hash, this.once[hash]);
            }
        }
        if (this.middleware) {
            this.handle.middlewares.splice(this.handle.middlewares.indexOf(this.middleware), 1);
        }

        return this;
    }
    public register(handle: IWebcheck): this {
        this.handle = handle;
        this.handle.emit("registerPlugin", this);
        return this;
    }
}
