import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from './users.service';
import { HashingServiceProtocol } from 'src/auth/hash/hashing.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateUserDto } from './dto/create-user.dto';
import { HttpException, HttpStatus } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { PayloadTokenDto } from 'src/auth/dto/payload-token.dto';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

jest.mock('node:fs/promises');

describe('UserService', () => {
  let userService: UsersService;
  let prismaService: PrismaService;
  let hashingService: HashingServiceProtocol;

  // Configura a inicialização do contrutor
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn().mockResolvedValue({
                id: 1,
                name: 'Jhon Doe',
                email: 'jhon-doe@email.com',
              }),
              findFirst: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: HashingServiceProtocol,
          useValue: {
            hash: jest.fn(),
          },
        },
      ],
    }).compile();

    userService = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
    hashingService = module.get<HashingServiceProtocol>(HashingServiceProtocol);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be define users service', () => {
    expect(userService).toBeDefined();
  });

  describe('Create User', () => {
    it('should create a new user', async () => {
      // Configuração do teste (Arrange)
      const createUserDto: CreateUserDto = {
        name: 'Jhon Doe',
        email: 'jhon-doe@email.com',
        password: '123456',
      };
      jest.spyOn(hashingService, 'hash').mockResolvedValue('HASH_MOCK_EXEMPLO');

      // Ação que desejamos fazer (Action)
      const result = await userService.create(createUserDto);

      // Conferir se foi execultada a ação esperada (Assert)
      expect(hashingService.hash).toHaveBeenCalled();
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          name: createUserDto.name,
          email: createUserDto.email,
          passworHash: 'HASH_MOCK_EXEMPLO',
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      expect(result).toEqual({
        id: 1,
        name: createUserDto.name,
        email: createUserDto.email,
      });
    });

    it('should throw error prisma create fails', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Jhon Doe',
        email: 'jhon-doe@email.com',
        password: '123456',
      };
      jest.spyOn(hashingService, 'hash').mockResolvedValue('HASH_MOCK_EXEMPLO');
      jest
        .spyOn(prismaService.user, 'create')
        .mockRejectedValue(new Error('Database error'));

      await expect(userService.create(createUserDto)).rejects.toThrow(
        new HttpException('Falha ao CADASTRAR usuário', HttpStatus.BAD_REQUEST),
      );

      expect(hashingService.hash).toHaveBeenCalledWith(createUserDto.password);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          name: createUserDto.name,
          email: createUserDto.email,
          passworHash: 'HASH_MOCK_EXEMPLO',
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
    });
  });

  describe('Find One User', () => {
    it('should return a find one user', async () => {
      const mockUser = {
        id: 1,
        name: 'Jhon Doe',
        email: 'jhon-doe@email.com',
        passworHash: 'hash_exemplo',
        avatar: null,
        task: [],
        active: true,
        createdAt: new Date(),
      };

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUser);

      const result = await userService.findOne(1);
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { id: 1 },
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
      expect(result).toEqual(mockUser);
    });

    it('should throw error exception whe user is ot found', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(null);

      await expect(userService.findOne(1)).rejects.toThrow(
        new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND),
      );

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { id: 1 },
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
    });
  });

  describe('Update User', () => {
    it('Should throw exception when user is not found', async () => {
      const updateUserDto: UpdateUserDto = { name: 'Novo nome' };
      const tokenPayload: PayloadTokenDto = {
        sub: 1,
        aud: '',
        email: 'Jhon-doe@email.com',
        exp: 25,
        iat: 30,
        iss: '',
      };

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(null);

      await expect(
        userService.update(1, updateUserDto, tokenPayload),
      ).rejects.toThrow(
        new HttpException('Falha ao ATUALIZAR usuário', HttpStatus.BAD_REQUEST),
      );
    });

    it('should throw UNAUTHORIZED exception when user is not authorized', async () => {
      const updateUserDto: UpdateUserDto = { name: 'Novo nome' };
      const tokenPayload: PayloadTokenDto = {
        sub: 5,
        aud: '',
        email: 'matheus@teste.com',
        exp: 123,
        iat: 123,
        iss: '',
      };

      const mockUser = {
        id: 1,
        name: 'Matheus',
        email: 'matheus@teste.com',
        avatar: null,
        Task: [],
        passworHash: 'hash_exemplo',
        active: true,
        createdAt: new Date(),
      };

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUser);

      await expect(
        userService.update(1, updateUserDto, tokenPayload),
      ).rejects.toThrow(
        new HttpException('Falha ao ATUALIZAR usuário', HttpStatus.BAD_REQUEST),
      );
    });

    it('should user updated', async () => {
      const updateUserDto: UpdateUserDto = {
        name: 'Novo nome',
        password: 'nova senha',
      };

      const tokenPayload: PayloadTokenDto = {
        sub: 1,
        aud: '',
        email: 'matheus@teste.com',
        exp: 123,
        iat: 123,
        iss: '',
      };

      const mockUser = {
        id: 1,
        name: 'William',
        email: 'wiliam@teste.com',
        avatar: null,
        passworHash: 'hash_exemplo',
        active: true,
        createdAt: new Date(),
      };

      const updatedUser = {
        id: 1,
        name: 'Novo nome',
        email: 'william@teste.com',
        avatar: null,
        passworHash: 'novo_hash_exemplo',
        active: true,
        createdAt: new Date(),
      };

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUser);
      jest.spyOn(hashingService, 'hash').mockResolvedValue('novo_hash_exemplo');
      jest.spyOn(prismaService.user, 'update').mockResolvedValue(updatedUser);

      const result = await userService.update(1, updateUserDto, tokenPayload);

      expect(hashingService.hash).toHaveBeenCalledWith(updateUserDto.password);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        data: {
          name: updateUserDto.name,
          passworHash: 'novo_hash_exemplo',
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      expect(result).toEqual(updatedUser);
    });
  });

  describe('Delete user', () => {
    it('should throw error when user is not found', async () => {
      const tokenPayload: PayloadTokenDto = {
        sub: 1,
        aud: '',
        email: 'matheus@teste.com',
        exp: 123,
        iat: 123,
        iss: '',
      };

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(null);

      await expect(userService.delete(1, tokenPayload)).rejects.toThrow(
        new HttpException('Falha ao DELETAR usuário', HttpStatus.BAD_REQUEST),
      );
    });

    it('should throw UNAUTHORIZED whem user is not authorized', async () => {
      const tokenPayload: PayloadTokenDto = {
        sub: 5,
        aud: '',
        email: 'matheus@teste.com',
        exp: 123,
        iat: 123,
        iss: '',
      };

      const mockUser = {
        id: 1,
        name: 'Matheus',
        email: 'matheus@teste.com',
        avatar: null,
        passworHash: 'hash_exemplo',
        active: true,
        createdAt: new Date(),
      };

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUser);

      await expect(userService.delete(1, tokenPayload)).rejects.toThrow(
        new HttpException('Falha ao DELETAR usuário', HttpStatus.BAD_REQUEST),
      );

      expect(prismaService.user.delete).not.toHaveBeenCalled();
    });

    it('should delete user', async () => {
      const tokenPayload: PayloadTokenDto = {
        sub: 1,
        aud: '',
        email: 'matheus@teste.com',
        exp: 123,
        iat: 123,
        iss: '',
      };

      const mockUser = {
        id: 1,
        name: 'Matheus',
        email: 'matheus@teste.com',
        avatar: null,
        passworHash: 'hash_exemplo',
        active: true,
        createdAt: new Date(),
      };

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUser);
      jest.spyOn(prismaService.user, 'delete').mockResolvedValue(mockUser);

      const result = await userService.delete(1, tokenPayload);

      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: {
          id: mockUser.id,
        },
      });

      expect(result).toEqual(mockUser);
    });
  });

  describe('Upload Avatar User', () => {
    it('should throw NOT_FOUND when user is not found', async () => {
      const tokenPayload: PayloadTokenDto = {
        sub: 1,
        aud: '',
        email: 'matheus@teste.com',
        exp: 123,
        iat: 123,
        iss: '',
      };

      const file = {
        originalname: 'avatar.png',
        mimetype: 'image/png',
        buffer: Buffer.from(''),
      } as Express.Multer.File;

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(null);

      await expect(
        userService.uploadAvatarImg(tokenPayload, file),
      ).rejects.toThrow(
        new HttpException(
          'Falha ao atualizar avatar de usuário',
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should upload avatar and update user successfully', async () => {
      const tokenPayload: PayloadTokenDto = {
        sub: 1,
        aud: '',
        email: 'matheus@teste.com',
        exp: 123,
        iat: 123,
        iss: '',
      };

      const file = {
        originalname: 'avatar.png',
        mimetype: 'image/png',
        buffer: Buffer.from(''),
      } as Express.Multer.File;

      const mockUser: any = {
        id: 1,
        name: 'Matheus',
        email: 'matheus@teste.com',
        avatar: null,
      };

      const updatedUser: any = {
        id: 1,
        name: 'Matheus',
        email: 'matheus@teste.com',
        avatar: '1.png',
      };

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUser);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue(updatedUser);
      jest.spyOn(fs, 'writeFile').mockResolvedValue();

      const result = await userService.uploadAvatarImg(tokenPayload, file);
      const fileLocale = path.resolve(process.cwd(), 'files', '1.png');

      expect(fs.writeFile).toHaveBeenCalledWith(fileLocale, file.buffer);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { avatar: '1.png' },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      });

      expect(result).toEqual(updatedUser);
    });

    it('should throw error if file write fails', async () => {
      const tokenPayload: PayloadTokenDto = {
        sub: 1,
        aud: '',
        email: 'matheus@teste.com',
        exp: 123,
        iat: 123,
        iss: '',
      };

      const file = {
        originalname: 'avatar.png',
        mimetype: 'image/png',
        buffer: Buffer.from(''),
      } as Express.Multer.File;

      const mockUser: any = {
        id: 1,
        name: 'Matheus',
        email: 'matheus@teste.com',
        avatar: null,
      };

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUser);

      jest
        .spyOn(fs, 'writeFile')
        .mockRejectedValue(new Error('File write error'));

      await expect(
        userService.uploadAvatarImg(tokenPayload, file),
      ).rejects.toThrow(
        new HttpException(
          'Falha ao atualizar avatar de usuário',
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });
});
