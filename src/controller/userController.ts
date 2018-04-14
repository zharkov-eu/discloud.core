"use strict";

import * as restify from "restify";
import UserService from "../service/userService";
import UserRequest from "./request/userRequest";
import {IUserResponse} from "./request/userResponse";

export default class UserController {
    private readonly userService: UserService;

    constructor(userService: UserService) {
        this.userService = userService;
    }

    public get = (req: restify.Request, res: restify.Response) => {
        return res.send(200, {});
    };

    public post = async (req: restify.Request, res: restify.Response) => {
        const userRequest = new UserRequest(req.body);
        const user = await this.userService.save(userRequest);
        const userResponse: IUserResponse = {
            group: user.group,
            username: user.username,
            uuid: user.uuid,
        };
        return res.json(201, userResponse, {location: `/user/${user.uuid}`});
    };
}
