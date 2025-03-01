import { Body, Controller, Post } from '@nestjs/common';
import { SignInDto } from './dto/sagnin.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.authenticate(signInDto);
  }
}
