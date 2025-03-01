import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaginationDto } from 'src/common/dto/paginatio.dto';
import { PayloadTokenDto } from 'src/auth/dto/payload-token.dto';
import { ResponseTaskDto } from './dto/response-task.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async findAll(paginationDto: PaginationDto): Promise<ResponseTaskDto[]> {
    const { limit = 10, offset = 0 } = paginationDto;

    const allTasks = await this.prisma.task.findMany({
      take: limit,
      skip: offset,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return allTasks;
  }

  async findOne(id: number): Promise<ResponseTaskDto> {
    const task = await this.prisma.task.findFirst({
      where: { id: id },
    });
    if (task?.name) return task;

    throw new HttpException('Essa tarefa não existe', HttpStatus.NOT_FOUND);
    //throw new NotFoundException('Tarefa não encontrada')
  }

  async create(
    createTaskDto: CreateTaskDto,
    tokenPayload: PayloadTokenDto,
  ): Promise<ResponseTaskDto> {
    try {
      const newTask = await this.prisma.task.create({
        data: {
          name: createTaskDto.name,
          description: createTaskDto.description,
          completed: false,
          userId: tokenPayload.sub,
        },
      });

      return newTask;
    } catch (error) {
      throw new HttpException(
        'Falaha ao CADASTRAR tarefa',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async update(
    id: number,
    updateTaskDto: UpdateTaskDto,
    tokenPayload: PayloadTokenDto,
  ): Promise<ResponseTaskDto> {
    try {
      const task = await this.prisma.task.findFirst({
        where: { id: id },
      });

      if (!task) {
        throw new HttpException('Essa tarefa não existe', HttpStatus.NOT_FOUND);
      }

      if (task.userId !== tokenPayload.sub) {
        throw new HttpException(
          'Falha ao atualizar essa tarefa!',
          HttpStatus.NOT_FOUND,
        );
      }

      const updateTask = await this.prisma.task.update({
        where: { id: id },
        data: {
          name: updateTaskDto.name ? updateTaskDto.name : task.name,
          description: updateTaskDto.description
            ? updateTaskDto.description
            : task.description,
          completed: updateTaskDto.completed
            ? updateTaskDto.completed
            : task.completed,
        },
      });
      return updateTask;
    } catch (error) {
      throw new HttpException(
        'Falaha ao ATUALIZAR tarefa',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async delete(id: number, tokenPayload: PayloadTokenDto) {
    try {
      const taskExists = await this.prisma.task.findFirst({
        where: { id: id },
      });

      if (!taskExists) {
        throw new HttpException('Tarefa não existe', HttpStatus.NOT_FOUND);
      }

      if (taskExists.userId !== tokenPayload.sub) {
        throw new HttpException(
          'Falha ao deletar essa tarefa',
          HttpStatus.NOT_FOUND,
        );
      }

      const taskDeleted = this.prisma.task.delete({
        where: { id: id },
      });

      return taskDeleted;
    } catch (error) {
      throw new HttpException(
        'Falaha ao DELETAR tarefa!',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
