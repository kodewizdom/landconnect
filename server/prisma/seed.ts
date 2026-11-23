import { PrismaClient, Role, AuthProvider, ListingStatus, CallPermission } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting LandConnect database seed...");

  const passwordHash = await bcrypt.hash("Password@123", 10);

  // 1. Seed Demo Accounts
  const buyer = await prisma.user.upsert({
    where: { email: "buyer@landconnect.com" },
    update: {
      password_hash: passwordHash,
      role: Role.buyer,
      full_name: "Demo Buyer",
      allow_calls_from: CallPermission.everyone,
      show_online: true,
    },
    create: {
      full_name: "Demo Buyer",
      email: "buyer@landconnect.com",
      password_hash: passwordHash,
      role: Role.buyer,
      auth_provider: AuthProvider.local,
      allow_calls_from: CallPermission.everyone,
      show_online: true,
      avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80",
    },
  });

  const seller = await prisma.user.upsert({
    where: { email: "seller@landconnect.com" },
    update: {
      password_hash: passwordHash,
      role: Role.seller,
      full_name: "Demo Seller",
      allow_calls_from: CallPermission.everyone,
      show_online: true,
    },
    create: {
      full_name: "Demo Seller",
      email: "seller@landconnect.com",
      password_hash: passwordHash,
      role: Role.seller,
      auth_provider: AuthProvider.local,
      allow_calls_from: CallPermission.everyone,
      show_online: true,
      avatar_url: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=400&q=80",
    },
  });

  const broker = await prisma.user.upsert({
    where: { email: "broker@landconnect.com" },
    update: {
      password_hash: passwordHash,
      role: Role.broker,
      full_name: "Demo Broker",
      allow_calls_from: CallPermission.everyone,
      show_online: true,
    },
    create: {
      full_name: "Demo Broker",
      email: "broker@landconnect.com",
      password_hash: passwordHash,
      role: Role.broker,
      auth_provider: AuthProvider.local,
      allow_calls_from: CallPermission.everyone,
      show_online: true,
      avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    },
  });

  console.log(`Demo accounts created: ${buyer.email}, ${seller.email}, ${broker.email}`);

  // 2. Seed 4 Sample Land Listings with Coordinates
  const sampleListings = [
    {
      owner_id: seller.id,
      title: "Prime Agricultural Land near Devanahalli",
      description: "Fertile agricultural land with excellent soil quality, road access, and close proximity to Bengaluru International Airport. Features natural water availability and clear titles.",
      price: 4500000.00,
      area_size: 2.50,
      area_unit: "acre",
      address_text: "Devanahalli, Bengaluru Rural, Karnataka",
      latitude: 13.2484,
      longitude: 77.7126,
      status: ListingStatus.available,
      images: [
        {
          image_url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80",
          sort_order: 0,
        },
        {
          image_url: "https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=800&q=80",
          sort_order: 1,
        },
      ],
    },
    {
      owner_id: seller.id,
      title: "Commercial Highway Corner Plot",
      description: "High-visibility corner commercial plot fronting NH 44, ideal for logistics hub, warehouse, or retail showroom. Wide 60ft frontage with complete legal clearances.",
      price: 12500000.00,
      area_size: 10890.00,
      area_unit: "sqft",
      address_text: "NH 44, Nelamangala, Bengaluru, Karnataka",
      latitude: 13.0995,
      longitude: 77.3929,
      status: ListingStatus.available,
      images: [
        {
          image_url: "https://images.unsplash.com/photo-1628744448840-55bdb2497bd4?auto=format&fit=crop&w=800&q=80",
          sort_order: 0,
        },
        {
          image_url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80",
          sort_order: 1,
        },
      ],
    },
    {
      owner_id: broker.id,
      title: "Gated Community Villa Plot in Sarjapur",
      description: "Clear title BMRDA-approved residential plot in an upcoming premium gated community. Features underground electricity, 40ft wide paved roads, club house, and landscaped parks.",
      price: 6800000.00,
      area_size: 2400.00,
      area_unit: "sqft",
      address_text: "Sarjapur Road, Bengaluru, Karnataka",
      latitude: 12.8601,
      longitude: 77.7858,
      status: ListingStatus.negotiation,
      images: [
        {
          image_url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
          sort_order: 0,
        },
        {
          image_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
          sort_order: 1,
        },
      ],
    },
    {
      owner_id: broker.id,
      title: "Scenic Farmhouse Land with Borewell",
      description: "Peaceful weekend retreat land with operational 6-inch borewell, drip irrigation setup, perimeter fencing, and scenic views of surrounding hills. Ready for plantation or organic farming.",
      price: 3200000.00,
      area_size: 20.00,
      area_unit: "gunta",
      address_text: "Kanakapura Road, Harohalli, Karnataka",
      latitude: 12.6528,
      longitude: 77.4589,
      status: ListingStatus.available,
      images: [
        {
          image_url: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=800&q=80",
          sort_order: 0,
        },
        {
          image_url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
          sort_order: 1,
        },
      ],
    },
  ];

  for (const item of sampleListings) {
    const { images, ...listingData } = item;
    const existing = await prisma.listing.findFirst({
      where: {
        owner_id: listingData.owner_id,
        title: listingData.title,
      },
    });

    if (existing) {
      console.log(`Listing "${listingData.title}" already exists, skipping creation.`);
    } else {
      const createdListing = await prisma.listing.create({
        data: {
          ...listingData,
          images: {
            create: images,
          },
        },
      });
      console.log(`Created listing: "${createdListing.title}" (${createdListing.id})`);
    }
  }

  console.log("LandConnect seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
