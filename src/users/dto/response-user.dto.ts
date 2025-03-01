class ITask {
  id: number;
  name: string;
  description: string;
  completed: boolean;
}

export class ResponseFindOneUserDto {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  Task: ITask[];
}

export class ResponseCreateUserDto {
  id: number;
  name: string;
  email: string;
}

export class ResponseUploadAvatarDto {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
}
