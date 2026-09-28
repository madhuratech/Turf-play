import process from 'node:process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MOCK_TURFS = [
  {
    id: 'turf-cbe-1',
    name: 'Velocity Arena & Floodlit Turf',
    city: 'Coimbatore',
    area: 'Peelamedu (Near PSG Tech)',
    address: 'Avinashi Road, Peelamedu, Coimbatore - 641004',
    sports: ['cricket', 'football'],
    pricePerHour: 1200,
    rating: 4.9,
    reviewsCount: 238,
    lat: 11.0261,
    lng: 77.0028,
    amenities: [
      'FIFA Quality AstroTurf',
      'High-mast LED Floodlights',
      'Changing Rooms',
      'Chilled RO Water',
      'Parking',
      'Spectator Gallery',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1529900245534-47fbf7de798a?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'turf-cbe-2',
    name: 'The Pitch Masters - Box Cricket Hub',
    city: 'Coimbatore',
    area: 'Saravanampatti',
    address: 'Chil SEZ IT Park Road, Saravanampatti, Coimbatore - 641035',
    sports: ['cricket'],
    pricePerHour: 950,
    rating: 4.8,
    reviewsCount: 184,
    lat: 11.0797,
    lng: 76.9997,
    amenities: [
      'Box Cricket Netting',
      'Floodlights',
      'Dugout Seating',
      'Live Streaming Setup',
      'Beverage Counter',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1531415074868-036b107e775a?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'turf-cbe-3',
    name: 'Strikerz Football & Sports Ground',
    city: 'Coimbatore',
    area: 'RS Puram',
    address: 'DB Road, Next to Forest College Ground, RS Puram, Coimbatore - 641002',
    sports: ['football', 'cricket'],
    pricePerHour: 1400,
    rating: 4.7,
    reviewsCount: 312,
    lat: 11.0094,
    lng: 76.9452,
    amenities: [
      '7-a-side Football Turf',
      'Shower & Locker Rooms',
      'Cafeteria',
      'Floodlights',
      'First Aid',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'turf-cbe-4',
    name: 'GreenField Sports Complex',
    city: 'Coimbatore',
    area: 'Gandhipuram',
    address: 'Cross Cut Road, 7th Street, Gandhipuram, Coimbatore - 641012',
    sports: ['cricket', 'football'],
    pricePerHour: 1100,
    rating: 4.6,
    reviewsCount: 142,
    lat: 11.0183,
    lng: 76.9678,
    amenities: [
      'Multi-sport Turf',
      'Floodlights',
      'Equipment Rental',
      'Covered Dugout',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'turf-cbe-5',
    name: 'Champions Turf & Cricket Academy',
    city: 'Coimbatore',
    area: 'Singanallur',
    address: 'Trichy Road, Near Singanallur Junction, Coimbatore - 641005',
    sports: ['cricket'],
    pricePerHour: 900,
    rating: 4.7,
    reviewsCount: 96,
    lat: 10.9991,
    lng: 77.0267,
    amenities: [
      'High Net Boundary',
      'Stumps & Bats Provided',
      'Night Match Lights',
      'Ample Parking',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'turf-chn-1',
    name: 'Marina KickOff Turf',
    city: 'Chennai',
    area: 'Mylapore',
    address: 'Dr. Radhakrishnan Salai, Mylapore, Chennai - 600004',
    sports: ['football', 'cricket'],
    pricePerHour: 1600,
    rating: 4.9,
    reviewsCount: 420,
    lat: 13.0425,
    lng: 80.2618,
    amenities: ['Synthetic Grass', 'Floodlights', 'Sound System', 'Locker Room'],
    imageUrl: 'https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'turf-blr-1',
    name: 'Koramangala Sports Arena',
    city: 'Bengaluru',
    area: 'Koramangala 4th Block',
    address: '80ft Road, Koramangala, Bengaluru - 560034',
    sports: ['cricket', 'football'],
    pricePerHour: 1800,
    rating: 4.8,
    reviewsCount: 512,
    lat: 12.9352,
    lng: 77.6245,
    amenities: ['Pro AstroTurf', 'LED Floodlights', 'Juice Bar', 'Showers'],
    imageUrl: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=800&q=80',
  },
];

const TIME_SLOT_HOURS = [
  { startHour: 6, endHour: 7, multiplier: 0.8 },
  { startHour: 7, endHour: 8, multiplier: 0.9 },
  { startHour: 8, endHour: 9, multiplier: 1.0 },
  { startHour: 16, endHour: 17, multiplier: 1.0 },
  { startHour: 17, endHour: 18, multiplier: 1.1 },
  { startHour: 18, endHour: 19, multiplier: 1.25 },
  { startHour: 19, endHour: 20, multiplier: 1.3 },
  { startHour: 20, endHour: 21, multiplier: 1.3 },
  { startHour: 21, endHour: 22, multiplier: 1.25 },
  { startHour: 22, endHour: 23, multiplier: 1.1 },
];

async function main() {
  console.log('🌱 Starting database seed...');

  for (const turfData of MOCK_TURFS) {
    const turf = await prisma.turf.upsert({
      where: { id: turfData.id },
      update: {
        name: turfData.name,
        city: turfData.city,
        area: turfData.area,
        address: turfData.address,
        sports: turfData.sports,
        pricePerHour: turfData.pricePerHour,
        rating: turfData.rating,
        reviewsCount: turfData.reviewsCount,
        amenities: turfData.amenities,
        imageUrl: turfData.imageUrl,
        lat: turfData.lat,
        lng: turfData.lng,
      },
      create: {
        id: turfData.id,
        name: turfData.name,
        city: turfData.city,
        area: turfData.area,
        address: turfData.address,
        sports: turfData.sports,
        pricePerHour: turfData.pricePerHour,
        rating: turfData.rating,
        reviewsCount: turfData.reviewsCount,
        amenities: turfData.amenities,
        imageUrl: turfData.imageUrl,
        lat: turfData.lat,
        lng: turfData.lng,
      },
    });

    console.log(`Seeded turf: ${turf.name} (${turf.city})`);

    // Generate slots for next 3 days
    const now = new Date();
    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + dayOffset);

      for (let i = 0; i < TIME_SLOT_HOURS.length; i++) {
        const slotConfig = TIME_SLOT_HOURS[i];
        const startsAt = new Date(targetDate);
        startsAt.setHours(slotConfig.startHour, 0, 0, 0);

        const endsAt = new Date(targetDate);
        endsAt.setHours(slotConfig.endHour, 0, 0, 0);

        const dateStr = startsAt.toISOString().split('T')[0];
        const slotId = `${turf.id}_${dateStr}_slot_${i}`;

        // Seed deterministically some booked slots
        const seed = turf.id.charCodeAt(turf.id.length - 1) + dayOffset * 7;
        const isBooked = (seed + i * 3) % 4 === 0 && i > 4;

        await prisma.turfSlot.upsert({
          where: { id: slotId },
          update: {
            startsAt,
            endsAt,
            price: Math.round(turf.pricePerHour * slotConfig.multiplier),
            isBooked,
          },
          create: {
            id: slotId,
            turfId: turf.id,
            startsAt,
            endsAt,
            price: Math.round(turf.pricePerHour * slotConfig.multiplier),
            isBooked,
          },
        });
      }
    }
  }

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
