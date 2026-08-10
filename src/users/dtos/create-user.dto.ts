import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

// Only the fields a client is allowed to set on creation. `status` is intentionally
// NOT accepted here: new users always start as ACTIVE (the entity default), so a caller
// can't create an account in an arbitrary state.
export class CreateUserDto {
  @ApiProperty({ example: 'Usman Afzal' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '+923251234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'usman@example.com' })
  @IsEmail()
  email: string;
}
