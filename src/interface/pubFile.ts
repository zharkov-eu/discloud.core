"use strict";

export default interface IPubFile {
  location: string[];
  size: number; // In kilobytes
  userId: number;
  uuid: string;
}
