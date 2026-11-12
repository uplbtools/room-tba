

export default class EscapeActions {
    private _stack = $state<(() => void)[]>([]);

    pushAction(cb: () => void) {
        this._stack.push(cb);
    }

    hasAction() {
        return this._stack.length !== 0;
    }

    trigger(cancelled: boolean = false) {
        const cb = this._stack.pop();
        if (typeof cb !== 'undefined' && !cancelled) {
            void cb();
        }
    }
}