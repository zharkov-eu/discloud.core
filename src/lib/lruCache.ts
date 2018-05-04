"use strict";

export default class LruCache<T> {
  private values: Map<string, T> = new Map<string, T>();
  private maxEntries: number;

  constructor(maxEntries: number) {
    this.maxEntries = maxEntries;
  }

  public get = async (key: string, fallback: (key: string) => Promise<T>): Promise<T> => {
    if (!this.values.has(key)) {
      const value = await fallback(key);
      if (this.values.size > this.maxEntries) {
        this.values.delete(this.values.keys().next().value);
      }
      this.values.set(key, value);
    }

    return this.values.get(key);
  };

  public clear = () => this.values.clear();
}
