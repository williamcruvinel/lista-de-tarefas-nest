import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { PaginationDto } from 'src/common/dto/paginatio.dto';
import { LoggerInterceptor } from 'src/common/interseptors/logger.interceptor';
import { AddHeaderInterceptor } from 'src/common/interseptors/add-header.interceptor';
import { AuthTokenGuard } from 'src/auth/guard/auth-token.guard';
import { PayloadTokenDto } from 'src/auth/dto/payload-token.dto';
import { TokenPayloadParam } from 'src/auth/param/token-payload.param';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@Controller('/tesks')
@UseInterceptors(LoggerInterceptor, AddHeaderInterceptor)
export class TasksController {
  constructor(private readonly teskService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Buscar todas tarefas' })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 10,
    description: 'Limite de tarefas a ser buscadas',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    example: 0,
    description: 'itens q deseja pular',
  })
  findAllTasks(@Query() paginationDto: PaginationDto) {
    return this.teskService.findAll(paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar detalhes de uma tarefa' })
  @ApiParam({
    name: 'id',
    example: 1,
    description: 'ID da tarefa',
  })
  findOneTesk(@Param('id', ParseIntPipe) id: number) {
    return this.teskService.findOne(id);
  }

  @UseGuards(AuthTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar tarefa' })
  @Post()
  createTask(
    @Body() createTaskDto: CreateTaskDto,
    @TokenPayloadParam() tokenPayload: PayloadTokenDto,
  ) {
    return this.teskService.create(createTaskDto, tokenPayload);
  }

  @UseGuards(AuthTokenGuard)
  @ApiConsumes()
  @ApiOperation({ summary: 'Editar uma tarefa' })
  @Patch(':id')
  updateTask(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: UpdateTaskDto,
    @TokenPayloadParam() tokenPayload: PayloadTokenDto,
  ) {
    return this.teskService.update(id, updateTaskDto, tokenPayload);
  }

  @UseGuards(AuthTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deletar uma tarefas' })
  @Delete(':id')
  deleteTesk(
    @Param('id', ParseIntPipe) id: number,
    @TokenPayloadParam() tokenPayload: PayloadTokenDto,
  ) {
    return this.teskService.delete(id, tokenPayload);
  }
}
