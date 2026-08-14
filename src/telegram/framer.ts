export interface Framer {
  readonly push: (chunk: string) => readonly string[];
  readonly pending: () => number;
}

export function createFramer(frameSize: number): Framer {
  let buffer = "";

  return {
    push: (chunk) => {
      buffer = buffer + chunk;

      const frames: string[] = [];

      while (buffer.length >= frameSize) {
        frames.push(buffer.slice(0, frameSize));
        buffer = buffer.slice(frameSize);
      }

      return frames;
    },

    pending: () => buffer.length,
  };
}
