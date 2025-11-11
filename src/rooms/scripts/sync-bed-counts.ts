import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Room } from '../entities/room.entity';
import { Bed } from '../entities/bed.entity';
import { Repository } from 'typeorm';

/**
 * One-time script to sync all room bedCounts with actual bed entities
 * Run this to fix the data inconsistency issue
 */
async function syncAllRoomBedCounts() {
  console.log('🚀 Starting bed count synchronization...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  
  const roomRepository = app.get<Repository<Room>>(getRepositoryToken(Room));
  const bedRepository = app.get<Repository<Bed>>(getRepositoryToken(Bed));

  try {
    // Get all rooms
    const rooms = await roomRepository.find({
      select: ['id', 'roomNumber', 'name', 'bedCount', 'hostelId']
    });

    console.log(`📊 Found ${rooms.length} rooms to process\n`);

    let updated = 0;
    let unchanged = 0;
    let errors = 0;

    for (const room of rooms) {
      try {
        // Count actual beds for this room
        const actualBedCount = await bedRepository.count({
          where: { roomId: room.id }
        });

        if (room.bedCount !== actualBedCount) {
          console.log(`🔄 Room ${room.roomNumber} (${room.name}): ${room.bedCount} → ${actualBedCount} beds`);
          
          await roomRepository.update(room.id, {
            bedCount: actualBedCount
          });
          
          updated++;
        } else {
          unchanged++;
        }
      } catch (error) {
        console.error(`❌ Error processing room ${room.roomNumber}:`, error.message);
        errors++;
      }
    }

    console.log('\n✅ Synchronization complete!');
    console.log(`   - Updated: ${updated} rooms`);
    console.log(`   - Unchanged: ${unchanged} rooms`);
    console.log(`   - Errors: ${errors} rooms`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await app.close();
  }
}

// Run the script
syncAllRoomBedCounts()
  .then(() => {
    console.log('\n🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
