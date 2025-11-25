import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signin')
  @ApiOperation({ summary: 'Sign in' })
  @ApiResponse({
    status: 200,
    description: 'Sign in successful',
    schema: { type: 'object', properties: { accessToken: { type: 'string' } } },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  signIn(@Body() signInDto: SignInDto): Promise<{ accessToken: string }> {
    return this.authService.signIn(signInDto);
  }

  @Get('validate-token')
  @ApiOperation({ summary: 'Validate token' })
  @ApiResponse({
    status: 200,
    description: 'Token validated successfully',
    type: Boolean,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  validateToken(@Query('token') token: string): Promise<JwtPayload> {
    return this.authService.validateToken(token);
  }
}
