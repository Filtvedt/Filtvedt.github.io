const { port1, port2 } = new MessageChannel();
port2.start();

export function takeABreakForTheUiToRunShallWe():Promise<void> {
  return new Promise(resolve => {
    const uid = Math.random();

    port2.addEventListener("message", function f(ev) {
      if (ev.data !== uid) {
        return;
      }
      port2.removeEventListener("message", f);
      resolve();
    });
    port1.postMessage(uid);
  });
}
