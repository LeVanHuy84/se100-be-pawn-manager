import { Controller, Get } from '@nestjs/common';
import { UserService } from './user.service';

@Controller({
  version: '1',
  path: 'users',
})
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getAll() {
    return await this.userService.findAll();
  }
}
