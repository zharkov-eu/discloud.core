"use strict";

export default class LruCache<T> {
  private values: Map<string, T> = new Map<string, T>();
  private readonly maxEntries: number;

  constructor(maxEntries: number) {
    this.maxEntries = maxEntries;
  }

  public get = (key: string) => {
    return this.values.get(key);
  };

  public set = (key: string, value: T): void => {
    if (this.values.size > this.maxEntries) {
      this.values.delete(this.values.keys().next().value);
    }
    this.values.set(key, value);
  };

  public getAsyncFallback = async (key: string, fallback: (key: string) => Promise<T>): Promise<T> => {
    if (!this.values.has(key)) {
      const value = await fallback(key);
      this.set(key, value);
    }

    return this.values.get(key);
  };

  public clear = () => this.values.clear();
}
