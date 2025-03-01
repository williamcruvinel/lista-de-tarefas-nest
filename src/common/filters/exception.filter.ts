import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    // CTX -> Context
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const errorRespopnse = exception.getResponse();

    response.status(status).json({
      statusCode: status,
      timesTamp: new Date().toISOString(),
      message:
        errorRespopnse !== '' ? errorRespopnse : 'Erro ao realizar operação',
      path: request.url,
    });
  }
}
