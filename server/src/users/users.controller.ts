import { Controller, Get, Param, UseGuards, Patch, Body, Query, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from './dto/pagination.dto';
import { RolesGurad } from 'src/common/gurads/roles.gurad';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Role } from 'src/common/enums/roles.enum';
import { IsSelfGuard } from 'src/auth/guards/is-self.guard';

@Controller('users')
@UseGuards(RolesGurad)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  @Roles(Role.ADMIN)
  async findAll(@Query() paginationDto: PaginationDto) {
    const { users, total } = await this.usersService.findAll(paginationDto);
    return { users, total };
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  findById(@Param('id') id: number) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @UseGuards(IsSelfGuard)
  update(
    @Param('id') id: number,
    @Body() updateUserDto: UpdateUserDto
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: number) {
    await this.usersService.remove(id);
    return { message: 'User deleted successfully' };
  }
}
