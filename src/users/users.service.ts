import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dtos/create-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    try{
      const user = await this.usersRepository.create(dto);
      return await this.usersRepository.save(user);
    }catch(error){
      if (error.code === '23505') {
        throw new ConflictException('User already exists');
      }
      throw new Error(error);
    }
  
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find({ order: { createdAt: 'DESC' } });
  }

  
  findOne(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }
}
