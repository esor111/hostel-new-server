import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bed, BedStatus } from '../rooms/entities/bed.entity';
import { Hostel } from '../hostel/entities/hostel.entity';

export type PlaygroundDataMode = 'sample' | 'real';
export type PlaygroundDataSource = 'database' | 'sample' | 'fallback';

export interface PlaygroundHostelPreview
  extends Pick<Hostel, 'id' | 'name' | 'businessId' | 'isActive'> {}

export interface PlaygroundBedPreview
  extends Pick<Bed, 'id' | 'bedNumber' | 'status' | 'hostelId'> {
  roomId?: string;
  gender?: string;
  monthlyRate?: number;
  description?: string;
  room?: {
    id?: string;
    roomNumber?: string;
    name?: string;
  };
  hostel?: PlaygroundHostelPreview;
}

export interface PlaygroundDataset {
  beds: PlaygroundBedPreview[];
  hostels: PlaygroundHostelPreview[];
  mode: PlaygroundDataMode;
  source: PlaygroundDataSource;
}

export interface PlaygroundFetchOptions {
  mode?: PlaygroundDataMode;
}

@Injectable()
export class PlaygroundService {
  private readonly logger = new Logger(PlaygroundService.name);

  constructor(
    @InjectRepository(Bed)
    private readonly bedRepository: Repository<Bed>,
    @InjectRepository(Hostel)
    private readonly hostelRepository: Repository<Hostel>,
  ) {}

  async getBedsWithHostels(options: PlaygroundFetchOptions = {}): Promise<PlaygroundDataset> {
    const requestedMode = options.mode ?? 'real';

    if (requestedMode === 'sample') {
      this.logger.debug('Playground requested in SAMPLE mode');
      return this.buildSampleDataset('sample');
    }

    const dataset = await this.fetchRealDataset();

    if (!dataset.beds.length || !dataset.hostels.length) {
      this.logger.warn('Playground real dataset empty. Falling back to sample data.');
      return this.buildSampleDataset('fallback');
    }

    return dataset;
  }

  private async fetchRealDataset(): Promise<PlaygroundDataset> {
    const [beds, hostels] = await Promise.all([
      this.bedRepository.find({
        relations: ['room', 'hostel'],
        where: { status: BedStatus.AVAILABLE },
        order: { createdAt: 'DESC' },
        take: 50,
      }),
      this.hostelRepository.find({
        order: { createdAt: 'DESC' },
        take: 20,
      })
    ]);

    return {
      beds: beds.map(bed => ({
        id: bed.id,
        bedNumber: bed.bedNumber,
        status: bed.status,
        hostelId: bed.hostelId,
        roomId: bed.roomId,
        gender: bed.gender,
        monthlyRate: bed.monthlyRate,
        description: bed.description,
        room: bed.room ? {
          id: bed.room.id,
          roomNumber: bed.room.roomNumber,
          name: bed.room.name,
        } : undefined,
        hostel: bed.hostel ? this.pickHostelPreview(bed.hostel) : undefined,
      })),
      hostels: hostels.map(hostel => this.pickHostelPreview(hostel)),
      mode: 'real',
      source: 'database',
    };
  }

  private buildSampleDataset(source: PlaygroundDataSource): PlaygroundDataset {
    return {
      beds: SAMPLE_BEDS,
      hostels: SAMPLE_HOSTELS,
      mode: 'sample',
      source,
    };
  }

  private pickHostelPreview(hostel: Hostel): PlaygroundHostelPreview {
    return {
      id: hostel.id,
      name: hostel.name,
      businessId: hostel.businessId,
      isActive: hostel.isActive,
    };
  }
}

const SAMPLE_HOSTELS: PlaygroundHostelPreview[] = [
  {
    id: 'hostel-sample-1',
    name: 'Evergreen Residency',
    businessId: 'sample-business-001',
    isActive: true,
  },
  {
    id: 'hostel-sample-2',
    name: 'Sunrise Suites',
    businessId: 'sample-business-002',
    isActive: true,
  },
];

const SAMPLE_BEDS: PlaygroundBedPreview[] = [
  {
    id: 'bed-sample-1',
    bedNumber: 'E-101-A',
    status: BedStatus.AVAILABLE,
    hostelId: SAMPLE_HOSTELS[0].id,
    roomId: 'room-sample-1',
    gender: 'Any',
    monthlyRate: 12000,
    description: 'Corner bed with balcony access',
    room: {
      id: 'room-sample-1',
      roomNumber: 'E-101',
      name: 'Evergreen Prime',
    },
    hostel: { ...SAMPLE_HOSTELS[0] },
  },
  {
    id: 'bed-sample-2',
    bedNumber: 'S-404-B',
    status: BedStatus.AVAILABLE,
    hostelId: SAMPLE_HOSTELS[1].id,
    roomId: 'room-sample-2',
    gender: 'Female',
    monthlyRate: 10500,
    description: 'City view bed with study desk',
    room: {
      id: 'room-sample-2',
      roomNumber: 'S-404',
      name: 'Skyline Loft',
    },
    hostel: { ...SAMPLE_HOSTELS[1] },
  },
];
