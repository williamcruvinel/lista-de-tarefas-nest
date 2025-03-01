import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { HashingServiceProtocol } from 'src/auth/hash/hashing.service';
import { PayloadTokenDto } from 'src/auth/dto/payload-token.dto';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import {
  ResponseCreateUserDto,
  ResponseFindOneUserDto,
  ResponseUploadAvatarDto,
} from './dto/response-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashingService: HashingServiceProtocol,
  ) {}

  async findOne(id: number): Promise<ResponseFindOneUserDto> {
    const user = await this.prisma.user.findFirst({
      where: { id: id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        Task: {
          select: {
            id: true,
            name: true,
            description: true,
            completed: true,
          },
        },
      },
    });
    if (user) return user;

    throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
  }

  async create(createUserDto: CreateUserDto): Promise<ResponseCreateUserDto> {
    try {
      const passworHash = await this.hashingService.hash(
        createUserDto.password,
      );

      const newUser = await this.prisma.user.create({
        data: {
          name: createUserDto.name,
          email: createUserDto.email,
          passworHash: passworHash,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      return newUser;
    } catch (error) {
      throw new HttpException(
        'Falha ao CADASTRAR usuário',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    tokenPayload: PayloadTokenDto,
  ): Promise<ResponseCreateUserDto> {
    try {
      const user = await this.prisma.user.findFirst({
        where: { id: id },
      });

      if (!user) {
        throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
      }

      if (user.id !== tokenPayload.sub) {
        throw new HttpException('Acesso negado.', HttpStatus.BAD_REQUEST);
      }

      const dataUser: { name?: string; passworHash?: string } = {
        name: updateUserDto.name ? updateUserDto.name : user.name,
      };

      if (updateUserDto?.password) {
        const passworHash = await this.hashingService.hash(
          updateUserDto.password,
        );
        dataUser['passworHash'] = passworHash;
      }

      const updateUser = await this.prisma.user.update({
        where: { id: id },
        data: {
          name: dataUser.name,
          passworHash: dataUser?.passworHash
            ? dataUser.passworHash
            : user.passworHash,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      return updateUser;
    } catch (error) {
      throw new HttpException(
        'Falha ao ATUALIZAR usuário',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async delete(
    id: number,
    tokenPayload: PayloadTokenDto,
  ): Promise<ResponseCreateUserDto> {
    try {
      const user = await this.prisma.user.findFirst({
        where: { id: id },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (!user) {
        throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
      }

      if (user.id !== tokenPayload.sub) {
        throw new HttpException('Acesso negado.', HttpStatus.BAD_REQUEST);
      }

      await this.prisma.user.delete({
        where: { id: id },
      });

      return user;
    } catch (error) {
      throw new HttpException(
        'Falha ao DELETAR usuário',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async uploadAvatarImg(
    tokenPayload: PayloadTokenDto,
    file: Express.Multer.File,
  ): Promise<ResponseUploadAvatarDto> {
    try {
      const mimeType = file.mimetype;
      const fileExtension = path
        .extname(file.originalname)
        .toLowerCase()
        .substring(1);
      const fileName = `${tokenPayload.sub}.${fileExtension}`;
      const fileLocale = path.resolve(process.cwd(), 'files', fileName);
      await fs.writeFile(fileLocale, file.buffer);

      const user = await this.prisma.user.findFirst({
        where: { id: tokenPayload.sub },
      });

      if (!user) {
        throw new HttpException(
          'Falha ao atualizar avatar de usuário',
          HttpStatus.BAD_REQUEST,
        );
      }

      const updateUser = await this.prisma.user.update({
        where: { id: user.id },
        data: { avatar: fileName },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      });

      return updateUser;
    } catch (error) {
      throw new HttpException(
        'Falha ao atualizar avatar de usuário',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
