import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HostelProfile } from './entities/hostel-profile.entity';
import { CreateHostelProfileDto, UpdateHostelProfileDto } from './dto/hostel-profile.dto';

@Injectable()
export class HostelService {
  constructor(
    @InjectRepository(HostelProfile)
    private hostelProfileRepository: Repository<HostelProfile>,
  ) {}

  async getProfile(): Promise<HostelProfile> {
    const profile = await this.hostelProfileRepository.findOne({
      order: { createdAt: 'DESC' }
    });
    
    if (!profile) {
      // Return default profile if none exists
      return this.createDefaultProfile();
    }
    
    return profile;
  }

  async createProfile(createProfileDto: CreateHostelProfileDto): Promise<HostelProfile> {
    const profile = this.hostelProfileRepository.create(createProfileDto);
    return await this.hostelProfileRepository.save(profile);
  }

  async updateProfile(updateProfileDto: UpdateHostelProfileDto): Promise<HostelProfile> {
    const existingProfile = await this.hostelProfileRepository.findOne({
      order: { createdAt: 'DESC' }
    });

    if (!existingProfile) {
      throw new NotFoundException('Hostel profile not found');
    }

    await this.hostelProfileRepository.update(existingProfile.id, updateProfileDto);
    return await this.hostelProfileRepository.findOne({ where: { id: existingProfile.id } });
  }

  private async createDefaultProfile(): Promise<HostelProfile> {
    const defaultProfile = {
      hostelName: "Himalayan Backpackers Hostel",
      ownerName: "Ramesh Shrestha",
      email: "ramesh@himalayanhostel.com",
      phone: "+977-9841234567",
      address: "Thamel Marg, Ward No. 26",
      province: "Bagmati",
      district: "Kathmandu",
      description: "A cozy hostel in the heart of Thamel, perfect for backpackers and adventure seekers.",
      amenities: [
        { id: "wifi", label: "Free WiFi", checked: true },
        { id: "laundry", label: "Laundry Service", checked: true },
        { id: "kitchen", label: "Common Kitchen", checked: true },
        { id: "rooftop", label: "Rooftop Access", checked: false },
        { id: "lockers", label: "Lockers", checked: true },
        { id: "ac", label: "Air Conditioning", checked: false },
        { id: "breakfast", label: "Free Breakfast", checked: false },
        { id: "parking", label: "Parking", checked: true }
      ],
      policies: {
        checkInTime: "14:00",
        checkOutTime: "11:00",
        cancelationPolicy: "24 hours",
        smokingPolicy: "Non-smoking",
        petPolicy: "Not allowed",
        visitorPolicy: "Allowed with registration"
      },
      pricing: {
        dormBed: 800,
        privateRoom: 2500,
        laundryService: 500,
        foodService: 3000
      }
    };

    return await this.createProfile(defaultProfile);
  }
}