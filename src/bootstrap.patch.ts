import * as dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

// Avoid "Converting circular structure to JSON" crashes when stringifying errors (e.g. inside Crawlee's ErrorTracker)
const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  };
};

if (!Error.prototype.hasOwnProperty('toJSON')) {
  Object.defineProperty(Error.prototype, 'toJSON', {
    value: function (this: Error) {
      const alt: Record<string, any> = {};
      Object.getOwnPropertyNames(this).forEach((key) => {
        alt[key] = (this as any)[key];
      });
      try {
        return JSON.parse(JSON.stringify(alt, getCircularReplacer()));
      } catch (err) {
        return {
          message: this.message,
          name: this.name,
          stack: this.stack,
        };
      }
    },
    configurable: true,
    writable: true,
  });
}
