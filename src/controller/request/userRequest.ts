"use strict";

import {NotEmpty, NotEmptyString, Validate} from "validation-api";

export interface IUserRequest {
    username: string;
    group?: string[];
    password?: string;
}

@Validate()
export default class UserRequest implements IUserRequest {
    @NotEmptyString({required: true})
    public username: string;

    @NotEmpty()
    public group: string[];

    @NotEmptyString()
    public password: string;

    constructor(request: IUserRequest) {
        if (!request || typeof request !== "object") {
            throw new Error();
        }
        this.username = request.username;
        if (request.group) {
            this.group = request.group;
        }
        if (request.password) {
            this.password = request.password;
        }
    }
}
