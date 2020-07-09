/**
usage:

const result = new Result(true, 'some additional information');

result.val // result value
result.meta // meta info

*/

module.exports = class Result {
    constructor(val, meta = '') {
        this._val = val;
        this._meta = encodeMeta(meta);
    }

    toString() {
        const val = JSON.stringify(this._val);
        return `[${val}] - ${this._meta}`;
    }

    get val() {
        return this._val;
    }
    
    set val(val) {
        if (this.constructor.name != 'Result') {
            throw Error(`Can't change "val" in result`);
        }
        this._val = val;
    }

    get meta() {
        return this._meta;
    }

    set meta(meta) {
        if (this.constructor.name != 'Result') {
            throw Error(`Can't change "meta" in result`);
        }
        this._meta = encodeMeta(meta)
    }
}

function encodeMeta(meta) {
    return (typeof meta == 'string') ? meta: JSON.stringify(meta);
}
