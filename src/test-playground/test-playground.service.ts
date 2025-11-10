import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bed, BedStatus } from '../rooms/entities/bed.entity';
import { Hostel } from '../hostel/entities/hostel.entity';
import { Room } from '../rooms/entities/room.entity';

@Injectable()
export class TestPlaygroundService {
  constructor(
    @InjectRepository(Bed)
    private bedRepository: Repository<Bed>,
    @InjectRepository(Hostel)
    private hostelRepository: Repository<Hostel>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
  ) {}

  async getAllBedsWithHostels(): Promise<{
    beds: Bed[];
    hostels: Hostel[];
  }> {
    const [beds, hostels] = await Promise.all([
      this.bedRepository.find({
        relations: ['room', 'hostel'],
        where: { status: BedStatus.AVAILABLE },
        order: { createdAt: 'DESC' } // Show newest beds first
      }),
      this.hostelRepository.find()
    ]);

    return { beds, hostels };
  }
}
