"use strict";

export default interface IPubFile {
  uuid: string;
  size: number; // In kilobytes
  location_set: string[];
}
